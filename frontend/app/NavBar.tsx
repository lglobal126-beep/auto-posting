"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const linkClass = (href: string) =>
    `app-nav-link${pathname === href || pathname?.startsWith(href + "/") ? " active" : ""}`;

  return (
    <nav className="app-nav">
      <Link href="/" className="app-nav-brand">
        🍽️ 맛집 자동 포스팅
      </Link>
      <div className="app-nav-links">
        <Link href="/drafts" className={linkClass("/drafts")}>
          내 초안
        </Link>
        <Link href="/connect" className={linkClass("/connect")}>
          계정 연동
        </Link>
        <button
          onClick={handleLogout}
          style={{
            fontSize: 13,
            color: "#6b7280",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "6px 12px",
            borderRadius: 8,
          }}
        >
          로그아웃
        </button>
      </div>
    </nav>
  );
}
