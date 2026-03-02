## 백엔드 명세 (FastAPI)

## 1. 개요

- **역할**: 영수증 OCR, LLM 호출, 네이버/인스타 연동, 비즈니스 로직 및 API 제공
- **프레임워크**: FastAPI (Python)
- **배포 대상**: Render 무료 Web Service (또는 유사 서비스)
- **데이터 저장소**: Supabase(Postgres)와 연동

## 2. 모듈 구조 (초안)

- `app/main.py`
  - FastAPI 앱 생성, 라우터 등록, 헬스 체크 엔드포인트

- `app/config.py`
  - 환경 변수 관리 (LLM 키, 네이버/인스타 클라이언트 ID/시크릿, Supabase 연결 정보 등)

- `app/dependencies.py`
  - 인증/권한 처리, Supabase와 연동하는 클라이언트 주입

- `app/routers/auth_social.py`
  - 네이버/인스타 OAuth 콜백 처리
  - 토큰 저장/갱신 로직

- `app/routers/drafts.py`
  - 초안 생성/수정/조회 API
  - 영수증 OCR 및 LLM 호출 트리거

- `app/routers/publish.py`
  - 초안 발행 API
  - 네이버/인스타 포스팅 실행 및 결과 저장

- `app/services/ocr.py`
  - Tesseract를 사용한 영수증 텍스트 추출

- `app/services/llm.py`
  - LLM API 호출 래퍼
  - 프롬프트 구성/응답 파싱

- `app/services/social/naver_blog.py`
  - 네이버 블로그 API 연동

- `app/services/social/instagram.py`
  - 인스타그램 Graph API 연동

- `app/models/schemas.py`
  - Pydantic 스키마 정의 (요청/응답/내부 DTO 등)

## 3. 환경 변수 (예시)

- `LLM_API_KEY`
- `LLM_API_BASE_URL`
- `NAVER_CLIENT_ID`
- `NAVER_CLIENT_SECRET`
- `NAVER_REDIRECT_URI`
- `INSTAGRAM_APP_ID`
- `INSTAGRAM_APP_SECRET`
- `INSTAGRAM_REDIRECT_URI`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

실제 값은 배포 환경(Render 등)에 환경 변수로 설정하고, 코드에는 하드코딩하지 않는다.

## 4. 기본 엔드포인트 (요약)

- `GET /health`
  - 서버 상태 확인용 헬스 체크

- `POST /drafts`
  - 초안 생성(영수증 OCR + LLM 호출 포함)

- `GET /drafts`
  - 현재 유저의 초안 목록 조회

- `GET /drafts/{id}`
  - 단일 초안 상세 조회

- `PATCH /drafts/{id}`
  - 초안 내용(블로그 제목/본문, 인스타 캡션 등) 수정

- `POST /publish`
  - 초안을 네이버/인스타에 발행 (즉시 발행 우선)

- `GET /posts`
  - 발행된 포스트 목록 조회

- `GET /oauth/naver/callback`
  - 네이버 OAuth 콜백, 토큰 저장

- `GET /oauth/instagram/callback`
  - 인스타 OAuth 콜백, 토큰 저장

## 5. 배포 개요 (실 서비스 기준)

- **호스팅**: Render 무료 Web Service
- **설정 파일**: 루트 `render.yaml`
  - `rootDir: backend`
  - `buildCommand: pip install -r requirements.txt`
  - `startCommand: uvicorn app.main:app --host 0.0.0.0 --port 10000`
- **환경 변수 (Render 대시보드에서 설정)**
  - `LLM_API_URL`, `LLM_API_KEY`
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`


세부 요청/응답 스키마는 `API_SPEC.md`에서 정의한다.

