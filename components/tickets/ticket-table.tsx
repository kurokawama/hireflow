"use client";

import Link from "next/link";
import type { TicketStatus, TicketType, TicketWithCandidate } from "@/types/tickets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TicketTableProps {
  tickets: TicketWithCandidate[];
  isLoading: boolean;
}

const statusClassMap: Record<TicketStatus, string> = {
  issued: "rounded-full bg-blue-100 text-blue-700",
  redeemed: "rounded-full bg-green-100 text-green-700",
  expired: "rounded-full bg-neutral-100 text-neutral-500",
  cancelled: "rounded-full bg-red-100 text-red-700",
};

const typeLabelMap: Record<TicketType, string> = {
  dr_stretch_60min: "Dr.ストレッチ 60分体験",
  pilates_weekly: "ピラティス 週1体験",
};

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("ja-JP");
}

export function TicketTable({ tickets, isLoading }: TicketTableProps) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>コード</TableHead>
            <TableHead>候補者名</TableHead>
            <TableHead>タイプ</TableHead>
            <TableHead>ステータス</TableHead>
            <TableHead>発行日</TableHead>
            <TableHead>有効期限</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-sm text-neutral-600">
                Loading...
              </TableCell>
            </TableRow>
          ) : tickets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-sm text-neutral-600">
                No data
              </TableCell>
            </TableRow>
          ) : (
            tickets.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell className="font-mono text-xs sm:text-sm">{ticket.ticket_code}</TableCell>
                <TableCell className="text-sm">{ticket.candidates?.name ?? "-"}</TableCell>
                <TableCell className="text-sm">{typeLabelMap[ticket.ticket_type]}</TableCell>
                <TableCell>
                  <Badge className={statusClassMap[ticket.status]}>{ticket.status}</Badge>
                </TableCell>
                <TableCell className="text-sm">{formatDate(ticket.issued_at)}</TableCell>
                <TableCell className="text-sm">{formatDate(ticket.expires_at)}</TableCell>
                <TableCell>
                  <Button asChild variant="outline" size="sm" className="border-neutral-200">
                    <Link href={`/tickets/${ticket.ticket_code}`}>Detail</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
