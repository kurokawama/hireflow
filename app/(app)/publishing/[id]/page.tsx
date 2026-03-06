"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import type { PostingLog, PostingQueueWithContent } from "@/types/sns";
import { PlatformIcon } from "@/components/sns/platform-icon";
import { PostingLogList } from "@/components/sns/posting-log-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString("ja-JP");
}

function statusClassName(status: PostingQueueWithContent["status"]) {
  if (status === "pending") {
    return "border-transparent bg-amber-100 text-amber-700";
  }
  if (status === "processing") {
    return "border-transparent bg-blue-100 text-blue-700";
  }
  if (status === "posted") {
    return "border-transparent bg-green-100 text-green-700";
  }
  if (status === "failed") {
    return "border-transparent bg-red-100 text-red-700";
  }
  return "border-transparent bg-neutral-200 text-neutral-700";
}

function statusLabel(status: PostingQueueWithContent["status"]) {
  if (status === "pending") {
    return "予定";
  }
  if (status === "processing") {
    return "処理中";
  }
  if (status === "posted") {
    return "投稿済み";
  }
  if (status === "failed") {
    return "失敗";
  }
  return "キャンセル";
}

export default function PublishingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queueId = useMemo(() => params?.id ?? "", [params?.id]);

  const [queueItem, setQueueItem] = useState<PostingQueueWithContent | null>(null);
  const [logs, setLogs] = useState<PostingLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    if (!queueId) {
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const supabase = createClient();

      const [queueResponse, logsResponse] = await Promise.all([
        supabase
          .from("posting_queue")
          .select(
            `
            *,
            content:generated_contents!content_id(id, body_text, platform, status),
            connection:sns_connections!connection_id(id, platform, external_account_name)
          `
          )
          .eq("id", queueId)
          .maybeSingle(),
        supabase
          .from("posting_logs")
          .select("*")
          .eq("queue_id", queueId)
          .order("created_at", { ascending: false }),
      ]);

      if (queueResponse.error) {
        setError(queueResponse.error.message);
        setQueueItem(null);
        setLogs([]);
        setIsLoading(false);
        return;
      }

      if (logsResponse.error) {
        setError(logsResponse.error.message);
        setQueueItem((queueResponse.data ?? null) as PostingQueueWithContent | null);
        setLogs([]);
        setIsLoading(false);
        return;
      }

      setQueueItem((queueResponse.data ?? null) as PostingQueueWithContent | null);
      setLogs((logsResponse.data ?? []) as PostingLog[]);
    } catch {
      setError("Failed to load posting detail.");
      setQueueItem(null);
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [queueId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleCancel = async () => {
    if (!queueItem) {
      return;
    }
    setIsActing(true);
    setError("");
    try {
      const response = await fetch("/api/sns/queue", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ queueId: queueItem.id }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error || "Failed to cancel post.");
        setIsActing(false);
        return;
      }
      await fetchData();
    } catch {
      setError("Failed to cancel post.");
    } finally {
      setIsActing(false);
    }
  };

  const handleRetry = async () => {
    if (!queueItem) {
      return;
    }
    setIsActing(true);
    setError("");
    try {
      const response = await fetch("/api/sns/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          content_id: queueItem.content_id,
          connection_id: queueItem.connection_id,
          platform: queueItem.platform,
          immediate: true,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error || "Failed to retry post.");
        setIsActing(false);
        return;
      }
      router.push("/publishing");
      router.refresh();
    } catch {
      setError("Failed to retry post.");
    } finally {
      setIsActing(false);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">読み込み中...</p>;
  }

  if (!queueItem) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-[#1D3557]">投稿管理</h1>
        <p className="text-sm text-muted-foreground">投稿データが見つかりませんでした。</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-[#1D3557]">投稿管理</h1>
          <div className="flex items-center gap-2">
            <PlatformIcon platform={queueItem.platform} />
            <span className="text-sm">{queueItem.platform}</span>
            <Badge className={statusClassName(queueItem.status)}>
              {statusLabel(queueItem.status)}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {queueItem.status === "failed" && (
            <Button
              type="button"
              className="bg-[#1D3557] hover:bg-[#122540]"
              disabled={isActing}
              onClick={() => void handleRetry()}
            >
              再試行
            </Button>
          )}
          {queueItem.status === "pending" && (
            <Button
              type="button"
              variant="outline"
              disabled={isActing}
              onClick={() => void handleCancel()}
            >
              キャンセル
            </Button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-neutral-200 bg-white lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">投稿内容</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">アカウント</p>
                <p className="text-sm font-medium">
                  {queueItem.connection?.external_account_name ?? "-"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">スケジュール時刻</p>
                <p className="text-sm font-medium">{formatDateTime(queueItem.scheduled_at)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">投稿日時</p>
                <p className="text-sm font-medium">{formatDateTime(queueItem.posted_at)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">失敗理由</p>
                <p className="text-sm font-medium">{queueItem.error_message ?? "-"}</p>
              </div>
            </div>
            <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {queueItem.content?.body_text ?? ""}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-neutral-200 bg-white">
          <CardHeader>
            <CardTitle className="text-base">投稿ログ</CardTitle>
          </CardHeader>
          <CardContent>
            <PostingLogList logs={logs} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
