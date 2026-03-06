"use client";

import { useState } from "react";
import type { SNSConnection, SNSPlatform } from "@/types/sns";
import { PlatformIcon } from "@/components/sns/platform-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ConnectionState = "connected" | "disconnected" | "expired";

interface ConnectionCardProps {
  platform: SNSPlatform;
  platformName: string;
  connection?: SNSConnection | null;
  isLoading?: boolean;
  isActing?: boolean;
  onConnect: (platform: SNSPlatform, accountName: string) => void;
  onDisconnect: (connectionId: string) => void;
}

function resolveConnectionState(connection?: SNSConnection | null): ConnectionState {
  if (!connection || connection.status === "revoked") {
    return "disconnected";
  }
  if (connection.status === "expired") {
    return "expired";
  }
  return "connected";
}

function statusLabel(status: ConnectionState) {
  if (status === "connected") {
    return "接続済み";
  }
  if (status === "expired") {
    return "期限切れ";
  }
  return "未接続";
}

function statusClassName(status: ConnectionState) {
  if (status === "connected") {
    return "border-transparent bg-green-100 text-green-700";
  }
  if (status === "expired") {
    return "border-transparent bg-amber-100 text-amber-700";
  }
  return "border-transparent bg-neutral-200 text-neutral-600";
}

export function ConnectionCard({
  platform,
  platformName,
  connection,
  isLoading = false,
  isActing = false,
  onConnect,
  onDisconnect,
}: ConnectionCardProps) {
  const [accountName, setAccountName] = useState("");
  const status = resolveConnectionState(connection);

  return (
    <Card className="border-neutral-200 bg-white">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <PlatformIcon platform={platform} />
            {platformName}
          </CardTitle>
          <Badge className={statusClassName(status)}>{statusLabel(status)}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">アカウント</p>
          <p className="text-sm font-medium text-foreground">
            {connection?.external_account_name ?? "-"}
          </p>
        </div>

        {status !== "connected" && (
          <div className="space-y-2">
            <Label htmlFor={`account-name-${platform}`}>アカウント名</Label>
            <Input
              id={`account-name-${platform}`}
              value={accountName}
              onChange={(event) => setAccountName(event.target.value)}
              placeholder={`${platformName} Account`}
              disabled={isLoading || isActing}
            />
          </div>
        )}

        {status === "connected" ? (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={isLoading || isActing}
            onClick={() => {
              if (!connection) {
                return;
              }
              onDisconnect(connection.id);
            }}
          >
            切断する
          </Button>
        ) : (
          <Button
            type="button"
            className="w-full bg-[#1D3557] hover:bg-[#122540]"
            disabled={isLoading || isActing}
            onClick={() => onConnect(platform, accountName.trim())}
          >
            接続する
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
