"use client";

import type { TicketStats } from "@/types/tickets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TicketStatsCardsProps {
  stats: TicketStats | null;
  isLoading: boolean;
}

interface StatItem {
  key: "total" | "issued" | "redeemed" | "redemption_rate";
  label: string;
  value: string;
}

export function TicketStatsCards({ stats, isLoading }: TicketStatsCardsProps) {
  const items: StatItem[] = [
    {
      key: "total",
      label: "total",
      value: String(stats?.total ?? 0),
    },
    {
      key: "issued",
      label: "issued",
      value: String(stats?.issued ?? 0),
    },
    {
      key: "redeemed",
      label: "redeemed",
      value: String(stats?.redeemed ?? 0),
    },
    {
      key: "redemption_rate",
      label: "redemption_rate",
      value: `${(stats?.redemption_rate ?? 0).toFixed(1)}%`,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.key} className="rounded-md border-neutral-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-600">{item.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[#1D3557]">{isLoading ? "-" : item.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
