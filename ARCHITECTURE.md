# Paper Translate AI - 아키텍처

## 시스템 구조

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              React Frontend (Vite)                     │  │
│  │  - PDF Viewer (react-pdf)                             │  │
│  │  - Translation Overlay                                 │  │
│  │  - Math Renderer (KaTeX)                              │  │
│  │  - State Management (Zustand)                         │  │
│  └───────────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP/REST API
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                  Next.js Backend (API Routes)                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  /api/translate      - 텍스트 번역                      │  │
│  │  /api/pdf/upload     - PDF 업로드 & 파싱               │  │
│  │  /api/pdf/export     - 번역 PDF 생성                   │  │
│  │                                                         │  │
│  │  Cache Layer (PostgreSQL via Prisma)                  │  │
│  │  - 번역 캐시 확인                                       │  │
│  │  - 캐시 미스 시 LangGraph 호출                         │  │
│  └───────────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP/REST API
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Python LangGraph Agent (FastAPI)                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  LangGraph Workflow                    │  │
│  │                                                         │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  [Content Classifier]                            │  │  │
│  │  │  - 휴리스틱 패턴 매칭                             │  │  │
│  │  │  - GPT-4o-mini 분류                              │  │  │
│  │  └──────────┬──────────────────────────────────────┘  │  │
│  │             │                                          │  │
│  │  ┌──────────▼──────────────────────────────────────┐  │  │
│  │  │         Conditional Routing                      │  │  │
│  │  └──┬───────┬───────┬───────┬──────────────────────┘  │  │
│  │     │       │       │       │                          │  │
│  │  ┌──▼───┐┌─▼────┐┌─▼────┐┌─▼────┐                   │  │
│  │  │ Text ││ Math ││Table ││Image │                   │  │
│  │  │Trans.││Trans.││Trans.││Handle│                   │  │
│  │  └──────┘└──────┘└──────┘└──────┘                   │  │
│  │                                                         │  │
│  │  각 에이전트는 CoT + Few-shot 프롬프트 사용            │  │
│  └───────────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────────┘
                        │ OpenAI API
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                      OpenAI GPT-5-mini                       │
│  - 텍스트 번역                                               │
│  - 콘텐츠 분류                                               │
│  - 수식 번역 및 설명                                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      PostgreSQL Database                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  pdf_metadata                                          │  │
│  │  - pdf_hash, title, total_pages                       │  │
│  │                                                         │  │
│  │  translations                                          │  │
│  │  - content_hash, original_text, translated_text       │  │
│  │  - content_type, pdf_hash, page_num                   │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 데이터 흐름

### 1. PDF 업로드
```
User → Frontend → Backend /api/pdf/upload
                 ↓
           pdf-parse (텍스트 추출)
                 ↓
           SHA-256 (PDF 해시)
                 ↓
           PostgreSQL (메타데이터 저장)
                 ↓
           Frontend (PDF 렌더링 시작)
```

### 2. 번역 요청
```
Frontend (텍스트 추출) → Backend /api/translate
                        ↓
                  content_hash 생성
                        ↓
                  PostgreSQL 캐시 확인
                  ├─ Hit → 즉시 반환
                  └─ Miss ↓
                     LangGraph Agent /translate
                        ↓
                  Content Classifier
                        ↓
                  적절한 Translator 라우팅
                        ↓
                  GPT-4o-mini (번역)
                        ↓
                  Backend (캐싱)
                        ↓
                  Frontend (표시)
```

### 3. PDF 내보내기
```
Frontend → Backend /api/pdf/export
          ↓
     PostgreSQL (모든 번역 조회)
          ↓
     pdf-lib (새 PDF 생성)
          ↓
     Frontend (다운로드)
```

## 컴포넌트 상세

### Frontend (React + Vite)

#### 주요 컴포넌트
```typescript
App.tsx                    - 메인 컴포넌트
├── PDFUpload.tsx         - 파일 업로드
├── PDFViewer.tsx         - PDF 렌더링 (react-pdf)
├── TranslationOverlay.tsx - 번역 표시
└── MathRenderer.tsx      - 수식 렌더링 (KaTeX)

Hooks
├── useTranslation.ts     - 번역 API 호출
└── useTranslationStore.ts - 상태 관리 (Zustand)

Utils
└── api.ts                - API 클라이언트
```

#### 상태 관리
```typescript
interface TranslationStore {
  pdfFile: File | null;
  pdfMetadata: PDFMetadata | null;
  translations: Map<string, Translation>;
  currentPage: number;
  isTranslating: boolean;
}
```

### Backend (Next.js API Routes)

#### API 엔드포인트
```typescript
POST /api/translate
Request: { text, pdfHash?, pageNum?, context? }
Response: { translatedText, contentType, fromCache }

POST /api/pdf/upload
Request: FormData (file)
Response: { pdfHash, title, totalPages }

POST /api/pdf/export
Request: { pdfHash }
Response: PDF Blob
```

#### 캐싱 로직
```typescript
1. generateContentHash(text) → SHA-256
2. getCachedTranslation(hash) → DB 조회
3. if (cached) return cached;
4. else {
     result = await langGraphClient.translate(text);
     cacheTranslation(result);
     return result;
   }
```

### LangGraph Agent (Python + FastAPI)

#### 에이전트 구조
```python
class ContentClassifier:
    - 휴리스틱 패턴 매칭
    - GPT-5-mini 분류
    - Returns: 'TEXT' | 'MATH' | 'TABLE' | 'IMAGE'

class TextTranslator:
    - CoT + Few-shot 프롬프트
    - GPT-5-mini 번역
    - Temperature: 0.3

class MathTranslator:
    - LaTeX 보존
    - 한국어 설명 추가
    - LaTeX 검증 (균형 체크)
    - Temperature: 0.1

class TableTranslator:
    - 표 구조 유지
    - 헤더/셀 번역
    - 구조 검증

class ImageHandler:
    - 캡션 번역
    - Figure/Table 키워드 유지
```

#### LangGraph 워크플로우
```python
StateGraph(TranslationState)
├── classify_node
├── translate_text_node
├── translate_math_node
├── translate_table_node
└── handle_image_node

Conditional Routing by content_type
```

## 데이터베이스 스키마

### pdf_metadata
```sql
CREATE TABLE pdf_metadata (
  id TEXT PRIMARY KEY,
  pdf_hash TEXT UNIQUE,
  title TEXT,
  total_pages INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### translations
```sql
CREATE TABLE translations (
  id TEXT PRIMARY KEY,
  pdf_hash TEXT REFERENCES pdf_metadata(pdf_hash),
  page_num INTEGER,
  content_hash TEXT UNIQUE,
  original_text TEXT,
  translated_text TEXT,
  content_type ENUM('TEXT', 'MATH', 'TABLE', 'IMAGE'),
  created_at TIMESTAMP,
  INDEX (pdf_hash, page_num),
  INDEX (content_hash)
);
```

## 보안 고려사항

### 1. API 키 보호
- 환경 변수로 관리 (.env 파일)
- Git에 커밋하지 않음 (.gitignore)
- 프로덕션: Vercel/Railway 시크릿

### 2. CORS 설정
- Backend: 허용된 도메인만 접근
- LangGraph: Backend에서만 호출

### 3. Rate Limiting
- LangGraph: slowapi로 제한
- Backend: Next.js middleware

### 4. 입력 검증
- PDF 파일 타입 검증
- 텍스트 길이 제한
- SQL Injection 방지 (Prisma ORM)

## 확장성

### 수평 확장
- Frontend: Vercel Edge Network
- Backend: Vercel Serverless Functions
- LangGraph: Railway/Render 인스턴스 증설

### 수직 확장
- PostgreSQL: 더 큰 인스턴스
- LangGraph: 더 많은 CPU/메모리

### 캐싱 전략
- L1: Frontend (Zustand)
- L2: Backend (PostgreSQL)
- L3: CDN (정적 파일)

## 모니터링

### 로그
- Frontend: console.log → Vercel Analytics
- Backend: Next.js 로그
- LangGraph: uvicorn 로그

### 메트릭
- API 응답 시간
- 캐시 히트율
- OpenAI API 사용량
- 에러율

### 알림
- Vercel: 빌드/배포 실패
- Railway: 서비스 다운
- OpenAI: API 할당량 초과

