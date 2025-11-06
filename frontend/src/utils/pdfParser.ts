import type {
  PDFPageProxy,
  TextContent,
  TextItem,
  TextMarkedContent,
  PDFOperatorList,
} from 'pdfjs-dist/types/src/display/api';
import type { PageViewport } from 'pdfjs-dist/types/src/display/display_utils';
import type { TextBlock, ContentType } from '../types';

type Matrix = [number, number, number, number, number, number];

interface PositionedItem {
  text: string;
  raw: string;
  x: number;
  y: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  fontSize: number;
  fontName?: string;
}

interface TextLine {
  items: PositionedItem[];
  x: number;
  y: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  baseline: number;
  fontSize: number;
  text: string;
  column: number;
}

interface ParagraphBlock {
  lines: TextLine[];
  x: number;
  y: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  column: number;
}

interface ColumnGroup {
  id: number;
  center: number;
  lines: TextLine[];
  minX: number;
  maxX: number;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const OPS = {
  save: 10,
  restore: 11,
  transform: 12,
  paintImageMaskXObject: 83,
  paintImageXObject: 85,
  paintInlineImageXObject: 86,
  paintImageXObjectRepeat: 88,
} as const;

const UNIT_SQUARE: [number, number][] = [
  [0, 0],
  [1, 0],
  [0, 1],
  [1, 1],
];

const MIN_IMAGE_AREA = 2000;
const MAX_IMAGE_TEXT_OVERLAP_RATIO = 0.55;
const ROTATION_THRESHOLD = 0.45;

function isTextItem(item: TextItem | TextMarkedContent): item is TextItem {
  return typeof (item as TextItem).str === 'string';
}

export async function extractTextBlocks(
  page: PDFPageProxy,
  pageNum: number
): Promise<TextBlock[]> {
  try {
    const textContent: TextContent = await page.getTextContent({
      includeMarkedContent: true,
    });
    const viewport: PageViewport = page.getViewport({ scale: 1.0 });
    const items = mapToPositionedItems(textContent.items, viewport.height);

    if (items.length === 0) {
      return [];
    }

    const lines = buildLinesFromItems(items);
    if (lines.length === 0) {
      return [];
    }

    const avgLineHeight = average(lines.map((line) => line.height)) || 12;
    const columns = assignColumns(lines, viewport.width);

    const paragraphs: ParagraphBlock[] = [];

    columns.forEach((column) => {
      column.lines.sort(sortLinesTopToBottom);
      paragraphs.push(
        ...groupLinesIntoParagraphs(column.lines, avgLineHeight, column.id)
      );
    });

    const unassignedLines = lines.filter((line) => line.column === -1);
    if (unassignedLines.length > 0) {
      unassignedLines.sort(sortLinesTopToBottom);
      paragraphs.push(
        ...groupLinesIntoParagraphs(
          unassignedLines,
          avgLineHeight,
          columns.length
        )
      );
    }

    const orderedParagraphs = sortParagraphsForReading(
      paragraphs,
      avgLineHeight
    );

    const blocks: TextBlock[] = orderedParagraphs
      .map((paragraph, index) => ({
        id: `block-${pageNum}-${index}`,
        text: paragraph.text,
        pageNum,
        x: paragraph.x,
        y: paragraph.y,
        width: paragraph.width,
        height: paragraph.height,
        contentType: detectContentType(paragraph.text),
        fontSize: paragraph.fontSize,
      }))
      .filter((block) => !shouldDropBlock(block));

    return blocks;
  } catch (error) {
    console.error('[TextExtraction] Failed to parse page', pageNum, error);
    return [];
  }
}

export async function detectImageRegions(
  page: PDFPageProxy,
  pageNum: number,
  textBlocks: TextBlock[]
): Promise<TextBlock[]> {
  try {
    const viewport: PageViewport = page.getViewport({ scale: 1.0 });
    const operatorImages = await extractImageBlocksFromOperators(
      page,
      viewport,
      pageNum
    );

    const filtered = operatorImages.filter(
      (image) => !isCoveredByText(image, textBlocks)
    );

    if (filtered.length > 0) {
      return filtered;
    }

    return detectImagesByCaptions(textBlocks, viewport, pageNum);
  } catch (error) {
    console.error('[ImageDetection] Error:', error);
    const viewport: PageViewport = page.getViewport({ scale: 1.0 });
    return detectImagesByCaptions(textBlocks, viewport, pageNum);
  }
}

export function detectTableRegions(blocks: TextBlock[]): TextBlock[] {
  const tables: TextBlock[] = [];

  const sortedBlocks = [...blocks].sort((a, b) => a.y - b.y);
  for (let i = 0; i < sortedBlocks.length; i++) {
    const block = sortedBlocks[i];
    if (block.contentType === 'TABLE') {
      tables.push(block);
      continue;
    }

    const lines = block.text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) {
      continue;
    }

    const hasMultipleColumns = lines.every((line) => {
      const cells = line.split(/\s{2,}|\t|\|/).filter((cell) => cell.trim());
      return cells.length >= 2;
    });

    if (hasMultipleColumns) {
      block.contentType = 'TABLE';
      tables.push(block);
    }
  }

  return tables;
}

function mapToPositionedItems(
  items: TextContent['items'],
  pageHeight: number
): PositionedItem[] {
  return items
    .filter(isTextItem)
    .map((rawItem) => {
      const raw = String(rawItem.str ?? '');
      const text = normaliseWhitespace(raw);

      if (!text) {
        return null;
      }

      const transform = Array.isArray(rawItem.transform)
        ? (rawItem.transform as number[])
        : undefined;
      const a = transform?.[0] ?? 1;
      const b = transform?.[1] ?? 0;
      const c = transform?.[2] ?? 0;
      const d = transform?.[3] ?? 1;
      const rotationMagnitude = Math.abs(b) + Math.abs(c);
      if (rotationMagnitude > ROTATION_THRESHOLD) {
        return null;
      }

      const x = transform?.[4] ?? 0;
      const yFromBottom = transform?.[5] ?? 0;
      const width =
        typeof rawItem.width === 'number' && rawItem.width !== 0
          ? Math.abs(rawItem.width)
          : Math.sqrt(a * a + b * b);
      const height =
        typeof rawItem.height === 'number' && rawItem.height !== 0
          ? Math.abs(rawItem.height)
          : Math.sqrt(c * c + d * d);

      if (width === 0 || height === 0) {
        return null;
      }

      const y = pageHeight - yFromBottom;
      const bottom = y + height;
      const right = x + width;

      return {
        text,
        raw,
        x,
        y,
        right,
        bottom,
        width,
        height,
        fontSize: height,
        fontName: rawItem.fontName,
      } as PositionedItem;
    })
    .filter((item): item is PositionedItem => item !== null);
}

function buildLinesFromItems(items: PositionedItem[]): TextLine[] {
  if (items.length === 0) {
    return [];
  }

  const sortedItems = [...items].sort((a, b) => {
    const yDiff = a.y - b.y;
    if (Math.abs(yDiff) < 2) {
      return a.x - b.x;
    }
    return yDiff;
  });

  const lines: TextLine[] = [];
  let currentItems: PositionedItem[] = [];

  for (const item of sortedItems) {
    if (currentItems.length === 0) {
      currentItems.push(item);
      continue;
    }

    const baseline = average(currentItems.map((i) => i.bottom));
    const baselineDiff = Math.abs(item.bottom - baseline);
    const currentHeight = average(currentItems.map((i) => i.height));
    const threshold = Math.max(currentHeight, item.height) * 0.55;

    if (baselineDiff > threshold) {
      lines.push(createTextLine(currentItems));
      currentItems = [item];
    } else {
      currentItems.push(item);
    }
  }

  if (currentItems.length > 0) {
    lines.push(createTextLine(currentItems));
  }

  return lines;
}

function createTextLine(items: PositionedItem[]): TextLine {
  const sortedItems = [...items].sort((a, b) => a.x - b.x);
  const x = Math.min(...sortedItems.map((item) => item.x));
  const y = Math.min(...sortedItems.map((item) => item.y));
  const right = Math.max(...sortedItems.map((item) => item.right));
  const bottom = Math.max(...sortedItems.map((item) => item.bottom));
  const width = right - x;
  const height = bottom - y;
  const fontSize = average(sortedItems.map((item) => item.height)) || height;

  const text = buildLineText(sortedItems);

  return {
    items: sortedItems,
    x,
    y,
    right,
    bottom,
    width,
    height,
    baseline: bottom,
    fontSize,
    text,
    column: -1,
  };
}

function buildLineText(items: PositionedItem[]): string {
  if (items.length === 0) {
    return '';
  }

  const parts: string[] = [];
  let lastRight = items[0].x;
  const avgCharWidth =
    average(
      items.map((item) => item.width / Math.max(item.text.length, 1))
    ) || 2;

  items.forEach((item) => {
    const trimmed = item.text.trim();
    if (!trimmed) {
      return;
    }

    if (parts.length > 0) {
      const gap = item.x - lastRight;
      if (gap > avgCharWidth * 1.5) {
        parts.push(' ');
      } else if (gap > avgCharWidth * 0.3 && !parts[parts.length - 1].endsWith(' ')) {
        parts.push(' ');
      }
    }

    parts.push(trimmed);
    lastRight = item.right;
  });

  return normaliseWhitespace(parts.join('')).trim();
}

function assignColumns(lines: TextLine[], pageWidth: number): ColumnGroup[] {
  if (lines.length === 0) {
    return [];
  }

  // 초기화
  lines.forEach((line) => {
    line.column = -1;
  });

  const narrowLines = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => line.width / pageWidth < 0.75);

  if (narrowLines.length === 0) {
    return [];
  }

  const centers = narrowLines.map(({ line }) => line.x + line.width / 2);
  const spread = Math.max(...centers) - Math.min(...centers);
  const shouldTryTwoColumns = spread > pageWidth * 0.25;
  let columns: ColumnGroup[] = [];

  if (shouldTryTwoColumns) {
    const assignments = kMeans1D(centers);

    if (assignments) {
      const clustersMap = new Map<number, TextLine[]>();
      assignments.forEach((clusterId, idx) => {
        const { line } = narrowLines[idx];
        const cluster = clustersMap.get(clusterId) ?? [];
        cluster.push(line);
        clustersMap.set(clusterId, cluster);
      });

      if (clustersMap.size === 2) {
        columns = [...clustersMap.entries()]
          .map(([clusterId, clusterLines]) => {
            const minX = Math.min(...clusterLines.map((l) => l.x));
            const maxX = Math.max(...clusterLines.map((l) => l.right));
            const center = average(clusterLines.map((l) => l.x + l.width / 2));
            return {
              id: clusterId,
              center,
              lines: clusterLines,
              minX,
              maxX,
            };
          })
          .sort((a, b) => a.center - b.center)
          .map((column, idx) => ({
            ...column,
            id: idx,
          }));

        const separation = Math.abs(columns[0].center - columns[1].center);
        const smallestClusterSize = Math.min(
          columns[0].lines.length,
          columns[1].lines.length
        );
        const clusterRatio = smallestClusterSize / narrowLines.length;

        if (separation < pageWidth * 0.2 || clusterRatio < 0.12) {
          columns = [];
        } else {
          columns.forEach((column) => {
            column.lines.forEach((line) => {
              line.column = column.id;
            });
          });
        }
      }
    }
  }

  if (columns.length === 0) {
    const singleColumnLines = narrowLines.map(({ line }) => line);
    singleColumnLines.forEach((line) => {
      line.column = 0;
    });
    const minX = Math.min(...singleColumnLines.map((l) => l.x));
    const maxX = Math.max(...singleColumnLines.map((l) => l.right));
    columns = [
      {
        id: 0,
        center: average(singleColumnLines.map((l) => l.x + l.width / 2)),
        lines: singleColumnLines,
        minX,
        maxX,
      },
    ];
  }

  // 컬럼 경계 갱신
  columns = columns.map((column) => {
    const columnLines = lines.filter((line) => line.column === column.id);
    if (columnLines.length === 0) {
      return {
        ...column,
        lines: [],
      };
    }
    const minX = Math.min(...columnLines.map((l) => l.x));
    const maxX = Math.max(...columnLines.map((l) => l.right));
    return {
      ...column,
      lines: columnLines,
      minX,
      maxX,
      center: average(columnLines.map((l) => l.x + l.width / 2)),
    };
  });

  // 컬럼 경계를 기반으로 라인 재평가
  lines.forEach((line) => {
    if (line.column === -1) {
      const overlaps = columns.map((column) => ({
        columnId: column.id,
        overlap: horizontalOverlapRatio(line, column),
      }));
      const best = overlaps.sort((a, b) => b.overlap - a.overlap)[0];
      if (best && best.overlap > 0.65) {
        line.column = best.columnId;
      }
      return;
    }

    const overlaps = columns.map((column) => horizontalOverlapRatio(line, column));
    const sorted = [...overlaps].sort((a, b) => b - a);
    if (sorted[0] < 0.45 || (sorted[0] - sorted[1] < 0.15 && sorted[1] > 0.3)) {
      line.column = -1;
    }
  });

  // 빈 컬럼 제거 및 정렬
  const populatedColumns = columns
    .map((column) => {
      const columnLines = lines.filter((line) => line.column === column.id);
      if (columnLines.length === 0) {
        return null;
      }
      const minX = Math.min(...columnLines.map((l) => l.x));
      const maxX = Math.max(...columnLines.map((l) => l.right));
      return {
        id: column.id,
        center: average(columnLines.map((l) => l.x + l.width / 2)),
        lines: columnLines,
        minX,
        maxX,
      };
    })
    .filter((column): column is ColumnGroup => column !== null)
    .sort((a, b) => a.center - b.center)
    .map((column, idx) => {
      column.lines.forEach((line) => {
        line.column = idx;
      });
      return {
        ...column,
        id: idx,
      };
    });

  return populatedColumns;
}

function kMeans1D(values: number[]): number[] | null {
  if (values.length < 2) {
    return null;
  }

  let c0 = Math.min(...values);
  let c1 = Math.max(...values);

  if (!Number.isFinite(c0) || !Number.isFinite(c1) || c0 === c1) {
    return null;
  }

  const assignments = new Array(values.length).fill(0);

  for (let iter = 0; iter < 6; iter += 1) {
    const sums = [0, 0];
    const counts = [0, 0];

    values.forEach((value, idx) => {
      const distanceToC0 = Math.abs(value - c0);
      const distanceToC1 = Math.abs(value - c1);
      const clusterId = distanceToC0 <= distanceToC1 ? 0 : 1;
      assignments[idx] = clusterId;
      sums[clusterId] += value;
      counts[clusterId] += 1;
    });

    if (counts[0] === 0 || counts[1] === 0) {
      return null;
    }

    const newC0 = sums[0] / counts[0];
    const newC1 = sums[1] / counts[1];

    if (Math.abs(newC0 - c0) < 1 && Math.abs(newC1 - c1) < 1) {
      break;
    }

    c0 = newC0;
    c1 = newC1;
  }

  return assignments;
}

function horizontalOverlapRatio(line: TextLine, column: ColumnGroup): number {
  const overlapWidth =
    Math.min(line.right, column.maxX) - Math.max(line.x, column.minX);
  if (overlapWidth <= 0 || line.width === 0) {
    return 0;
  }
  return overlapWidth / line.width;
}

function groupLinesIntoParagraphs(
  lines: TextLine[],
  avgLineHeight: number,
  columnId: number
): ParagraphBlock[] {
  if (lines.length === 0) {
    return [];
  }

  const paragraphs: ParagraphBlock[] = [];
  let currentLines: TextLine[] = [];
  const paragraphGap = avgLineHeight * 1.2;
  const sectionGap = avgLineHeight * 2.0;

  for (const line of lines) {
    if (!line.text) {
      continue;
    }

    if (currentLines.length === 0) {
      currentLines.push(line);
      continue;
    }

    const prev = currentLines[currentLines.length - 1];
    const verticalGap = line.y - prev.bottom;
    const horizontalShift = Math.abs(line.x - prev.x);
    const fontJump = line.fontSize > prev.fontSize * 1.35;
    const indent = line.x > prev.x + prev.fontSize * 0.75;
    const bullet = /^[•\-–\u2022]/.test(line.text);
    const columnChanged = line.column !== prev.column;

    const isSectionBreak = verticalGap > sectionGap || fontJump || columnChanged;
    const isParagraphBreak =
      verticalGap > paragraphGap ||
      indent ||
      bullet ||
      horizontalShift > prev.width * 0.35;

    if (isSectionBreak) {
      paragraphs.push(createParagraphBlock(currentLines, columnId));
      currentLines = [line];
      continue;
    }

    if (isParagraphBreak) {
      paragraphs.push(createParagraphBlock(currentLines, columnId));
      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.length > 0) {
    paragraphs.push(createParagraphBlock(currentLines, columnId));
  }

  return paragraphs;
}

function createParagraphBlock(lines: TextLine[], columnId: number): ParagraphBlock {
  const x = Math.min(...lines.map((line) => line.x));
  const y = Math.min(...lines.map((line) => line.y));
  const right = Math.max(...lines.map((line) => line.right));
  const bottom = Math.max(...lines.map((line) => line.bottom));
  const width = right - x;
  const height = bottom - y;
  const fontSize = average(lines.map((line) => line.fontSize)) || height / lines.length;

  const text = mergeLineTexts(lines).trim();

  return {
    lines,
    x,
    y,
    right,
    bottom,
    width,
    height,
    text,
    fontSize,
    column: columnId,
  };
}

function mergeLineTexts(lines: TextLine[]): string {
  if (lines.length === 0) {
    return '';
  }

  return lines.reduce((acc, line, index) => {
    if (index === 0) {
      return line.text;
    }

    const prev = lines[index - 1].text;
    if (shouldMergeWithoutSpace(prev)) {
      return `${acc.slice(0, -1)}${line.text.trimStart()}`;
    }

    return `${acc}\n${line.text}`;
  }, '');
}

function shouldMergeWithoutSpace(text: string): boolean {
  return /[A-Za-z]-$/.test(text);
}

function sortLinesTopToBottom(a: TextLine, b: TextLine): number {
  if (Math.abs(a.y - b.y) > 2) {
    return a.y - b.y;
  }
  return a.x - b.x;
}

function sortParagraphsForReading(
  paragraphs: ParagraphBlock[],
  avgLineHeight: number
): ParagraphBlock[] {
  return [...paragraphs].sort((a, b) => {
    const verticalGap = Math.abs(a.y - b.y);
    if (verticalGap > avgLineHeight * 0.75) {
      return a.y - b.y;
    }
    if (a.column !== b.column) {
      return a.column - b.column;
    }
    return a.y - b.y;
  });
}

function detectContentType(text: string): ContentType {
  const trimmedText = text.trim();

  const mathPatterns = [
    /\$.*\$/,
    /\\\(.*\\\)/,
    /\\\[.*\\\]/,
    /\\begin\{(equation|align|math)\}/,
    /[∫∑∏√±≤≥≠∞∈∉⊂⊃∪∩]/,
    /[α-ωΑ-Ω]/,
    /\^[{\w]|_[{\w]/,
    /\\frac|\\int|\\sum|\\prod|\\sqrt/,
  ];

  if (mathPatterns.some((pattern) => pattern.test(text))) {
    return 'MATH';
  }

  const tablePatterns = [
    /\|.*\|.*\|/,
    /\t.*\t.*\t/,
    /(^\s*Table\s+\d+)/i,
  ];

  if (tablePatterns.some((pattern) => pattern.test(text))) {
    return 'TABLE';
  }

  const imagePatterns = [
    /^Figure\s+\d+/i,
    /^Fig\.\s*\d+/i,
    /^그림\s+\d+/,
    /^Image\s+\d+/i,
  ];

  if (imagePatterns.some((pattern) => pattern.test(trimmedText))) {
    return 'IMAGE';
  }

  return 'TEXT';
}

function normaliseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ');
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function shouldDropBlock(block: TextBlock): boolean {
  const words = block.text.split(/\s+/).filter(Boolean);
  if (block.contentType !== 'TEXT') {
    return false;
  }

  if (words.length === 0) {
    return true;
  }

  if (words.length === 1 && block.height < (block.fontSize ?? 12) * 1.1) {
    return true;
  }

  return false;
}

async function extractImageBlocksFromOperators(
  page: PDFPageProxy,
  viewport: PageViewport,
  pageNum: number
): Promise<TextBlock[]> {
  if (typeof page.getOperatorList !== 'function') {
    return [];
  }

  const operatorList: PDFOperatorList = await page.getOperatorList();
  const baseMatrix = toMatrix(viewport.transform);
  const matrixStack: Matrix[] = [];
  let currentMatrix = cloneMatrix(baseMatrix);
  const images: TextBlock[] = [];

  const pushImage = (matrix: Matrix) => {
    const rect = rectFromMatrix(matrix);
    if (!rect) {
      return;
    }

    const area = rect.width * rect.height;
    if (!isFinite(area) || area < MIN_IMAGE_AREA) {
      return;
    }

    images.push({
      id: `image-${pageNum}-${images.length}`,
      text: '[Image]',
      pageNum,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      contentType: 'IMAGE',
    });
  };

  for (let i = 0; i < operatorList.fnArray.length; i += 1) {
    const fn = operatorList.fnArray[i];
    const args = operatorList.argsArray[i] || [];

    switch (fn) {
      case OPS.save:
        matrixStack.push(cloneMatrix(currentMatrix));
        break;
      case OPS.restore:
        currentMatrix = matrixStack.pop() ?? cloneMatrix(baseMatrix);
        break;
      case OPS.transform:
        currentMatrix = multiplyMatrices(currentMatrix, toMatrix(args));
        break;
      case OPS.paintImageMaskXObject:
      case OPS.paintImageXObject:
      case OPS.paintInlineImageXObject:
      case OPS.paintImageXObjectRepeat:
        pushImage(currentMatrix);
        break;
      default:
        break;
    }
  }

  return dedupeImageBlocks(images);
}

function detectImagesByCaptions(
  textBlocks: TextBlock[],
  viewport: PageViewport,
  pageNum: number
): TextBlock[] {
  const images: TextBlock[] = [];
  const captions = textBlocks.filter((block) =>
    /^(Figure|Fig\.?|Image|그림)\s+\d+/i.test(block.text.trim())
  );

  captions.forEach((caption, index) => {
    const x = Math.max(caption.x - caption.width * 0.25, 0);
    const width = Math.min(viewport.width * 0.8, caption.width * 2);
    const height = Math.min(viewport.height * 0.4, caption.height * 6);
    const y = Math.max(caption.y - height - caption.height * 0.5, 0);

    images.push({
      id: `image-${pageNum}-caption-${index}`,
      text: `[Image for: ${caption.text.slice(0, 40)}]`,
      pageNum,
      x,
      y,
      width,
      height,
      contentType: 'IMAGE',
    });
  });

  return images;
}

function dedupeImageBlocks(blocks: TextBlock[]): TextBlock[] {
  const unique: TextBlock[] = [];

  blocks.forEach((current) => {
    const hasDuplicate = unique.some((existing) => {
      const overlap = overlapRatio(existing, current);
      return overlap > 0.75;
    });

    if (!hasDuplicate) {
      unique.push(current);
    }
  });

  return unique;
}

function overlapRatio(a: TextBlock, b: TextBlock): number {
  const left = Math.max(a.x, b.x);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const top = Math.max(a.y, b.y);
  const bottom = Math.min(a.y + a.height, b.y + b.height);

  if (right <= left || bottom <= top) {
    return 0;
  }

  const intersection = (right - left) * (bottom - top);
  const minArea = Math.min(a.width * a.height, b.width * b.height);

  return intersection / (minArea || 1);
}

function isCoveredByText(image: TextBlock, textBlocks: TextBlock[]): boolean {
  return textBlocks.some((block) => {
    if (block.contentType === 'IMAGE') {
      return false;
    }
    return overlapRatio(image, block) > MAX_IMAGE_TEXT_OVERLAP_RATIO;
  });
}

function cloneMatrix(matrix: Matrix): Matrix {
  return [matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]];
}

function toMatrix(values: unknown): Matrix {
  const arr = Array.isArray(values)
    ? values
    : isArrayLike(values)
      ? Array.from(values as ArrayLike<number>)
      : undefined;

  if (!arr) {
    return [1, 0, 0, 1, 0, 0];
  }

  return [
    toFiniteNumber(arr[0], 1),
    toFiniteNumber(arr[1], 0),
    toFiniteNumber(arr[2], 0),
    toFiniteNumber(arr[3], 1),
    toFiniteNumber(arr[4], 0),
    toFiniteNumber(arr[5], 0),
  ];
}

function multiplyMatrices(a: Matrix, b: Matrix): Matrix {
  const [a0, a1, a2, a3, a4, a5] = a;
  const [b0, b1, b2, b3, b4, b5] = b;

  return [
    a0 * b0 + a2 * b1,
    a1 * b0 + a3 * b1,
    a0 * b2 + a2 * b3,
    a1 * b2 + a3 * b3,
    a0 * b4 + a2 * b5 + a4,
    a1 * b4 + a3 * b5 + a5,
  ];
}

function applyMatrix(matrix: Matrix, point: [number, number]): [number, number] {
  const [a, b, c, d, e, f] = matrix;
  const [x, y] = point;
  return [a * x + c * y + e, b * x + d * y + f];
}

function rectFromMatrix(matrix: Matrix): Rect | null {
  const points = UNIT_SQUARE.map((point) => applyMatrix(matrix, point));
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const width = maxX - minX;
  const height = maxY - minY;

  if (!isFinite(width) || !isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  return {
    x: minX,
    y: minY,
    width,
    height,
  };
}

function isArrayLike(value: unknown): value is ArrayLike<number> {
  return Boolean(
    value !== null &&
      typeof value === 'object' &&
      'length' in (value as { length: unknown })
  );
}

function toFiniteNumber(value: unknown, fallback: number): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}
