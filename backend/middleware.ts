import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // API 라우트에 대한 CORS 처리
  if (request.nextUrl.pathname.startsWith('/api')) {
    const origin = request.headers.get('origin');
    const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
    
    // 허용된 origin인지 확인 (개발 환경에서는 모든 origin 허용)
    const allowedOrigin = process.env.NODE_ENV === 'production' 
      ? (origin === frontendOrigin ? origin : frontendOrigin)
      : (origin || frontendOrigin);
    
    // OPTIONS 요청 (preflight) 처리
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': allowedOrigin,
          'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, X-Requested-With',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // 실제 요청에 대한 CORS 헤더 추가는 route handler에서 처리
    const response = NextResponse.next();
    
    // 에러 발생 시에도 CORS 헤더가 포함되도록 응답 헤더 설정
    response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
    
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};

