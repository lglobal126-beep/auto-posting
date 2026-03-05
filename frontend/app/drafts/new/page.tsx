"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useRequireAuth } from "@/hooks/useRequireAuth";

type PostType = "blog" | "coupang";

type FileItem = {
  file: File;
  type: "image" | "receipt";
  preview: string;
};

type ReceiptInfo = {
  restaurant_name?: string | null;
  address?: string | null;
  phone?: string | null;
  menu_items?: { name: string; price: string }[] | null;
  total_amount?: string | null;
  visit_date?: string | null;
};

type DraftPreview = {
  draft_id: string;
  post_type: string;
  restaurant_name?: string | null;
  address?: string | null;
  receipt_info?: ReceiptInfo | null;
  blog_title: string;
  blog_body: string;
  blog_hashtags: string[];
};

export default function NewDraftPage() {
  const router = useRouter();
  const { checking } = useRequireAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [postType, setPostType] = useState<PostType>("blog");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [coupangUrl, setCoupangUrl] = useState("");
  const [memo, setMemo] = useState("");
  const [keywords, setKeywords] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<DraftPreview | null>(null);
  const [copied, setCopied] = useState(false);

  const addFiles = (selectedFiles: File[]) => {
    const newItems: FileItem[] = selectedFiles.map((file) => {
      const isReceipt =
        file.name.toLowerCase().includes("receipt") ||
        file.name.toLowerCase().includes("\uC601\uC218\uC99D");
      return {
        file,
        type: isReceipt ? "receipt" : "image",
        preview: URL.createObjectURL(file),
      };
    });
    setFiles((prev) => [...prev, ...newItems]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files || []));
    e.target.value = "";
  };

  const toggleType = (idx: number) => {
    setFiles((prev) =>
      prev.map((f, i) =>
        i === idx ? { ...f, type: f.type === "receipt" ? "image" : "receipt" } : f
      )
    );
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const switchMode = (mode: PostType) => {
    setPostType(mode);
    setFiles([]);
    setPreview(null);
    setError(null);
  };

  const handleSubmit = async () => {
    if (postType === "blog" && files.length === 0) {
      setError("\uC0AC\uC9C4 \uB610\uB294 \uC601\uC218\uC99D\uC744 \uCD5C\uC18C 1\uC7A5 \uC5C5\uB85C\uB4DC\uD574\uC8FC\uC138\uC694.");
      return;
    }
    if (postType === "coupang" && !coupangUrl.trim()) {
      setError("\uCFE0\uD321 \uC0C1\uD488 URL\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694.");
      return;
    }
    setError(null);
    setLoading(true);
    setPreview(null);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error("\uB85C\uADF8\uC778 \uC138\uC158\uC774 \uC720\uD6A8\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uB85C\uADF8\uC778\uD574\uC8FC\uC138\uC694.");
      }

      const imagePaths: string[] = [];
      let receiptPath: string | null = null;

      for (const item of files) {
        const ext = item.file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const filePath = `uploads/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("media")
          .upload(filePath, item.file);

        if (uploadError) throw uploadError;

        if (item.type === "image") imagePaths.push(filePath);
        if (item.type === "receipt") receiptPath = filePath;
      }

      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
      if (!apiBase) throw new Error("\uBC31\uC5D4\uB4DC API \uC8FC\uC18C\uAC00 \uC124\uC815\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4.");

      const body: Record<string, unknown> = {
        post_type: postType,
        image_paths: imagePaths,
        video_paths: [],
        memo,
      };

      if (postType === "blog") {
        body.receipt_path = receiptPath;
        body.keywords = keywords
          ? keywords.split(",").map((k) => k.trim()).filter(Boolean)
          : undefined;
      } else {
        body.coupang_url = coupangUrl.trim();
      }

      const res = await fetch(`${apiBase}/drafts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`\uCD08\uC548 \uC0DD\uC131 \uC2E4\uD328 (${res.status})`);
      const result = await res.json();

      if (result?.data?.draft_id) {
        setPreview(result.data as DraftPreview);
      } else {
        throw new Error("\uCD08\uC548 \uC0DD\uC131 \uACB0\uACFC\uB97C \uD574\uC11D\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "\uC5C5\uB85C\uB4DC \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!preview) return;
    const text =
      preview.post_type === "coupang"
        ? `${preview.blog_title}\n\n${preview.blog_body}`
        : `${preview.blog_title}\n\n${preview.blog_body}\n\n${preview.blog_hashtags.join(" ")}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (checking) {
    return (
      <div className="app-card app-card-sm">
        <p className="app-subtitle">\uB85C\uADF8\uC778 \uC0C1\uD0DC\uB97C \uD655\uC778\uD558\uB294 \uC911\uC785\uB2C8\uB2E4...</p>
      </div>
    );
  }

  return (
    <div className="app-card">
      <div className="app-card-header">
        <div className="app-icon-circle">\uD83D\uDCDD</div>
        <h1 className="app-title">\uC0C8 \uD3EC\uC2A4\uD305 \uB9CC\uB4E4\uAE30</h1>
      </div>

      {/* \uBAA8\uB4DC \uD1A0\uAE00 */}
      <div className="form-field">
        <label className="form-label">\uD3EC\uC2A4\uD305 \uC885\uB958</label>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => switchMode("blog")}
            style={{
              flex: 1, padding: "12px 16px", borderRadius: 10,
              border: postType === "blog" ? "2px solid #16a34a" : "2px solid #e5e7eb",
              background: postType === "blog" ? "#f0fdf4" : "#fff",
              color: postType === "blog" ? "#166534" : "#6b7280",
              fontWeight: postType === "blog" ? 700 : 400,
              cursor: "pointer", fontSize: 14,
            }}
          >
            \uD83D\uDCD7 \uB124\uC774\uBC84 \uBE14\uB85C\uADF8
          </button>
          <button
            onClick={() => switchMode("coupang")}
            style={{
              flex: 1, padding: "12px 16px", borderRadius: 10,
              border: postType === "coupang" ? "2px solid #ea580c" : "2px solid #e5e7eb",
              background: postType === "coupang" ? "#fff7ed" : "#fff",
              color: postType === "coupang" ? "#9a3412" : "#6b7280",
              fontWeight: postType === "coupang" ? 700 : 400,
              cursor: "pointer", fontSize: 14,
            }}
          >
            \uD83D\uDED2 \uCFE0\uD321 \uB9AC\uBDF0
          </button>
        </div>
      </div>

      {/* \uBE14\uB85C\uADF8: \uC0AC\uC9C4 \uC5C5\uB85C\uB4DC */}
      {postType === "blog" && (
        <div className="form-field">
          <label className="form-label">\uC0AC\uC9C4 / \uC601\uC218\uC99D</label>
          <div
            style={{ border: "2px dashed #d1d5db", borderRadius: 12, padding: "20px 16px", textAlign: "center", cursor: "pointer", background: "#fafafa" }}
            onClick={() => fileInputRef.current?.click()}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>\uD83D\uDCC2</div>
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>\uD074\uB9AD\uD558\uC5EC \uC0AC\uC9C4\xB7\uC601\uC218\uC99D\uC744 \uC120\uD0DD\uD558\uC138\uC694</p>
            <p style={{ fontSize: 11, color: "#9ca3af", margin: "4px 0 0" }}>
              \uD30C\uC77C\uBA85\uC5D0 &quot;\uC601\uC218\uC99D&quot; \uB610\uB294 &quot;receipt&quot;\uAC00 \uC788\uC73C\uBA74 \uC790\uB3D9\uC73C\uB85C \uC601\uC218\uC99D\uC73C\uB85C \uBD84\uB958\uB429\uB2C8\uB2E4
            </p>
          </div>
          <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" onChange={handleFileChange} style={{ display: "none" }} />
          {files.length > 0 && (
            <div className="file-preview-list">
              {files.map((item, idx) => (
                <div key={idx} className="file-preview-item">
                  <img src={item.preview} alt="" />
                  <button className="file-remove-btn" onClick={() => removeFile(idx)} title="\uC81C\uAC70">\u2715</button>
                  <button
                    className="receipt-toggle-btn"
                    onClick={() => toggleType(idx)}
                    style={{ background: item.type === "receipt" ? "#fde68a" : "#bfdbfe", color: item.type === "receipt" ? "#92400e" : "#1e40af" }}
                  >
                    {item.type === "receipt" ? "\uC601\uC218\uC99D" : "\uC74C\uC2DD"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* \uCFE0\uD321: URL + \uC120\uD0DD \uC0AC\uC9C4 */}
      {postType === "coupang" && (
        <>
          <div className="form-field">
            <label className="form-label">\uCFE0\uD321 \uC0C1\uD488 URL</label>
            <input
              type="url" className="form-input" value={coupangUrl}
              onChange={(e) => setCoupangUrl(e.target.value)}
              placeholder="https://www.coupang.com/vp/products/..."
            />
            <p className="form-help">\uCFE0\uD321 \uC0C1\uD488 \uD398\uC774\uC9C0 URL\uC744 \uBD99\uC5EC\uB123\uC73C\uBA74 AI\uAC00 \uC0C1\uD488 \uC815\uBCF4\uB97C \uBD84\uC11D\uD574 \uB9AC\uBDF0\uB97C \uC0DD\uC131\uD569\uB2C8\uB2E4.</p>
          </div>
          <div className="form-field">
            <label className="form-label">\uC0C1\uD488 \uC0AC\uC9C4 (\uC120\uD0DD)</label>
            <div
              style={{ border: "2px dashed #d1d5db", borderRadius: 12, padding: "16px", textAlign: "center", cursor: "pointer", background: "#fafafa" }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div style={{ fontSize: 24, marginBottom: 4 }}>\uD83D\uDCF7</div>
              <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>\uC2E4\uC81C \uC218\uB839\uD55C \uC0C1\uD488 \uC0AC\uC9C4\uC744 \uC62C\uB9AC\uBA74 \uB354 \uC0DD\uC0DD\uD55C \uB9AC\uBDF0\uAC00 \uC0DD\uC131\uB429\uB2C8\uB2E4 (\uC120\uD0DD)</p>
            </div>
            <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
            {files.length > 0 && (
              <div className="file-preview-list">
                {files.map((item, idx) => (
                  <div key={idx} className="file-preview-item">
                    <img src={item.preview} alt="" />
                    <button className="file-remove-btn" onClick={() => removeFile(idx)} title="\uC81C\uAC70">\u2715</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* \uBA54\uBAA8 */}
      <div className="form-field">
        <label className="form-label">{postType === "blog" ? "\uBC29\uBB38 \uBA54\uBAA8" : "\uC0AC\uC6A9 \uBA54\uBAA8"}</label>
        <textarea
          className="form-textarea" value={memo} onChange={(e) => setMemo(e.target.value)} style={{ minHeight: 100 }}
          placeholder={
            postType === "blog"
              ? "\uC0AC\uC9C4\uC73C\uB85C \uC54C \uC218 \uC5C6\uB294 \uAC83\uB4E4\uC744 \uC801\uC5B4\uC8FC\uC138\uC694\n\n\uC608)\n\uCE5C\uAD6C\uB791 \uC800\uB140 \uBC29\uBB38, \uC6E8\uC774\uD305 15\uBD84\n\uB3FC\uC9C0\uAEF3\uB370\uAE30 \uD0F1\uD0F1\uD558\uACE0 \uCF9D\uAE40\n\uC7AC\uBC29\uBB38 \uC758\uC0AC \uC788\uC74C"
              : "\uC0AC\uC6A9 \uD6C4\uAE30\uB97C \uAC04\uB2E8\uD788 \uC801\uC5B4\uC8FC\uC138\uC694\n\n\uC608)\n\uBC30\uC1A1 3\uC77C \uAC78\uB9BC, \uD3EC\uC7A5 \uAF54\uAF54\uD568\n\uC2E4\uC81C \uC368\uBCF4\uB2C8 \uC18C\uC74C\uC774 \uC608\uC0C1\uBCF4\uB2E4 \uC801\uC74C\n\uC0C9\uC0C1\uC774 \uC0AC\uC9C4\uACFC \uAC70\uC758 \uB3D9\uC77C\uD568, \uC7AC\uAD6C\uB9E4 \uC758\uC0AC \uC788\uC74C"
          }
        />
      </div>

      {/* \uBE14\uB85C\uADF8 \uC804\uC6A9: \uD0A4\uC6CC\uB4DC */}
      {postType === "blog" && (
        <div className="form-field">
          <label className="form-label">\uD0A4\uC6CC\uB4DC (\uC120\uD0DD)</label>
          <textarea
            className="form-textarea" value={keywords} onChange={(e) => setKeywords(e.target.value)} style={{ minHeight: 80 }}
            placeholder={"\uCF64\uB9C8\uB85C \uAD6C\uBD84\uD574\uC11C \uC785\uB825\uD558\uC138\uC694\n\n\uC608)\n\uAC15\uB0A8 \uACE0\uAE30\uC9D1, \uB3FC\uC9C0\uAEF3\uB370\uAE30 \uB9DB\uC9D1,\n\uB370\uC774\uD2B8, \uD68C\uC2DD, \uC8FC\uCC28\uAC00\uB2A5"}
          />
          <p className="form-help">\uC9C0\uC5ED\uBA85, \uBC29\uBB38 \uBAA9\uC801, \uC74C\uC2DD \uD2B9\uC9D5\uC744 \uB123\uC73C\uBA74 \uAC80\uC0C9 \uB178\uCD9C\uC5D0 \uB3C4\uC6C0\uB3FC\uC694.</p>
        </div>
      )}

      {error && <p className="error-text">{error}</p>}

      <button className="app-primary-btn" onClick={handleSubmit} disabled={loading}>
        {loading
          ? "AI\uAC00 \uAE00\uC744 \uC791\uC131 \uC911\uC785\uB2C8\uB2E4... (30~60\uCD08 \uC18C\uC694)"
          : postType === "blog"
          ? "AI\uB85C \uBE14\uB85C\uADF8 \uAE00 \uC0DD\uC131\uD558\uAE30"
          : "AI\uB85C \uCFE0\uD321 \uB9AC\uBDF0 \uC0DD\uC131\uD558\uAE30"}
      </button>

      {/* \uC601\uC218\uC99D \uC778\uC2DD \uACB0\uACFC */}
      {preview?.receipt_info && (
        <div className="receipt-box" style={{ marginTop: 24 }}>
          <div className="receipt-box-title">\uD83E\uDDFE \uC601\uC218\uC99D \uC778\uC2DD \uACB0\uACFC</div>
          {preview.receipt_info.restaurant_name && <div className="receipt-row"><span className="receipt-label">\uC0C1\uD638\uBA85</span><span className="receipt-value">{preview.receipt_info.restaurant_name}</span></div>}
          {preview.receipt_info.address && <div className="receipt-row"><span className="receipt-label">\uC8FC\uC18C</span><span className="receipt-value">{preview.receipt_info.address}</span></div>}
          {preview.receipt_info.phone && <div className="receipt-row"><span className="receipt-label">\uC804\uD654</span><span className="receipt-value">{preview.receipt_info.phone}</span></div>}
          {preview.receipt_info.menu_items && preview.receipt_info.menu_items.length > 0 && (
            <div className="receipt-row"><span className="receipt-label">\uBA54\uB274</span><span className="receipt-value">{preview.receipt_info.menu_items.map((m) => `${m.name} ${m.price}`).join(", ")}</span></div>
          )}
          {preview.receipt_info.total_amount && <div className="receipt-row"><span className="receipt-label">\uD569\uACC4</span><span className="receipt-value">{preview.receipt_info.total_amount}</span></div>}
        </div>
      )}

      {/* \uC0DD\uC131 \uACB0\uACFC */}
      {preview && (
        <div style={{ marginTop: 24 }}>
          <div className="preview-section">
            <div className="preview-section-head">
              <span className="preview-section-title">
                {preview.post_type === "coupang" ? "\uD83D\uDED2 \uCFE0\uD321 \uB9AC\uBDF0" : "\uD83D\uDCD7 \uB124\uC774\uBC84 \uBE14\uB85C\uADF8"}
              </span>
              <button className="copy-btn" onClick={handleCopy}>{copied ? "\u2713 \uBCF5\uC0AC\uB428" : "\uBCF5\uC0AC"}</button>
            </div>
            <div className="preview-body">
              <div className="preview-title">{preview.blog_title}</div>
              <div style={{ fontSize: 12, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                {preview.blog_body.slice(0, 500)}{preview.blog_body.length > 500 && "..."}
              </div>
              {preview.blog_hashtags.length > 0 && (
                <div className="preview-hashtags">{preview.blog_hashtags.join(" ")}</div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="app-primary-btn" style={{ flex: 1 }} onClick={() => router.push(`/drafts/${preview.draft_id}`)}>
              \uC0C1\uC138 \uD3B8\uC9D1\uD558\uAE30 \u2192
            </button>
          </div>
        </div>
      )}

      <div className="app-link-row">
        <Link href="/">\uD648\uC73C\uB85C</Link>
        <span>\xB7</span>
        <Link href="/drafts">\uB0B4 \uCD08\uC548 \uBAA9\uB85D</Link>
      </div>
    </div>
  );
}
