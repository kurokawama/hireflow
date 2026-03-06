"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { POSTABLE_PLATFORMS, getPlatformConfig } from "@/lib/sns/platform-config";
import type { GeneratedContent } from "@/types/database";
import type { SNSConnection, SNSPlatform } from "@/types/sns";
import { PlatformIcon } from "@/components/sns/platform-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function truncateText(value: string, maxLength = 80) {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength)}...`;
}

export default function NewPublishingPage() {
  const router = useRouter();

  const [contents, setContents] = useState<GeneratedContent[]>([]);
  const [connections, setConnections] = useState<SNSConnection[]>([]);
  const [selectedContentId, setSelectedContentId] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<SNSPlatform>("x");
  const [selectedConnectionId, setSelectedConnectionId] = useState("");
  const [scheduleMode, setScheduleMode] = useState<"immediate" | "scheduled">("immediate");
  const [scheduledAt, setScheduledAt] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selectedContent = useMemo(
    () => contents.find((content) => content.id === selectedContentId),
    [contents, selectedContentId]
  );

  const availableConnections = useMemo(
    () =>
      connections.filter(
        (connection) =>
          connection.platform === selectedPlatform && connection.status === "active"
      ),
    [connections, selectedPlatform]
  );

  const loadInitialData = async () => {
    setIsLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const [{ data: approvedContents, error: contentError }, connectionsResponse] =
        await Promise.all([
          supabase
            .from("generated_contents")
            .select("*")
            .eq("status", "approved")
            .order("created_at", { ascending: false })
            .limit(50),
          fetch("/api/sns/connections", {
            method: "GET",
            credentials: "include",
          }),
        ]);

      if (contentError) {
        setError(contentError.message);
        setIsLoading(false);
        return;
      }

      const connectionPayload = (await connectionsResponse.json()) as {
        data?: SNSConnection[];
        error?: string;
      };

      if (!connectionsResponse.ok || !connectionPayload.data) {
        setError(connectionPayload.error || "Failed to load SNS connections.");
        setIsLoading(false);
        return;
      }

      const nextContents = (approvedContents ?? []) as GeneratedContent[];
      setContents(nextContents);
      if (nextContents[0]?.id) {
        setSelectedContentId(nextContents[0].id);
      }

      setConnections(connectionPayload.data);
    } catch {
      setError("Failed to load publishing form data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadInitialData();
  }, []);

  useEffect(() => {
    if (availableConnections.some((connection) => connection.id === selectedConnectionId)) {
      return;
    }
    setSelectedConnectionId(availableConnections[0]?.id ?? "");
  }, [availableConnections, selectedConnectionId]);

  const handleSubmit = async () => {
    if (!selectedContentId || !selectedConnectionId || !selectedPlatform) {
      setError("必須項目を選択してください。");
      return;
    }

    if (scheduleMode === "scheduled" && !scheduledAt) {
      setError("投稿日時を選択してください。");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const body: {
        content_id: string;
        connection_id: string;
        platform: SNSPlatform;
        immediate: boolean;
        scheduled_at?: string;
      } = {
        content_id: selectedContentId,
        connection_id: selectedConnectionId,
        platform: selectedPlatform,
        immediate: scheduleMode === "immediate",
      };

      if (scheduleMode === "scheduled" && scheduledAt) {
        body.scheduled_at = new Date(scheduledAt).toISOString();
      }

      const response = await fetch("/api/sns/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error || "Failed to create post.");
        setIsSubmitting(false);
        return;
      }

      router.push("/publishing");
      router.refresh();
    } catch {
      setError("Failed to create post.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-[#1D3557]">新規投稿</h1>
        <p className="text-sm text-muted-foreground">投稿内容と接続先を選択します。</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="border-neutral-200 bg-white">
            <CardHeader>
              <CardTitle className="text-base">Step 1</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label htmlFor="content-id">コンテンツを選択</Label>
              <Select
                value={selectedContentId}
                onValueChange={(value) => setSelectedContentId(value)}
                disabled={isLoading || contents.length === 0}
              >
                <SelectTrigger id="content-id">
                  <SelectValue
                    placeholder={contents.length === 0 ? "選択可能なコンテンツがありません" : ""}
                  />
                </SelectTrigger>
                <SelectContent>
                  {contents.map((content) => (
                    <SelectItem key={content.id} value={content.id}>
                      {truncateText(content.body_text)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card className="border-neutral-200 bg-white">
            <CardHeader>
              <CardTitle className="text-base">Step 2</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="platform">プラットフォームを選択</Label>
                <Select
                  value={selectedPlatform}
                  onValueChange={(value: SNSPlatform) => setSelectedPlatform(value)}
                  disabled={isLoading}
                >
                  <SelectTrigger id="platform">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POSTABLE_PLATFORMS.map((platform) => (
                      <SelectItem key={platform} value={platform}>
                        <span className="flex items-center gap-2">
                          <PlatformIcon platform={platform} />
                          {getPlatformConfig(platform).display_name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="connection-id">接続アカウント</Label>
                <Select
                  value={selectedConnectionId}
                  onValueChange={(value) => setSelectedConnectionId(value)}
                  disabled={isLoading || availableConnections.length === 0}
                >
                  <SelectTrigger id="connection-id">
                    <SelectValue
                      placeholder={
                        availableConnections.length === 0
                          ? "利用可能な接続がありません"
                          : "接続アカウントを選択"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {availableConnections.map((connection) => (
                      <SelectItem key={connection.id} value={connection.id}>
                        {connection.external_account_name ?? connection.platform}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="border-neutral-200 bg-white">
            <CardHeader>
              <CardTitle className="text-base">Step 3</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={scheduleMode === "immediate" ? "default" : "outline"}
                  className={scheduleMode === "immediate" ? "bg-[#1D3557] hover:bg-[#122540]" : ""}
                  onClick={() => setScheduleMode("immediate")}
                >
                  即時投稿
                </Button>
                <Button
                  type="button"
                  variant={scheduleMode === "scheduled" ? "default" : "outline"}
                  className={scheduleMode === "scheduled" ? "bg-[#1D3557] hover:bg-[#122540]" : ""}
                  onClick={() => setScheduleMode("scheduled")}
                >
                  投稿をスケジュール
                </Button>
              </div>

              {scheduleMode === "scheduled" && (
                <div className="space-y-2">
                  <Label htmlFor="scheduled-at">投稿日時</Label>
                  <input
                    id="scheduled-at"
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(event) => setScheduledAt(event.target.value)}
                    className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit border-neutral-200 bg-white">
          <CardHeader>
            <CardTitle className="text-base">Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-transparent bg-[#1D3557]/10 text-[#1D3557]">
                {selectedPlatform}
              </Badge>
              <Badge variant="outline">
                {connections.find((connection) => connection.id === selectedConnectionId)
                  ?.external_account_name ?? "-"}
              </Badge>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {selectedContent?.body_text ?? "コンテンツを選択してください。"}
            </p>
            <Button
              type="button"
              className="w-full bg-[#E63946] hover:bg-[#C62F3B]"
              disabled={isLoading || isSubmitting}
              onClick={() => void handleSubmit()}
            >
              {isSubmitting
                ? "送信中..."
                : scheduleMode === "immediate"
                  ? "即時投稿"
                  : "投稿をスケジュール"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
