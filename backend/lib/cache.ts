import { prisma } from './db';
import crypto from 'crypto';

/**
 * 텍스트의 SHA-256 해시 생성
 */
export function generateContentHash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * 캐시된 번역 확인
 */
export async function getCachedTranslation(contentHash: string) {
  return await prisma.translation.findUnique({
    where: { contentHash },
  });
}

/**
 * 번역 결과 캐싱
 */
export async function cacheTranslation(params: {
  pdfHash: string;
  pageNum: number;
  contentHash: string;
  originalText: string;
  translatedText: string;
  contentType: 'TEXT' | 'MATH' | 'TABLE' | 'IMAGE';
}) {
  return await prisma.translation.create({
    data: params,
  });
}

/**
 * PDF 메타데이터 저장 또는 업데이트
 */
export async function upsertPdfMetadata(params: {
  pdfHash: string;
  title?: string;
  totalPages: number;
}) {
  return await prisma.pdfMetadata.upsert({
    where: { pdfHash: params.pdfHash },
    update: {
      totalPages: params.totalPages,
      title: params.title,
    },
    create: params,
  });
}

