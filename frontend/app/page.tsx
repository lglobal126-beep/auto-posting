import Link from "next/link";

export default function HomePage() {
  return (
    <div className="app-card">
      <div className="app-card-header">
        <div className="app-icon-circle">🍽️</div>
        <h1 className="app-title">맛집 인플루언서 자동 포스팅</h1>
        <p className="app-subtitle">
          사진·영상·영수증만 올리면 네이버 블로그와 인스타그램 포스팅이 한 번에
          완성돼요.
        </p>
      </div>

      <div className="app-steps">
        <div className="app-steps-title">
          <span>사용 방법</span>
        </div>
        <ol className="app-steps-list">
          <li>1. 식당 사진·영상·영수증을 업로드합니다.</li>
          <li>2. 키워드를 간단히 적고 AI로 초안을 생성합니다.</li>
          <li>3. 네이버 블로그와 인스타그램에 바로 발행합니다.</li>
        </ol>
      </div>

      <Link href="/drafts/new">
        <button className="app-primary-btn">ZIP 파일 선택 및 병합 시작</button>
      </Link>

      <div className="app-link-row">
        이미 계정이 있다면{" "}
        <Link href="/login">
          로그인하기
        </Link>
      </div>
    </div>
  );
}

