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
        file.name.toLowerCase().includes("영수증");
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
      setError("사진 또는 영수증을 최소 1장 업로드해주세요.");
      return;
    }
    if (postType === "coupang" && !coupangUrl.trim()) {
      setError("쿠팡 상품 URL을 입력해주세요.");
      return;
    }
    setError(null);
    setLoading(true);
    setPreview(null);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error("로그인 세션이 유효하지 않습니다. 다시 로그인해주세요.");
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
      if (!apiBase) throw new Error("백엔드 API 주소가 설정되지 않았습니다.");

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

      if (!res.ok) throw new Error(`초안 생성 실패 (${res.status})`);
      const result = await res.json();

      if (result?.data?.draft_id) {
        setPreview(result.data as DraftPreview);
      } else {
        throw new Error("초안 생성 결과를 해석하지 못했습니다.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "업로드 중 오류가 발생했습니다.";
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
        <p className="app-subtitle">로그인 상태를 확인하는 중입니다...</p>
      </div>
    );
  }

  return (
    <div className="app-card">
      <div className="app-card-header">
        <div className="app-icon-circle">📝</div>
        <h1 className="app-title">새 포스팅 만들기</h1>
      </div>

      {/* 모드 토글 */}
      <div className="form-field">
        <label className="form-label">포스팅 종류</label>
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
            📗 네이버 블로그
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
            🛍️ 쿠팡 리뷰
          </button>
        </div>
      </div>

      {/* 블로그: 사진 업로드 */}
      {postType === "blog" && (
        <div className="form-field">
          <label className="form-label">사진 / 영수증</label>
          <div
            style={{ border: "2px dashed #d1d5db", borderRadius: 12, padding: "20px 16px", textAlign: "center", cursor: "pointer", background: "#fafafa" }}
            onClick={() => fileInputRef.current?.click()}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>클릭하여 사진·영수증을 선택하세요</p>
            <p style={{ fontSize: 11, color: "#9ca3af", margin: "4px 0 0" }}>
              파일명에 &quot;영수증&quot; 또는 &quot;receipt&quot;가 있으면 자동으로 영수증으로 분류됩니다
            </p>
          </div>
          <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" onChange={handleFileChange} style={{ display: "none" }} />
          {files.length > 0 && (
            <div className="file-preview-list">
              {files.map((item, idx) => (
                <div key={idx} className="file-preview-item">
                  <img src={item.preview} alt="" />
                  <button className="file-remove-btn" onClick={() => removeFile(idx)} title="제거">✕</button>
                  <button
                    className="receipt-toggle-btn"
                    onClick={() => toggleType(idx)}
                    style={{ background: item.type === "receipt" ? "#fde68a" : "#bfdbfe", color: item.type === "receipt" ? "#92400e" : "#1e40af" }}
                  >
                    {item.type === "receipt" ? "영수증" : "음식"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 쿠팡: URL + 선택 사진 */}
      {postType === "coupang" && (
        <>
          <div className="form-field">
            <label className="form-label">쿠팡 상품 URL</label>
            <input
              type="url" className="form-input" value={coupangUrl}
              onChange={(e) => setCoupangUrl(e.target.value)}
              placeholder="https://www.coupang.com/vp/products/..."
            />
            <p className="form-help">쿠팡 상품 페이지 URL을 붙여넣으면 AI가 상품 정보를 분석해 리뷰를 생성합니다.</p>
          </div>
          <div className="form-field">
            <label className="form-label">상품 사진 (선택)</label>
            <div
              style={{ border: "2px dashed #d1d5db", borderRadius: 12, padding: "16px", textAlign: "center", cursor: "pointer", background: "#fafafa" }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div style={{ fontSize: 24, marginBottom: 4 }}>📷</div>
              <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>실제 수령한 상품 사진을 올리면 더 생생한 리뷰가 생성됩니다 (선택)</p>
            </div>
            <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
            {files.length > 0 && (
              <div className="file-preview-list">
                {files.map((item, idx) => (
                  <div key={idx} className="file-preview-item">
                    <img src={item.preview} alt="" />
                    <button className="file-remove-btn" onClick={() => removeFile(idx)} title="제거">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* 메모 */}
      <div className="form-field">
        <label className="form-label">{postType === "blog" ? "방문 메모" : "사용 메모"}</label>
        <textarea
          className="form-textarea" value={memo} onChange={(e) => setMemo(e.target.value)} style={{ minHeight: 100 }}
          placeholder={
            postType === "blog"
              ? "사진으로 알 수 없는 것들을 적어주세요\n\n예)\n친구랑 저녁 방문, 웨이팅 15분\n돼지껍데기 탱탱하고 쫄깃, 특제소스 차별화됨\n재방문 의사 있음"
              : "사용 후기를 간단히 적어주세요\n\n예)\n배송 3일 걸림, 포장 꼼꼼함\n실제로 써보니 소음이 예상보다 적음\n색상이 사진과 거의 동일함, 재구매 의사 있음"
          }
        />
      </div>

      {/* 블로그 전용: 키워드 */}
      {postType === "blog" && (
        <div className="form-field">
          <label className="form-label">키워드 (선택)</label>
          <textarea
            className="form-textarea" value={keywords} onChange={(e) => setKeywords(e.target.value)} style={{ minHeight: 80 }}
            placeholder={"콤마로 구분해서 입력하세요\n\n예)\n강남 고기집, 돼지껍데기 맛집,\n데이트, 회식, 주차가능"}
          />
          <p className="form-help">지역명, 방문 목적, 음식 특징을 넣으면 검색 노출에 도움돼요.</p>
        </div>
      )}

      {error && <p className="error-text">{error}</p>}

      <button className="app-primary-btn" onClick={handleSubmit} disabled={loading}>
        {loading
          ? "AI가 글을 작성 중입니다... (30~60초 소요)"
          : postType === "blog"
          ? "AI로 블로그 글 생성하기"
          : "AI로 쿠팡 리뷰 생성하기"}
      </button>

      {/* 영수증 인식 결과 */}
      {preview?.receipt_info && (
        <div className="receipt-box" style={{ marginTop: 24 }}>
          <div className="receipt-box-title">🧾 영수증 인식 결과</div>
          {preview.receipt_info.restaurant_name && <div className="receipt-row"><span className="receipt-label">상호명</span><span className="receipt-value">{preview.receipt_info.restaurant_name}</span></div>}
          {preview.receipt_info.address && <div className="receipt-row"><span className="receipt-label">주소</span><span className="receipt-value">{preview.receipt_info.address}</span></div>}
          {preview.receipt_info.phone && <div className="receipt-row"><span className="receipt-label">전화</span><span className="receipt-value">{preview.receipt_info.phone}</span></div>}
          {preview.receipt_info.menu_items && preview.receipt_info.menu_items.length > 0 && (
            <div className="receipt-row"><span className="receipt-label">메뉴</span><span className="receipt-value">{preview.receipt_info.menu_items.map((m) => `${m.name} ${m.price}`).join(", ")}</span></div>
          )}
          {preview.receipt_info.total_amount && <div className="receipt-row"><span className="receipt-label">합계</span><span className="receipt-value">{preview.receipt_info.total_amount}</span></div>}
        </div>
      )}

      {/* 생성 결과 */}
      {preview && (
        <div style={{ marginTop: 24 }}>
          <div className="preview-section">
            <div className="preview-section-head">
              <span className="preview-section-title">
                {preview.post_type === "coupang" ? "🛍️ 쿠팡 리뷰" : "📗 네이버 블로그"}
              </span>
              <button className="copy-btn" onClick={handleCopy}>{copied ? "✓ 복사됨" : "복사"}</button>
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
              상세 편집하기 →
            </button>
          </div>
        </div>
      )}

      <div className="app-link-row">
        <Link href="/">홈으로</Link>
        <span>·</span>
        <Link href="/drafts">내 초안 목록</Link>
      </div>
    </div>
  );
}
