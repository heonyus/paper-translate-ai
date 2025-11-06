# Paper Translate AI - Deployment Guide

## Vercel 배포 (Frontend + Backend)

### 1. Vercel 프로젝트 생성

```bash
# Vercel CLI 설치
npm i -g vercel

# 로그인
vercel login

# 프로젝트 초기화
vercel
```

### 2. 환경 변수 설정

Vercel 대시보드에서 다음 환경 변수 추가:

```
DATABASE_URL=postgresql://user:password@host:5432/paper_translate
LANGRAPH_AGENT_URL=https://your-langraph-agent.railway.app
```

### 3. PostgreSQL 설정

**옵션 1: Vercel Postgres**
```bash
# Vercel 대시보드에서 Postgres 추가
# 자동으로 DATABASE_URL 생성됨
```

**옵션 2: Supabase**
1. https://supabase.com 에서 프로젝트 생성
2. Database URL 복사하여 Vercel 환경 변수에 추가

### 4. Prisma Migration 실행

```bash
cd backend
npx prisma migrate deploy
```

### 5. 배포

```bash
vercel --prod
```

## Railway 배포 (LangGraph Agent)

### 1. Railway 프로젝트 생성

1. https://railway.app 접속
2. "New Project" 클릭
3. "Deploy from GitHub repo" 선택
4. 저장소 연결

### 2. 환경 변수 설정

Railway 대시보드에서:

```
OPENAI_API_KEY=your_openai_api_key
PORT=8000
```

### 3. Dockerfile 빌드 설정

Railway가 자동으로 `langraph-agent/Dockerfile`을 감지합니다.

**Root Path 설정:**
- Settings > Build & Deploy
- Root Directory: `langraph-agent`

### 4. 도메인 생성

- Settings > Networking
- Generate Domain 클릭
- 생성된 URL을 Vercel의 `LANGRAPH_AGENT_URL`에 추가

## 대안: Render 배포 (LangGraph Agent)

### 1. Render 프로젝트 생성

1. https://render.com 접속
2. "New +" > "Web Service"
3. GitHub 저장소 연결

### 2. 설정

```
Name: paper-translate-langraph
Environment: Docker
Region: Oregon (US West)
Branch: main
Root Directory: langraph-agent
```

### 3. 환경 변수

```
OPENAI_API_KEY=your_openai_api_key
PORT=8000
```

### 4. 배포

"Create Web Service" 클릭

## 배포 확인

### 1. LangGraph Agent 확인
```bash
curl https://your-langraph-agent.railway.app/health
```

### 2. Backend API 확인
```bash
curl https://your-backend.vercel.app/api/health
```

### 3. Frontend 확인
브라우저에서 https://your-frontend.vercel.app 접속

## 보안 설정

### 1. CORS 설정

`backend/next.config.ts`:
```typescript
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://your-frontend.vercel.app' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
        ],
      },
    ];
  },
};
```

### 2. API Rate Limiting

`langraph-agent/main.py`에 rate limiting 추가:
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.post("/translate")
@limiter.limit("10/minute")
async def translate(request: Request, ...):
    ...
```

## 모니터링

### 1. Vercel Analytics
Vercel 대시보드에서 Analytics 활성화

### 2. Railway Metrics
Railway 대시보드에서 CPU/Memory 사용량 모니터링

### 3. OpenAI Usage
https://platform.openai.com/usage 에서 API 사용량 확인

## 비용 예상

### 개인 사용 (월 ~100 페이지 번역)
- Vercel: Free tier 충분
- Railway: $5/month
- Supabase: Free tier 충분
- OpenAI GPT-5-mini: ~$2-5/month

### 중간 사용 (월 ~1000 페이지)
- Vercel: Free tier 또는 Pro $20/month
- Railway: $20/month
- Supabase: Free tier 또는 Pro $25/month
- OpenAI: ~$20-50/month

## 트러블슈팅

### 배포 실패
```bash
# 로그 확인
vercel logs
railway logs

# 로컬에서 빌드 테스트
npm run build
docker build -t langraph-agent ./langraph-agent
```

### Database Connection 오류
- DATABASE_URL 형식 확인
- SSL 모드 추가: `?sslmode=require`
- 방화벽 설정 확인

### LangGraph Agent Timeout
- Railway/Render에서 더 큰 인스턴스 사용
- OpenAI API timeout 설정 조정

