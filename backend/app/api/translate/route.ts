import { NextRequest, NextResponse } from 'next/server';
import { langGraphClient } from '@/lib/langraph-client';
import { generateContentHash, getCachedTranslation, cacheTranslation } from '@/lib/cache';
import { addCorsHeaders, preflightResponse } from '@/lib/cors';

export function OPTIONS() {
  return preflightResponse();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, pdfHash, pageNum, context } = body;

    if (!text) {
      return addCorsHeaders(NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      ));
    }

    // 콘텐츠 해시 생성
    const contentHash = generateContentHash(text);

    // 캐시 확인
    const cached = await getCachedTranslation(contentHash);
    if (cached) {
      console.log('Cache hit for content:', contentHash.substring(0, 8));
      return addCorsHeaders(NextResponse.json({
        translatedText: cached.translatedText,
        contentType: cached.contentType,
        fromCache: true,
      }));
    }

    // LangGraph 에이전트 호출
    console.log('Calling LangGraph agent for translation...');
    const result = await langGraphClient.translate({ text, context });

    // 결과 캐싱
    if (pdfHash && pageNum !== undefined) {
      await cacheTranslation({
        pdfHash,
        pageNum,
        contentHash,
        originalText: text,
        translatedText: result.translatedText,
        contentType: result.contentType as 'TEXT' | 'MATH' | 'TABLE' | 'IMAGE',
      });
    }

    return addCorsHeaders(NextResponse.json({
      ...result,
      fromCache: false,
    }));
  } catch (error) {
    console.error('Translation error:', error);
    return addCorsHeaders(NextResponse.json(
      { error: 'Translation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    ));
  }
}
