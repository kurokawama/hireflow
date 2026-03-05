"use client";

import Image from "next/image";
import type { YouTubeSearchResult } from "@/types/targets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type SearchResultsProps = {
  results: YouTubeSearchResult[];
  addedChannelIds: string[];
  addingChannelIds: string[];
  onAdd: (result: YouTubeSearchResult) => Promise<void>;
};

export function SearchResults({
  results,
  addedChannelIds,
  addingChannelIds,
  onAdd,
}: SearchResultsProps) {
  if (results.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
        <p className="text-sm text-muted-foreground">検索結果がありません</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {results.map((result) => {
        const added = addedChannelIds.includes(result.channel_id);
        const adding = addingChannelIds.includes(result.channel_id);

        return (
          <Card key={result.channel_id} className="border-border bg-card shadow-sm">
            <CardContent className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row">
                <Image
                  src={result.thumbnail_url}
                  alt={result.channel_title}
                  width={128}
                  height={72}
                  className="h-[72px] w-[128px] rounded-md border border-border object-cover"
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-foreground">
                        {result.channel_title}
                      </p>
                      <a
                        href={result.profile_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-primary underline-offset-4 hover:underline"
                      >
                        {result.profile_url}
                      </a>
                    </div>
                    <Button
                      type="button"
                      aria-label={`${result.channel_title}をリストに追加`}
                      onClick={() => void onAdd(result)}
                      disabled={added || adding}
                    >
                      {added ? "追加済み" : adding ? "追加中..." : "リストに追加"}
                    </Button>
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">{result.description}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="border-border text-muted-foreground">
                      登録者数{" "}
                      {typeof result.subscriber_count === "number"
                        ? result.subscriber_count.toLocaleString("ja-JP")
                        : "-"}
                    </Badge>
                    <Badge variant="outline" className="border-border text-muted-foreground">
                      動画数{" "}
                      {typeof result.video_count === "number"
                        ? result.video_count.toLocaleString("ja-JP")
                        : "-"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
