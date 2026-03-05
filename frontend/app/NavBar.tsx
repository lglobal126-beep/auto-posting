"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const linkClass = (href: string) =>
    `app-nav-link${pathname === href || pathname?.startsWith(href + "/") ? " active" : ""}`;

  if (pathname === "/login") return null;

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
          <div ref={dropdownRef} style={{ position: "relative" }}>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                color: "#374151",
                background: "#f3f4f6",
                border: "1px solid #e5e7eb",
                borderRadius: 20,
                padding: "5px 10px 5px 12px",
                cursor: "pointer",
                fontWeight: 500,
                maxWidth: 220,
              }}
            >
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 160,
                }}
                title={userEmail}
              >
                {userEmail}
              </span>
              <span style={{ fontSize: 10, color: "#9ca3af", flexShrink: 0 }}>
                {dropdownOpen ? "▲" : "▼"}
              </span>
            </button>

            {dropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 8px)",
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                  minWidth: 200,
                  zIndex: 100,
                  overflow: "hidden",
                }}
              >
                {/* 사용자 정보 */}
                <div style={{ padding: "14px 16px", borderBottom: "1px solid #f3f4f6" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "#fef2f2",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18,
                        flexShrink: 0,
                      }}
                    >
                      👤
                    </div>
                    <div style={{ overflow: "hidden" }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#111827",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {userEmail}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 로그아웃 */}
                <button
                  onClick={handleLogout}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 13,
                    color: "#e53e3e",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#fff5f5")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  ↪ 로그아웃
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
