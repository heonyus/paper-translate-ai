import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useTranslationStore } from '../store/translationStore';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// PDF.js worker를 로컬 번들에서 로드하도록 설정
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  onTextExtracted?: (text: string, pageNum: number) => void;
}

export function PDFViewer({ onTextExtracted }: PDFViewerProps) {
  const { pdfFile, pdfMetadata, setCurrentPage } = useTranslationStore();
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentPage(pageNumber);
  }, [pageNumber, setCurrentPage]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    console.log(`PDF loaded with ${numPages} pages`);
  }

  function onPageLoadSuccess(page: any) {
    // 텍스트 레이어에서 텍스트 추출
    page.getTextContent().then((textContent: any) => {
      const text = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      if (onTextExtracted && text) {
        onTextExtracted(text, pageNumber);
      }
    });
  }

  if (!pdfFile) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
        <p className="text-gray-500">No PDF file selected</p>
      </div>
    );
  }

  return (
    <div className="w-full" ref={containerRef}>
      <div className="mb-4 flex justify-between items-center bg-gray-100 p-4 rounded-lg">
        <button
          onClick={() => setPageNumber(page => Math.max(1, page - 1))}
          disabled={pageNumber <= 1}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        
        <p className="text-sm text-gray-700">
          Page {pageNumber} of {numPages || '?'}
          {pdfMetadata && <span className="ml-2">({pdfMetadata.title})</span>}
        </p>
        
        <button
          onClick={() => setPageNumber(page => Math.min(numPages, page + 1))}
          disabled={pageNumber >= numPages}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>

      <div className="border border-gray-300 rounded-lg overflow-auto bg-white">
        <Document
          file={pdfFile}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={<div className="p-8 text-center">Loading PDF...</div>}
          error={<div className="p-8 text-center text-red-500">Error loading PDF</div>}
        >
          <Page
            pageNumber={pageNumber}
            onLoadSuccess={onPageLoadSuccess}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            width={800}
          />
        </Document>
      </div>
    </div>
  );
}

