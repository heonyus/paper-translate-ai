import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useTranslationStore } from '../store/translationStore';
import { BlockTranslationOverlay } from './BlockTranslationOverlay';
import { extractTextBlocks, detectImageRegions } from '../utils/pdfParser';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// PDF.js worker 설정
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export function ImmersivePDFViewer() {
  const { 
    pdfFile, 
    pdfMetadata, 
    setCurrentPage,
    textBlocks,
    setTextBlocks,
    getTextBlocks,
    showTranslations,
    setShowTranslations,
  } = useTranslationStore();
  
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pageScale, setPageScale] = useState<number>(1.0);
  const [pdfWidth, setPdfWidth] = useState<number>(800);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<any>(null);

  useEffect(() => {
    setCurrentPage(pageNumber);
  }, [pageNumber, setCurrentPage]);

  // 컨테이너 너비에 맞춰 PDF 너비 조정
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        setPdfWidth(Math.min(containerWidth - 40, 1200)); // 최대 1200px
      }
    };
    
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // 페이지가 로드되면 텍스트 블록 추출
  const handlePageLoadSuccess = async (page: any) => {
    pageRef.current = page;
    setIsExtracting(true);
    
    try {
      // 이미 추출된 블록이 있는지 확인
      const existingBlocks = getTextBlocks(pageNumber);
      if (existingBlocks.length > 0) {
        console.log(`Using cached blocks for page ${pageNumber}`);
        setIsExtracting(false);
        return;
      }

      // 텍스트 블록 추출
      const blocks = await extractTextBlocks(page, pageNumber);
      
      // 이미지 영역 감지
      const imageBlocks = await detectImageRegions(page, pageNumber);
      
      // 모든 블록 합치기
      const allBlocks = [...blocks, ...imageBlocks];
      
      console.log(`Extracted ${allBlocks.length} blocks from page ${pageNumber}`);
      setTextBlocks(pageNumber, allBlocks);
    } catch (error) {
      console.error('Error extracting text blocks:', error);
    } finally {
      setIsExtracting(false);
    }
  };

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    console.log(`PDF loaded with ${numPages} pages`);
  }

  // 현재 페이지의 블록 가져오기
  const currentBlocks = getTextBlocks(pageNumber);

  if (!pdfFile) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
        <p className="text-gray-500">PDF 파일을 선택해주세요</p>
      </div>
    );
  }

  return (
    <div className="w-full" ref={containerRef}>
      {/* 컨트롤 바 */}
      <div className="mb-4 flex justify-between items-center bg-gray-100 p-4 rounded-lg">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setPageNumber(page => Math.max(1, page - 1))}
            disabled={pageNumber <= 1}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-600"
          >
            이전
          </button>
          
          <p className="text-sm text-gray-700">
            {pageNumber} / {numPages || '?'}
            {pdfMetadata && <span className="ml-2">({pdfMetadata.title})</span>}
          </p>
          
          <button
            onClick={() => setPageNumber(page => Math.min(numPages, page + 1))}
            disabled={pageNumber >= numPages}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-600"
          >
            다음
          </button>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowTranslations(!showTranslations)}
            className={`px-4 py-2 rounded ${
              showTranslations
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
            }`}
          >
            {showTranslations ? '번역 숨기기' : '번역 보기'}
          </button>
          
          <select
            value={pageScale}
            onChange={(e) => setPageScale(parseFloat(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded"
          >
            <option value="0.75">75%</option>
            <option value="1.0">100%</option>
            <option value="1.25">125%</option>
            <option value="1.5">150%</option>
          </select>
        </div>
      </div>

      {/* PDF 뷰어 with 오버레이 */}
      <div className="relative border border-gray-300 rounded-lg overflow-auto bg-white">
        <div style={{ position: 'relative' }}>
          <Document
            file={pdfFile}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={<div className="p-8 text-center">PDF 로딩 중...</div>}
            error={<div className="p-8 text-center text-red-500">PDF 로딩 오류</div>}
          >
            <Page
              pageNumber={pageNumber}
              onLoadSuccess={handlePageLoadSuccess}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              width={pdfWidth}
              scale={pageScale}
            />
          </Document>

          {/* 번역 오버레이 */}
          {currentBlocks.length > 0 && (
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', pointerEvents: 'none' }}>
              {currentBlocks.map((block) => (
                showTranslations && (
                  <BlockTranslationOverlay
                    key={block.id}
                    block={block}
                    scale={pageScale}
                    autoTranslate={true}
                  />
                )
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 블록 정보 (디버깅용, 나중에 제거 가능) */}
      {currentBlocks.length > 0 && (
        <div className="mt-4 p-4 bg-gray-50 rounded text-xs text-gray-600">
          페이지에서 {currentBlocks.length}개의 텍스트 블록을 감지했습니다
        </div>
      )}
    </div>
  );
}

