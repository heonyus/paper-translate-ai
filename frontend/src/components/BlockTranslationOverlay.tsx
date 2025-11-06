import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { MathRenderer } from './MathRenderer';
import type { TextBlock } from '../types';
import { useTranslationStore } from '../store/translationStore';

interface TranslationCardProps {
  block: TextBlock;
  autoTranslate?: boolean;
  onScrollToBlock?: (block: TextBlock) => void;
}

export function BlockTranslationOverlay({
  block,
  autoTranslate = true,
  onScrollToBlock,
}: TranslationCardProps) {
  const { translate, isLoading } = useTranslation();
  const [translatedText, setTranslatedText] = useState<string>('');
  const [hasStarted, setHasStarted] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const copyResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { activeBlockId, setActiveBlockId } = useTranslationStore();
  const isActive = activeBlockId === block.id;

  const label = useMemo(() => {
    switch (block.contentType) {
      case 'MATH':
        return '수식';
      case 'TABLE':
        return '표';
      case 'IMAGE':
        return '이미지';
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

  const handleActivate = () => {
    setActiveBlockId(block.id);
    onScrollToBlock?.(block);
  };

  return (
    <article
      onMouseEnter={() => setActiveBlockId(block.id)}
      onMouseLeave={() => {
        if (activeBlockId === block.id) {
          setActiveBlockId(null);
        }
      }}
      onFocus={handleActivate}
      onClick={handleActivate}
      className={[
        'group rounded-2xl border border-white/10 bg-slate-900/80 px-6 py-5 transition',
        'shadow-[0_20px_40px_-20px_rgba(15,23,42,0.6)] backdrop-blur',
        isActive ? 'border-sky-400/70 shadow-[0_35px_70px_-30px_rgba(56,189,248,0.6)]' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      tabIndex={0}
    >
      <header className="mb-4 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-sky-300">
            {label}
          </span>
          <p className="mt-1 text-xs text-slate-400">
            페이지 {block.pageNum} · x:{Math.round(block.x)} y:{Math.round(block.y)}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-300">
          {isLoading ? (
            <>
              <span className="h-2 w-2 animate-pulse rounded-full bg-sky-300" />
              <span>번역 중...</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.6)]" />
              <span>완료</span>
            </>
          )}
        </div>
      </header>

      <div className="space-y-3 text-sm leading-relaxed text-slate-100">
        {isLoading && !translatedText ? (
          <div className="flex items-center gap-2 text-xs text-slate-400">
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

      <footer className="mt-4 flex items-center justify-between text-[12px] text-slate-300">
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
        <button
          type="button"
          onClick={handleActivate}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-slate-200 transition hover:border-sky-400 hover:text-sky-200"
        >
          원문 보기
        </button>
      </footer>
    </article>
  );
}
