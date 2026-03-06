"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { VideoProjectStatus, VideoProjectWithMedia } from "@/types/video";
import { createClient } from "@/lib/supabase/browser";
import { ProjectCard } from "@/components/video/project-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type FilterType = "all" | "script" | "shooting" | "uploaded" | "editing" | "done";

interface ProjectListResponse {
  data?: VideoProjectWithMedia[];
  error?: string;
}

const doneStatuses: VideoProjectStatus[] = ["edited", "approved"];

export default function VideoProjectListPage() {
  const supabase = useMemo(() => createClient(), []);
  const [filter, setFilter] = useState<FilterType>("all");
  const [projects, setProjects] = useState<VideoProjectWithMedia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProjects = async (nextFilter: FilterType) => {
    setIsLoading(true);
    setError("");

    try {
      await supabase.auth.getSession();

      const params = new URLSearchParams();
      if (nextFilter !== "all" && nextFilter !== "done") {
        params.set("status", nextFilter);
      }

      const response = await fetch(`/api/video/projects${params.toString() ? `?${params}` : ""}`, {
        credentials: "include",
      });
      const payload = (await response.json()) as ProjectListResponse;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error || "プロジェクト一覧の取得に失敗しました。");
      }

      if (nextFilter === "done") {
        setProjects(payload.data.filter((item) => doneStatuses.includes(item.status)));
      } else {
        setProjects(payload.data);
      }
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "プロジェクト一覧の取得に失敗しました。",
      );
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchProjects(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-[#1D3557]">動画プロジェクト</h1>
          <p className="text-sm text-neutral-600">動画制作の進行状況を管理します。</p>
        </div>
        <Button asChild className="bg-[#1D3557] hover:bg-[#122540]">
          <Link href="/video/new">新規プロジェクト</Link>
        </Button>
      </div>

      <Tabs value={filter} onValueChange={(value) => setFilter(value as FilterType)}>
        <TabsList className="w-full justify-start overflow-x-auto bg-neutral-100">
          <TabsTrigger value="all">全て</TabsTrigger>
          <TabsTrigger value="script">台本</TabsTrigger>
          <TabsTrigger value="shooting">撮影中</TabsTrigger>
          <TabsTrigger value="uploaded">アップロード済</TabsTrigger>
          <TabsTrigger value="editing">編集中</TabsTrigger>
          <TabsTrigger value="done">完了</TabsTrigger>
        </TabsList>
      </Tabs>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="h-72 border-neutral-200">
              <CardContent className="h-full animate-pulse rounded-md bg-neutral-100" />
            </Card>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <Card className="border-neutral-200">
          <CardContent className="py-12 text-center">
            <p className="font-medium text-[#1D3557]">プロジェクトがありません</p>
            <p className="mt-1 text-sm text-neutral-600">
              「新規プロジェクト」から動画プロジェクトを作成してください。
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
