"use client";

import { useState } from "react";
import type { RedeemTicketRequest, VisitorInfo } from "@/types/tickets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface RedeemFormProps {
  ticketCode: string;
  storeId?: string;
  onSuccess?: (redeemedAt: string | null) => void;
}

const DEFAULT_STORE_ID = "store-staff-default";

type RedeemApiResponse = {
  data?: {
    redeemed_at?: string | null;
  };
  error?: string;
};

export function RedeemForm({ ticketCode, storeId = DEFAULT_STORE_ID, onSuccess }: RedeemFormProps) {
  const [visitorInfo, setVisitorInfo] = useState<VisitorInfo>({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const updateField = (field: keyof VisitorInfo, value: string) => {
    setVisitorInfo((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const payload: Pick<RedeemTicketRequest, "store_id" | "visitor_info"> = {
        store_id: storeId,
        visitor_info: {
          name: visitorInfo.name?.trim() || undefined,
          phone: visitorInfo.phone?.trim() || undefined,
          email: visitorInfo.email?.trim() || undefined,
          address: visitorInfo.address?.trim() || undefined,
          notes: visitorInfo.notes?.trim() || undefined,
        },
      };

      const response = await fetch(`/api/verify/${encodeURIComponent(ticketCode)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responseBody = (await response.json()) as RedeemApiResponse;
      if (!response.ok) {
        throw new Error(responseBody.error || "Request failed.");
      }

      onSuccess?.(responseBody.data?.redeemed_at ?? null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Request failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
      <input type="hidden" name="store_id" value={storeId} readOnly />

      <div className="space-y-2">
        <Label htmlFor="redeem-name">お名前</Label>
        <Input
          id="redeem-name"
          type="text"
          required
          value={visitorInfo.name ?? ""}
          onChange={(event) => updateField("name", event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="redeem-phone">電話番号</Label>
        <Input
          id="redeem-phone"
          type="tel"
          required
          value={visitorInfo.phone ?? ""}
          onChange={(event) => updateField("phone", event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="redeem-email">メール</Label>
        <Input
          id="redeem-email"
          type="email"
          value={visitorInfo.email ?? ""}
          onChange={(event) => updateField("email", event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="redeem-address">住所</Label>
        <Input
          id="redeem-address"
          type="text"
          value={visitorInfo.address ?? ""}
          onChange={(event) => updateField("address", event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="redeem-notes">備考</Label>
        <Textarea
          id="redeem-notes"
          rows={3}
          value={visitorInfo.notes ?? ""}
          onChange={(event) => updateField("notes", event.target.value)}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" disabled={isSubmitting} className="w-full bg-[#1D3557] hover:bg-[#122540]">
        {isSubmitting ? "..." : "使用する"}
      </Button>
    </form>
  );
}
