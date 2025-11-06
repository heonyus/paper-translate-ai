import type { TextBlock, PDFTextItem, ContentType } from '../types';

interface TextLine {
  items: PDFTextItem[];
  y: number;
  x: number;
  width: number;
  height: number;
  text: string;
}

/**
 * PDF.js의 텍스트 아이템을 추출하고 문단으로 그룹핑합니다.
 */
export async function extractTextBlocks(
  page: any,
  pageNum: number
): Promise<TextBlock[]> {
  try {
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1.0 });
    
    // 텍스트 아이템 추출 및 좌표 변환
    const items: PDFTextItem[] = textContent.items
      .filter((item: any) => item.str && item.str.trim().length > 0)
      .map((item: any) => ({
        str: item.str,
        transform: item.transform,
        width: item.width,
        height: item.height,
        fontName: item.fontName,
      }));

    if (items.length === 0) {
      return [];
    }

    // 텍스트 아이템을 줄로 그룹핑
    const lines = groupIntoLines(items, viewport.height);

    // 줄을 문단으로 그룹핑
    const paragraphs = groupIntoParagraphs(lines);

    // TextBlock으로 변환
    const blocks: TextBlock[] = paragraphs.map((para, index) => {
      const contentType = detectContentType(para.text);
      return {
        id: `block-${pageNum}-${index}`,
        text: para.text,
        pageNum,
        x: para.x,
        y: para.y,
        width: para.width,
        height: para.height,
        contentType,
        fontSize: para.height,
      };
    });

    return blocks;
  } catch (error) {
    console.error('Error extracting text blocks:', error);
    return [];
  }
}

/**
 * 텍스트 아이템을 y좌표 기반으로 줄로 그룹핑
 */
function groupIntoLines(items: PDFTextItem[], pageHeight: number): TextLine[] {
  const LINE_HEIGHT_THRESHOLD = 5; // 같은 줄로 간주할 y 차이

  // y 좌표로 정렬 (PDF는 아래에서 위로, 우리는 위에서 아래로)
  const sortedItems = [...items].sort((a, b) => {
    const yA = pageHeight - a.transform[5];
    const yB = pageHeight - b.transform[5];
    if (Math.abs(yA - yB) < LINE_HEIGHT_THRESHOLD) {
      return a.transform[4] - b.transform[4]; // x 좌표로 정렬
    }
    return yA - yB;
  });

  const lines: TextLine[] = [];
  let currentLine: PDFTextItem[] = [];
  let currentY = -1;

  for (const item of sortedItems) {
    const y = pageHeight - item.transform[5];
    
    if (currentY === -1 || Math.abs(y - currentY) < LINE_HEIGHT_THRESHOLD) {
      currentLine.push(item);
      currentY = y;
    } else {
      if (currentLine.length > 0) {
        lines.push(createLineFromItems(currentLine, pageHeight));
      }
      currentLine = [item];
      currentY = y;
    }
  }

  if (currentLine.length > 0) {
    lines.push(createLineFromItems(currentLine, pageHeight));
  }

  return lines;
}

/**
 * 텍스트 아이템 배열로부터 TextLine 생성
 */
function createLineFromItems(items: PDFTextItem[], pageHeight: number): TextLine {
  const text = items.map(item => item.str).join(' ');
  const firstItem = items[0];
  const lastItem = items[items.length - 1];
  
  const x = firstItem.transform[4];
  const y = pageHeight - firstItem.transform[5];
  const width = lastItem.transform[4] + lastItem.width - x;
  const height = Math.max(...items.map(item => item.height));

  return {
    items,
    y,
    x,
    width,
    height,
    text,
  };
}

/**
 * 줄들을 문단으로 그룹핑
 */
function groupIntoParagraphs(lines: TextLine[]): TextLine[] {
  if (lines.length === 0) return [];

  const PARAGRAPH_GAP_THRESHOLD = 20; // 문단 구분 기준 (픽셀)
  const paragraphs: TextLine[] = [];
  let currentParagraph: TextLine[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (currentParagraph.length === 0) {
      currentParagraph.push(line);
    } else {
      const prevLine = currentParagraph[currentParagraph.length - 1];
      const gap = line.y - (prevLine.y + prevLine.height);

      if (gap > PARAGRAPH_GAP_THRESHOLD) {
        // 새 문단 시작
        paragraphs.push(mergeLinesIntoParagraph(currentParagraph));
        currentParagraph = [line];
      } else {
        currentParagraph.push(line);
      }
    }
  }

  if (currentParagraph.length > 0) {
    paragraphs.push(mergeLinesIntoParagraph(currentParagraph));
  }

  return paragraphs;
}

/**
 * 여러 줄을 하나의 문단으로 병합
 */
function mergeLinesIntoParagraph(lines: TextLine[]): TextLine {
  const text = lines.map(line => line.text).join(' ');
  const firstLine = lines[0];
  const lastLine = lines[lines.length - 1];
  
  const x = Math.min(...lines.map(line => line.x));
  const y = firstLine.y;
  const width = Math.max(...lines.map(line => line.x + line.width)) - x;
  const height = (lastLine.y + lastLine.height) - y;

  return {
    items: lines.flatMap(line => line.items),
    y,
    x,
    width,
    height,
    text,
  };
}

/**
 * 텍스트 내용으로 콘텐츠 타입 감지
 */
function detectContentType(text: string): ContentType {
  // 수식 패턴 감지
  const mathPatterns = [
    /\$.*\$/,  // $...$
    /\\\(.*\\\)/,  // \(...\)
    /\\\[.*\\\]/,  // \[...\]
    /\\begin\{equation\}/,
    /\\begin\{align\}/,
    /[∫∑∏√±≤≥≠∞α-ωΑ-Ω]/,  // 수학 기호
    /\^[\{\w]|_[\{\w]/,  // 지수, 하첨자
  ];

  for (const pattern of mathPatterns) {
    if (pattern.test(text)) {
      return 'MATH';
    }
  }

  // 표 패턴 감지
  const tablePatterns = [
    /\|.*\|.*\|/,  // | ... | ... |
    /\t.*\t/,  // 탭 구분
  ];

  for (const pattern of tablePatterns) {
    if (pattern.test(text)) {
      return 'TABLE';
    }
  }

  // 이미지 캡션 감지
  const imagePatterns = [
    /^Figure\s+\d+/i,
    /^Fig\.\s*\d+/i,
    /^그림\s+\d+/,
  ];

  for (const pattern of imagePatterns) {
    if (pattern.test(text.trim())) {
      return 'IMAGE';
    }
  }

  return 'TEXT';
}

/**
 * 이미지 영역 감지 (OperatorList 사용)
 */
export async function detectImageRegions(page: any, pageNum: number): Promise<TextBlock[]> {
  try {
    const operatorList = await page.getOperatorList();
    const viewport = page.getViewport({ scale: 1.0 });
    const images: TextBlock[] = [];
    
    for (let i = 0; i < operatorList.fnArray.length; i++) {
      const fn = operatorList.fnArray[i];
      const args = operatorList.argsArray[i];
      
      // paintImageXObject 또는 paintInlineImageXObject
      if (fn === 85 || fn === 86) { // OPS.paintImageXObject
        // 이미지 위치 추정 (transform matrix에서)
        const transform = args[0] || [1, 0, 0, 1, 0, 0];
        
        images.push({
          id: `image-${pageNum}-${i}`,
          text: '[Image]',
          pageNum,
          x: transform[4] || 0,
          y: viewport.height - (transform[5] || 0),
          width: transform[0] || 100,
          height: transform[3] || 100,
          contentType: 'IMAGE',
        });
      }
    }
    
    return images;
  } catch (error) {
    console.error('Error detecting image regions:', error);
    return [];
  }
}

/**
 * 표 영역 감지 (정렬된 텍스트 패턴 분석)
 */
export function detectTableRegions(blocks: TextBlock[]): TextBlock[] {
  // 간단한 휴리스틱: 여러 블록이 수직으로 정렬되어 있고 
  // 각 블록이 비슷한 x 좌표를 가지면 표로 간주
  const tables: TextBlock[] = [];
  
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (block.text.includes('|') || block.text.includes('\t')) {
      // 이미 TABLE로 감지된 경우
      if (block.contentType !== 'TABLE') {
        block.contentType = 'TABLE';
      }
    }
  }
  
  return tables;
}

