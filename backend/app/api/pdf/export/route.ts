import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { prisma } from '@/lib/db';
import { addCorsHeaders, preflightResponse } from '@/lib/cors';

export function OPTIONS() {
  return preflightResponse();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pdfHash, translations } = body;

    if (!pdfHash) {
      return addCorsHeaders(NextResponse.json(
        { error: 'PDF hash is required' },
        { status: 400 }
      ));
    }

    // PDF 메타데이터 가져오기
    const metadata = await prisma.pdfMetadata.findUnique({
      where: { pdfHash },
      include: { translations: true },
    });

    if (!metadata) {
      return addCorsHeaders(NextResponse.json(
        { error: 'PDF not found' },
        { status: 404 }
      ));
    }

    // 새로운 PDF 문서 생성
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // 각 페이지에 번역 추가
    const translationsToUse = translations || metadata.translations;

    // 페이지별로 그룹화
    const translationsByPage = new Map<number, typeof translationsToUse>();
    for (const trans of translationsToUse) {
      const pageNum = trans.pageNum || 0;
      if (!translationsByPage.has(pageNum)) {
        translationsByPage.set(pageNum, []);
      }
      translationsByPage.get(pageNum)?.push(trans);
    }

    // 각 페이지 생성
    for (let i = 0; i < metadata.totalPages; i++) {
      const page = pdfDoc.addPage([595, 842]); // A4 크기
      const { width, height } = page.getSize();

      // 페이지 번호
      page.drawText(`Page ${i + 1}`, {
        x: 50,
        y: height - 50,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });

      // 해당 페이지의 번역들
      const pageTranslations = translationsByPage.get(i) || [];
      let yPosition = height - 100;

      for (const trans of pageTranslations) {
        // 원문
        page.drawText('Original:', {
          x: 50,
          y: yPosition,
          size: 10,
          font,
          color: rgb(0.5, 0.5, 0.5),
        });
        yPosition -= 15;

        const originalLines = wrapText(trans.originalText || '', 80);
        for (const line of originalLines) {
          if (yPosition < 50) break;
          page.drawText(line, {
            x: 50,
            y: yPosition,
            size: 9,
            font,
            color: rgb(0.3, 0.3, 0.3),
          });
          yPosition -= 12;
        }

        yPosition -= 10;

        // 번역문 (참고: 한글 폰트는 별도로 임베드해야 함)
        page.drawText('Translation:', {
          x: 50,
          y: yPosition,
          size: 10,
          font,
          color: rgb(0, 0, 1),
        });
        yPosition -= 15;

        const translatedLines = wrapText(trans.translatedText || '', 80);
        for (const line of translatedLines) {
          if (yPosition < 50) break;
          page.drawText(line, {
            x: 50,
            y: yPosition,
            size: 9,
            font,
            color: rgb(0, 0, 0),
          });
          yPosition -= 12;
        }

        yPosition -= 20;

        if (yPosition < 100) break; // 페이지 공간 부족
      }
    }

    // PDF를 바이트로 변환
    const pdfBytes = await pdfDoc.save();

    // 응답 반환
    const response = new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${metadata.title}_translated.pdf"`,
      },
    });

    return addCorsHeaders(response);
  } catch (error) {
    console.error('PDF export error:', error);
    return addCorsHeaders(NextResponse.json(
      { error: 'PDF export failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    ));
  }
}

// 텍스트 줄바꿈 헬퍼 함수
function wrapText(text: string, maxLength: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + word).length > maxLength) {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = word + ' ';
    } else {
      currentLine += word + ' ';
    }
  }

  if (currentLine) lines.push(currentLine.trim());
  return lines;
}

