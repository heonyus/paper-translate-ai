export type ContentType = 'TEXT' | 'MATH' | 'TABLE' | 'IMAGE';

export interface Translation {
  originalText: string;
  translatedText: string;
  contentType: ContentType;
  fromCache?: boolean;
}

export interface PDFMetadata {
  pdfHash: string;
  title: string;
  totalPages: number;
}

export interface TextChunk {
  text: string;
  pageNum: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextBlock {
  id: string;
  text: string;
  pageNum: number;
  x: number;
  y: number;
  width: number;
  height: number;
  contentType: ContentType;
  fontSize?: number;
}

export interface PDFTextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
  fontName?: string;
}

