"use client";

import Link from "next/link";
import type { VideoProjectStatus, VideoProjectWithMedia } from "@/types/video";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
  project: VideoProjectWithMedia;
  onClick?: () => void;
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

function getPlatformLabel(project: VideoProjectWithMedia) {
  const platform = (project as unknown as { platform?: string }).platform;
  if (!platform) return "未設定";

  const map: Record<string, string> = {
    instagram: "Instagram",
    tiktok: "TikTok",
    youtube: "YouTube",
    x: "X",
  };
  return map[platform] || platform;
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  const thumbnail = project.edited_video?.thumbnail_path || project.raw_video?.thumbnail_path;

  return (
    <Link href={`/video/${project.id}`} className="block" onClick={onClick}>
      <Card className="h-full border-neutral-200 transition hover:border-[#1D3557]/30 hover:shadow-sm">
        <CardHeader className="space-y-3">
          <div
            className={cn(
              "flex h-40 items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-neutral-100 text-sm text-neutral-500",
            )}
          >
            {thumbnail ? (
              <img src={thumbnail} alt={`${project.title} サムネイル`} className="h-full w-full object-cover" />
            ) : (
              <span>サムネイルなし</span>
            )}
          </div>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-2 text-base text-[#1D3557]">{project.title}</CardTitle>
            <Badge className={cn("shrink-0", statusClassMap[project.status])}>{statusLabelMap[project.status]}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-neutral-600">
          <p>プラットフォーム: {getPlatformLabel(project)}</p>
          <p>作成日: {new Intl.DateTimeFormat("ja-JP").format(new Date(project.created_at))}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
