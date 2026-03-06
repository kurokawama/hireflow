"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import type { EntryTracking, FunnelStep } from "@/types/tracking";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface FunnelTableProps {
  events: EntryTracking[];
  isLoading: boolean;
}

const stepLabelMap: Record<FunnelStep, string> = {
  impression: "インプレッション",
  click: "クリック",
  quiz_start: "クイズ開始",
  quiz_complete: "クイズ完了",
  line_follow: "LINEフォロー",
  ticket_issued: "チケット発行",
  ticket_redeemed: "チケット使用",
  interview_book: "面接予約",
};

const sourceLabelMap: Record<EntryTracking["entry_source"], string> = {
  organic_post: "オーガニック投稿",
  paid_ad: "広告",
  advocacy_share: "社員シェア",
  direct: "直接流入",
};

export function FunnelTable({ events, isLoading }: FunnelTableProps) {
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const sortedEvents = useMemo(() => {
    const next = [...events];
    next.sort((a, b) => {
      const left = new Date(a.created_at).getTime();
      const right = new Date(b.created_at).getTime();
      return sortOrder === "desc" ? right - left : left - right;
    });
    return next;
  }, [events, sortOrder]);

  return (
    <div className="rounded-md border border-neutral-200 bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <button
                type="button"
                onClick={() => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
                className="inline-flex items-center gap-1 text-left text-xs font-medium uppercase tracking-wide text-neutral-600 hover:text-[#1D3557]"
              >
                日付
                <ArrowUpDown className="h-3.5 w-3.5" />
              </button>
            </TableHead>
            <TableHead>流入元</TableHead>
            <TableHead>プラットフォーム</TableHead>
            <TableHead>ファネル段階</TableHead>
            <TableHead>候補者</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-sm text-neutral-500">
                読み込み中...
              </TableCell>
            </TableRow>
          )}

          {!isLoading && sortedEvents.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-sm text-neutral-500">
                トラッキングデータはありません
              </TableCell>
            </TableRow>
          )}

          {!isLoading &&
            sortedEvents.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="text-sm">
                  {new Date(event.created_at).toLocaleString("ja-JP")}
                </TableCell>
                <TableCell className="text-sm">
                  {sourceLabelMap[event.entry_source] ?? event.entry_source}
                </TableCell>
                <TableCell className="text-sm">
                  {event.referral_platform ? event.referral_platform : "-"}
                </TableCell>
                <TableCell className="text-sm">
                  <Badge className="border-transparent bg-[#1D3557]/10 text-[#1D3557]">
                    {stepLabelMap[event.funnel_step]}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs sm:text-sm">
                  {event.candidate_id ? event.candidate_id : "-"}
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );
}
