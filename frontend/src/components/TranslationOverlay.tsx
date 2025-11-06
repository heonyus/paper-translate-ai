import { useState, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { MathRenderer } from './MathRenderer';

interface TranslationOverlayProps {
  originalText: string;
  pageNum: number;
  autoTranslate?: boolean;
}

export function TranslationOverlay({
  originalText,
  pageNum,
  autoTranslate = true,
}: TranslationOverlayProps) {
  const { translate, isLoading } = useTranslation();
  const [translatedText, setTranslatedText] = useState<string>('');
  const [contentType, setContentType] = useState<string>('TEXT');
  const [showTranslation, setShowTranslation] = useState(true);

  useEffect(() => {
    if (autoTranslate && originalText) {
      handleTranslate();
    }
  }, [originalText, pageNum, autoTranslate]);

  const handleTranslate = async () => {
    const result = await translate(originalText, pageNum);
    if (result) {
      setTranslatedText(result.translatedText);
      setContentType(result.contentType);
    }
  };

  if (!originalText) {
    return null;
  }

  return (
    <div className="my-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-sm font-semibold text-gray-700">Original ({contentType})</h3>
        <button
          onClick={() => setShowTranslation(!showTranslation)}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          {showTranslation ? 'Hide' : 'Show'} Translation
        </button>
      </div>

      <p className="text-sm text-gray-600 mb-3 whitespace-pre-wrap">
        {originalText.substring(0, 200)}
        {originalText.length > 200 && '...'}
      </p>

      {showTranslation && (
        <>
          <h3 className="text-sm font-semibold text-blue-700 mb-2">Korean Translation</h3>
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
              <span className="text-sm text-gray-500">Translating...</span>
            </div>
          ) : translatedText ? (
            contentType === 'MATH' ? (
              <MathRenderer text={translatedText} />
            ) : (
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{translatedText}</p>
            )
          ) : (
            <button
              onClick={handleTranslate}
              className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
            >
              Translate
            </button>
          )}
        </>
      )}
    </div>
  );
}

