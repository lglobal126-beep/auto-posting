"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full space-y-6">
        <h1 className="text-2xl font-bold text-center">
          맛집 인플루언서 자동 포스팅
        </h1>
        <p className="text-center text-sm text-gray-600">
          사진·영상·영수증만 업로드하면 네이버 블로그 글과 인스타그램 캡션을
          자동으로 만들어주는 도우미입니다.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href="/login"
            className="w-full py-2 rounded-md bg-black text-white text-center"
          >
            로그인하기
          </Link>
          <Link
            href="/drafts/new"
            className="w-full py-2 rounded-md border border-gray-300 text-center"
          >
            새 포스팅 만들기
          </Link>
        </div>
      </div>
    </main>
  );
}

