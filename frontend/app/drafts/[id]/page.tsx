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
        if (!res.ok) throw new Error("\uCD08\uC548 \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
        const json = await res.json();
        const d = json.data as DraftDetailData;
        setData(d);
        setTitle(d.blog_title || "");
        setBody(d.blog_body || "");
        setHashtags((d.blog_hashtags || []).join(" "));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "\uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.";
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
      if (!session) throw new Error("\uC138\uC158\uC774 \uB9CC\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4.");
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
      if (!res.ok) throw new Error("\uC800\uC7A5\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
      setSaveMsg("\uC800\uC7A5\uB418\uC5C8\uC2B5\uB2C8\uB2E4.");
      setTimeout(() => setSaveMsg(null), 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "\uC800\uC7A5 \uC911 \uC624\uB958";
      setSaveMsg(`\uC624\uB958: ${msg}`);
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
        <p className="app-subtitle">\uBD88\uB7EC\uC624\uB294 \uC911...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="app-card app-card-sm">
        <p className="error-text">{error ?? "\uCD08\uC548\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4."}</p>
        <div className="app-link-row">
          <Link href="/drafts">\uBAA9\uB85D\uC73C\uB85C</Link>
        </div>
      </div>
    );
  }

  const isCoupang = data.post_type === "coupang";

  return (
    <div className="app-card">
      <div style={{ marginBottom: 20 }}>
        <h1 className="app-title" style={{ marginBottom: 4 }}>
          {isCoupang ? "\uD83D\uDED2 \uCFE0\uD321 \uB9AC\uBDF0 \uD3B8\uC9D1" : "\uD83D\uDCD7 \uBE14\uB85C\uADF8 \uD3B8\uC9D1"}
        </h1>
        {data.restaurant_name && (
          <p className="app-subtitle" style={{ textAlign: "left" }}>
            \uD83C\uDF74 {data.restaurant_name}
            {data.address && ` \xB7 ${data.address}`}
          </p>
        )}
      </div>

      {/* \uC601\uC218\uC99D \uC815\uBCF4 (blog only) */}
      {!isCoupang && data.receipt_info && (
        <div className="receipt-box">
          <div className="receipt-box-title">\uD83E\uDDFE \uC601\uC218\uC99D \uC778\uC2DD \uC815\uBCF4</div>
          {data.receipt_info.restaurant_name && <div className="receipt-row"><span className="receipt-label">\uC0C1\uD638\uBA85</span><span className="receipt-value">{data.receipt_info.restaurant_name}</span></div>}
          {data.receipt_info.address && <div className="receipt-row"><span className="receipt-label">\uC8FC\uC18C</span><span className="receipt-value">{data.receipt_info.address}</span></div>}
          {data.receipt_info.phone && <div className="receipt-row"><span className="receipt-label">\uC804\uD654</span><span className="receipt-value">{data.receipt_info.phone}</span></div>}
          {data.receipt_info.menu_items && data.receipt_info.menu_items.length > 0 && (
            <div className="receipt-row">
              <span className="receipt-label">\uBA54\uB274</span>
              <span className="receipt-value">{data.receipt_info.menu_items.map((m) => `${m.name} ${m.price}`).join(" / ")}</span>
            </div>
          )}
          {data.receipt_info.total_amount && <div className="receipt-row"><span className="receipt-label">\uD569\uACC4</span><span className="receipt-value">{data.receipt_info.total_amount}</span></div>}
        </div>
      )}

      {/* \uD3B8\uC9D1 \uC601\uC5ED */}
      <div className="preview-section">
        <div className="preview-section-head">
          <span className="preview-section-title">
            {isCoupang ? "\uD83D\uDED2 \uCFE0\uD321 \uB9AC\uBDF0" : "\uD83D\uDCD7 \uB124\uC774\uBC84 \uBE14\uB85C\uADF8"}
          </span>
          <button className="copy-btn" onClick={handleCopy}>
            {copied ? "\u2713 \uBCF5\uC0AC\uB428" : "\uC804\uCCB4 \uBCF5\uC0AC"}
          </button>
        </div>
        <div style={{ padding: 14 }}>
          <div className="form-field" style={{ marginBottom: 10 }}>
            <label className="form-label" style={{ fontSize: 11 }}>
              {isCoupang ? "\uD55C\uC904\uD3C9" : "\uC81C\uBAA9"}
            </label>
            <input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="form-field" style={{ marginBottom: isCoupang ? 0 : 10 }}>
            <label className="form-label" style={{ fontSize: 11 }}>
              {isCoupang ? "\uB9AC\uBDF0 \uBCF8\uBB38" : "\uBCF8\uBB38"}
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
              <label className="form-label" style={{ fontSize: 11 }}>\uD574\uC2DC\uD0DC\uADF8</label>
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

      {/* \uC800\uC7A5 */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button className="app-secondary-btn" onClick={handleSave} disabled={saving} style={{ flex: 1 }}>
          {saving ? "\uC800\uC7A5 \uC911..." : "\uD83D\uDCBE \uC218\uC815 \uB0B4\uC6A9 \uC800\uC7A5"}
        </button>
      </div>
      {saveMsg && (
        <p className={saveMsg.startsWith("\uC624\uB958") ? "error-text" : "success-text"}>{saveMsg}</p>
      )}

      <hr className="divider" />

      {/* \uBC1C\uD589 \uC548\uB0B4 */}
      {isCoupang ? (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>\uD83D\uDED2 \uCFE0\uD321 \uB9AC\uBDF0 \uAC8C\uC2DC</h2>
          <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#9a3412" }}>
            1. \uC704 <strong>\u300C\uC804\uCCB4 \uBCF5\uC0AC\u300D</strong> \uBC84\uD2BC\uC73C\uB85C \uB9AC\uBDF0 \uBCF5\uC0AC
            <br />
            2. \uCFE0\uD321 \uC571\uC5D0\uC11C \uD574\uB2F9 \uC0C1\uD488 \uAD6C\uB9E4 \uB0B4\uC5ED \u2192 \uBBF8\uB9AC\uBCF4\uAE30 \u2192 \uD6C4\uAE30 \uC791\uC131\uC5D0 \uBD99\uC5EC\uB123\uAE30
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>\uD83D\uDCD7 \uB124\uC774\uBC84 \uBE14\uB85C\uADF8 \uBC1C\uD589</h2>
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#166534" }}>
            1. \uC704 <strong>\u300C\uC804\uCCB4 \uBCF5\uC0AC\u300D</strong> \uBC84\uD2BC\uC73C\uB85C \uBE14\uB85C\uADF8 \uB0B4\uC6A9 \uBCF5\uC0AC
            <br />
            2.{" "}
            <a
              href="https://blog.naver.com/PostWriteForm.naver"
              target="_blank"
              rel="noreferrer"
              style={{ color: "#16a34a", fontWeight: 600 }}
            >
              \uB124\uC774\uBC84 \uBE14\uB85C\uADF8 \uAE00\uC4F0\uAE30 \uC5F4\uAE30 \u2192
            </a>{" "}
            \uC5D0\uC11C \uBD99\uC5EC\uB123\uAE30
          </div>
        </div>
      )}

      <div className="app-link-row">
        <Link href="/drafts">\uBAA9\uB85D\uC73C\uB85C</Link>
        <span>\xB7</span>
        <Link href="/drafts/new">\uC0C8 \uD3EC\uC2A4\uD305</Link>
      </div>
    </div>
  );
}
