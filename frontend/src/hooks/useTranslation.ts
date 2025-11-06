import { useState } from 'react';
import { translateText } from '../utils/api';
import type { TranslationRequest, TranslationResponse } from '../utils/api';
import { useTranslationStore } from '../store/translationStore';

export function useTranslation() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addTranslation, getTranslation, pdfMetadata } = useTranslationStore();

  const translate = async (text: string, pageNum: number, context?: string): Promise<TranslationResponse | null> => {
    // 캐시 키 생성
    const cacheKey = `${pageNum}-${text.substring(0, 50)}`;
    
    // 로컬 캐시 확인
    const cached = getTranslation(cacheKey);
    if (cached) {
      return {
        translatedText: cached.translatedText,
        contentType: cached.contentType,
        fromCache: true,
      };
    }

    setIsLoading(true);
    setError(null);

    try {
      const request: TranslationRequest = {
        text,
        pdfHash: pdfMetadata?.pdfHash,
        pageNum,
        context,
      };

      const response = await translateText(request);

      // 로컬 스토어에 캐싱
      addTranslation(cacheKey, {
        originalText: text,
        translatedText: response.translatedText,
        contentType: response.contentType,
        fromCache: response.fromCache,
      });

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Translation failed';
      setError(errorMessage);
      console.error('Translation error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { translate, isLoading, error };
}

