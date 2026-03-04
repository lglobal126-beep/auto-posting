"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useRequireAuth } from "@/hooks/useRequireAuth";

type DraftSummary = {
  id: string;
  restaurant_name?: string | null;
  blog_title?: string | null;
  created_at: string;
  status: string;
};

export default function DraftsPage() {
  const { checking } = useRequireAuth();
  const [drafts, setDrafts] = useState<DraftSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
        const res = await fetch(`${apiBase}/drafts`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const json = await res.json();
        if (json.success) setDrafts(json.data || []);
        else setError("초안 목록을 불러오지 못했습니다.");
      } catch {
        setError("네트워크 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };
    if (!checking) load();
  }, [checking]);

  if (checking || loading) {
    return (
      <div className="app-card app-card-sm">
        <p className="app-subtitle">불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="app-card" style={{ maxWidth: 680 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 className="app-title" style={{ margin: 0 }}>내 초안 목록</h1>
        <Link href="/drafts/new">
          <button className="app-primary-btn" style={{ width: "auto", padding: "10px 20px", marginTop: 0 }}>
            + 새 포스팅
          </button>
        </Link>
      </div>

      {error && <p className="error-text">{error}</p>}

      {drafts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
          <p>아직 작성한 초안이 없어요.</p>
          <Link href="/drafts/new">
            <button className="app-primary-btn" style={{ marginTop: 16, width: "auto", padding: "10px 24px" }}>
              첫 포스팅 만들기
            </button>
          </Link>
        </div>
      ) : (
        <div className="draft-list">
          {drafts.map((d) => (
            <Link key={d.id} href={`/drafts/${d.id}`} className="draft-card">
              <div>
                <div className="draft-card-title">
                  {d.blog_title || d.restaurant_name || "제목 없음"}
                </div>
                <div className="draft-card-meta">
                  {d.restaurant_name && `${d.restaurant_name} · `}
                  {new Date(d.created_at).toLocaleDateString("ko-KR")}
                </div>
              </div>
              <span style={{ color: "#d1d5db", fontSize: 18 }}>›</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
