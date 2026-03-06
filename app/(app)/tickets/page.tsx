"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  expireOverdueTicketsAction,
  getTicketStatsAction,
  listTicketsAction,
} from "@/lib/actions/tickets";
import type { TicketStatus, TicketWithCandidate } from "@/types/tickets";
import { TicketIssueDialog } from "@/components/tickets/ticket-issue-dialog";
import { TicketStatsCards } from "@/components/tickets/ticket-stats-cards";
import { TicketTable } from "@/components/tickets/ticket-table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type StatusFilter = "all" | TicketStatus;

export default function TicketsPage() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getTicketStatsAction>>["data"]>(null);
  const [tickets, setTickets] = useState<TicketWithCandidate[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(async (status: StatusFilter, runExpiry: boolean) => {
    setIsLoading(true);
    setErrorMessage(null);

    if (runExpiry) {
      await expireOverdueTicketsAction();
    }

    const [statsResult, ticketsResult] = await Promise.all([
      getTicketStatsAction(),
      listTicketsAction(status === "all" ? undefined : { status }),
    ]);

    if (statsResult.error || ticketsResult.error) {
      setErrorMessage(statsResult.error ?? ticketsResult.error ?? "データの読み込みに失敗しました");
      setStats(statsResult.data);
      setTickets(ticketsResult.data);
    } else {
      setStats(statsResult.data);
      setTickets(ticketsResult.data);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadData(statusFilter, true);
  }, [loadData, statusFilter]);

  const candidateOptions = useMemo(() => {
    const map = new Map<string, string>();

    for (const ticket of tickets) {
      if (!ticket.candidates) continue;
      const name = ticket.candidates.name?.trim() ? ticket.candidates.name : ticket.candidates.id;
      map.set(ticket.candidates.id, name);
    }

    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [tickets]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-bold text-[#1D3557]">チケット管理</h1>
        <div className="flex items-center gap-2">
          <TicketIssueDialog
            candidates={candidateOptions}
            triggerLabel="チケット発行"
            onIssued={() => {
              void loadData(statusFilter, false);
            }}
          />
          <Button asChild variant="outline" className="border-neutral-200">
            <Link href="/tickets/new">発行フォーム</Link>
          </Button>
        </div>
      </div>

      <TicketStatsCards stats={stats} isLoading={isLoading} />

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-neutral-600">ステータス</p>
        <div className="w-full max-w-xs">
          <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              <SelectItem value="issued">発行済み</SelectItem>
              <SelectItem value="redeemed">使用済み</SelectItem>
              <SelectItem value="expired">期限切れ</SelectItem>
              <SelectItem value="cancelled">キャンセル</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {errorMessage ? <p className="text-sm text-red-700">{errorMessage}</p> : null}

      <TicketTable tickets={tickets} isLoading={isLoading} />
    </div>
  );
}
