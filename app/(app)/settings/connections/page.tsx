"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PLATFORM_CONFIGS } from "@/lib/sns/platform-config";
import type { SNSConnection, SNSPlatform } from "@/types/sns";
import { ConnectionCard } from "@/components/sns/connection-card";

function navClass(isActive: boolean) {
  return [
    "pb-2 text-sm font-medium border-b-2 transition-colors",
    isActive
      ? "border-[#E63946] text-[#E63946]"
      : "border-transparent text-neutral-600 hover:text-neutral-900",
  ].join(" ");
}

export default function SettingsConnectionsPage() {
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<SNSConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actingPlatform, setActingPlatform] = useState<SNSPlatform | null>(null);
  const [error, setError] = useState("");

  const connectedPlatform = searchParams.get("connected");

  const platformEntries = useMemo(
    () => Object.values(PLATFORM_CONFIGS),
    []
  );

  const loadConnections = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/sns/connections", {
        method: "GET",
        credentials: "include",
      });
      const payload = (await response.json()) as { data?: SNSConnection[]; error?: string };
      if (!response.ok || !payload.data) {
        setError(payload.error || "Failed to load SNS connections.");
        setConnections([]);
        setIsLoading(false);
        return;
      }
      setConnections(payload.data);
    } catch {
      setError("Failed to load SNS connections.");
      setConnections([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadConnections();
  }, []);

  const resolveConnection = (platform: SNSPlatform) => {
    const samePlatform = connections.filter((connection) => connection.platform === platform);
    const active = samePlatform.find((connection) => connection.status === "active");
    if (active) {
      return active;
    }
    const expired = samePlatform.find((connection) => connection.status === "expired");
    if (expired) {
      return expired;
    }
    return null;
  };

  const handleConnect = (platform: SNSPlatform, accountName: string) => {
    const query = accountName ? `?account_name=${encodeURIComponent(accountName)}` : "";
    window.location.assign(`/api/sns/connect/${platform}${query}`);
  };

  const handleDisconnect = async (connectionId: string, platform: SNSPlatform) => {
    setActingPlatform(platform);
    setError("");
    try {
      const response = await fetch("/api/sns/connections", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ connectionId }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error || "Failed to disconnect.");
        setActingPlatform(null);
        return;
      }
      await loadConnections();
    } catch {
      setError("Failed to disconnect.");
    } finally {
      setActingPlatform(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4 overflow-x-auto border-b pb-2">
        <Link href="/settings/stores" className={navClass(false)}>
          店舗
        </Link>
        <Link href="/settings/profiles" className={navClass(false)}>
          プロフィール
        </Link>
        <Link href="/settings/members" className={navClass(false)}>
          メンバー
        </Link>
        <Link href="/settings/voices" className={navClass(false)}>
          スタッフボイス
        </Link>
        <Link href="/settings/staff-sns" className={navClass(false)}>
          スタッフSNS
        </Link>
        <Link href="/settings/connections" className={navClass(true)}>
          SNS接続管理
        </Link>
        <Link href="/settings/quiz" className={navClass(false)}>
          クイズ
        </Link>
        <Link href="/settings/lists" className={navClass(false)}>
          リスト
        </Link>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-[#1D3557]">SNS接続管理</h1>
        <p className="text-sm text-muted-foreground">
          SNSプラットフォームごとの接続状況を管理します。
        </p>
      </div>

      {connectedPlatform && (
        <p className="text-sm text-green-700">
          {connectedPlatform} の接続が完了しました。
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {platformEntries.map((config) => {
          const connection = resolveConnection(config.platform);
          return (
            <ConnectionCard
              key={config.platform}
              platform={config.platform}
              platformName={config.display_name}
              connection={connection}
              isLoading={isLoading}
              isActing={actingPlatform === config.platform}
              onConnect={handleConnect}
              onDisconnect={(connectionId) =>
                void handleDisconnect(connectionId, config.platform)
              }
            />
          );
        })}
      </div>
    </div>
  );
}
