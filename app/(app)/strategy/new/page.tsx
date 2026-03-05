"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TargetList } from "@/types/targets";

function getWeekStartDateValue() {
  const now = new Date();
  const currentDay = now.getDay();
  const diff = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

export default function NewStrategyPage() {
  const router = useRouter();
  const [lists, setLists] = useState<TargetList[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(true);
  const [listError, setListError] = useState("");
  const [selectedListId, setSelectedListId] = useState("");
  const [weekStart, setWeekStart] = useState(getWeekStartDateValue());
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");

  useEffect(() => {
    const loadLists = async () => {
      setIsLoadingLists(true);
      setListError("");

      try {
        const response = await fetch("/api/targets/lists");
        const json = (await response.json()) as {
          data?: TargetList[];
          error?: string;
        };
        if (!response.ok || !json.data) {
          setListError(json.error || "ターゲットリストの取得に失敗しました。");
          return;
        }
        setLists(json.data);
        if (json.data[0]?.id) {
          setSelectedListId(json.data[0].id);
        }
      } catch {
        setListError("ターゲットリストの取得に失敗しました。");
      } finally {
        setIsLoadingLists(false);
      }
    };

    void loadLists();
  }, []);

  const canSubmit = useMemo(() => {
    return selectedListId.length > 0 && weekStart.length > 0 && !isGenerating;
  }, [selectedListId, weekStart, isGenerating]);

  const handleGenerate = async () => {
    setGenerateError("");
    if (!canSubmit) return;

    setIsGenerating(true);
    try {
      const response = await fetch("/api/strategy/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_list_id: selectedListId,
          week_start: weekStart,
        }),
      });

      const json = (await response.json()) as {
        data?: { calendar?: { id: string } };
        error?: string;
      };

      if (!response.ok || !json.data?.calendar?.id) {
        setGenerateError(json.error || "AI戦略の生成に失敗しました。");
        return;
      }

      router.push(`/strategy/${json.data.calendar.id}`);
    } catch {
      setGenerateError("AI戦略の生成に失敗しました。");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">AI戦略生成</h1>

      <Card className="rounded-md shadow-sm">
        <CardHeader>
          <CardTitle>戦略生成フォーム</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="target-list-select">Step 1: ターゲットリスト選択</Label>
            {isLoadingLists ? (
              <div
                className="h-10 w-full animate-pulse rounded-md bg-muted motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : lists.length === 0 ? (
              <p className="text-sm text-muted-foreground">ターゲットリストがありません。</p>
            ) : (
              <Select value={selectedListId} onValueChange={setSelectedListId}>
                <SelectTrigger id="target-list-select" aria-label="ターゲットリストを選択">
                  <SelectValue placeholder="ターゲットリストを選択" />
                </SelectTrigger>
                <SelectContent>
                  {lists.map((list) => (
                    <SelectItem key={list.id} value={list.id}>
                      {list.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="week-start">Step 2: 週の開始日選択</Label>
            <input
              id="week-start"
              type="date"
              value={weekStart}
              onChange={(event) => setWeekStart(event.target.value)}
              aria-label="週の開始日"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-3">
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={!canSubmit || lists.length === 0 || isLoadingLists}
              aria-label="AI戦略を生成"
              className="motion-reduce:transition-none"
            >
              AI戦略を生成
            </Button>

            {isGenerating && (
              <div className="space-y-2 rounded-md border bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">AIが戦略を分析中...</p>
                <div
                  className="h-4 w-3/4 animate-pulse rounded bg-muted motion-reduce:animate-none"
                  aria-hidden="true"
                />
                <div
                  className="h-4 w-full animate-pulse rounded bg-muted motion-reduce:animate-none"
                  aria-hidden="true"
                />
                <div
                  className="h-4 w-5/6 animate-pulse rounded bg-muted motion-reduce:animate-none"
                  aria-hidden="true"
                />
              </div>
            )}

            {listError && (
              <p role="alert" className="text-sm text-destructive">
                {listError}
              </p>
            )}
            {generateError && (
              <p role="alert" className="text-sm text-destructive">
                {generateError}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
