"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { KitHint } from "@/types/advocacy";

type BrandType = "dr_stretch" | "wecle";

interface GeneratedKitPreview {
  id: string;
  title: string;
  theme: string;
  hints: KitHint[];
  hashtags: string[];
  template_text: string | null;
}

export default function NewAdvocacyKitPage() {
  const [brand, setBrand] = useState<BrandType>("dr_stretch");
  const [targetAudience, setTargetAudience] = useState("");
  const [targetListId, setTargetListId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<GeneratedKitPreview | null>(null);

  const canSubmit = useMemo(() => {
    return !isSubmitting && brand.length > 0;
  }, [brand, isSubmitting]);

  const handleGenerateKit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError("");
    setPreview(null);

    try {
      const response = await fetch("/api/advocacy/kits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          brand,
          target_audience: targetAudience.trim() || undefined,
          target_list_id: targetListId.trim() || undefined,
          scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        }),
      });

      const json = (await response.json()) as {
        data?: GeneratedKitPreview;
        error?: string;
      };

      if (!response.ok || !json.data) {
        setError(json.error || "キット生成に失敗しました。");
        return;
      }

      setPreview(json.data);
    } catch {
      setError("キット生成に失敗しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">新規投稿キット生成</h1>
        <Button asChild variant="outline">
          <Link href="/advocacy" aria-label="投稿キット一覧へ戻る">
            一覧へ戻る
          </Link>
        </Button>
      </div>

      <Card className="rounded-md shadow-sm">
        <CardHeader>
          <CardTitle>キット生成フォーム</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="advocacy-brand">ブランド *</Label>
            <Select value={brand} onValueChange={(value: BrandType) => setBrand(value)}>
              <SelectTrigger id="advocacy-brand" aria-label="ブランドを選択">
                <SelectValue placeholder="ブランドを選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dr_stretch">Dr.Stretch</SelectItem>
                <SelectItem value="wecle">Wecle</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="target-audience">ターゲット像（任意）</Label>
            <Textarea
              id="target-audience"
              value={targetAudience}
              onChange={(event) => setTargetAudience(event.target.value)}
              placeholder="例: 仕事帰りに短時間で体を整えたい20〜30代の会社員"
              aria-label="ターゲット像"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="target-list-id">ターゲットリストID（任意）</Label>
            <Input
              id="target-list-id"
              value={targetListId}
              onChange={(event) => setTargetListId(event.target.value)}
              placeholder="例: 9f8b2f2e-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              aria-label="ターゲットリストID"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduled-at">配布予定日時（任意）</Label>
            <Input
              id="scheduled-at"
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
              aria-label="配布予定日時"
            />
          </div>

          <div className="space-y-3">
            <Button
              type="button"
              onClick={handleGenerateKit}
              disabled={!canSubmit}
              aria-label="AIで投稿キットを生成"
            >
              {isSubmitting ? "生成中..." : "AIでキットを生成"}
            </Button>

            {isSubmitting && (
              <div className="space-y-2 rounded-md border bg-muted/40 p-4" aria-live="polite" aria-busy="true">
                <p className="text-sm text-muted-foreground">AIが投稿キットを作成しています...</p>
                <div className="h-4 w-full animate-pulse rounded bg-muted motion-reduce:animate-none" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-muted motion-reduce:animate-none" />
                <div className="h-4 w-4/6 animate-pulse rounded bg-muted motion-reduce:animate-none" />
              </div>
            )}

            {error && (
              <p role="alert" aria-live="polite" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {preview && (
        <Card className="rounded-md shadow-sm">
          <CardHeader className="space-y-3">
            <CardTitle>生成結果プレビュー</CardTitle>
            <p className="text-lg font-semibold text-foreground">{preview.title}</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-foreground">テーマ</h2>
              <p className="text-sm leading-6 text-muted-foreground">{preview.theme}</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-foreground">ヒント</h2>
              {preview.hints.length === 0 ? (
                <p className="text-sm text-muted-foreground">ヒントはありません。</p>
              ) : (
                <ul className="space-y-2 text-sm text-foreground">
                  {preview.hints.map((hint, index) => (
                    <li key={`${preview.id}-hint-${index}`} className="rounded-md border p-3">
                      <p className="font-medium">{hint.hint_text}</p>
                      {hint.example_description && (
                        <p className="mt-1 text-muted-foreground">{hint.example_description}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-foreground">ハッシュタグ</h2>
              {preview.hashtags.length === 0 ? (
                <p className="text-sm text-muted-foreground">ハッシュタグはありません。</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {preview.hashtags.map((tag) => (
                    <span
                      key={`${preview.id}-${tag}`}
                      className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-foreground">テンプレート文</h2>
              <p className="whitespace-pre-wrap rounded-md border bg-muted/20 p-3 text-sm text-foreground">
                {preview.template_text || "テンプレート文はありません。"}
              </p>
            </section>

            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href={`/advocacy/${preview.id}`} aria-label="生成したキットの詳細へ移動">
                  詳細ページへ
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/advocacy" aria-label="投稿キット一覧へ移動">
                  一覧を確認
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
