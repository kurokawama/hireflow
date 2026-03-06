"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PostingQueueWithContent } from "@/types/sns";
import { PostingQueueTable } from "@/components/sns/posting-queue-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";

type FilterType = "all" | "pending" | "posted" | "failed";

interface PostingStats {
  pending: number;
  posted: number;
  failed: number;
}

const initialStats: PostingStats = {
  pending: 0,
  posted: 0,
  failed: 0,
};

export default function PublishingPage() {
  const [items, setItems] = useState<PostingQueueWithContent[]>([]);
  const [stats, setStats] = useState<PostingStats>(initialStats);
  const [filter, setFilter] = useState<FilterType>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchStats = async () => {
    setIsStatsLoading(true);
    try {
      const response = await fetch("/api/sns/queue?stats=true", {
        credentials: "include",
      });
      const payload = (await response.json()) as { data?: PostingStats; error?: string };
      if (!response.ok || !payload.data) {
        setError(payload.error || "Failed to fetch posting stats.");
        setIsStatsLoading(false);
        return;
      }
      setStats(payload.data);
    } catch {
      setError("Failed to fetch posting stats.");
    } finally {
      setIsStatsLoading(false);
    }
  };

  const fetchQueue = async (nextFilter: FilterType) => {
    setIsLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (nextFilter !== "all") {
        params.set("status", nextFilter);
      }
      const query = params.toString();
      const response = await fetch(`/api/sns/queue${query ? `?${query}` : ""}`, {
        credentials: "include",
      });
      const payload = (await response.json()) as {
        data?: PostingQueueWithContent[];
        error?: string;
      };
      if (!response.ok || !payload.data) {
        setError(payload.error || "Failed to fetch posting queue.");
        setItems([]);
        setIsLoading(false);
        return;
      }
      setItems(payload.data);
    } catch {
      setError("Failed to fetch posting queue.");
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchStats();
  }, []);

  useEffect(() => {
    void fetchQueue(filter);
  }, [filter]);

  const handleCancel = async (queueId: string) => {
    setCancellingId(queueId);
    setError("");
    try {
      const response = await fetch("/api/sns/queue", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ queueId }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error || "Failed to cancel post.");
        setCancellingId(null);
        return;
      }
      await Promise.all([fetchQueue(filter), fetchStats()]);
    } catch {
      setError("Failed to cancel post.");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-[#1D3557]">投稿管理</h1>
          <p className="text-sm text-muted-foreground">SNS投稿キューを管理します。</p>
        </div>
        <Button asChild className="bg-[#E63946] hover:bg-[#C62F3B]">
          <Link href="/publishing/new">
            <Plus className="mr-2 h-4 w-4" />
            新規投稿
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-neutral-200 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-600">予定</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[#1D3557]">
              {isStatsLoading ? "-" : stats.pending}
            </p>
          </CardContent>
        </Card>
        <Card className="border-neutral-200 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-600">投稿済み</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[#1D3557]">
              {isStatsLoading ? "-" : stats.posted}
            </p>
          </CardContent>
        </Card>
        <Card className="border-neutral-200 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-600">失敗</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[#1D3557]">
              {isStatsLoading ? "-" : stats.failed}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={filter} onValueChange={(value) => setFilter(value as FilterType)}>
        <TabsList className="bg-neutral-100">
          <TabsTrigger value="all">全て</TabsTrigger>
          <TabsTrigger value="pending">予定</TabsTrigger>
          <TabsTrigger value="posted">投稿済み</TabsTrigger>
          <TabsTrigger value="failed">失敗</TabsTrigger>
        </TabsList>
      </Tabs>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <PostingQueueTable
        items={items}
        isLoading={isLoading}
        cancellingId={cancellingId}
        onCancel={(queueId) => void handleCancel(queueId)}
        emptyText="投稿はありません。"
      />
    </div>
  );
}
