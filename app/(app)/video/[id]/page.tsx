"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { MediaFile, ShootingGuide, VideoProjectStatus, VideoProjectWithMedia } from "@/types/video";
import { createClient } from "@/lib/supabase/browser";
import { ScriptViewer } from "@/components/video/script-viewer";
import { UploadZone } from "@/components/video/upload-zone";
import { EditorPanel } from "@/components/video/editor-panel";
import { MediaGallery } from "@/components/video/media-gallery";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface PageProps {
  params: {
    id: string;
  };
}

interface VideoProjectDetail extends VideoProjectWithMedia {
  raw_video_url?: string | null;
  edited_video_url?: string | null;
}

interface ProjectDetailResponse {
  data?: VideoProjectDetail;
  error?: string;
}

const statusLabelMap: Record<VideoProjectStatus, string> = {
  script: "台本",
  shooting: "撮影中",
  uploaded: "アップロード済",
  editing: "編集中",
  edited: "編集済み",
  approved: "承認済み",
};

const statusClassMap: Record<VideoProjectStatus, string> = {
  script: "bg-slate-100 text-slate-700",
  shooting: "bg-amber-100 text-amber-700",
  uploaded: "bg-sky-100 text-sky-700",
  editing: "bg-violet-100 text-violet-700",
  edited: "bg-emerald-100 text-emerald-700",
  approved: "bg-[#1D3557] text-white",
};

function extractMediaFiles(project: VideoProjectDetail): MediaFile[] {
  const list = [project.raw_video, project.edited_video].filter(Boolean) as MediaFile[];
  const unique = new Map<string, MediaFile>();
  list.forEach((file) => unique.set(file.id, file));
  return Array.from(unique.values());
}

export default function VideoProjectDetailPage({ params }: PageProps) {
  const supabase = useMemo(() => createClient(), []);
  const [project, setProject] = useState<VideoProjectDetail | null>(null);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProject = async () => {
    setError("");
    setIsLoading(true);

    try {
      await supabase.auth.getSession();

      const response = await fetch(`/api/video/projects/${params.id}`, {
        credentials: "include",
      });
      const payload = (await response.json()) as ProjectDetailResponse;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error || "プロジェクトの取得に失敗しました。");
      }

      setProject(payload.data);
      setMediaFiles(extractMediaFiles(payload.data));
    } catch (fetchError) {
      setProject(null);
      setMediaFiles([]);
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "プロジェクトの取得に失敗しました。",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const handleUploadComplete = (mediaFile: MediaFile) => {
    setMediaFiles((prev) => {
      const next = new Map(prev.map((item) => [item.id, item]));
      next.set(mediaFile.id, mediaFile);
      return Array.from(next.values());
    });
    setProject((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        raw_video: mediaFile,
        raw_video_id: mediaFile.id,
        status: "uploaded",
      };
    });
  };

  const handleDeleteFromGallery = (id: string) => {
    setMediaFiles((prev) => prev.filter((file) => file.id !== id));
    setProject((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        raw_video: prev.raw_video?.id === id ? null : prev.raw_video,
        edited_video: prev.edited_video?.id === id ? null : prev.edited_video,
      };
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-neutral-100" />
        <Card className="border-neutral-200">
          <CardContent className="h-72 animate-pulse bg-neutral-100" />
        </Card>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline">
          <Link href="/video">一覧へ戻る</Link>
        </Button>
        <p className="text-sm text-red-600">{error || "プロジェクトが見つかりません。"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-[#1D3557]">{project.title}</h1>
          <div className="flex items-center gap-2">
            <Badge className={statusClassMap[project.status]}>{statusLabelMap[project.status]}</Badge>
            <span className="text-sm text-neutral-600">
              更新日: {new Intl.DateTimeFormat("ja-JP").format(new Date(project.updated_at))}
            </span>
          </div>
        </div>
        <Button asChild variant="outline" className="border-[#1D3557] text-[#1D3557] hover:bg-[#122540] hover:text-white">
          <Link href="/video">一覧へ戻る</Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <ScriptViewer
            scriptText={project.script_text}
            shootingGuide={(project.shooting_guide as ShootingGuide) || null}
          />
        </div>

        <div className="space-y-6">
          {!project.raw_video && (
            <UploadZone projectId={project.id} onUploadComplete={handleUploadComplete} />
          )}

          {project.raw_video && (
            <Card className="border-neutral-200">
              <CardContent className="space-y-3 p-4">
                <p className="text-sm font-medium text-[#1D3557]">素材プレビュー</p>
                {project.raw_video_url ? (
                  <video controls className="w-full rounded-md border border-neutral-200">
                    <source src={project.raw_video_url} type={project.raw_video.mime_type} />
                  </video>
                ) : (
                  <p className="text-sm text-neutral-600">プレビューURLは未生成です。</p>
                )}
              </CardContent>
            </Card>
          )}

          {project.raw_video && <EditorPanel project={project} />}

          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-[#1D3557]">メディア一覧</h2>
            <MediaGallery files={mediaFiles} onDelete={handleDeleteFromGallery} />
          </div>
        </div>
      </div>
    </div>
  );
}
