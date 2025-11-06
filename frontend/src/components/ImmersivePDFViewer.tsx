import { useState, useEffect, useMemo, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { PDFPageProxy } from 'pdfjs-dist/types/src/display/api';
import { useTranslationStore } from '../store/translationStore';
import { BlockTranslationOverlay } from './BlockTranslationOverlay';
import { extractTextBlocks, detectImageRegions } from '../utils/pdfParser';
import type { TextBlock } from '../types';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// PDF.js worker 설정
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export function ImmersivePDFViewer() {
  const {
    pdfFile,
    pdfMetadata,
    setCurrentPage,
    setTextBlocks,
    getTextBlocks,
    showTranslations,
    setShowTranslations,
    activeBlockId,
    setActiveBlockId,
  } = useTranslationStore();

  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pageScale, setPageScale] = useState<number>(1.0);
  const [pdfWidth, setPdfWidth] = useState<number>(800);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [debugMode, setDebugMode] = useState<boolean>(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [basePageSize, setBasePageSize] = useState<{ width: number; height: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<PDFPageProxy | null>(null);
  const pageViewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentPage(pageNumber);
  }, [pageNumber, setCurrentPage]);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        setPdfWidth(Math.min(containerWidth * 0.55, 900));
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const handlePageLoadSuccess = async (page: PDFPageProxy) => {
    pageRef.current = page;
    setIsExtracting(true);

    try {
      setExtractError(null);

      const existingBlocks = getTextBlocks(pageNumber);
      if (existingBlocks.length > 0) {
        setIsExtracting(false);
        if (!basePageSize) {
          const viewport = page.getViewport({ scale: 1 });
          setBasePageSize({ width: viewport.width, height: viewport.height });
        }
        return;
      }

      const blocks = await extractTextBlocks(page, pageNumber);
      const imageBlocks = await detectImageRegions(page, pageNumber, blocks);
      const allBlocks = [...blocks, ...imageBlocks];

      setTextBlocks(pageNumber, allBlocks);
      const viewport = page.getViewport({ scale: 1 });
      setBasePageSize({ width: viewport.width, height: viewport.height });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setExtractError(`텍스트 추출 실패: ${errorMsg}`);
    } finally {
      setIsExtracting(false);
    }
  };

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  const currentBlocks = getTextBlocks(pageNumber);
  const activeBlock = useMemo(
    () => currentBlocks.find((block) => block.id === activeBlockId) ?? null,
    [currentBlocks, activeBlockId]
  );

  const handleScrollToBlock = (block?: TextBlock | null) => {
    if (!pageViewportRef.current || !block) return;
    const scrollTarget = block.y * renderScale - 40;
    pageViewportRef.current.scrollTo({
      top: Math.max(scrollTarget, 0),
      behavior: 'smooth',
    });
  };

  const renderedWidth = useMemo(() => pdfWidth * pageScale, [pdfWidth, pageScale]);
  const renderScale = useMemo(() => {
    if (!basePageSize) {
      return pageScale;
    }
    return (pdfWidth * pageScale) / basePageSize.width;
  }, [basePageSize, pdfWidth, pageScale]);

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
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-5">
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-400">
              Paper Translate AI
            </span>
            <div className="mt-1 flex items-center gap-2 text-sm text-slate-200">
              <span className="font-medium">{pdfMetadata?.title || '제목 없는 문서'}</span>
              <span className="text-slate-500">•</span>
              <span>
                {pageNumber} / {numPages || '?'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
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
              <span>번역 패널</span>
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
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-8 py-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 shadow-[0_60px_120px_-60px_rgba(15,23,42,0.9)]">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40">
              <div
                ref={pageViewportRef}
                className="max-h-[80vh] overflow-auto p-6"
                onScroll={() => {
                  if (activeBlockId) {
                    setActiveBlockId(activeBlockId);
                  }
                }}
              >
                <div className="relative mx-auto" style={{ width: renderedWidth }}>
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
                      renderTextLayer
                      renderAnnotationLayer
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
                            left: `${block.x * renderScale}px`,
                            top: `${block.y * renderScale}px`,
                            width: `${block.width * renderScale}px`,
                            height: `${block.height * renderScale}px`,
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

                      {activeBlock && (
                        <div
                          style={{
                            position: 'absolute',
                            left: `${activeBlock.x * renderScale}px`,
                            top: `${activeBlock.y * renderScale}px`,
                            width: `${activeBlock.width * renderScale}px`,
                            height: `${activeBlock.height * renderScale}px`,
                            borderRadius: '12px',
                            boxShadow: '0 0 0 2px rgba(56,189,248,0.8)',
                            background: 'rgba(56,189,248,0.12)',
                            transition: 'all 0.2s ease',
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {showTranslations && (
            <aside className="flex max-h-[80vh] flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 shadow-[0_60px_120px_-60px_rgba(15,23,42,0.9)]">
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-100">
                    페이지 {pageNumber} 번역 카드
                  </h2>
                  <p className="text-xs text-slate-400">
                    감지된 블록 {currentBlocks.length}개
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleScrollToBlock(activeBlock ?? currentBlocks[0])}
                  disabled={!activeBlock && currentBlocks.length === 0}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 transition hover:border-sky-400 hover:text-sky-200 disabled:opacity-40"
                >
                  원문 위치로 이동
                </button>
              </div>
              <div className="flex-1 overflow-auto px-6 py-5">
                <div className="flex flex-col gap-5">
                  {currentBlocks.length === 0 && (
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-slate-300">
                      이 페이지에서 번역할 블록이 없습니다. 이미지만 있는 페이지일 수 있습니다.
                    </div>
                  )}

                  {currentBlocks.map((block) => (
                    <BlockTranslationOverlay
                      key={block.id}
                      block={block}
                      onScrollToBlock={handleScrollToBlock}
                    />
                  ))}
                </div>
              </div>
            </aside>
          )}
        </div>

        <div className="mx-auto max-w-7xl space-y-3 px-8">
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
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-xs text-emerald-200 shadow-inner">
              ✓ 페이지에서 {currentBlocks.length}개의 콘텐츠 블록을 감지했습니다. 상세 분석 로그는 브라우저 콘솔에서 확인할 수 있습니다.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
