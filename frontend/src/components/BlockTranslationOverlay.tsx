import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { MathRenderer } from './MathRenderer';
import type { TextBlock } from '../types';

interface BlockTranslationOverlayProps {
  block: TextBlock;
  scale: number;
  autoTranslate?: boolean;
}

export function BlockTranslationOverlay({
  block,
  scale,
  autoTranslate = true,
}: BlockTranslationOverlayProps) {
  const { translate, isLoading } = useTranslation();
  const [translatedText, setTranslatedText] = useState<string>('');
  const [hasStarted, setHasStarted] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const copyResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const label = useMemo(() => {
    switch (block.contentType) {
      case 'MATH':
        return '수식';
      case 'TABLE':
        return '표';
      case 'IMAGE':
        return '이미지 설명';
      default:
        return '본문';
    }
  }, [block.contentType]);

  const translateBlock = useCallback(async () => {
    setHasStarted(true);
    try {
      const result = await translate(block.text, block.pageNum);
      if (result) {
        setTranslatedText(result.translatedText);
      }
    } catch (error) {
      console.error(`[Block ${block.id}] Translation error:`, error);
    }
  }, [block.id, block.pageNum, block.text, translate]);

  useEffect(() => {
    setTranslatedText('');
    setHasStarted(false);
    setIsCopied(false);
  }, [block.id]);

  useEffect(() => {
    if (autoTranslate && block.text && !translatedText && !hasStarted) {
      void translateBlock();
    }
  }, [autoTranslate, block.text, hasStarted, translatedText, translateBlock]);

  useEffect(() => {
    return () => {
      if (copyResetTimer.current) {
        clearTimeout(copyResetTimer.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    if (!translatedText) {
      return;
    }
    try {
      await navigator.clipboard.writeText(translatedText);
      setIsCopied(true);
      if (copyResetTimer.current) {
        clearTimeout(copyResetTimer.current);
      }
      copyResetTimer.current = setTimeout(() => setIsCopied(false), 1200);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  // 번역이 시작되지 않았으면 표시하지 않음
  if (!hasStarted) {
    return null;
  }

  // 스케일을 적용한 위치 계산
  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${block.x * scale}px`,
    top: `${(block.y + block.height) * scale + 12}px`,
    width: `${Math.max(block.width * scale, 260)}px`,
    background:
      'linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.86))',
    padding: '18px 20px 20px',
    borderRadius: '16px',
    color: '#f8fafc',
    zIndex: 20,
    transition: 'transform 0.25s ease, box-shadow 0.3s ease',
    pointerEvents: 'auto',
    boxShadow:
      '0 18px 45px -15px rgba(15, 23, 42, 0.75), 0 0 0 1px rgba(148, 163, 184, 0.18)',
    backdropFilter: 'blur(10px)',
  };

  return (
    <div
      style={style}
      className="translation-overlay group hover:translate-y-[-2px] hover:shadow-[0_30px_60px_-30px_rgba(56,189,248,0.6)]"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-sky-300">
          {label}
        </span>
        <div className="flex items-center gap-2 text-xs text-slate-200">
          {isLoading ? (
            <>
              <span className="h-2 w-2 animate-ping rounded-full bg-sky-300" />
              <span>번역 중...</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.6)]" />
              <span>완료</span>
            </>
          )}
        </div>
      </div>

      <div className="space-y-3 text-sm leading-relaxed text-slate-100">
        {isLoading ? (
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-slate-500 border-t-sky-400" />
            <span>문장을 정리하고 있습니다...</span>
          </div>
        ) : block.contentType === 'MATH' ? (
          <MathRenderer text={translatedText} />
        ) : (
          <p className="whitespace-pre-line text-[15px] text-slate-50">
            {translatedText}
          </p>
        )}

        <p className="rounded-md border border-white/5 bg-white/5 px-3 py-2 text-[12px] text-slate-300">
          {block.text.trim()}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between text-[12px] text-slate-300">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!translatedText}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-medium text-slate-200 transition hover:border-sky-400 hover:text-sky-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCopied ? '복사됨' : '복사'}
          </button>
          <button
            type="button"
            onClick={() => void translateBlock()}
            className="rounded-full border border-transparent bg-sky-500/80 px-3 py-1.5 font-medium text-slate-900 transition hover:bg-sky-400"
          >
            다시 번역
          </button>
        </div>
        <span className="text-slate-400">
          p.{block.pageNum} · {label}
        </span>
      </div>
    </div>
  );
}
