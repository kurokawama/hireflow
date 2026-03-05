"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CalendarStatus, ContentTask } from "@/types/strategy";

interface TaskCardProps {
  task: ContentTask;
}

interface CalendarActionsProps {
  calendarId: string;
  calendarStatus: CalendarStatus;
  taskCount: number;
}

const taskStatusClassMap: Record<ContentTask["status"], string> = {
  pending: "bg-muted text-muted-foreground border-transparent",
  in_progress: "bg-blue-100 text-blue-800 border-transparent",
  completed: "bg-green-100 text-green-800 border-transparent",
  skipped: "bg-yellow-100 text-yellow-800 border-transparent",
};

const taskStatusLabelMap: Record<ContentTask["status"], string> = {
  pending: "未着手",
  in_progress: "進行中",
  completed: "完了",
  skipped: "スキップ",
};

const contentTypeLabelMap: Record<ContentTask["content_type"], string> = {
  text: "テキスト",
  image: "画像",
  video_script: "動画台本",
};

function formatDate(dateString: string | null) {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("ja-JP");
}

export function TaskCard({ task }: TaskCardProps) {
  return (
    <article className="rounded-md border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">{task.title}</h3>
          <p className="text-sm text-muted-foreground">{task.description || "-"}</p>
        </div>
        <Badge className={taskStatusClassMap[task.status]}>{taskStatusLabelMap[task.status]}</Badge>
      </div>

      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">プラットフォーム</dt>
          <dd className="font-medium text-foreground">{task.platform}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">コンテンツタイプ</dt>
          <dd className="font-medium text-foreground">{contentTypeLabelMap[task.content_type]}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">期限日</dt>
          <dd className="font-medium text-foreground">{formatDate(task.due_date)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">ステータス</dt>
          <dd className="font-medium text-foreground">{taskStatusLabelMap[task.status]}</dd>
        </div>
      </dl>
    </article>
  );
}

export function CalendarActions({
  calendarId,
  calendarStatus,
  taskCount,
}: CalendarActionsProps) {
  const router = useRouter();
  const [isApproving, setIsApproving] = useState(false);
  const [isCreatingTasks, setIsCreatingTasks] = useState(false);
  const [error, setError] = useState("");

  const showApprove = calendarStatus === "draft";
  const showCreateTasks = calendarStatus === "approved" && taskCount === 0;

  const handleApprove = async () => {
    setError("");
    setIsApproving(true);
    try {
      const response = await fetch(`/api/strategy/${calendarId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });

      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(json.error || "承認に失敗しました。");
        return;
      }
      router.refresh();
    } catch {
      setError("承認に失敗しました。");
    } finally {
      setIsApproving(false);
    }
  };

  const handleCreateTasks = async () => {
    setError("");
    setIsCreatingTasks(true);
    try {
      const response = await fetch(`/api/strategy/${calendarId}/tasks`, {
        method: "POST",
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(json.error || "タスク生成に失敗しました。");
        return;
      }
      router.refresh();
    } catch {
      setError("タスク生成に失敗しました。");
    } finally {
      setIsCreatingTasks(false);
    }
  };

  if (!showApprove && !showCreateTasks) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {showApprove && (
          <Button
            type="button"
            onClick={handleApprove}
            disabled={isApproving}
            aria-label="カレンダーを承認"
            className="motion-reduce:transition-none"
          >
            {isApproving ? "承認中..." : "承認"}
          </Button>
        )}
        {showCreateTasks && (
          <Button
            type="button"
            onClick={handleCreateTasks}
            disabled={isCreatingTasks}
            aria-label="タスクを生成"
            className="motion-reduce:transition-none"
          >
            {isCreatingTasks ? "タスク生成中..." : "タスク生成"}
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" aria-live="polite" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
