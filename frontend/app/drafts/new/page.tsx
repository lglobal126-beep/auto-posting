"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { supabase } from "@/lib/supabaseClient";

type UploadFileWithType = {
  file: File;
  type: "image" | "video" | "receipt";
};

export default function NewDraftPage() {
  const router = useRouter();
  const [files, setFiles] = useState<UploadFileWithType[]>([]);
  const [memo, setMemo] = useState("");
  const [keywords, setKeywords] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const mapped = selectedFiles.map<UploadFileWithType>((file) => {
      const isReceipt =
        file.name.toLowerCase().includes("receipt") ||
        file.name.toLowerCase().includes("영수증");
      const isVideo = file.type.startsWith("video/");
      return {
        file,
        type: isReceipt ? "receipt" : isVideo ? "video" : "image",
      };
    });
    setFiles(mapped);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const imagePaths: string[] = [];
      const videoPaths: string[] = [];
      let receiptPath: string | null = null;

      for (const item of files) {
        const fileExt = item.file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${fileExt}`;
        const filePath = `uploads/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("media")
          .upload(filePath, item.file);

        if (uploadError) {
          throw uploadError;
        }

        if (item.type === "image") imagePaths.push(filePath);
        if (item.type === "video") videoPaths.push(filePath);
        if (item.type === "receipt") receiptPath = filePath;
      }

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

      const response = await fetch(`${apiBase}/drafts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          image_paths: imagePaths,
          video_paths: videoPaths,
          receipt_path: receiptPath,
          memo,
          keywords: keywords
            ? keywords.split(",").map((k) => k.trim())
            : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("초안 생성 요청에 실패했습니다.");
      }

      const result = await response.json();
      console.log("초안 생성 결과:", result);

      if (result?.data?.draft_id) {
        router.push(`/drafts/${result.data.draft_id}`);
      }
    } catch (err: any) {
      setError(err.message ?? "업로드 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-6">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-xl font-bold text-center">새 포스팅 만들기</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">사진 / 영상 / 영수증</h2>
            <p className="text-xs text-gray-500">
              파일명에 &quot;receipt&quot; 또는 &quot;영수증&quot;이 포함된
              파일은 영수증으로 인식됩니다.
            </p>
            <input
              type="file"
              multiple
              className="text-xs"
              onChange={handleFileChange}
            />
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">방문 메모</h2>
            <textarea
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              rows={4}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="맛, 서비스, 분위기, 누구와 갔는지 등 자유롭게 적어주세요."
            />
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">키워드 (선택)</h2>
            <p className="text-xs text-gray-500">
              식당 분위기나 강조하고 싶은 포인트를 콤마로 구분해서 적어주세요.
              (예: 강남역, 곱창, 퇴근 후 한 잔, 조용한 분위기)
            </p>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="예: 강남역, 곱창, 퇴근 후 한 잔"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
            />
          </section>

          {error && (
            <p className="text-xs text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full py-2 rounded-md bg-black text-white text-center text-sm disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "업로드 중..." : "AI로 초안 생성하기"}
          </button>
        </form>

        <div className="text-center">
          <Link href="/" className="text-xs text-blue-600 underline">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </main>
  );
}

