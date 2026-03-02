## API 명세 (초안)

이 문서는 FastAPI 백엔드가 제공하는 주요 HTTP API를 정의한다.  
인증은 Supabase Auth에서 발급된 액세스 토큰을 `Authorization: Bearer <token>` 헤더로 전달하는 것을 기본으로 한다.

---

## 공통

- **Base URL (예시)**: `https://<backend-domain>/`
- **Content-Type**: JSON (`application/json`), 파일 업로드 시 `multipart/form-data`

### 응답 공통 형식 (권장)

```json
{
  "success": true,
  "data": { },
  "error": null
}
```

에러 시:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "에러 설명"
  }
}
```

---

## 1. 헬스 체크

### `GET /health`

- **설명**: 서버 상태 확인
- **요청 헤더**: 없음
- **응답 예시**

```json
{
  "success": true,
  "data": {
    "status": "ok"
  },
  "error": null
}
```

---

## 2. 초안(Drafts)

### `POST /drafts`

- **설명**: 새 초안 생성 (영수증 OCR 및 LLM 호출 포함)
- **인증**: 필요 (Bearer 토큰)
- **요청 형식**: `application/json` (실제 배포 시 파일 업로드 경로를 이미 Supabase Storage에 올려둔 후, 그 경로를 전달하는 방식)

#### 요청 바디 예시

```json
{
  "image_paths": ["public/user1/img1.jpg", "public/user1/img2.jpg"],
  "video_paths": ["public/user1/video1.mp4"],
  "receipt_path": "public/user1/receipt1.jpg",
  "memo": "강남역 곱창집, 대기 많았지만 담백한 곱창이 인상적이었음.",
  "keywords": ["강남역", "곱창", "퇴근 후 한 잔"]
}
```

#### 응답 바디 예시

```json
{
  "success": true,
  "data": {
    "draft_id": 1,
    "restaurant_name": "강남곱창",
    "blog_title": "강남역 곱창 맛집, 기름 대신 담백함으로 승부한 곳",
    "blog_body": "...본문 내용...",
    "blog_hashtags": [
      "#강남맛집",
      "#곱창맛집",
      "#데이트코스"
    ],
    "instagram_caption": "퇴근 후 한 잔 하기 딱 좋은 곱창집...",
    "instagram_hashtags": [
      "#강남맛집",
      "#곱창맛집",
      "#퇴근후한잔"
    ]
  },
  "error": null
}
```

---

### `GET /drafts`

- **설명**: 현재 사용자 초안 목록 조회
- **인증**: 필요

#### 응답 예시

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "restaurant_name": "강남곱창",
      "created_at": "2026-03-02T12:00:00Z",
      "status": "draft"
    }
  ],
  "error": null
}
```

---

### `GET /drafts/{id}`

- **설명**: 단일 초안 상세 조회
- **인증**: 필요

#### 응답 예시

```json
{
  "success": true,
  "data": {
    "id": 1,
    "restaurant_name": "강남곱창",
    "visit_datetime": "2026-03-01T19:30:00Z",
    "blog_title": "강남역 곱창 맛집, 기름 대신 담백함으로 승부한 곳",
    "blog_body": "...본문 내용...",
    "blog_hashtags": [
      "#강남맛집",
      "#곱창맛집",
      "#데이트코스"
    ],
    "instagram_caption": "퇴근 후 한 잔 하기 딱 좋은 곱창집...",
    "instagram_hashtags": [
      "#강남맛집",
      "#곱창맛집",
      "#퇴근후한잔"
    ],
    "media": [
      {
        "type": "image",
        "path": "public/user1/img1.jpg"
      },
      {
        "type": "receipt",
        "path": "public/user1/receipt1.jpg"
      }
    ]
  },
  "error": null
}
```

---

### `PATCH /drafts/{id}`

- **설명**: 초안 내용 수정
- **인증**: 필요

#### 요청 예시

```json
{
  "blog_title": "강남역 곱창 맛집, 담백한 곱창 한 판",
  "blog_body": "...수정된 본문...",
  "instagram_caption": "담백한 곱창에 소주 한 잔 딱 좋은 날🍶",
  "instagram_hashtags": [
    "#강남역",
    "#곱창",
    "#맛집기록"
  ]
}
```

#### 응답 예시

```json
{
  "success": true,
  "data": {
    "id": 1,
    "updated_at": "2026-03-02T13:00:00Z"
  },
  "error": null
}
```

---

## 3. 발행(Publish)

### `POST /publish`

- **설명**: 초안을 네이버/인스타에 발행
- **인증**: 필요

#### 요청 예시

```json
{
  "draft_id": 1,
  "publish_to_naver": true,
  "publish_to_instagram": true,
  "scheduled_at": null
}
```

#### 응답 예시

```json
{
  "success": true,
  "data": {
    "post_id": 10,
    "naver_post_url": "https://blog.naver.com/.../12345",
    "instagram_post_url": "https://www.instagram.com/p/XXXX/",
    "publish_status": "success"
  },
  "error": null
}
```

---

## 4. 발행된 포스트 조회

### `GET /posts`

- **설명**: 발행된 포스트 목록 조회
- **인증**: 필요

#### 응답 예시

```json
{
  "success": true,
  "data": [
    {
      "id": 10,
      "draft_id": 1,
      "naver_post_url": "https://blog.naver.com/.../12345",
      "instagram_post_url": "https://www.instagram.com/p/XXXX/",
      "publish_status": "success",
      "published_at": "2026-03-02T13:10:00Z"
    }
  ],
  "error": null
}
```

---

## 5. 소셜 계정 연동 (OAuth 콜백)

### `GET /oauth/naver/callback`

- **설명**: 네이버 OAuth 콜백 엔드포인트. `code`와 `state`를 받아 토큰을 발급/저장한다.
- **쿼리 파라미터**
  - `code`: 인가 코드
  - `state`: CSRF 방지용 상태 값

#### 응답

- 성공 시: 간단한 HTML/리다이렉트 페이지 (프론트엔드에서 연동 완료 상태를 처리)

---

### `GET /oauth/instagram/callback`

- **설명**: 인스타그램 OAuth 콜백 엔드포인트. `code`를 받아 토큰을 발급/저장한다.
- **쿼리 파라미터**
  - `code`: 인가 코드

#### 응답

- 성공 시: 간단한 HTML/리다이렉트 페이지

