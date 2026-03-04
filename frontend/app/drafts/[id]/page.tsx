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
  restaurant_name?: string | null;
  address?: string | null;
  receipt_info?: ReceiptInfo | null;
  blog_title: string;
  blog_body: string;
  blog_hashtags: string[];
  instagram_caption: string;
  instagram_hashtags: string[];
  image_paths?: string[];
};

export default function DraftDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { checking } = useRequireAuth();

  const [data, setData] = useState<DraftDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 편집 상태
  const [blogTitle, setBlogTitle] = useState("");
  const [blogBody, setBlogBody] = useState("");
  const [blogHashtags, setBlogHashtags] = useState("");
  const [instaCaption, setInstaCaption] = useState("");
  const [instaHashtags, setInstaHashtags] = useState("");

  // 저장 상태
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const [copied, setCopied] = useState<"blog" | "insta" | null>(null);

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
        setBlogTitle(d.blog_title || "");
        setBlogBody(d.blog_body || "");
        setBlogHashtags((d.blog_hashtags || []).join(" "));
        setInstaCaption(d.instagram_caption || "");
        setInstaHashtags((d.instagram_hashtags || []).join(" "));
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
      const res = await fetch(`${apiBase}/drafts/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          blog_title: blogTitle,
          blog_body: blogBody,
          blog_hashtags: blogHashtags.split(" ").filter((t) => t.startsWith("#")),
          instagram_caption: instaCaption,
          instagram_hashtags: instaHashtags.split(" ").filter((t) => t.startsWith("#")),
        }),
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

  const handleCopy = async (type: "blog" | "insta") => {
    const text =
      type === "blog"
        ? `${blogTitle}\n\n${blogBody}\n\n${blogHashtags}`
        : `${instaCaption}\n\n${instaHashtags}`;
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
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

  return (
    <div className="app-card">
      <div style={{ marginBottom: 20 }}>
        <h1 className="app-title" style={{ marginBottom: 4 }}>초안 편집 · 발행</h1>
        {data.restaurant_name && (
          <p className="app-subtitle" style={{ textAlign: "left" }}>
            🍴 {data.restaurant_name}
            {data.address && ` · ${data.address}`}
          </p>
        )}
      </div>

      {/* 영수증 정보 */}
      {data.receipt_info && (
        <div className="receipt-box">
          <div className="receipt-box-title">🧾 영수증 인식 정보</div>
          {data.receipt_info.restaurant_name && (
            <div className="receipt-row">
              <span className="receipt-label">상호명</span>
              <span className="receipt-value">{data.receipt_info.restaurant_name}</span>
            </div>
          )}
          {data.receipt_info.address && (
            <div className="receipt-row">
              <span className="receipt-label">주소</span>
              <span className="receipt-value">{data.receipt_info.address}</span>
            </div>
          )}
          {data.receipt_info.phone && (
            <div className="receipt-row">
              <span className="receipt-label">전화</span>
              <span className="receipt-value">{data.receipt_info.phone}</span>
            </div>
          )}
          {data.receipt_info.menu_items && data.receipt_info.menu_items.length > 0 && (
            <div className="receipt-row">
              <span className="receipt-label">메뉴</span>
              <span className="receipt-value">
                {data.receipt_info.menu_items.map((m) => `${m.name} ${m.price}`).join(" / ")}
              </span>
            </div>
          )}
          {data.receipt_info.total_amount && (
            <div className="receipt-row">
              <span className="receipt-label">합계</span>
              <span className="receipt-value">{data.receipt_info.total_amount}</span>
            </div>
          )}
        </div>
      )}

      {/* 편집 영역 */}
      <div className="preview-grid">
        {/* 네이버 블로그 */}
        <div className="preview-section">
          <div className="preview-section-head">
            <span className="preview-section-title">📗 네이버 블로그</span>
            <button className="copy-btn" onClick={() => handleCopy("blog")}>
              {copied === "blog" ? "✓ 복사됨" : "전체 복사"}
            </button>
          </div>
          <div style={{ padding: 14 }}>
            <div className="form-field" style={{ marginBottom: 10 }}>
              <label className="form-label" style={{ fontSize: 11 }}>제목</label>
              <input
                className="form-input"
                value={blogTitle}
                onChange={(e) => setBlogTitle(e.target.value)}
              />
            </div>
            <div className="form-field" style={{ marginBottom: 10 }}>
              <label className="form-label" style={{ fontSize: 11 }}>본문</label>
              <textarea
                className="form-textarea"
                value={blogBody}
                onChange={(e) => setBlogBody(e.target.value)}
                style={{ minHeight: 280 }}
              />
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: 11 }}>해시태그</label>
              <textarea
                className="form-textarea"
                value={blogHashtags}
                onChange={(e) => setBlogHashtags(e.target.value)}
                style={{ minHeight: 60, color: "#6366f1" }}
              />
            </div>
          </div>
        </div>

        {/* 인스타그램 */}
        <div className="preview-section">
          <div className="preview-section-head">
            <span className="preview-section-title">📸 인스타그램</span>
            <button className="copy-btn" onClick={() => handleCopy("insta")}>
              {copied === "insta" ? "✓ 복사됨" : "전체 복사"}
            </button>
          </div>
          <div style={{ padding: 14 }}>
            <div className="form-field" style={{ marginBottom: 10 }}>
              <label className="form-label" style={{ fontSize: 11 }}>캡션</label>
              <textarea
                className="form-textarea"
                value={instaCaption}
                onChange={(e) => setInstaCaption(e.target.value)}
                style={{ minHeight: 160 }}
              />
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: 11 }}>해시태그</label>
              <textarea
                className="form-textarea"
                value={instaHashtags}
                onChange={(e) => setInstaHashtags(e.target.value)}
                style={{ minHeight: 100, color: "#6366f1" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 저장 */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button
          className="app-secondary-btn"
          onClick={handleSave}
          disabled={saving}
          style={{ flex: 1 }}
        >
          {saving ? "저장 중..." : "💾 수정 내용 저장"}
        </button>
      </div>
      {saveMsg && (
        <p className={saveMsg.startsWith("오류") ? "error-text" : "success-text"}>{saveMsg}</p>
      )}

      <hr className="divider" />

      {/* 네이버 블로그 - 복사 안내 */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>📗 네이버 블로그 발행</h2>
        <div
          style={{
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: 10,
            padding: "12px 16px",
            fontSize: 13,
            color: "#166534",
          }}
        >
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

      {/* 인스타그램 - 복사 안내 */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>📸 인스타그램 발행</h2>
        <div
          style={{
            background: "#fdf4ff",
            border: "1px solid #e9d5ff",
            borderRadius: 10,
            padding: "12px 16px",
            fontSize: 13,
            color: "#6b21a8",
          }}
        >
          1. 위 <strong>「전체 복사」</strong> 버튼으로 캡션+해시태그 복사
          <br />
          2. 인스타그램 앱에서 사진 선택 후 붙여넣기
        </div>
      </div>

      <div className="app-link-row">
        <Link href="/drafts">목록으로</Link>
        <span>·</span>
        <Link href="/drafts/new">새 포스팅</Link>
      </div>
    </div>
  );
}
