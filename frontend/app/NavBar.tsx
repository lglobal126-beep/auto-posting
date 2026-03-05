"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const linkClass = (href: string) =>
    `app-nav-link${pathname === href || pathname?.startsWith(href + "/") ? " active" : ""}`;

  return (
    <nav className="app-nav">
      <Link href="/" className="app-nav-brand">
        📡 Auto Posting
      </Link>
      <div className="app-nav-links">
        <Link href="/drafts" className={linkClass("/drafts")}>
          내 초안
        </Link>

        {userEmail && (
          <span
            style={{
              fontSize: 13,
              color: "#374151",
              background: "#f3f4f6",
              padding: "5px 12px",
              borderRadius: 20,
              fontWeight: 500,
              maxWidth: 180,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={userEmail}
          >
            {userEmail}
          </span>
        )}

        <button
          onClick={handleLogout}
          style={{
            fontSize: 13,
            color: "#fff",
            background: "#e53e3e",
            border: "none",
            cursor: "pointer",
            padding: "6px 14px",
            borderRadius: 8,
            fontWeight: 600,
          }}
        >
          로그아웃
        </button>
      </div>
    </nav>
  );
}
