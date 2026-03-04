import "./globals.css";
import NavBar from "./NavBar";

export const metadata = {
  title: "맛집 자동 포스팅",
  description: "사진·영수증만으로 네이버/인스타 포스팅 자동 생성",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <div className="app-shell">
          <NavBar />
          <main className="app-main">{children}</main>
        </div>
      </body>
    </html>
  );
}
