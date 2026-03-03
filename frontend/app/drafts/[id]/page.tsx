"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { supabase } from "@/lib/supabaseClient";
import { useRequireAuth } from "@/hooks/useRequireAuth";

type DraftDetailData = {
  id: number;
  restaurant_name?: string | null;
  visit_datetime?: string | null;
  blog_title: string;
  blog_body: string;
  blog_hashtags: string[];
  instagram_caption: string;
  instagram_hashtags: string[];
};

export default function DraftDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { checking } = useRequireAuth();

  const [data, setData] = useState<DraftDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);
  const [publishToNaver, setPublishToNaver] = useState(true);
  const [publishToInstagram, setPublishToInstagram] = useState(true);

  useEffect(() => {
    const fetchDraft = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
        if (!apiBase) {
          throw new Error("백엔드 API 주소가 설정되지 않았습니다.");
        }

        const res = await fetch(`${apiBase}/drafts/${id}`);
        if (!res.ok) {
          throw new Error("초안 정보를 불러오지 못했습니다.");
        }
        const json = await res.json();
        setData(json.data);
      } catch (err: any) {
        setError(err.message ?? "불러오기 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchDraft();
    }
  }, [id]);

  const handlePublish = async () => {
    if (!data) return;
    setPublishing(true);
    setPublishError(null);
    setPublishSuccess(null);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("로그인 세션이 유효하지 않습니다. 다시 로그인해주세요.");
      }

      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
      if (!apiBase) {
        throw new Error("백엔드 API 주소가 설정되지 않았습니다.");
      }

      const res = await fetch(`${apiBase}/posts/publish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          draft_id: data.id,
          publish_to_naver: publishToNaver,
          publish_to_instagram: publishToInstagram,
          scheduled_at: null,
        }),
      });

      if (!res.ok) {
        throw new Error("발행 요청에 실패했습니다.");
      }

      const json = await res.json();
      setPublishSuccess("발행 요청이 완료되었습니다.");
      console.log("발행 결과:", json);
    } catch (err: any) {
      setPublishError(err.message ?? "발행 중 오류가 발생했습니다.");
    } finally {
      setPublishing(false);
    }
  };

  if (checking) {
    return (
      <div className="app-card">
        <p className="app-subtitle">로그인 상태를 확인하는 중입니다...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-600">초안을 불러오는 중입니다...</p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <div className="app-card">
        <p className="error-text">
          {error ?? "초안 정보를 찾을 수 없습니다."}
        </p>
        <div className="app-link-row">
          <Link href="/">홈으로 돌아가기</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="app-card">
      <div className="app-card-header">
        <div className="app-icon-circle">📄</div>
        <h1 className="app-title">
          {data.blog_title || "제목 없는 초안"}
        </h1>
        {data.restaurant_name && (
          <p className="app-subtitle">
            식당: {data.restaurant_name}
          </p>
        )}
      </div>

      <div className="two-column" style={{ marginBottom: 20 }}>
        <section>
          <h2 className="form-label">네이버 블로그용 포스팅</h2>
          <div className="form-textarea" style={{ minHeight: 160 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>
              {data.blog_title}
            </div>
            <div style={{ whiteSpace: "pre-line", fontSize: 13 }}>
              {data.blog_body}
            </div>
            {data.blog_hashtags?.length > 0 && (
              <div style={{ marginTop: 10, fontSize: 11, color: "#4b5563" }}>
                {data.blog_hashtags.join(" ")}
              </div>
            )}
          </div>
        </section>

        <section>
          <h2 className="form-label">인스타그램용 포스팅</h2>
          <div className="form-textarea" style={{ minHeight: 160 }}>
            <div style={{ whiteSpace: "pre-line", fontSize: 13 }}>
              {data.instagram_caption}
            </div>
            {data.instagram_hashtags?.length > 0 && (
              <div style={{ marginTop: 10, fontSize: 11, color: "#4b5563" }}>
                {data.instagram_hashtags.join(" ")}
              </div>
            )}
          </div>
        </section>
      </div>

      <section style={{ textAlign: "left", marginTop: 8 }}>
        <h2 className="form-label">발행 설정</h2>
        <div
          style={{
            display: "flex",
            gap: 16,
            fontSize: 13,
            marginBottom: 6,
          }}
        >
          <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input
              type="checkbox"
              checked={publishToNaver}
              onChange={(e) => setPublishToNaver(e.target.checked)}
            />
            네이버 블로그
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input
              type="checkbox"
              checked={publishToInstagram}
              onChange={(e) => setPublishToInstagram(e.target.checked)}
            />
            인스타그램
          </label>
        </div>
        {publishError && <p className="error-text">{publishError}</p>}
        {publishSuccess && <p className="success-text">{publishSuccess}</p>}
      </section>

      <button
        type="button"
        className="app-primary-btn"
        onClick={handlePublish}
        disabled={publishing}
      >
        {publishing ? "발행 중..." : "선택한 채널로 발행하기"}
      </button>

      <div className="app-link-row">
        <Link href="/">홈으로</Link> ·{" "}
        <Link href="/drafts/new">새 초안 만들기</Link>
      </div>
    </div>
  );
}


