"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useRequireAuth } from "@/hooks/useRequireAuth";

type ShortsResult = {
  script: string;
  audio_url: string;
  result_video_url: string;
};

export default function NewShortsPage() {
  const { checking } = useRequireAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [restaurantName, setRestaurantName] = useState("");
  const [area, setArea] = useState("");
  const [memo, setMemo] = useState("");

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ShortsResult | null>(null);

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoFile(file);
    setVideoDuration(null);
    const url = URL.createObjectURL(file);
    setVideoPreview(url);
    // 영상 길이 추출
    const tempVideo = document.createElement("video");
    tempVideo.preload = "metadata";
    tempVideo.onloadedmetadata = () => {
      setVideoDuration(Math.round(tempVideo.duration));
      URL.revokeObjectURL(tempVideo.src);
    };
    tempVideo.src = url;
    setResult(null);
    e.target.value = "";
  };

  const handleSubmit = async () => {
    if (!videoFile) { setError("영상을 업로드해주세요."); return; }
    if (!restaurantName.trim()) { setError("가게 상호명을 입력해주세요."); return; }
    if (!area.trim()) { setError("지역을 입력해주세요."); return; }

    setError(null);
    setLoading(true);
    setResult(null);

    try {
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !session?.access_token) throw new Error("로그인 세션이 유효하지 않습니다.");

      // 1) 영상 Supabase 업로드
      setStep("영상 업로드 중...");
      const ext = videoFile.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const filePath = `uploads/${fileName}`;

      const { error: uploadErr } = await supabase.storage.from("media").upload(filePath, videoFile);
      if (uploadErr) throw uploadErr;

      // 2) 숏츠 생성 API 호출
      setStep("AI 스크립트 생성 중...");
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
      if (!apiBase) throw new Error("백엔드 API 주소가 설정되지 않았습니다.");

      const res = await fetch(`${apiBase}/shorts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          video_path: filePath,
          restaurant_name: restaurantName.trim(),
          area: area.trim(),
          memo: memo.trim() || undefined,
          video_duration: videoDuration ?? undefined,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.detail || `서버 오류 (${res.status})`);
      }

      const json = await res.json();
      setResult(json.data as ShortsResult);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "오류가 발생했습니다.";
      setError(msg);
    } finally {
      setLoading(false);
      setStep("");
    }
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
        <div className="app-icon-circle">🎬</div>
        <h1 className="app-title">숏츠 나레이션 제작</h1>
        <p className="app-subtitle">음식 영상에 AI 나레이션을 입혀 인스타 릴스·숏츠를 만들어요</p>
      </div>

      {/* 영상 업로드 */}
      <div className="form-field">
        <label className="form-label">음식 영상 업로드</label>
        <div
          style={{
            border: "2px dashed #d1d5db", borderRadius: 12, padding: "20px 16px",
            textAlign: "center", cursor: "pointer", background: "#fafafa",
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          {videoPreview ? (
            <video
              src={videoPreview}
              controls
              style={{ width: "100%", maxHeight: 280, borderRadius: 8, objectFit: "cover" }}
            />
          ) : (
            <>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🎥</div>
              <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>클릭하여 영상을 선택하세요</p>
              <p style={{ fontSize: 11, color: "#9ca3af", margin: "4px 0 0" }}>MP4, MOV, AVI 등 지원</p>
            </>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleVideoChange}
          style={{ display: "none" }}
        />
        {videoFile && (
          <p style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
            선택된 파일: {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(1)}MB)
          </p>
        )}
      </div>

      {/* 가게 정보 */}
      <div className="form-field">
        <label className="form-label">가게 상호명</label>
        <input
          className="form-input"
          value={restaurantName}
          onChange={(e) => setRestaurantName(e.target.value)}
          placeholder="예: 미미네 돼지껍데기"
        />
      </div>

      <div className="form-field">
        <label className="form-label">지역</label>
        <input
          className="form-input"
          value={area}
          onChange={(e) => setArea(e.target.value)}
          placeholder="예: 경기 화성시"
        />
        <p className="form-help">시/군/구 수준까지만 입력하면 됩니다.</p>
      </div>

      <div className="form-field">
        <label className="form-label">음식 메모 (선택)</label>
        <textarea
          className="form-textarea"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          style={{ minHeight: 80 }}
          placeholder="예: 돼지껍데기 탱탱하고 쫄깃, 특제소스 맛있음, 줄서는 집"
        />
        <p className="form-help">음식 특징·분위기를 간단히 적으면 나레이션 퀄리티가 올라갑니다.</p>
      </div>

      {error && <p className="error-text">{error}</p>}

      <button
        className="app-primary-btn"
        onClick={handleSubmit}
        disabled={loading}
        style={{ background: loading ? "#9ca3af" : "#7c3aed" }}
      >
        {loading ? `${step || "처리 중..."}` : "🎬 AI 나레이션 생성하기"}
      </button>

      {loading && (
        <div style={{ textAlign: "center", padding: "16px 0", color: "#7c3aed", fontSize: 13 }}>
          <div style={{ fontSize: 24, marginBottom: 6 }}>⚙️</div>
          스크립트 → TTS 변환 → 영상 병합 순서로 진행됩니다.
          <br />약 30~60초 소요됩니다.
        </div>
      )}

      {/* 결과 */}
      {result && (
        <div style={{ marginTop: 24 }}>
          {/* 스크립트 */}
          <div className="preview-section" style={{ marginBottom: 16 }}>
            <div className="preview-section-head">
              <span className="preview-section-title">📝 나레이션 스크립트</span>
            </div>
            <div className="preview-body">
              <div style={{ fontSize: 13, lineHeight: 1.8, whiteSpace: "pre-wrap", color: "#1f2937" }}>
                {result.script}
              </div>
            </div>
          </div>

          {/* 오디오 미리듣기 */}
          <div className="preview-section" style={{ marginBottom: 16 }}>
            <div className="preview-section-head">
              <span className="preview-section-title">🔊 나레이션 오디오 (Adam TTS)</span>
            </div>
            <div style={{ padding: "12px 14px" }}>
              <audio
                controls
                src={result.audio_url}
                style={{ width: "100%", borderRadius: 8 }}
              />
            </div>
          </div>

          {/* 완성 영상 다운로드 */}
          <div className="preview-section" style={{ marginBottom: 16 }}>
            <div className="preview-section-head">
              <span className="preview-section-title">🎬 완성 영상</span>
            </div>
            <div style={{ padding: "12px 14px" }}>
              <video
                controls
                src={result.result_video_url}
                style={{ width: "100%", maxHeight: 300, borderRadius: 8 }}
              />
              <a
                href={result.result_video_url}
                download
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "block",
                  marginTop: 10,
                  textAlign: "center",
                  background: "#7c3aed",
                  color: "#fff",
                  borderRadius: 10,
                  padding: "12px 0",
                  fontWeight: 700,
                  fontSize: 14,
                  textDecoration: "none",
                }}
              >
                영상 다운로드
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="app-link-row">
        <Link href="/">홈으로</Link>
        <span>·</span>
        <Link href="/drafts/new">포스팅 만들기</Link>
      </div>
    </div>
  );
}
