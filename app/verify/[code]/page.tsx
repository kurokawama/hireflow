"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import type { TicketStatus, TicketType } from "@/types/tickets";
import { RedeemForm } from "@/components/tickets/redeem-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type VerifyTicket = {
  ticket_code: string;
  ticket_type: TicketType;
  status: TicketStatus;
  issued_at: string;
  expires_at: string;
  redeemed_at: string | null;
};

type VerifyApiResponse = {
  data?: VerifyTicket;
  error?: string;
};

const ticketTypeLabels: Record<TicketType, string> = {
  dr_stretch_60min: "Dr.ストレッチ 60分体験",
  pilates_weekly: "ピラティス 週1体験",
};

function statusLabel(status: TicketStatus) {
  if (status === "issued") return "有効";
  if (status === "redeemed") return "使用済み";
  if (status === "expired") return "期限切れ";
  return "期限切れ";
}

function statusClassName(status: TicketStatus) {
  if (status === "issued") return "border-transparent bg-green-100 text-green-600";
  if (status === "redeemed") return "border-transparent bg-blue-100 text-blue-600";
  if (status === "expired") return "border-transparent bg-neutral-200 text-neutral-700";
  return "border-transparent bg-neutral-200 text-neutral-700";
}

export default function VerifyTicketPage() {
  const params = useParams<{ code: string | string[] }>();
  const searchParams = useSearchParams();
  const code = useMemo(
    () => (Array.isArray(params?.code) ? params.code[0] ?? "" : (params?.code ?? "")),
    [params]
  );
  const storeId = searchParams.get("store_id") ?? undefined;

  const [isLoading, setIsLoading] = useState(true);
  const [ticket, setTicket] = useState<VerifyTicket | null>(null);
  const [error, setError] = useState("");
  const [showRedeemForm, setShowRedeemForm] = useState(false);

  useEffect(() => {
    if (!code) {
      setIsLoading(false);
      setError("チケットが見つかりません");
      return;
    }

    let cancelled = false;

    const loadTicket = async () => {
      setIsLoading(true);
      setTicket(null);
      setError("");
      setShowRedeemForm(false);

      try {
        const response = await fetch(`/api/verify/${encodeURIComponent(code)}`, {
          method: "GET",
        });
        const payload = (await response.json()) as VerifyApiResponse;

        if (response.status === 404) {
          throw new Error("チケットが見つかりません");
        }
        if (!response.ok || !payload.data) {
          throw new Error(payload.error || "Request failed.");
        }

        if (!cancelled) {
          setTicket(payload.data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Request failed.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadTicket();

    return () => {
      cancelled = true;
    };
  }, [code]);

  const handleRedeemSuccess = (redeemedAt: string | null) => {
    setTicket((prev) =>
      prev
        ? {
            ...prev,
            status: "redeemed",
            redeemed_at: redeemedAt ?? new Date().toISOString(),
          }
        : prev
    );
    setShowRedeemForm(false);
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-neutral-200 bg-white">
        <CardContent className="space-y-4 p-6">
          {isLoading && <p className="text-sm text-neutral-600">読み込み中...</p>}

          {!isLoading && error && (
            <p className="text-sm text-red-600">{error === "チケットが見つかりません" ? "チケットが見つかりません" : error}</p>
          )}

          {!isLoading && !error && ticket && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-[#1D3557]">
                  {ticketTypeLabels[ticket.ticket_type]}
                </p>
                <Badge className={statusClassName(ticket.status)}>{statusLabel(ticket.status)}</Badge>
              </div>

              <div className="space-y-1 text-sm text-neutral-600">
                <p>発行日: {new Date(ticket.issued_at).toLocaleString("ja-JP")}</p>
                <p>有効期限: {new Date(ticket.expires_at).toLocaleString("ja-JP")}</p>
                {ticket.status === "redeemed" && ticket.redeemed_at && (
                  <p>使用日: {new Date(ticket.redeemed_at).toLocaleString("ja-JP")}</p>
                )}
              </div>

              {ticket.status === "expired" && <p className="text-sm text-neutral-600">期限切れ</p>}

              {ticket.status === "issued" && (
                <div className="space-y-3">
                  {!showRedeemForm && (
                    <Button
                      type="button"
                      className="w-full bg-[#1D3557] hover:bg-[#122540]"
                      onClick={() => setShowRedeemForm(true)}
                    >
                      使用する
                    </Button>
                  )}
                  {showRedeemForm && (
                    <RedeemForm
                      ticketCode={ticket.ticket_code}
                      storeId={storeId}
                      onSuccess={handleRedeemSuccess}
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
