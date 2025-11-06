import { useState } from 'react';
import { PDFUpload } from './components/PDFUpload';
import { ImmersivePDFViewer } from './components/ImmersivePDFViewer';
import { ServerStatus } from './components/ServerStatus';
import { useTranslationStore } from './store/translationStore';
import { exportPDF } from './utils/api';

function App() {
  const { pdfFile, pdfMetadata, reset } = useTranslationStore();
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    if (!pdfMetadata) return;

    setIsExporting(true);
    try {
      const blob = await exportPDF(pdfMetadata.pdfHash);
      
      // 다운로드 트리거
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${pdfMetadata.title}_translated.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Paper Translate AI</h1>
            {pdfFile && (
              <div className="flex space-x-2">
                <button
                  onClick={handleExportPDF}
                  disabled={isExporting}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300"
                >
                  {isExporting ? 'Exporting...' : 'Export PDF'}
                </button>
                <button
                  onClick={reset}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Reset
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {!pdfFile ? (
          <PDFUpload />
        ) : (
          <div className="w-full">
            <ImmersivePDFViewer />
          </div>
        )}
      </main>

      <footer className="mt-12 py-6 bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-600">
          <p>Paper Translate AI - Academic Paper Translation with LangGraph</p>
        </div>
      </footer>

      {/* 서버 상태 표시 */}
      <ServerStatus />
    </div>
  );
}

export default App;
