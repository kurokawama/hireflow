"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CollectionCriteria, CollectionResult } from "@/types/targets";

type ListResponse = {
  data?: {
    name: string;
    collection_criteria?: CollectionCriteria | null;
  };
  error?: string;
};

type CollectResponse = {
  data?: CollectionResult;
  error?: string;
};

export default function AutoCollectionPage() {
  const params = useParams<{ listId: string }>();
  const listId = params.listId;

  const [listName, setListName] = useState("");
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");

  // Collection criteria form
  const [keywordsInput, setKeywordsInput] = useState("");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [location, setLocation] = useState("");
  const [scoreThreshold, setScoreThreshold] = useState("50");
  const [maxPerKeyword, setMaxPerKeyword] = useState("25");

  // Collection state
  const [collecting, setCollecting] = useState(false);
  const [collectError, setCollectError] = useState("");
  const [result, setResult] = useState<CollectionResult | null>(null);

  useEffect(() => {
    const fetchList = async () => {
      setListLoading(true);
      setListError("");
      try {
        const response = await fetch(`/api/targets/lists/${listId}`, {
          method: "GET",
          cache: "no-store",
        });
        const body = (await response.json().catch(() => null)) as ListResponse | null;
        if (!response.ok || !body?.data) {
          throw new Error(body?.error ?? "リスト情報の取得に失敗しました");
        }
        setListName(body.data.name);

        // Restore previous criteria if exists
        const criteria = body.data.collection_criteria;
        if (criteria) {
          setKeywordsInput(criteria.keywords.join(", "));
          if (criteria.age_min) setAgeMin(String(criteria.age_min));
          if (criteria.age_max) setAgeMax(String(criteria.age_max));
          if (criteria.location) setLocation(criteria.location);
          setScoreThreshold(String(criteria.score_threshold));
          setMaxPerKeyword(String(criteria.max_results_per_keyword));
        }
      } catch (error) {
        setListError(
          error instanceof Error ? error.message : "リスト情報の取得に失敗しました"
        );
      } finally {
        setListLoading(false);
      }
    };

    if (listId) {
      void fetchList();
    }
  }, [listId]);

  const handleCollect = async () => {
    const keywords = keywordsInput
      .split(/[,、\n]/)
      .map((k) => k.trim())
      .filter(Boolean);

    if (keywords.length === 0) {
      setCollectError("キーワードを1つ以上入力してください");
      return;
    }

    setCollecting(true);
    setCollectError("");
    setResult(null);

    const criteria: CollectionCriteria = {
      keywords,
      age_min: ageMin ? Number(ageMin) : undefined,
      age_max: ageMax ? Number(ageMax) : undefined,
      location: location.trim() || undefined,
      platforms: ["youtube"],
      score_threshold: Number(scoreThreshold) || 50,
      max_results_per_keyword: Number(maxPerKeyword) || 25,
    };

    try {
      const response = await fetch(`/api/targets/lists/${listId}/collect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ criteria }),
      });
      const body = (await response.json().catch(() => null)) as CollectResponse | null;

      if (!response.ok || !body?.data) {
        throw new Error(body?.error ?? "自動収集に失敗しました");
      }

      setResult(body.data);
    } catch (error) {
      setCollectError(
        error instanceof Error ? error.message : "自動収集に失敗しました"
      );
    } finally {
      setCollecting(false);
    }
  };

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link href="/targets" className="hover:text-foreground">
          ターゲットリスト
        </Link>
        <span>{">"}</span>
        <Link href={`/targets/${listId}`} className="hover:text-foreground">
          {listLoading ? "読み込み中..." : listName || "リスト"}
        </Link>
        <span>{">"}</span>
        <span className="text-foreground">自動収集</span>
      </nav>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">SNS自動収集</h1>
        <p className="text-sm text-muted-foreground">
          キーワードと条件を設定すると、AIが自動でプロフィールを検索・分析・登録します。
        </p>
      </div>

      {listError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {listError}
        </p>
      )}

      <Card className="rounded-md shadow-sm">
        <CardHeader>
          <CardTitle>収集条件</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="keywords">キーワード（カンマ区切りで複数入力可）</Label>
            <Input
              id="keywords"
              aria-label="検索キーワード"
              placeholder="例: サッカー, 野球, パーソナルトレーナー, ストレッチ"
              value={keywordsInput}
              onChange={(e) => setKeywordsInput(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              スポーツ名、職種、スキルなどを入力してください
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="age-min">年齢（下限）</Label>
              <Input
                id="age-min"
                aria-label="年齢下限"
                type="number"
                min={15}
                max={65}
                placeholder="例: 20"
                value={ageMin}
                onChange={(e) => setAgeMin(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="age-max">年齢（上限）</Label>
              <Input
                id="age-max"
                aria-label="年齢上限"
                type="number"
                min={15}
                max={65}
                placeholder="例: 30"
                value={ageMax}
                onChange={(e) => setAgeMax(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="location">地域</Label>
              <Input
                id="location"
                aria-label="地域"
                placeholder="例: 東京"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="score-threshold">
                スコア閾値（{scoreThreshold}点以上を自動登録）
              </Label>
              <Input
                id="score-threshold"
                aria-label="スコア閾値"
                type="number"
                min={0}
                max={100}
                value={scoreThreshold}
                onChange={(e) => setScoreThreshold(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-per-keyword">キーワードあたりの最大取得数</Label>
            <Input
              id="max-per-keyword"
              aria-label="キーワードあたり最大取得数"
              type="number"
              min={5}
              max={50}
              value={maxPerKeyword}
              onChange={(e) => setMaxPerKeyword(e.target.value)}
            />
          </div>

          <Button
            type="button"
            onClick={() => void handleCollect()}
            disabled={collecting || !keywordsInput.trim()}
            aria-label="自動収集を開始"
            className="w-full motion-reduce:transition-none sm:w-auto"
          >
            {collecting ? "収集中...（AI分析含め1-2分かかります）" : "自動収集を開始"}
          </Button>

          {collectError && (
            <p
              role="alert"
              aria-live="polite"
              className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {collectError}
            </p>
          )}
        </CardContent>
      </Card>

      {collecting && (
        <Card className="rounded-md shadow-sm">
          <CardContent className="space-y-3 pt-6">
            <p className="text-sm font-medium text-foreground">自動収集中...</p>
            <div className="space-y-2">
              <div
                className="h-3 w-full animate-pulse rounded bg-muted motion-reduce:animate-none"
                aria-hidden="true"
              />
              <p className="text-xs text-muted-foreground">
                YouTube APIでチャンネルを検索 → AIがプロフィールを分析・スコアリング → 条件に合うプロフィールを自動登録
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="rounded-md shadow-sm">
          <CardHeader>
            <CardTitle>収集結果</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-md border bg-muted/30 p-3 text-center">
                <p className="text-2xl font-bold text-foreground">
                  {result.profiles_found}
                </p>
                <p className="text-xs text-muted-foreground">検出数</p>
              </div>
              <div className="rounded-md border bg-primary/10 p-3 text-center">
                <p className="text-2xl font-bold text-primary">
                  {result.profiles_added}
                </p>
                <p className="text-xs text-muted-foreground">自動登録数</p>
              </div>
              <div className="rounded-md border bg-muted/30 p-3 text-center">
                <p className="text-2xl font-bold text-muted-foreground">
                  {result.profiles_skipped}
                </p>
                <p className="text-xs text-muted-foreground">
                  スキップ（条件外）
                </p>
              </div>
              <div className="rounded-md border bg-muted/30 p-3 text-center">
                <p className="text-2xl font-bold text-muted-foreground">
                  {result.profiles_duplicate}
                </p>
                <p className="text-xs text-muted-foreground">重複</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-destructive">エラー:</p>
                {result.errors.map((err, i) => (
                  <p key={`collect-error-${i}`} className="text-xs text-destructive">
                    {err}
                  </p>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                asChild
                variant="outline"
                aria-label="収集結果をリストで確認"
              >
                <Link href={`/targets/${listId}`}>
                  リストで確認（{result.profiles_added}件追加済み）
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setResult(null);
                }}
                aria-label="再度収集を実行"
              >
                条件を変えて再収集
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!collecting && !result && (
        <Card className="rounded-md border-dashed shadow-none">
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">
              キーワードを設定して「自動収集を開始」を押すと、AIが自動でプロフィールを検索・分析・登録します。
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Badge variant="outline" className="text-xs">YouTube対応</Badge>
              <Badge variant="outline" className="text-xs">AIスコアリング</Badge>
              <Badge variant="outline" className="text-xs">年齢推定</Badge>
              <Badge variant="outline" className="text-xs">地域フィルタ</Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
