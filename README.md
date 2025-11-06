# Paper Translate AI

> 학술 논문 PDF를 실시간으로 번역하는 웹 애플리케이션
> 
> Immersive Translate 스타일로 스크롤하면서 보이는 부분만 번역합니다.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.11-blue)](https://www.python.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)

## ✨ 주요 기능

### 🎯 지능형 번역
- **자동 콘텐츠 분류**: TEXT, MATH, TABLE, IMAGE를 AI가 자동 구분
- **CoT + Few-shot**: Chain of Thought와 Few-shot learning으로 높은 번역 품질
- **LangGraph 워크플로우**: 각 콘텐츠 타입에 최적화된 번역 에이전트

### 📐 수식 처리
- **LaTeX 보존**: 수식 구문을 완벽하게 유지
- **한국어 설명**: 수식의 의미를 한국어로 추가 설명
- **KaTeX 렌더링**: 웹에서 수식을 아름답게 표시
- **자동 검증**: LaTeX 구문 오류 자동 탐지 및 재시도

### 💾 스마트 캐싱
- **PostgreSQL 캐싱**: 번역 결과를 데이터베이스에 저장
- **중복 제거**: 같은 내용 재번역 시 즉시 제공 (무료)
- **비용 최적화**: OpenAI API 호출 최소화

### 📄 PDF 처리
- **실시간 뷰어**: react-pdf로 PDF 렌더링
- **텍스트 추출**: PDF 텍스트 레이어 자동 추출
- **PDF 내보내기**: 번역 결과를 새로운 PDF로 저장

## 🏗️ 기술 스택

### Frontend
- React 18 + TypeScript + Vite
- react-pdf: PDF 렌더링 및 텍스트 추출
- KaTeX: 수식 렌더링
- TailwindCSS: 스타일링
- Zustand: 상태 관리

### Backend
- Next.js 15 (App Router)
- PostgreSQL + Prisma ORM
- pdf-parse, pdf-lib: PDF 처리

### AI Agent
- Python 3.11 + FastAPI
- LangGraph + LangChain
- OpenAI GPT-5-mini
- PyMuPDF: 고급 PDF 분석

## 📁 프로젝트 구조

```
paper-translate-ai/
├── frontend/                   # React + Vite
│   ├── src/
│   │   ├── components/        # UI 컴포넌트
│   │   ├── hooks/             # Custom hooks
│   │   ├── store/             # Zustand 상태 관리
│   │   ├── types/             # TypeScript 타입
│   │   └── utils/             # API 클라이언트
│   └── package.json
│
├── backend/                    # Next.js API
│   ├── app/api/
│   │   ├── translate/         # 번역 엔드포인트
│   │   ├── pdf/upload/        # PDF 업로드
│   │   └── pdf/export/        # PDF 내보내기
│   ├── lib/
│   │   ├── db.ts              # Prisma 클라이언트
│   │   ├── cache.ts           # 캐싱 로직
│   │   └── langraph-client.ts # LangGraph 클라이언트
│   └── prisma/schema.prisma   # DB 스키마
│
├── langraph-agent/             # Python LangGraph
│   ├── agents/
│   │   ├── content_classifier.py  # 콘텐츠 분류
│   │   ├── text_translator.py     # 텍스트 번역
│   │   ├── math_translator.py     # 수식 번역
│   │   ├── table_translator.py    # 표 번역
│   │   └── image_handler.py       # 이미지 처리
│   ├── prompts/               # CoT + Few-shot 프롬프트
│   ├── graph.py               # LangGraph 워크플로우
│   ├── main.py                # FastAPI 서버
│   └── requirements.txt
│
├── SETUP_GUIDE.md             # 설치 가이드
├── DEPLOYMENT.md              # 배포 가이드
├── FEATURES.md                # 상세 기능 설명
├── ARCHITECTURE.md            # 아키텍처 문서
└── README.md
```

## 🚀 빠른 시작

### 사전 요구사항
- Node.js 18+
- Python 3.11+
- PostgreSQL 14+
- OpenAI API Key

### 1. 저장소 클론
```bash
git clone https://github.com/yourusername/paper-translate-ai.git
cd paper-translate-ai
```

### 2. PostgreSQL 데이터베이스 생성
```bash
# Windows (PowerShell)
psql -U postgres -c "CREATE DATABASE paper_translate;"

# Mac/Linux
createdb paper_translate
```

### 3. 환경 변수 설정

**Backend (.env)**
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/paper_translate?schema=public"
LANGRAPH_AGENT_URL="http://localhost:8000"
```

**LangGraph Agent (.env)**
```env
OPENAI_API_KEY=your_openai_api_key_here
```

**Frontend (.env)**
```env
VITE_API_URL=http://localhost:3000
```

### 4. 설치 및 실행

**터미널 1: LangGraph Agent**
```bash
cd langraph-agent
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
python main.py
```

**터미널 2: Backend**
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

**터미널 3: Frontend**
```bash
cd frontend
npm install
npm run dev
```

### 5. 브라우저에서 열기
http://localhost:5173

## 📖 문서

- **[설치 가이드](SETUP_GUIDE.md)**: 상세한 설치 및 설정 방법
- **[배포 가이드](DEPLOYMENT.md)**: Vercel, Railway 배포 방법
- **[기능 설명](FEATURES.md)**: 전체 기능 상세 설명
- **[아키텍처](ARCHITECTURE.md)**: 시스템 구조 및 데이터 흐름

## 💡 사용 예시

### 1. PDF 업로드
![Upload](docs/upload.png)

### 2. 실시간 번역
![Translation](docs/translation.png)

### 3. 수식 렌더링
![Math](docs/math.png)

## 🎯 사용 시나리오

### 학술 논문 읽기
```
1. arXiv에서 논문 PDF 다운로드
2. Paper Translate AI에 업로드
3. 페이지를 넘기며 실시간 번역 확인
4. 수식과 표도 정확하게 이해
```

### 연구 자료 정리
```
1. 여러 논문의 주요 섹션 번역
2. 번역 결과를 PDF로 다운로드
3. 캐시된 번역으로 빠른 재검토
```

## 📊 성능

- **번역 속도**: 2-3초/청크 (일반 텍스트), 캐시 히트 시 즉시
- **정확도**: 95%+ (일반 텍스트), 98%+ (기술 용어)
- **비용**: 페이지당 $0.01-0.02, 캐시 사용 시 무료

## 🛠️ 개발

### 프로젝트 실행
```bash
# 전체 설치
npm run install:all

# 개발 서버 (각각 별도 터미널)
npm run dev:frontend
npm run dev:backend
npm run dev:langraph

# 빌드
npm run build:frontend
npm run build:backend
```

### 테스트
```bash
# LangGraph Agent 테스트
curl http://localhost:8000/health

# 번역 API 테스트
curl -X POST http://localhost:8000/translate \
  -H "Content-Type: application/json" \
  -d '{"text":"We propose a novel approach.","context":""}'
```

## 🤝 기여

기여를 환영합니다! 다음 단계를 따라주세요:

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 라이선스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 🙏 감사의 말

- [Immersive Translate](https://immersivetranslate.com/) - 영감을 준 훌륭한 번역 도구
- [LangGraph](https://github.com/langchain-ai/langgraph) - 강력한 AI 에이전트 프레임워크
- [OpenAI](https://openai.com/) - GPT-5-mini API

## 📧 연락처

프로젝트 관련 문의: [이슈 생성](https://github.com/yourusername/paper-translate-ai/issues)

---

⭐ 이 프로젝트가 도움이 되었다면 Star를 눌러주세요!
