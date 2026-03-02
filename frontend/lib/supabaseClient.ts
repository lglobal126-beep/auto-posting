import { createClient } from "@supabase/supabase-js";

// TODO: 아래 두 값은 실제로 Supabase 프로젝트를 만들고
//       Project Settings → API 메뉴에서 가져온 URL과 anon 키로 교체해야 합니다.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // 개발 중에만 경고 로그, 실제 배포에서는 환경 변수 설정 필수
  console.warn(
    "Supabase 환경 변수가 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 값을 확인해주세요."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

