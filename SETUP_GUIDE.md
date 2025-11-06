# Paper Translate AI - Setup Guide

이 가이드는 로컬 개발 환경 설정 및 테스트 방법을 안내합니다.

## 사전 요구사항

### 필수 소프트웨어
- Node.js 18+ (https://nodejs.org/)
- Python 3.11+ (https://www.python.org/)
- PostgreSQL 14+ (https://www.postgresql.org/)
- npm 또는 yarn

### API 키
- OpenAI API Key (https://platform.openai.com/api-keys)

## 1단계: PostgreSQL 데이터베이스 설정

### Windows

#### 옵션 1: PostgreSQL 설치 및 설정 (권장)

1. **PostgreSQL 다운로드 및 설치**
   - https://www.postgresql.org/download/windows/ 접속
   - 또는 https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
   - 최신 버전 다운로드 (14.x 이상)
   - 설치 시 비밀번호 설정 (꼭 기억하세요!)
   - 기본 포트 5432 사용

2. **환경 변수 PATH 추가**
   ```powershell
   # PostgreSQL bin 폴더를 PATH에 추가
   # 기본 설치 경로: C:\Program Files\PostgreSQL\16\bin
   
   # 시스템 환경 변수에 추가하거나, PowerShell에서 임시로:
   $env:Path += ";C:\Program Files\PostgreSQL\16\bin"
   ```

3. **데이터베이스 생성**
   ```powershell
   # PowerShell에서 실행
   # PostgreSQL 서비스가 실행 중인지 확인
   Get-Service -Name postgresql*
   
   # psql로 접속 (비밀번호 입력 필요)
   psql -U postgres
   
   # SQL 명령어 실행
   CREATE DATABASE paper_translate;
   \l  # 데이터베이스 목록 확인
   \q  # 종료
   ```

#### 옵션 2: Docker 사용 (간편)

```powershell
# Docker가 설치되어 있다면
docker run --name postgres-paper-translate `
  -e POSTGRES_PASSWORD=mypassword `
  -e POSTGRES_DB=paper_translate `
  -p 5432:5432 `
  -d postgres:16

# 연결 확인
docker ps
```

#### 옵션 3: Supabase 사용 (클라우드, 무료)

1. https://supabase.com 접속
2. 새 프로젝트 생성
3. Database 섹션에서 Connection String 복사
4. `backend/.env` 파일에 붙여넣기

### Mac/Linux
```bash
# PostgreSQL 설치 후
createdb paper_translate

# 또는 psql 사용
psql postgres
CREATE DATABASE paper_translate;
\q
```

## 2단계: 환경 변수 설정

### Backend (.env)
```bash
cd backend
copy .env.example .env  # Windows
# cp .env.example .env  # Mac/Linux
```

`.env` 파일 편집:
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/paper_translate?schema=public"
LANGRAPH_AGENT_URL="http://localhost:8000"
```

### LangGraph Agent (.env)
```bash
cd langraph-agent
copy .env.example .env  # Windows
# cp .env.example .env  # Mac/Linux
```

`.env` 파일 편집:
```
OPENAI_API_KEY=your_actual_api_key_here
```

### Frontend (.env)
```bash
cd frontend
copy .env.example .env  # Windows
# cp .env.example .env  # Mac/Linux
```

`.env` 파일 편집:
```
VITE_API_URL=http://localhost:3000
```

## 3단계: Dependencies 설치

### Backend
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
```

### Frontend
```bash
cd frontend
npm install
```

### LangGraph Agent
```bash
cd langraph-agent
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
```

## 4단계: 로컬 서버 실행

### 터미널 1: LangGraph Agent 시작
```bash
cd langraph-agent
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux
python main.py
```

서버가 http://localhost:8000 에서 실행됩니다.

### 터미널 2: Backend 시작
```bash
cd backend
npm run dev
```

서버가 http://localhost:3000 에서 실행됩니다.

### 터미널 3: Frontend 시작
```bash
cd frontend
npm run dev
```

앱이 http://localhost:5173 에서 실행됩니다.

## 5단계: 테스트

### LangGraph Agent 테스트
```bash
# 헬스 체크
curl http://localhost:8000/health

# 번역 테스트
curl -X POST http://localhost:8000/translate \
  -H "Content-Type: application/json" \
  -d '{"text":"We propose a novel approach.","context":""}'
```

### Backend API 테스트
```bash
# 브라우저에서
http://localhost:3000
```

### Frontend 테스트
1. 브라우저에서 http://localhost:5173 열기
2. PDF 파일 업로드 (예: Concept Bottleneck Models.pdf)
3. 페이지 네비게이션으로 번역 확인
4. Export PDF 버튼으로 번역된 PDF 다운로드

## 문제 해결

### PostgreSQL 연결 오류

#### Windows
```powershell
# 1. PostgreSQL 서비스 확인
Get-Service -Name postgresql*

# 서비스가 중지되어 있으면 시작
Start-Service -Name "postgresql-x64-16"  # 버전에 따라 이름 다름

# 2. psql 명령어가 없다는 오류
# PATH 환경 변수에 PostgreSQL bin 추가
$env:Path += ";C:\Program Files\PostgreSQL\16\bin"

# 3. 연결 테스트
psql -U postgres -d paper_translate

# 4. 비밀번호 오류
# .env 파일의 DATABASE_URL에서 비밀번호 확인
# 형식: postgresql://postgres:YOUR_PASSWORD@localhost:5432/paper_translate
```

#### Mac
```bash
# PostgreSQL 서비스 확인
brew services list

# 서비스 시작
brew services start postgresql

# 연결 테스트
psql -U postgres -d paper_translate
```

#### Linux
```bash
# PostgreSQL 서비스 확인
sudo systemctl status postgresql

# 서비스 시작
sudo systemctl start postgresql

# 연결 테스트
psql -U postgres -d paper_translate
```

#### Docker 사용 시
```bash
# 컨테이너 상태 확인
docker ps -a

# 컨테이너 시작
docker start postgres-paper-translate

# 로그 확인
docker logs postgres-paper-translate
```

### LangGraph Agent 오류
```bash
# OpenAI API 키 확인
echo $OPENAI_API_KEY  # Mac/Linux
echo %OPENAI_API_KEY%  # Windows

# Python 패키지 재설치
pip install -r requirements.txt --upgrade
```

### Frontend 빌드 오류
```bash
# node_modules 삭제 후 재설치
rm -rf node_modules  # Mac/Linux
# rmdir /s node_modules  # Windows
npm install
```

## 성능 최적화 팁

1. **캐싱 활용**: 동일한 PDF를 여러 번 번역하면 캐시에서 즉시 응답
2. **청크 크기**: 긴 텍스트는 자동으로 청크로 나뉘어 번역
3. **API 비용**: GPT-4o-mini 사용으로 비용 최소화

## 다음 단계

로컬에서 테스트가 완료되면:
- [배포 가이드](DEPLOYMENT.md) 참조
- Vercel에 프론트엔드 및 백엔드 배포
- Railway 또는 Render에 LangGraph Agent 배포

