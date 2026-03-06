-- =====================================================
-- Supabase DB 설정 SQL
-- Supabase 대시보드 → SQL Editor 에서 실행하세요
-- =====================================================

-- 기존 테이블/정책 제거 (재실행 시 충돌 방지)
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS drafts CASCADE;
DROP TABLE IF EXISTS user_social_accounts CASCADE;

-- storage 기존 정책 제거 (이미 존재하면 에러 방지)
DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read media" ON storage.objects;

-- 1. drafts 테이블
CREATE TABLE drafts (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  post_type       TEXT NOT NULL DEFAULT 'blog',  -- 'blog' | 'coupang'
  restaurant_name TEXT,
  address         TEXT,
  phone           TEXT,
  receipt_info    JSONB,
  coupang_url     TEXT,
  image_paths     TEXT[] DEFAULT '{}',
  video_paths     TEXT[] DEFAULT '{}',
  receipt_path    TEXT,
  blog_title      TEXT NOT NULL DEFAULT '',
  blog_body       TEXT NOT NULL DEFAULT '',
  blog_hashtags   TEXT[] DEFAULT '{}',
  instagram_caption TEXT NOT NULL DEFAULT '',
  instagram_hashtags TEXT[] DEFAULT '{}',
  summary         TEXT,
  status          TEXT NOT NULL DEFAULT 'draft',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ※ 이미 테이블이 존재하는 경우 아래 구문으로 컬럼만 추가하세요:
-- ALTER TABLE drafts ADD COLUMN IF NOT EXISTS post_type TEXT NOT NULL DEFAULT 'blog';
-- ALTER TABLE drafts ADD COLUMN IF NOT EXISTS coupang_url TEXT;
-- ALTER TABLE drafts ADD COLUMN IF NOT EXISTS summary TEXT;

-- 2. posts 테이블 (발행 이력)
CREATE TABLE posts (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id              UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  draft_id             UUID REFERENCES drafts(id) ON DELETE CASCADE NOT NULL,
  naver_post_url       TEXT,
  instagram_post_url   TEXT,
  publish_status       TEXT NOT NULL DEFAULT 'pending',
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 소셜 계정 연동 테이블
CREATE TABLE user_social_accounts (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform     TEXT NOT NULL,  -- 'naver' 또는 'instagram'
  access_token TEXT,
  refresh_token TEXT,
  expires_at   TIMESTAMPTZ,
  account_info JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- =====================================================
-- RLS (Row Level Security) 설정
-- =====================================================

ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_social_accounts ENABLE ROW LEVEL SECURITY;

-- drafts RLS (DROP으로 이미 제거됐으므로 바로 생성)
CREATE POLICY "Users can manage own drafts"
  ON drafts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own posts"
  ON posts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own social accounts"
  ON user_social_accounts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- Storage 버킷 설정 (대시보드에서 직접 해도 됨)
-- =====================================================

-- media 버킷이 없으면 생성
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- media 버킷 업로드 정책 (로그인 사용자만)
CREATE POLICY "Authenticated users can upload media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'media' AND auth.role() = 'authenticated');

-- media 버킷 공개 읽기 (Instagram API에서 접근 가능해야 함)
CREATE POLICY "Anyone can read media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media');
