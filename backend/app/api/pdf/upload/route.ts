import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { upsertPdfMetadata } from '@/lib/cache';
import { addCorsHeaders, preflightResponse } from '@/lib/cors';
// @ts-ignore - pdf-parse는 TypeScript 정의가 불완전할 수 있습니다
import pdfParse from 'pdf-parse';

export function OPTIONS() {
  return preflightResponse();
}

export async function POST(request: NextRequest) {
  // 에러 발생 시에도 CORS 헤더를 포함하기 위해 try-catch로 감쌉니다
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return addCorsHeaders(NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      ));
    }

    // PDF 파일 버퍼로 변환
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // PDF 해시 생성
    const pdfHash = createHash('sha256').update(buffer).digest('hex');

    // PDF 파싱
    let data;
    try {
      data = await pdfParse(buffer);
    } catch (parseError) {
      console.error('PDF parse error:', parseError);
      return addCorsHeaders(NextResponse.json(
        { 
          error: 'PDF parsing failed', 
          details: parseError instanceof Error ? parseError.message : 'Unknown error'
        },
        { status: 400 }
      ));
    }

    // 메타데이터 저장
    try {
      await upsertPdfMetadata({
        pdfHash,
        title: file.name.replace('.pdf', ''),
        totalPages: data.numpages,
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      // 데이터베이스 에러가 발생해도 PDF 파싱은 성공했으므로 메타데이터는 반환
      return addCorsHeaders(NextResponse.json({
        pdfHash,
        title: file.name.replace('.pdf', ''),
        totalPages: data.numpages,
        textLength: data.text.length,
        warning: 'Metadata could not be saved to database',
      }));
    }

    return addCorsHeaders(NextResponse.json({
      pdfHash,
      title: file.name.replace('.pdf', ''),
      totalPages: data.numpages,
      textLength: data.text.length,
    }));
  } catch (error) {
    console.error('PDF upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error stack:', errorStack);
    
    // 에러 응답에도 반드시 CORS 헤더를 포함합니다
    return addCorsHeaders(NextResponse.json(
      { 
        error: 'PDF upload failed', 
        details: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { stack: errorStack })
      },
      { status: 500 }
    ));
  }
}
