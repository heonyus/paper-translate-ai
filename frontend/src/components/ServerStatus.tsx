import { useState, useEffect } from 'react';

export function ServerStatus() {
  const [backendStatus, setBackendStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [langGraphStatus, setLangGraphStatus] = useState<'checking' | 'ok' | 'error'>('checking');

  useEffect(() => {
    checkServers();
    const interval = setInterval(checkServers, 10000); // 10초마다 체크
    return () => clearInterval(interval);
  }, []);

  const checkServers = async () => {
    // 백엔드 체크
    try {
      const response = await fetch('/api/health', { method: 'GET' });
      setBackendStatus(response.ok ? 'ok' : 'error');
    } catch {
      setBackendStatus('error');
    }

    // LangGraph 체크 (백엔드를 통해 간접적으로)
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'test' }),
      });
      // 실패해도 연결은 된 것
      setLangGraphStatus(response.status !== 502 ? 'ok' : 'error');
    } catch {
      setLangGraphStatus('error');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'checking': return '⏳';
      case 'ok': return '✅';
      case 'error': return '❌';
      default: return '❓';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'checking': return '확인 중...';
      case 'ok': return '정상';
      case 'error': return '오류';
      default: return '알 수 없음';
    }
  };

  // 모두 정상이면 표시하지 않음
  if (backendStatus === 'ok' && langGraphStatus === 'ok') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border-2 border-yellow-400 rounded-lg shadow-lg p-4 z-50 max-w-sm">
      <h3 className="font-bold text-sm mb-2">⚠️ 서버 상태</h3>
      <div className="space-y-1 text-xs">
        <div className="flex items-center justify-between">
          <span>백엔드 (port 3000):</span>
          <span className="ml-2">
            {getStatusIcon(backendStatus)} {getStatusText(backendStatus)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>LangGraph (port 8001):</span>
          <span className="ml-2">
            {getStatusIcon(langGraphStatus)} {getStatusText(langGraphStatus)}
          </span>
        </div>
      </div>
      
      {(backendStatus === 'error' || langGraphStatus === 'error') && (
        <div className="mt-3 p-2 bg-yellow-50 rounded text-xs">
          <p className="font-semibold mb-1">서버를 시작하세요:</p>
          {backendStatus === 'error' && (
            <code className="block text-xs bg-gray-100 p-1 rounded mb-1">
              cd backend && npm run dev
            </code>
          )}
          {langGraphStatus === 'error' && (
            <code className="block text-xs bg-gray-100 p-1 rounded">
              cd langraph-agent && python -m uvicorn main:app --reload --port 8001
            </code>
          )}
        </div>
      )}
    </div>
  );
}

