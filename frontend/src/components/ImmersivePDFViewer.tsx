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
  const [debugMode, setDebugMode] = useState<boolean>(false);
  const [extractError, setExtractError] = useState<string | null>(null);
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
      setExtractError(null);
      
      // 이미 추출된 블록이 있는지 확인
      const existingBlocks = getTextBlocks(pageNumber);
      if (existingBlocks.length > 0) {
        console.log(`Using cached blocks for page ${pageNumber}`);
        setIsExtracting(false);
        return;
      }

      // 텍스트 블록 추출
      console.log(`[ImmersivePDF] Starting text extraction for page ${pageNumber}`);
      const blocks = await extractTextBlocks(page, pageNumber);
      console.log(`[ImmersivePDF] Extracted ${blocks.length} text blocks`);
      
      // 이미지 영역 감지 (텍스트 블록 정보 활용)
      const imageBlocks = await detectImageRegions(page, pageNumber, blocks);
      console.log(`[ImmersivePDF] Detected ${imageBlocks.length} image regions`);
      
      // 모든 블록 합치기
      const allBlocks = [...blocks, ...imageBlocks];
      
      console.log(`[ImmersivePDF] Total ${allBlocks.length} blocks for page ${pageNumber}`);
      if (allBlocks.length > 0) {
        console.log(`[ImmersivePDF] First block:`, allBlocks[0]);
      }
      setTextBlocks(pageNumber, allBlocks);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error extracting text blocks:', error);
      setExtractError(`텍스트 추출 실패: ${errorMsg}`);
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
      <div className="flex min-h-[22rem] flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-slate-900/40 px-8 py-16 text-center text-slate-300 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.8)]">
        <p className="text-lg font-semibold text-slate-100">PDF 파일을 선택해주세요</p>
        <p className="mt-3 max-w-md text-sm text-slate-400">
          학술 논문을 업로드하면 페이지 구조를 분석하고 문단‧표‧수식을 자동으로 번역합니다.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen w-full overflow-hidden bg-slate-950 text-slate-100"
    >
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-400">
              Paper Translate AI
            </span>
            <div className="mt-1 flex items-center gap-2 text-sm text-slate-200">
              <span className="font-medium">
                {pdfMetadata?.title || '제목 없는 문서'}
              </span>
              <span className="text-slate-500">•</span>
              <span>
                {pageNumber} / {numPages || '?'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPageNumber((page) => Math.max(1, page - 1))}
              disabled={pageNumber <= 1}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-sky-400 hover:text-sky-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              이전
            </button>
            <button
              onClick={() => setPageNumber((page) => Math.min(numPages, page + 1))}
              disabled={pageNumber >= numPages}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-sky-400 hover:text-sky-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              다음
            </button>
            <div className="ml-4 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-200">
              <span>번역</span>
              <button
                onClick={() => setShowTranslations(!showTranslations)}
                className={`rounded-full px-3 py-1 transition ${
                  showTranslations
                    ? 'bg-sky-500/80 text-slate-900 hover:bg-sky-400'
                    : 'bg-white/10 text-slate-200 hover:bg-white/20'
                }`}
              >
                {showTranslations ? 'ON' : 'OFF'}
              </button>
            </div>
            <button
              onClick={() => setDebugMode(!debugMode)}
              className={`rounded-full border border-white/10 px-4 py-2 text-xs font-medium transition ${
                debugMode
                  ? 'bg-amber-400/90 text-slate-900 hover:bg-amber-300'
                  : 'bg-white/5 text-slate-200 hover:bg-white/10'
              }`}
            >
              {debugMode ? '디버그 ON' : '디버그 OFF'}
            </button>
            <select
              value={pageScale}
              onChange={(e) => setPageScale(parseFloat(e.target.value))}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 outline-none transition hover:border-sky-400"
            >
              <option value="0.75">75%</option>
              <option value="1.0">100%</option>
              <option value="1.25">125%</option>
              <option value="1.5">150%</option>
            </select>
          </div>
        </div>
      </header>

      <main className="pb-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-[0_60px_120px_-60px_rgba(15,23,42,0.9)]">
            <div className="relative mx-auto overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40 p-6">
              <div style={{ position: 'relative' }}>
                <Document
                  file={pdfFile}
                  onLoadSuccess={onDocumentLoadSuccess}
                  loading={
                    <div className="flex h-[480px] items-center justify-center text-slate-300">
                      PDF 로딩 중...
                    </div>
                  }
                  error={
                    <div className="flex h-[480px] items-center justify-center text-red-400">
                      PDF 로딩 오류
                    </div>
                  }
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

                {currentBlocks.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      pointerEvents: 'none',
                    }}
                  >
                    {debugMode &&
                      currentBlocks.map((block) => (
                        <div
                          key={`debug-${block.id}`}
                          style={{
                            position: 'absolute',
                            left: `${block.x * pageScale}px`,
                            top: `${block.y * pageScale}px`,
                            width: `${block.width * pageScale}px`,
                            height: `${block.height * pageScale}px`,
                            border: '1.5px dashed rgba(56, 189, 248, 0.8)',
                            backgroundColor: 'rgba(56, 189, 248, 0.08)',
                            color: '#38bdf8',
                            fontSize: '10px',
                            padding: '4px',
                          }}
                          title={`${block.contentType}: ${block.text.substring(0, 60)}`}
                        >
                          {block.contentType}
                        </div>
                      ))}

                    {showTranslations &&
                      currentBlocks.map((block) => (
                        <BlockTranslationOverlay
                          key={block.id}
                          block={block}
                          scale={pageScale}
                          autoTranslate={true}
                        />
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {isExtracting && (
              <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 px-5 py-4 text-sm text-sky-200 shadow-inner">
                <div className="flex items-center gap-3">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
                  <span>텍스트 블록을 추출하는 중입니다...</span>
                </div>
              </div>
            )}

            {extractError && (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-200 shadow-inner">
                ❌ {extractError}
              </div>
            )}

            {!isExtracting && !extractError && currentBlocks.length > 0 && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-xs text-emerald-200 shadow-inner md:col-span-2">
                ✓ 페이지에서 {currentBlocks.length}개의 콘텐츠 블록을 감지했습니다.
                <span className="ml-2 text-emerald-300/70">
                  상세 분석 로그는 브라우저 콘솔에서 확인할 수 있습니다.
                </span>
              </div>
            )}

            {!isExtracting && !extractError && currentBlocks.length === 0 && (
              <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-4 text-sm text-amber-100 shadow-inner md:col-span-2">
                ⚠️ 이 페이지에서는 텍스트 블록을 찾지 못했습니다. 이미지 또는 도표 전용 페이지일 수 있습니다.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
