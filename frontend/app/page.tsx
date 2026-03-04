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
        <div className="app-icon-circle">🍽️</div>
        <h1 className="app-title">맛집 인플루언서 자동 포스팅</h1>
        <p className="app-subtitle">
          사진·영수증만 올리면 네이버 블로그와 인스타그램 포스팅이 한 번에 완성돼요.
        </p>
      </div>

      <div className="app-steps">
        <div className="app-steps-title">📋 사용 방법</div>
        <ol className="app-steps-list">
          <li>식당 사진·영상·영수증을 업로드합니다.</li>
          <li>AI가 영수증에서 상호명·주소·메뉴를 자동으로 인식합니다.</li>
          <li>키워드를 간단히 입력하고 AI로 초안을 생성합니다.</li>
          <li>네이버 블로그·인스타그램에 바로 발행합니다.</li>
        </ol>
      </div>

      <Link href="/drafts/new">
        <button className="app-primary-btn">새 포스팅 만들기</button>
      </Link>

      <div className="app-link-row">
        <Link href="/drafts">내 초안 목록 보기</Link>
        <span>·</span>
        <Link href="/connect">계정 연동 설정</Link>
      </div>
    </div>
  );
}
