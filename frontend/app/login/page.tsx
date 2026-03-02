"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/");
  };

  return (
    <div className="app-card">
      <div className="app-card-header">
        <div className="app-icon-circle">🔐</div>
        <h1 className="app-title">로그인</h1>
        <p className="app-subtitle">
          내 맛집 기록을 안전하게 관리하기 위해 로그인이 필요합니다.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label className="form-label">이메일</label>
          <input
            type="email"
            className="form-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-field">
          <label className="form-label">비밀번호</label>
          <input
            type="password"
            className="form-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="error-text">{error}</p>}

        <button
          type="submit"
          className="app-primary-btn"
          disabled={loading}
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>
      </form>

      <div className="app-link-row">
        <Link href="/">홈으로 돌아가기</Link>
      </div>
    </div>
  );
}

