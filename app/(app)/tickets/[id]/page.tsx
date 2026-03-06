"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getTicketByCodeAction } from "@/lib/actions/tickets";
import type { TicketWithCandidate } from "@/types/tickets";
import { TicketDetailCard } from "@/components/tickets/ticket-detail-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<TicketWithCandidate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadTicket() {
      setIsLoading(true);
      setErrorMessage(null);

      const result = await getTicketByCodeAction(params.id);
      if (result.error || !result.data) {
        setTicket(null);
        setErrorMessage(result.error ?? "チケットが見つかりません");
      } else {
        setTicket(result.data);
      }

      setIsLoading(false);
    }

    void loadTicket();
  }, [params.id]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-bold text-[#1D3557]">チケット詳細</h1>
        <Button asChild variant="outline" className="border-neutral-200">
          <Link href="/tickets">戻る</Link>
        </Button>
      </div>

      {isLoading ? <p className="text-sm text-neutral-600">読み込み中...</p> : null}
      {!isLoading && errorMessage ? <p className="text-sm text-red-700">{errorMessage}</p> : null}

      {!isLoading && ticket ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <TicketDetailCard ticket={ticket} />

          <Card className="rounded-md border-neutral-200">
            <CardHeader>
              <CardTitle className="text-[#1D3557]">候補者 / 来店者情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-sm">
              <div className="space-y-3">
                <p className="font-semibold text-[#1D3557]">候補者情報</p>
                <div className="space-y-2 text-neutral-700">
                  <p>名前: {ticket.candidates?.name ?? "-"}</p>
                  <p>メール: {ticket.candidates?.email ?? "-"}</p>
                  <p>電話番号: {ticket.candidates?.phone ?? "-"}</p>
                  <p>LINE ID: {ticket.candidates?.line_user_id ?? "-"}</p>
                  <p>スコア: {ticket.candidates?.ai_score ?? "-"}</p>
                  <p>ステージ: {ticket.candidates?.stage ?? "-"}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="font-semibold text-[#1D3557]">来店者情報</p>
                <div className="space-y-2 text-neutral-700">
                  <p>名前: {ticket.visitor_info?.name ?? "-"}</p>
                  <p>電話番号: {ticket.visitor_info?.phone ?? "-"}</p>
                  <p>メール: {ticket.visitor_info?.email ?? "-"}</p>
                  <p>住所: {ticket.visitor_info?.address ?? "-"}</p>
                  <p>備考: {ticket.visitor_info?.notes ?? "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
