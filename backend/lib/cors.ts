import { NextResponse } from 'next/server';

const defaultOrigin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';

const baseHeaders = {
  'Access-Control-Allow-Origin': defaultOrigin,
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, X-Requested-With',
  'Access-Control-Allow-Credentials': 'true',
} as const;

export function addCorsHeaders<T extends NextResponse>(response: T): T {
  Object.entries(baseHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export function preflightResponse() {
  return addCorsHeaders(new NextResponse(null, { status: 204 }));
}

