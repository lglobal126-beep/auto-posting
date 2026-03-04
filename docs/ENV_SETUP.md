# 환경변수 설정 가이드

## Backend (Render.com 환경변수)

| 변수명 | 값 | 설명 |
|--------|-----|------|
| `LLM_API_URL` | `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent` | Gemini API URL |
| `LLM_API_KEY` | `AIza...` | Google AI Studio에서 발급 |
| `SUPABASE_URL` | `https://kiwclflwrbgbhsxfmucj.supabase.co` | Supabase 프로젝트 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Supabase 대시보드 → Settings → API → service_role |
| `NAVER_CLIENT_ID` | `...` | 네이버 개발자센터에서 발급 |
| `NAVER_CLIENT_SECRET` | `...` | 네이버 개발자센터에서 발급 |
| `NAVER_REDIRECT_URI` | `https://auto-posting-pjwm.onrender.com/auth/naver/callback` | Render 백엔드 URL + `/auth/naver/callback` |
| `FRONTEND_URL` | `https://auto-posting-sigma.vercel.app` | Vercel 프론트엔드 URL |

## Frontend (Vercel 환경변수)

| 변수명 | 값 |
|--------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://kiwclflwrbgbhsxfmucj.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` (anon key) |
| `NEXT_PUBLIC_API_BASE_URL` | `https://auto-posting-pjwm.onrender.com` |

---

## 네이버 개발자센터 앱 설정

1. https://developers.naver.com/apps/#/register 에서 앱 등록
2. **사용 API**: `블로그` + `회원정보 조회`
3. **서비스 환경**: PC 웹
4. **Callback URL**: `https://auto-posting-pjwm.onrender.com/auth/naver/callback`
5. 발급받은 `Client ID`, `Client Secret`을 백엔드 환경변수에 설정

---

## 인스타그램 Graph API 설정

1. https://developers.facebook.com 에서 앱 생성
2. **Instagram Graph API** 제품 추가
3. Instagram Business 또는 Creator 계정 연결
4. 필요 권한: `instagram_basic`, `instagram_content_publish`
5. 앱 검수 후 Long-lived Access Token 발급
6. 서비스 내 **계정 연동** 페이지에서 토큰과 User ID 입력

---

## Supabase DB 설정

`docs/supabase_setup.sql` 파일을 Supabase 대시보드의 SQL Editor에서 실행하세요.

**Storage 버킷 확인:**
- `media` 버킷이 **public**으로 설정되어야 인스타그램 API에서 이미지에 접근할 수 있습니다.
- Supabase 대시보드 → Storage → media 버킷 → Public 토글 활성화
