// 개발 환경에서는 Vite 프록시를 사용 (CORS 우회)
// 프로덕션에서는 VITE_API_URL 환경 변수 사용
const API_URL = import.meta.env.VITE_API_URL || '';

export interface TranslationRequest {
  text: string;
  pdfHash?: string;
  pageNum?: number;
  context?: string;
}

export interface TranslationResponse {
  translatedText: string;
  contentType: 'TEXT' | 'MATH' | 'TABLE' | 'IMAGE';
  fromCache?: boolean;
  error?: string;
}

export interface PDFUploadResponse {
  pdfHash: string;
  title: string;
  totalPages: number;
  textLength: number;
}

export async function translateText(request: TranslationRequest): Promise<TranslationResponse> {
  const response = await fetch(`${API_URL}/api/translate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Translation failed: ${response.statusText}`);
  }

  return response.json();
}

export async function uploadPDF(file: File): Promise<PDFUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/api/pdf/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`PDF upload failed: ${response.statusText}`);
  }

  return response.json();
}

export async function exportPDF(pdfHash: string): Promise<Blob> {
  const response = await fetch(`${API_URL}/api/pdf/export`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pdfHash }),
  });

  if (!response.ok) {
    throw new Error(`PDF export failed: ${response.statusText}`);
  }

  return response.blob();
}

