## 맛집 인플루언서 자동 포스팅 도우미

- 사진·영상·영수증만 업로드하면 네이버 블로그 글과 인스타그램 캡션을 자동 생성하고, 연동된 계정으로 발행까지 도와주는 개인용 도구입니다.
- 이 레포지토리는 백엔드(FastAPI)와 프론트엔드(Next.js), 명세 문서들을 포함합니다.

### 디렉토리 구조 (초안)

- `backend/` - FastAPI 기반 백엔드 코드
- `frontend/` - Next.js 기반 프론트엔드 코드 (예정)
- `docs/` - PRD, 명세서 등 문서

### 백엔드 개발 서버 실행 (로컬)

1. 가상환경 생성 및 활성화 (선택)
2. 의존성 설치:

```bash
pip install -r backend/requirements.txt
```

3. FastAPI 실행:

```bash
uvicorn app.main:app --reload
```

> 실제 경로/모듈은 개발 환경에 따라 조정할 수 있습니다.

