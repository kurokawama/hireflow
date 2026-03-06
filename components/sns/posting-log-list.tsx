"use client";

import type { PostingLog } from "@/types/sns";
import { Badge } from "@/components/ui/badge";

interface PostingLogListProps {
  logs: PostingLog[];
  isLoading?: boolean;
}

function actionLabel(action: PostingLog["action"]) {
  if (action === "attempted") {
    return "attempted";
  }
  if (action === "succeeded") {
    return "succeeded";
  }
  if (action === "failed") {
    return "failed";
  }
  return "retried";
}

function actionBadgeClass(action: PostingLog["action"]) {
  if (action === "succeeded") {
    return "border-transparent bg-green-100 text-green-700";
  }
  if (action === "failed") {
    return "border-transparent bg-red-100 text-red-700";
  }
  if (action === "retried") {
    return "border-transparent bg-blue-100 text-blue-700";
  }
  return "border-transparent bg-amber-100 text-amber-700";
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ja-JP");
}

export function PostingLogList({ logs, isLoading = false }: PostingLogListProps) {
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">読み込み中...</p>;
  }

  if (logs.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center">
        <p className="text-sm text-muted-foreground">ログはありません。</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {logs.map((log, index) => (
        <div key={log.id} className="flex gap-4">
          <div className="flex w-6 flex-col items-center">
            <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#1D3557]" />
            {index !== logs.length - 1 && <span className="mt-1 h-full w-px bg-neutral-200" />}
          </div>
          <div className="pb-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={actionBadgeClass(log.action)}>
                {actionLabel(log.action)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatDateTime(log.created_at)}
              </span>
            </div>
            {log.error_details && (
              <p className="mt-2 text-sm text-red-600">{log.error_details}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
