"use client";

import Link from "next/link";

export default function ConnectPage() {
  return (
    <div className="app-card" style={{ maxWidth: 560 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 className="app-title">발행 안내</h1>
        <p className="app-subtitle" style={{ marginTop: 6, textAlign: "left" }}>
          현재 네이버 블로그와 인스타그램 모두 복사·붙여넣기 방식으로 발행합니다.
        </p>
      </div>

      {/* 네이버 블로그 */}
      <div className="connect-card">
        <div className="connect-card-head">
          <div className="connect-platform">
            <div className="platform-icon platform-naver">N</div>
            네이버 블로그
          </div>
        </div>
        <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
          네이버 공식 블로그 Write API가 제공되지 않아 직접 붙여넣기 방식을 사용합니다.
        </p>
        <a
          href="https://blog.naver.com/PostWriteForm.naver"
          target="_blank"
          rel="noreferrer"
          className="app-primary-btn"
          style={{ display: "inline-block", textDecoration: "none", textAlign: "center" }}
        >
          네이버 블로그 글쓰기 열기 →
        </a>
      </div>

      {/* 인스타그램 */}
      <div className="connect-card">
        <div className="connect-card-head">
          <div className="connect-platform">
            <div className="platform-icon platform-instagram">📸</div>
            인스타그램
          </div>
        </div>
        <p style={{ fontSize: 13, color: "#6b7280" }}>
          초안 편집 페이지에서 캡션+해시태그를 복사한 뒤, 인스타그램 앱에서 사진과 함께 붙여넣기 하세요.
        </p>
      </div>

      <div className="app-link-row">
        <Link href="/drafts">내 초안 목록</Link>
        <span>·</span>
        <Link href="/drafts/new">새 포스팅</Link>
      </div>
    </div>
  );
}
