"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useRequireAuth } from "@/hooks/useRequireAuth";

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
  restaurant_name?: string | null;
  address?: string | null;
  receipt_info?: ReceiptInfo | null;
  blog_title: string;
  blog_body: string;
  blog_hashtags: string[];
  instagram_caption: string;
  instagram_hashtags: string[];
};

export default function NewDraftPage() {
  const router = useRouter();
  const { checking } = useRequireAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<FileItem[]>([]);
  const [memo, setMemo] = useState("");
  const [keywords, setKeywords] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<DraftPreview | null>(null);
  const [copied, setCopied] = useState<"blog" | "insta" | null>(null);

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

  const handleSubmit = async () => {
    if (files.length === 0) {
      setError("사진 또는 영수증을 최소 1장 업로드해주세요.");
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

      const res = await fetch(`${apiBase}/drafts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          image_paths: imagePaths,
          video_paths: [],
          receipt_path: receiptPath,
          memo,
          keywords: keywords ? keywords.split(",").map((k) => k.trim()).filter(Boolean) : undefined,
        }),
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

  const handleCopy = async (type: "blog" | "insta") => {
    if (!preview) return;
    let text = "";
    if (type === "blog") {
      text = `${preview.blog_title}\n\n${preview.blog_body}\n\n${preview.blog_hashtags.join(" ")}`;
    } else {
      text = `${preview.instagram_caption}\n\n${preview.instagram_hashtags.join(" ")}`;
    }
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
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
        <p className="app-subtitle">
          식당 사진과 영수증을 업로드하면 AI가 블로그·인스타 글을 자동으로 작성해드립니다.
        </p>
      </div>

      {/* 파일 업로드 */}
      <div className="form-field">
        <label className="form-label">사진 / 영수증</label>
        <div
          style={{
            border: "2px dashed #d1d5db",
            borderRadius: 12,
            padding: "20px 16px",
            textAlign: "center",
            cursor: "pointer",
            background: "#fafafa",
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
          <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
            클릭하여 사진·영수증을 선택하세요
          </p>
          <p style={{ fontSize: 11, color: "#9ca3af", margin: "4px 0 0" }}>
            파일명에 &quot;영수증&quot; 또는 &quot;receipt&quot;가 있으면 자동으로 영수증으로 분류됩니다
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        {files.length > 0 && (
          <div className="file-preview-list">
            {files.map((item, idx) => (
              <div key={idx} className="file-preview-item">
                <img src={item.preview} alt="" />
                <button
                  className="file-remove-btn"
                  onClick={() => removeFile(idx)}
                  title="제거"
                >
                  ✕
                </button>
                <button
                  className="receipt-toggle-btn"
                  onClick={() => toggleType(idx)}
                  style={{
                    background: item.type === "receipt" ? "#fde68a" : "#bfdbfe",
                    color: item.type === "receipt" ? "#92400e" : "#1e40af",
                  }}
                  title="클릭하여 종류 변경"
                >
                  {item.type === "receipt" ? "영수증" : "음식"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="two-column">
        <div className="form-field">
          <label className="form-label">방문 메모</label>
          <textarea
            className="form-textarea"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            style={{ minHeight: 120 }}
            placeholder={"사진으로 알 수 없는 것들을 적어주세요 😊\n\n예)\n친구랑 저녁 방문, 웨이팅 15분\n돼지껍데기 탱탱하고 쫄깃, 특제소스 차별화됨\n김치말이국수 시원하고 새콤 — 마무리로 딱\n직원 친절, 테이블 간격 넓어 쾌적\n건물 뒤 공영주차장 이용 가능\n재방문 의사 있음"}
          />
          <p className="form-help">맛·식감·서비스·분위기·동행인·웨이팅 등 사진에 안 찍히는 경험을 적을수록 글이 풍부해져요.</p>
        </div>
        <div className="form-field">
          <label className="form-label">키워드 (선택)</label>
          <textarea
            className="form-textarea"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            style={{ minHeight: 120 }}
            placeholder={"콤마로 구분해서 입력하세요\n\n예)\n강남 고기집, 돼지껍데기 맛집,\n데이트, 회식, 탄력있는 껍데기,\n특제소스, 주차가능, 아늑한 분위기"}
          />
          <p className="form-help">지역명, 방문 목적(데이트·회식), 음식 특징, 분위기를 넣으면 검색 노출에 도움돼요.</p>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      <button
        className="app-primary-btn"
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? "AI가 글을 작성 중입니다... (30~60초 소요)" : "AI로 초안 생성하기"}
      </button>

      {/* 영수증 정보 표시 */}
      {preview?.receipt_info && (
        <div className="receipt-box" style={{ marginTop: 24 }}>
          <div className="receipt-box-title">🧾 영수증 인식 결과</div>
          {preview.receipt_info.restaurant_name && (
            <div className="receipt-row">
              <span className="receipt-label">상호명</span>
              <span className="receipt-value">{preview.receipt_info.restaurant_name}</span>
            </div>
          )}
          {preview.receipt_info.address && (
            <div className="receipt-row">
              <span className="receipt-label">주소</span>
              <span className="receipt-value">{preview.receipt_info.address}</span>
            </div>
          )}
          {preview.receipt_info.phone && (
            <div className="receipt-row">
              <span className="receipt-label">전화</span>
              <span className="receipt-value">{preview.receipt_info.phone}</span>
            </div>
          )}
          {preview.receipt_info.menu_items && preview.receipt_info.menu_items.length > 0 && (
            <div className="receipt-row">
              <span className="receipt-label">메뉴</span>
              <span className="receipt-value">
                {preview.receipt_info.menu_items.map((m) => `${m.name} ${m.price}`).join(", ")}
              </span>
            </div>
          )}
          {preview.receipt_info.total_amount && (
            <div className="receipt-row">
              <span className="receipt-label">합계</span>
              <span className="receipt-value">{preview.receipt_info.total_amount}</span>
            </div>
          )}
        </div>
      )}

      {/* 생성 결과 미리보기 */}
      {preview && (
        <div style={{ marginTop: preview.receipt_info ? 0 : 24 }}>
          <div className="preview-grid">
            {/* 네이버 블로그 */}
            <div className="preview-section">
              <div className="preview-section-head">
                <span className="preview-section-title">📗 네이버 블로그</span>
                <button
                  className="copy-btn"
                  onClick={() => handleCopy("blog")}
                >
                  {copied === "blog" ? "✓ 복사됨" : "복사"}
                </button>
              </div>
              <div className="preview-body">
                <div className="preview-title">{preview.blog_title}</div>
                <div style={{ fontSize: 12, lineHeight: 1.7 }}>
                  {preview.blog_body.slice(0, 400)}
                  {preview.blog_body.length > 400 && "..."}
                </div>
                <div className="preview-hashtags">
                  {preview.blog_hashtags.join(" ")}
                </div>
              </div>
            </div>

            {/* 인스타그램 */}
            <div className="preview-section">
              <div className="preview-section-head">
                <span className="preview-section-title">📸 인스타그램</span>
                <button
                  className="copy-btn"
                  onClick={() => handleCopy("insta")}
                >
                  {copied === "insta" ? "✓ 복사됨" : "복사"}
                </button>
              </div>
              <div className="preview-body">
                <div style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>
                  {preview.instagram_caption}
                </div>
                <div className="preview-hashtags">
                  {preview.instagram_hashtags.join(" ")}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="app-primary-btn"
              style={{ flex: 1 }}
              onClick={() => router.push(`/drafts/${preview.draft_id}`)}
            >
              상세 편집 · 발행하기 →
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
