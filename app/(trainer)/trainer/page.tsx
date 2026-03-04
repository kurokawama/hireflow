import Script from "next/script";
import { Camera, Megaphone, MessageCircle, Video } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Platform } from "@/types/database";

type TrainerContentRow = {
  id: string;
  platform: Platform;
  body_text: string;
  created_at: string;
  click_count: number;
};

function getStartOfWeekIso() {
  const now = new Date();
  const currentDay = now.getDay();
  const diff = currentDay === 0 ? -6 : 1 - currentDay;
  const start = new Date(now);
  start.setDate(now.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}

function getPlatformIcon(platform: Platform) {
  switch (platform) {
    case "instagram":
      return Camera;
    case "tiktok":
      return Video;
    case "line":
      return MessageCircle;
    default:
      return Megaphone;
  }
}

function previewText(text: string) {
  if (text.length <= 130) return text;
  return `${text.slice(0, 130)}...`;
}

export default async function TrainerPortalPage() {
  const supabase = await createClient();
  const weekStart = getStartOfWeekIso();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: member } = user
    ? await supabase
        .from("organization_members")
        .select("store_id")
        .eq("auth_user_id", user.id)
        .eq("is_active", true)
        .single()
    : { data: null };

  const storeId = member?.store_id || null;

  const contentsResult = storeId
    ? await supabase
        .from("generated_contents")
        .select("id, platform, body_text, created_at")
        .eq("store_id", storeId)
        .eq("status", "approved")
        .gte("created_at", weekStart)
        .order("created_at", { ascending: false })
    : { data: [], error: null };

  const contentIds = (contentsResult.data || []).map((item) => item.id);
  const linksResult =
    contentIds.length > 0
      ? await supabase
          .from("apply_links")
          .select("content_id, click_count")
          .in("content_id", contentIds)
      : { data: [], error: null };

  const clicksMap = new Map<string, number>();
  for (const link of linksResult.data || []) {
    clicksMap.set(link.content_id, (clicksMap.get(link.content_id) || 0) + (link.click_count || 0));
  }

  const hasError = Boolean(contentsResult.error);
  const mockRows: TrainerContentRow[] = [
    {
      id: "mock-trainer-1",
      platform: "instagram",
      body_text: "Mock approved content for trainer portal",
      created_at: new Date().toISOString(),
      click_count: 17,
    },
    {
      id: "mock-trainer-2",
      platform: "line",
      body_text: "Mock approved content for trainer portal",
      created_at: new Date().toISOString(),
      click_count: 8,
    },
  ];

  const contentRows: TrainerContentRow[] = hasError
    ? mockRows
    : (contentsResult.data || []).map((item) => ({
        id: item.id,
        platform: item.platform,
        body_text: item.body_text,
        created_at: item.created_at,
        click_count: clicksMap.get(item.id) || 0,
      }));

  const totalClicks = contentRows.reduce((sum, row) => sum + row.click_count, 0);

  return (
    <div className="space-y-4">
      <Card className="rounded-md shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle>インパクト</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-500">クリック数</p>
          <p className="text-2xl font-bold text-neutral-900">{totalClicks}</p>
        </CardContent>
      </Card>

      <h2 className="text-xl font-bold text-neutral-900">今週のコンテンツ</h2>

      <div className="space-y-3">
        {contentRows.map((content) => {
          const Icon = getPlatformIcon(content.platform);
          return (
            <Card key={content.id} className="rounded-md shadow-sm">
              <CardContent className="space-y-3 pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-[#1D3557]" />
                    <Badge variant="outline">{content.platform}</Badge>
                  </div>
                  <span className="text-xs text-neutral-500">
                    {new Date(content.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-neutral-800">
                  {previewText(content.body_text)}
                </p>
                <Button type="button" variant="outline" size="sm" data-copy-text={content.body_text}>
                  コピー
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Script id="trainer-copy-script" strategy="afterInteractive">
        {`document.addEventListener("click", async function (event) {
          var target = event.target;
          if (!(target instanceof Element)) return;
          var button = target.closest("[data-copy-text]");
          if (!button) return;
          var text = button.getAttribute("data-copy-text") || "";
          if (!text) return;
          try {
            await navigator.clipboard.writeText(text);
          } catch (error) {
            console.error(error);
          }
        });`}
      </Script>
    </div>
  );
}
