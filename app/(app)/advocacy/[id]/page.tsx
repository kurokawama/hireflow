"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { KitStatus, PostingKit } from "@/types/advocacy";

const statusLabelMap: Record<KitStatus, string> = {
  draft: "下書き",
  scheduled: "予約済み",
  distributed: "配布済み",
  archived: "アーカイブ",
};

const statusClassMap: Record<KitStatus, string> = {
  draft: "bg-neutral-100 text-neutral-700 border-transparent",
  scheduled: "bg-blue-100 text-blue-800 border-transparent",
  distributed: "bg-green-100 text-green-800 border-transparent",
  archived: "bg-neutral-200 text-neutral-700 border-transparent",
};

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("ja-JP");
}

export default function AdvocacyKitDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const kitId = params?.id;

  const [kit, setKit] = useState<PostingKit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    if (!kitId) return;

    let isMounted = true;

    const loadKit = async () => {
      setIsLoading(true);
      setLoadError("");

      try {
        const response = await fetch("/api/advocacy/kits", {
          method: "GET",
          cache: "no-store",
        });
        const json = (await response.json()) as { data?: PostingKit[]; error?: string };

        if (!response.ok || !json.data) {
          if (!isMounted) return;
          setLoadError(json.error || "キット詳細の取得に失敗しました。");
          setKit(null);
          return;
        }

        const foundKit = json.data.find((entry) => entry.id === kitId) || null;
        if (!isMounted) return;
        setKit(foundKit);
        if (!foundKit) {
          setLoadError("指定されたキットが見つかりませんでした。");
        }
      } catch {
        if (!isMounted) return;
        setLoadError("キット詳細の取得に失敗しました。");
        setKit(null);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadKit();
    return () => {
      isMounted = false;
    };
  }, [kitId]);

  const canDistribute = useMemo(() => {
    return kit?.status !== "distributed" && kit?.status !== "archived";
  }, [kit?.status]);

  const canArchive = useMemo(() => {
    return kit?.status !== "archived";
  }, [kit?.status]);

  const handleStatusUpdate = async (nextStatus: KitStatus) => {
    if (!kit) return;
    setActionError("");
    setIsUpdatingStatus(true);

    try {
      const response = await fetch("/api/advocacy/kits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kit_id: kit.id,
          status: nextStatus,
        }),
      });
      const json = (await response.json()) as { data?: PostingKit; error?: string };
      if (!response.ok || !json.data) {
        setActionError(json.error || "ステータス更新に失敗しました。");
        return;
      }
      setKit(json.data);
      router.refresh();
    } catch {
      setActionError("ステータス更新に失敗しました。");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">投稿キット詳細</h1>
        <Button asChild variant="outline">
          <Link href="/advocacy" aria-label="投稿キット一覧に戻る">
            一覧へ戻る
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <Card className="rounded-md shadow-sm">
          <CardContent className="space-y-3 pt-6" aria-live="polite" aria-busy="true">
            <div className="h-5 w-1/2 animate-pulse rounded bg-muted motion-reduce:animate-none" />
            <div className="h-4 w-full animate-pulse rounded bg-muted motion-reduce:animate-none" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-muted motion-reduce:animate-none" />
          </CardContent>
        </Card>
      ) : loadError || !kit ? (
        <Card className="rounded-md shadow-sm">
          <CardContent className="space-y-3 pt-6">
            <p role="alert" className="text-sm text-destructive">
              {loadError || "キットが見つかりません。"}
            </p>
            <Button asChild size="sm">
              <Link href="/advocacy" aria-label="投稿キット一覧へ移動">
                一覧へ戻る
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="rounded-md shadow-sm">
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <CardTitle className="text-xl">{kit.title}</CardTitle>
                <Badge className={statusClassMap[kit.status]}>{statusLabelMap[kit.status]}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{kit.theme}</p>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground">ブランド</p>
                <p className="font-medium text-foreground">{kit.brand || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">配布予定日時</p>
                <p className="font-medium text-foreground">{formatDateTime(kit.scheduled_at)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">配布日時</p>
                <p className="font-medium text-foreground">{formatDateTime(kit.distributed_at)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">作成日時</p>
                <p className="font-medium text-foreground">{formatDateTime(kit.created_at)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-md shadow-sm">
            <CardHeader>
              <CardTitle>投稿ヒント</CardTitle>
            </CardHeader>
            <CardContent>
              {kit.hints.length === 0 ? (
                <p className="text-sm text-muted-foreground">ヒントは登録されていません。</p>
              ) : (
                <ul className="space-y-2">
                  {kit.hints.map((hint, index) => (
                    <li key={`${kit.id}-hint-${index}`} className="rounded-md border p-3">
                      <p className="text-sm font-medium text-foreground">{hint.hint_text}</p>
                      {hint.example_description && (
                        <p className="mt-1 text-sm text-muted-foreground">{hint.example_description}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-md shadow-sm">
            <CardHeader>
              <CardTitle>ハッシュタグ</CardTitle>
            </CardHeader>
            <CardContent>
              {kit.hashtags.length === 0 ? (
                <p className="text-sm text-muted-foreground">ハッシュタグはありません。</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {kit.hashtags.map((tag) => (
                    <span
                      key={`${kit.id}-${tag}`}
                      className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-md shadow-sm">
            <CardHeader>
              <CardTitle>テンプレート文</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap rounded-md border bg-muted/20 p-3 text-sm text-foreground">
                {kit.template_text || "テンプレート文はありません。"}
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-md shadow-sm">
            <CardHeader>
              <CardTitle>アクション</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => handleStatusUpdate("distributed")}
                  disabled={!canDistribute || isUpdatingStatus}
                  aria-label="キットを配布済みにする"
                >
                  配布済みにする
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleStatusUpdate("archived")}
                  disabled={!canArchive || isUpdatingStatus}
                  aria-label="キットをアーカイブする"
                >
                  アーカイブ
                </Button>
              </div>
              {isUpdatingStatus && (
                <p className="text-sm text-muted-foreground" aria-live="polite">
                  更新中...
                </p>
              )}
              {actionError && (
                <p role="alert" aria-live="polite" className="text-sm text-destructive">
                  {actionError}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
