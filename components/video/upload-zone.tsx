"use client";

import { useRef, useState } from "react";
import type { MediaFile } from "@/types/video";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface UploadZoneProps {
  projectId: string;
  onUploadComplete: (mediaFile: MediaFile) => void;
}

interface UploadResponse {
  data?: {
    media_file_id: string;
    storage_path: string;
    file_size: number;
  };
  error?: string;
}

interface ProjectResponse {
  data?: {
    raw_video?: MediaFile | null;
  };
  error?: string;
}

const MAX_SIZE_BYTES = 50 * 1024 * 1024;

export function UploadZone({ projectId, onUploadComplete }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const validateFile = (file: File) => {
    if (!file.type.startsWith("video/")) {
      setError("動画ファイルのみアップロードできます。");
      return false;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError("ファイルサイズは50MB以下にしてください。");
      return false;
    }
    return true;
  };

  const fetchUploadedMedia = async () => {
    const response = await fetch(`/api/video/projects/${projectId}`, {
      credentials: "include",
    });
    const payload = (await response.json()) as ProjectResponse;
    if (!response.ok || !payload.data?.raw_video) {
      throw new Error(payload.error || "アップロード後の取得に失敗しました。");
    }
    return payload.data.raw_video;
  };

  const uploadFile = async (file: File) => {
    setError("");
    setProgress(0);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("project_id", projectId);

      const uploadPayload = await new Promise<UploadResponse>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/video/upload");
        xhr.withCredentials = true;

        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;
          setProgress(Math.round((event.loaded / event.total) * 100));
        };

        xhr.onload = () => {
          try {
            const parsed = JSON.parse(xhr.responseText) as UploadResponse;
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(parsed);
              return;
            }
            reject(new Error(parsed.error || "アップロードに失敗しました。"));
          } catch {
            reject(new Error("アップロードに失敗しました。"));
          }
        };

        xhr.onerror = () => reject(new Error("アップロード中に通信エラーが発生しました。"));
        xhr.send(formData);
      });

      if (!uploadPayload.data) {
        throw new Error(uploadPayload.error || "アップロードに失敗しました。");
      }

      const media = await fetchUploadedMedia();
      onUploadComplete(media);
      setProgress(100);
    } catch (uploadError) {
      const message =
        uploadError instanceof Error ? uploadError.message : "アップロードに失敗しました。";
      setError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectedFile = (file: File | undefined) => {
    if (!file) return;
    if (!validateFile(file)) return;
    void uploadFile(file);
  };

  return (
    <Card className="border-neutral-200">
      <CardHeader>
        <CardTitle className="text-[#1D3557]">動画アップロード</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            handleSelectedFile(event.dataTransfer.files?.[0]);
          }}
          className={`rounded-lg border-2 border-dashed p-8 text-center transition ${
            isDragging ? "border-[#1D3557] bg-[#1D3557]/5" : "border-neutral-300"
          }`}
        >
          <p className="font-medium text-[#1D3557]">動画をドラッグ＆ドロップ</p>
          <p className="mt-1 text-sm text-neutral-600">またはクリックして選択</p>
          <p className="mt-1 text-xs text-neutral-500">対応形式: MP4 / MOV / WebM / AVI（最大50MB）</p>

          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(event) => handleSelectedFile(event.target.files?.[0])}
          />

          <Button
            type="button"
            variant="outline"
            className="mt-4 border-[#1D3557] text-[#1D3557] hover:bg-[#122540] hover:text-white"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
          >
            ファイルを選択
          </Button>
        </div>

        {isUploading && (
          <div className="space-y-2">
            <div className="h-2 w-full overflow-hidden rounded bg-neutral-200">
              <div
                className="h-full bg-[#1D3557] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-neutral-600">アップロード中... {progress}%</p>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </CardContent>
    </Card>
  );
}
