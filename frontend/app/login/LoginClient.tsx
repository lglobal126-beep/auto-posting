"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setError("아이디 또는 비밀번호가 올바르지 않습니다.");
      return;
    }

    const redirect = searchParams.get("redirect") || "/";
    router.push(redirect);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f0f0f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: "40px 36px",
          width: "100%",
          maxWidth: 420,
          boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
        }}
      >
        {/* 제목 */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#e53e3e", letterSpacing: "-0.5px" }}>
            📡 Auto Posting
          </div>
          <div style={{ fontSize: 14, color: "#888", marginTop: 6 }}>로그인</div>
        </div>

        {/* 안내 박스 */}
        <div
          style={{
            background: "#ebf8ff",
            border: "1px solid #bee3f8",
            borderRadius: 8,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 24,
            fontSize: 13,
            color: "#2b6cb0",
          }}
        >
          <span style={{ fontSize: 16 }}>ℹ️</span>
          아이디와 패스워드는 관리자에게 문의하세요.
        </div>

        <form onSubmit={handleSubmit}>
          {/* 아이디 */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#555", display: "block", marginBottom: 6 }}>
              아이디
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="아이디 입력"
              required
              style={{
                width: "100%",
                padding: "11px 14px",
                border: "1.5px solid #e2e8f0",
                borderRadius: 8,
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
                color: "#333",
                background: "#fafafa",
              }}
            />
          </div>

          {/* 비밀번호 */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#555", display: "block", marginBottom: 6 }}>
              비밀번호
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
                required
                style={{
                  width: "100%",
                  padding: "11px 44px 11px 14px",
                  border: "1.5px solid #e2e8f0",
                  borderRadius: 8,
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                  color: "#333",
                  background: "#fafafa",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#aaa",
                  fontSize: 16,
                  padding: 0,
                }}
                tabIndex={-1}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {error && (
            <p style={{ color: "#e53e3e", fontSize: 13, marginBottom: 12, textAlign: "center" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "13px",
              background: loading ? "#fc8181" : "#e53e3e",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "background 0.2s",
            }}
          >
            🔒 {loading ? "로그인 중..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
