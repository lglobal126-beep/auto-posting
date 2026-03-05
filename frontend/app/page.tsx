"use client";

import Link from "next/link";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function HomePage() {
  const { checking } = useRequireAuth();

  if (checking) {
    return (
      <div className="app-card app-card-sm">
        <p className="app-subtitle">로그인 상태를 확인하는 중입니다...</p>
      </div>
    );
  }

  return (
    <div className="app-card app-card-sm" style={{ textAlign: "center" }}>
      <div className="app-card-header">
        <div className="app-icon-circle">📡</div>
        <h1 className="app-title">Auto Posting</h1>
        <p className="app-subtitle">
          AI가 블로그·쿠팡 리뷰를 자동으로 작성해드립니다.
        </p>
      </div>

      <div className="app-steps">
        <div className="app-steps-title">📋 사용 방법</div>
        <ol className="app-steps-list">
          <li>모드 선택 — 네이버 블로그 또는 쿠팡 리뷰</li>
          <li>사진·영수증(블로그) 또는 상품 URL(쿠팡)을 입력합니다.</li>
          <li>AI가 자동으로 글을 생성합니다.</li>
          <li>내용 확인 후 복사해서 바로 게시하세요.</li>
        </ol>
      </div>

      <Link href="/drafts/new">
        <button className="app-primary-btn">새 포스팅 만들기</button>
      </Link>

      <div className="app-link-row">
        <Link href="/drafts">내 초안 목록 보기</Link>
      </div>
    </div>
  );
}
