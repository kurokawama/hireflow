"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import type { TicketStatus, TicketType, TicketWithCandidate } from "@/types/tickets";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface TicketDetailCardProps {
  ticket: TicketWithCandidate;
}

const statusLabelMap: Record<TicketStatus, string> = {
  issued: "発行済み",
  redeemed: "使用済み",
  expired: "期限切れ",
  cancelled: "キャンセル",
};

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

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("ja-JP");
}

export function TicketDetailCard({ ticket }: TicketDetailCardProps) {
  const [qrImageSrc, setQrImageSrc] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    async function buildQr() {
      try {
        if (ticket.qr_code_url && ticket.qr_code_url.startsWith("data:image/")) {
          if (mounted) setQrImageSrc(ticket.qr_code_url);
          return;
        }

        const dataUrl = await QRCode.toDataURL(ticket.ticket_code, { margin: 1, width: 256 });
        if (mounted) setQrImageSrc(dataUrl);
      } catch {
        if (mounted) setQrImageSrc("");
      }
    }

    void buildQr();

    return () => {
      mounted = false;
    };
  }, [ticket.qr_code_url, ticket.ticket_code]);

  return (
    <Card className="rounded-md border-neutral-200">
      <CardHeader>
        <CardTitle className="text-[#1D3557]">チケット情報</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <p className="text-xs text-neutral-600">チケットコード</p>
          <p className="font-mono text-sm text-[#1D3557]">{ticket.ticket_code}</p>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-neutral-600">チケットタイプ</p>
          <p className="text-sm text-neutral-700">{typeLabelMap[ticket.ticket_type]}</p>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-neutral-600">ステータス</p>
          <Badge className={statusClassMap[ticket.status]}>{statusLabelMap[ticket.status]}</Badge>
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="text-xs text-neutral-600">発行日</p>
          <p className="text-sm text-neutral-700">{formatDateTime(ticket.issued_at)}</p>
        </div>
        <div className="space-y-2">
          <p className="text-xs text-neutral-600">有効期限</p>
          <p className="text-sm text-neutral-700">{formatDateTime(ticket.expires_at)}</p>
        </div>
        <div className="space-y-2">
          <p className="text-xs text-neutral-600">使用日</p>
          <p className="text-sm text-neutral-700">{formatDateTime(ticket.redeemed_at)}</p>
        </div>

        <Separator />

        <div className="space-y-3">
          <p className="text-xs text-neutral-600">QRコード</p>
          <div className="flex h-48 w-48 items-center justify-center rounded-md border border-neutral-200 bg-white">
            {qrImageSrc ? (
              <Image src={qrImageSrc} alt="QR Code" width={192} height={192} />
            ) : (
              <p className="text-xs text-neutral-500">QRコード未生成</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
