import { useState, useEffect } from 'react';
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
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (autoTranslate && block.text && !translatedText) {
      handleTranslate();
    }
  }, [block.text, autoTranslate]);

  const handleTranslate = async () => {
    const result = await translate(block.text, block.pageNum);
    if (result) {
      setTranslatedText(result.translatedText);
      setIsVisible(true);
    }
  };

  if (!isVisible && !isLoading) {
    return null;
  }

  // 스케일을 적용한 위치 계산
  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${block.x * scale}px`,
    top: `${(block.y + block.height) * scale}px`,
    width: `${block.width * scale}px`,
    minHeight: '20px',
    backgroundColor: 'rgba(128, 128, 128, 0.08)',
    borderLeft: '3px solid rgba(128, 128, 128, 0.5)',
    padding: '8px 12px',
    marginTop: '4px',
    borderRadius: '0 4px 4px 0',
    fontSize: '13px',
    lineHeight: '1.5',
    color: '#333',
    zIndex: 10,
    transition: 'opacity 0.2s',
    pointerEvents: 'auto',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  };

  return (
    <div style={style} className="translation-overlay">
      {isLoading ? (
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600"></div>
          <span className="text-xs text-gray-500">번역 중...</span>
        </div>
      ) : translatedText ? (
        block.contentType === 'MATH' ? (
          <MathRenderer text={translatedText} />
        ) : (
          <span className="text-sm">{translatedText}</span>
        )
      ) : null}
    </div>
  );
}

