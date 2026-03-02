"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { supabase } from "@/lib/supabaseClient";

type DraftDetailData = {
  id: number;
  restaurant_name?: string | null;
  visit_datetime?: string | null;
  blog_title: string;
  blog_body: string;
  instagram_caption: string;
  instagram_hashtags: string[];
};

export default function DraftDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [data, setData] = useState<DraftDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);
  const [publishToNaver, setPublishToNaver] = useState(true);
  const [publishToInstagram, setPublishToInstagram] = useState(true);

  useEffect(() => {
    const fetchDraft = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
        if (!apiBase) {
          throw new Error("백엔드 API 주소가 설정되지 않았습니다.");
        }

        const res = await fetch(`${apiBase}/drafts/${id}`);
        if (!res.ok) {
          throw new Error("초안 정보를 불러오지 못했습니다.");
        }
        const json = await res.json();
        setData(json.data);
      } catch (err: any) {
        setError(err.message ?? "불러오기 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchDraft();
    }
  }, [id]);

  const handlePublish = async () => {
    if (!data) return;
    setPublishing(true);
    setPublishError(null);
    setPublishSuccess(null);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("로그인 세션이 유효하지 않습니다. 다시 로그인해주세요.");
      }

      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
      if (!apiBase) {
        throw new Error("백엔드 API 주소가 설정되지 않았습니다.");
      }

      const res = await fetch(`${apiBase}/posts/publish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          draft_id: data.id,
          publish_to_naver: publishToNaver,
          publish_to_instagram: publishToInstagram,
          scheduled_at: null,
        }),
      });

      if (!res.ok) {
        throw new Error("발행 요청에 실패했습니다.");
      }

      const json = await res.json();
      setPublishSuccess("발행 요청이 완료되었습니다.");
      console.log("발행 결과:", json);
    } catch (err: any) {
      setPublishError(err.message ?? "발행 중 오류가 발생했습니다.");
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-600">초안을 불러오는 중입니다...</p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4">
        <p className="text-sm text-red-600 mb-4">
          {error ?? "초안 정보를 찾을 수 없습니다."}
        </p>
        <Link href="/" className="text-xs text-blue-600 underline">
          홈으로 돌아가기
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-6">
      <div className="w-full max-w-2xl space-y-6">
        <h1 className="text-xl font-bold">
          {data.blog_title || "제목 없는 초안"}
        </h1>
        {data.restaurant_name && (
          <p className="text-sm text-gray-600">
            식당: {data.restaurant_name}
          </p>
        )}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">네이버 블로그 본문</h2>
          <div className="border border-gray-200 rounded-md p-3 text-sm whitespace-pre-line">
            {data.blog_body}
          </div>
        </section>
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">인스타그램 캡션</h2>
          <div className="border border-gray-200 rounded-md p-3 text-sm whitespace-pre-line">
            {data.instagram_caption}
            {data.instagram_hashtags?.length > 0 && (
              <div className="mt-2 text-xs text-gray-700">
                {data.instagram_hashtags.join(" ")}
              </div>
            )}
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold">발행 설정</h2>
          <div className="flex items-center gap-4 text-sm">
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={publishToNaver}
                onChange={(e) => setPublishToNaver(e.target.checked)}
              />
              네이버 블로그
            </label>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={publishToInstagram}
                onChange={(e) => setPublishToInstagram(e.target.checked)}
              />
              인스타그램
            </label>
          </div>
          {publishError && (
            <p className="text-xs text-red-600">{publishError}</p>
          )}
          {publishSuccess && (
            <p className="text-xs text-green-600">{publishSuccess}</p>
          )}
          <button
            type="button"
            className="mt-2 w-full py-2 rounded-md bg-black text-white text-center text-sm disabled:opacity-60"
            onClick={handlePublish}
            disabled={publishing}
          >
            {publishing ? "발행 중..." : "선택한 채널로 발행하기"}
          </button>
        </section>

        <div className="flex justify-between text-xs">
          <Link href="/" className="text-blue-600 underline">
            홈으로
          </Link>
          <Link href="/drafts/new" className="text-blue-600 underline">
            새 초안 만들기
          </Link>
        </div>
      </div>
    </main>
  );
}


