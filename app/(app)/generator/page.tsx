"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { GiftSettingsPanel } from "@/components/generator/gift-settings-panel";
import { LineDeliveryPanel } from "@/components/generator/line-delivery-panel";
import { QuizCampaignPanel } from "@/components/generator/quiz-campaign-panel";
import type { Platform, Profile, Store, TemplateType } from "@/types/database";
import type { GenerateResponse } from "@/types/dto";

type StoreOption = Pick<Store, "id" | "store_name">;
type ProfileOption = Pick<Profile, "id" | "profile_name">;
type GeneratePlatform = Extract<
  Platform,
  "instagram" | "tiktok" | "line" | "meta_ad" | "facebook" | "x" | "youtube"
>;
type GeneratedResult = GenerateResponse["contents"][number];

const FALLBACK_STORES: StoreOption[] = [
  { id: "mock-store-1", store_name: "Dr. Stretch Shibuya" },
  { id: "mock-store-2", store_name: "Wecle Shinjuku" },
];

const FALLBACK_PROFILES: ProfileOption[] = [
  { id: "mock-profile-1", profile_name: "Default Profile" },
  { id: "mock-profile-2", profile_name: "Hiring Focus" },
];

const TEMPLATE_OPTIONS: TemplateType[] = ["staff_day", "job_intro", "qa"];
const PLATFORM_OPTIONS: GeneratePlatform[] = [
  "instagram",
  "tiktok",
  "line",
  "meta_ad",
  "facebook",
  "x",
  "youtube",
];
const PLATFORM_LABELS: Record<GeneratePlatform, string> = {
  instagram: "instagram",
  tiktok: "tiktok",
  line: "line",
  meta_ad: "meta_ad",
  facebook: "Facebook",
  x: "X",
  youtube: "YouTube",
};

export default function GeneratorPage() {
  const [stores, setStores] = useState<StoreOption[]>(FALLBACK_STORES);
  const [profiles, setProfiles] = useState<ProfileOption[]>(FALLBACK_PROFILES);
  const [storeId, setStoreId] = useState("");
  const [profileId, setProfileId] = useState("");
  const [templateType, setTemplateType] = useState<TemplateType>("staff_day");
  const [platforms, setPlatforms] = useState<GeneratePlatform[]>(["instagram"]);
  const [results, setResults] = useState<GeneratedResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const load = async () => {
      const [storesResult, profilesResult] = await Promise.all([
        supabase
          .from("stores")
          .select("id, store_name")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("profiles")
          .select("id, profile_name")
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      if (!storesResult.error && storesResult.data && storesResult.data.length > 0) {
        setStores(storesResult.data as StoreOption[]);
      }
      if (!profilesResult.error && profilesResult.data && profilesResult.data.length > 0) {
        setProfiles(profilesResult.data as ProfileOption[]);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    if (!storeId && stores[0]) setStoreId(stores[0].id);
  }, [storeId, stores]);

  useEffect(() => {
    if (!profileId && profiles[0]) setProfileId(profiles[0].id);
  }, [profileId, profiles]);

  const defaultTab = useMemo(() => results[0]?.platform || "instagram", [results]);

  const togglePlatform = (platform: GeneratePlatform) => {
    setPlatforms((prev) => {
      if (prev.includes(platform)) return prev.filter((p) => p !== platform);
      return [...prev, platform];
    });
  };

  const handleGenerate = async () => {
    setError("");
    setResults([]);

    if (!storeId || !profileId || platforms.length === 0) {
      setError("Required fields are missing.");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: storeId,
          profile_id: profileId,
          template_type: templateType,
          platforms,
        }),
      });

      const json = (await response.json()) as {
        data?: GenerateResponse;
        error?: string;
      };

      if (!response.ok || !json.data) {
        setError(json.error || "Generation failed.");
        return;
      }

      setResults(json.data.contents);
    } catch {
      setError("Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="post" className="space-y-6">
        <TabsList className="bg-neutral-100">
          <TabsTrigger value="post">投稿文生成</TabsTrigger>
          <TabsTrigger value="quiz">アンケート作成</TabsTrigger>
        </TabsList>
        <TabsContent value="post" className="space-y-6">
          <h1 className="text-3xl font-bold text-neutral-900">コンテンツ生成</h1>

          <Card className="rounded-md shadow-sm">
            <CardHeader>
              <CardTitle>コンテンツ生成</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-5 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>店舗を選択</Label>
                  <Select value={storeId} onValueChange={setStoreId}>
                    <SelectTrigger>
                      <SelectValue placeholder="店舗を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {stores.map((store) => (
                        <SelectItem key={store.id} value={store.id}>
                          {store.store_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>プロフィール</Label>
                  <Select value={profileId} onValueChange={setProfileId}>
                    <SelectTrigger>
                      <SelectValue placeholder="プロフィール" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.profile_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>テンプレートタイプ</Label>
                  <Select
                    value={templateType}
                    onValueChange={(value) => setTemplateType(value as TemplateType)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="テンプレートタイプ" />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>プラットフォーム</Label>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {PLATFORM_OPTIONS.map((platform) => (
                    <label
                      key={platform}
                      className="flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={platforms.includes(platform)}
                        onChange={() => togglePlatform(platform)}
                      />
                      <span>{PLATFORM_LABELS[platform]}</span>
                    </label>
                  ))}
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <Button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="bg-[#E63946] hover:bg-[#C62F3B]"
              >
                生成
              </Button>
            </CardContent>
          </Card>

          {results.length > 0 && (
            <Card className="rounded-md shadow-sm">
              <CardHeader>
                <CardTitle>生成結果</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue={defaultTab}>
                  <TabsList>
                    {results.map((result) => (
                      <TabsTrigger key={result.content_id} value={result.platform}>
                        {result.platform}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {results.map((result) => (
                    <TabsContent
                      key={result.content_id}
                      value={result.platform}
                      className="space-y-3"
                    >
                      <Textarea value={result.body_text} readOnly className="min-h-[220px]" />
                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => navigator.clipboard.writeText(result.body_text)}
                        >
                          コピー
                        </Button>
                        <code className="rounded bg-neutral-100 px-2 py-1 text-xs">
                          {result.apply_link}
                        </code>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="quiz" className="space-y-6">
          <QuizCampaignPanel
            onSelectCampaign={(id) => setSelectedCampaignId(id)}
            selectedId={selectedCampaignId}
          />
          {selectedCampaignId && (
            <div className="mt-6 space-y-6">
              <LineDeliveryPanel campaignId={selectedCampaignId} />
              <GiftSettingsPanel campaignId={selectedCampaignId} />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
