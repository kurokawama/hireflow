"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { CreateTargetProfileRequest, YouTubeSearchResult } from "@/types/targets";
import { SearchResults } from "@/components/targets/search-results";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ListResponse = {
  data?: {
    name: string;
  };
  error?: string;
};

export default function TargetListYouTubeSearchPage() {
  const params = useParams<{ listId: string }>();
  const listId = params.listId;

  const [listName, setListName] = useState("");
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [results, setResults] = useState<YouTubeSearchResult[]>([]);

  const [addingChannelIds, setAddingChannelIds] = useState<string[]>([]);
  const [addedChannelIds, setAddedChannelIds] = useState<string[]>([]);

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

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!query.trim()) {
      setSearchError("キーワードを入力してください");
      return;
    }

    setSearching(true);
    setSearchError("");
    setSearched(true);

    try {
      const response = await fetch("/api/targets/search/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), max_results: 10 }),
      });
      const body = (await response.json().catch(() => null)) as
        | { data?: YouTubeSearchResult[]; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "検索に失敗しました");
      }

      setResults(body?.data ?? []);
    } catch (error) {
      setResults([]);
      setSearchError(error instanceof Error ? error.message : "検索に失敗しました");
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async (result: YouTubeSearchResult) => {
    setAddingChannelIds((prev) => [...prev, result.channel_id]);
    setSearchError("");

    const payload: CreateTargetProfileRequest = {
      list_id: listId,
      platform: "youtube",
      source: "youtube_search",
      username: result.channel_id,
      display_name: result.channel_title,
      bio: result.description,
      follower_count: result.subscriber_count ?? undefined,
      profile_url: result.profile_url,
    };

    try {
      const response = await fetch("/api/targets/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(body?.error ?? "プロフィールの追加に失敗しました");
      }
      setAddedChannelIds((prev) =>
        prev.includes(result.channel_id) ? prev : [...prev, result.channel_id]
      );
    } catch (error) {
      setSearchError(
        error instanceof Error ? error.message : "プロフィールの追加に失敗しました"
      );
    } finally {
      setAddingChannelIds((prev) => prev.filter((id) => id !== result.channel_id));
    }
  };

  const showEmptyState = useMemo(
    () => searched && !searching && results.length === 0 && !searchError,
    [results.length, searched, searchError, searching]
  );

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
        <span className="text-foreground">YouTube検索</span>
      </nav>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">YouTube検索</h1>
        <p className="text-sm text-muted-foreground">
          キーワードでチャンネル候補を検索し、ターゲットリストに追加します。
        </p>
      </div>

      {listError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {listError}
        </p>
      )}

      <form
        className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row"
        onSubmit={handleSearch}
      >
        <Input
          aria-label="検索キーワード"
          placeholder="キーワードを入力"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Button type="submit" disabled={searching} aria-label="YouTube検索を実行">
          {searching ? "検索中..." : "検索"}
        </Button>
      </form>

      {searchError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {searchError}
        </p>
      )}

      {searching && (
        <div className="grid gap-4" aria-label="検索結果読み込み中">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`youtube-search-skeleton-${index}`}
              className="h-36 animate-pulse rounded-lg border border-border bg-muted/40 motion-reduce:animate-none"
            />
          ))}
        </div>
      )}

      {!searching && searched && (
        <SearchResults
          results={results}
          addedChannelIds={addedChannelIds}
          addingChannelIds={addingChannelIds}
          onAdd={handleAdd}
        />
      )}

      {!searching && !searched && (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-10 text-center">
          <p className="text-sm text-muted-foreground">キーワードを入力して検索してください</p>
        </div>
      )}

      {showEmptyState && (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-10 text-center">
          <p className="text-sm text-muted-foreground">検索結果がありません</p>
        </div>
      )}
    </div>
  );
}
