"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useRequireAuth } from "@/hooks/useRequireAuth";

type ReceiptInfo = {
  restaurant_name?: string | null;
  address?: string | null;
  phone?: string | null;
  menu_items?: { name: string; price: string }[] | null;
  total_amount?: string | null;
};

type DraftDetailData = {
  id: string;
  post_type: string;
  restaurant_name?: string | null;
  address?: string | null;
  receipt_info?: ReceiptInfo | null;
  blog_title: string;
  blog_body: string;
  blog_hashtags: string[];
  image_paths?: string[];
};

export default function DraftDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { checking } = useRequireAuth();

  const [data, setData] = useState<DraftDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [hashtags, setHashtags] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchDraft = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
        const res = await fetch(`${apiBase}/drafts/${id}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) throw new Error("초안 정보를 불러오지 못했습니다.");
        const json = await res.json();
        const d = json.data as DraftDetailData;
        setData(d);
        setTitle(d.blog_title || "");
        setBody(d.blog_body || "");
        setHashtags((d.blog_hashtags || []).join(" "));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "오류가 발생했습니다.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    if (id && !checking) fetchDraft();
  }, [id, checking]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("세션이 만료되었습니다.");
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
      const updates: Record<string, unknown> = {
        blog_title: title,
        blog_body: body,
      };
      if (data?.post_type !== "coupang") {
        updates.blog_hashtags = hashtags.split(" ").filter((t) => t.startsWith("#"));
      }
      const res = await fetch(`${apiBase}/drafts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("저장에 실패했습니다.");
      setSaveMsg("저장되었습니다.");
      setTimeout(() => setSaveMsg(null), 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "저장 중 오류";
      setSaveMsg(`오류: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    const text =
      data?.post_type === "coupang"
        ? `${title}\n\n${body}`
        : `${title}\n\n${body}\n\n${hashtags}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (checking || loading) {
    return (
      <div className="app-card app-card-sm">
        <p className="app-subtitle">불러오는 중...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="app-card app-card-sm">
        <p className="error-text">{error ?? "초안을 찾을 수 없습니다."}</p>
        <div className="app-link-row">
          <Link href="/drafts">목록으로</Link>
        </div>
      </div>
    );
  }

  const isCoupang = data.post_type === "coupang";

  return (
    <div className="app-card">
      <div style={{ marginBottom: 20 }}>
        <h1 className="app-title" style={{ marginBottom: 4 }}>
          {isCoupang ? "🛍️ 쿠팡 리뷰 편집" : "📗 블로그 편집"}
        </h1>
        {data.restaurant_name && (
          <p className="app-subtitle" style={{ textAlign: "left" }}>
            🍴 {data.restaurant_name}
            {data.address && ` · ${data.address}`}
          </p>
        )}
      </div>

      {/* 영수증 정보 (blog only) */}
      {!isCoupang && data.receipt_info && (
        <div className="receipt-box">
          <div className="receipt-box-title">🧾 영수증 인식 정보</div>
          {data.receipt_info.restaurant_name && <div className="receipt-row"><span className="receipt-label">상호명</span><span className="receipt-value">{data.receipt_info.restaurant_name}</span></div>}
          {data.receipt_info.address && <div className="receipt-row"><span className="receipt-label">주소</span><span className="receipt-value">{data.receipt_info.address}</span></div>}
          {data.receipt_info.phone && <div className="receipt-row"><span className="receipt-label">전화</span><span className="receipt-value">{data.receipt_info.phone}</span></div>}
          {data.receipt_info.menu_items && data.receipt_info.menu_items.length > 0 && (
            <div className="receipt-row">
              <span className="receipt-label">메뉴</span>
              <span className="receipt-value">{data.receipt_info.menu_items.map((m) => `${m.name} ${m.price}`).join(" / ")}</span>
            </div>
          )}
          {data.receipt_info.total_amount && <div className="receipt-row"><span className="receipt-label">합계</span><span className="receipt-value">{data.receipt_info.total_amount}</span></div>}
        </div>
      )}

      {/* 편집 영역 */}
      <div className="preview-section">
        <div className="preview-section-head">
          <span className="preview-section-title">
            {isCoupang ? "🛍️ 쿠팡 리뷰" : "📗 네이버 블로그"}
          </span>
          <button className="copy-btn" onClick={handleCopy}>
            {copied ? "✓ 복사됨" : "전체 복사"}
          </button>
        </div>
        <div style={{ padding: 14 }}>
          <div className="form-field" style={{ marginBottom: 10 }}>
            <label className="form-label" style={{ fontSize: 11 }}>
              {isCoupang ? "한줄평" : "제목"}
            </label>
            <input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="form-field" style={{ marginBottom: isCoupang ? 0 : 10 }}>
            <label className="form-label" style={{ fontSize: 11 }}>
              {isCoupang ? "리뷰 본문" : "본문"}
            </label>
            <textarea
              className="form-textarea"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              style={{ minHeight: isCoupang ? 320 : 280 }}
            />
          </div>
          {!isCoupang && (
            <div className="form-field" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: 11 }}>해시태그</label>
              <textarea
                className="form-textarea"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                style={{ minHeight: 60, color: "#6366f1" }}
              />
            </div>
          )}
        </div>
      </div>

      {/* 저장 */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button className="app-secondary-btn" onClick={handleSave} disabled={saving} style={{ flex: 1 }}>
          {saving ? "저장 중..." : "💾 수정 내용 저장"}
        </button>
      </div>
      {saveMsg && (
        <p className={saveMsg.startsWith("오류") ? "error-text" : "success-text"}>{saveMsg}</p>
      )}

      <hr className="divider" />

      {/* 발행 안내 */}
      {isCoupang ? (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>🛍️ 쿠팡 리뷰 게시</h2>
          <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#9a3412" }}>
            1. 위 <strong>「전체 복사」</strong> 버튼으로 리뷰 복사
            <br />
            2. 쿠팡 앱에서 해당 상품 구매 내역 → 미리보기 → 후기 작성에 붙여넣기
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>📗 네이버 블로그 발행</h2>
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#166534" }}>
            1. 위 <strong>「전체 복사」</strong> 버튼으로 블로그 내용 복사
            <br />
            2.{" "}
            <a
              href="https://blog.naver.com/PostWriteForm.naver"
              target="_blank"
              rel="noreferrer"
              style={{ color: "#16a34a", fontWeight: 600 }}
            >
              네이버 블로그 글쓰기 열기 →
            </a>{" "}
            에서 붙여넣기
          </div>
        </div>
      )}

      <div className="app-link-row">
        <Link href="/drafts">목록으로</Link>
        <span>·</span>
        <Link href="/drafts/new">새 포스팅</Link>
      </div>
    </div>
  );
}
