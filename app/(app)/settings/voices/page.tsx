"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";
import type { StaffVoice, Store } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

function getSupabase() {
  return createClient();
}

type VoiceForm = {
  speaker_name: string;
  store_id: string;
  content_raw: string;
  highlights: string;
};

const initialForm: VoiceForm = {
  speaker_name: "",
  store_id: "",
  content_raw: "",
  highlights: "",
};

function navClass(isActive: boolean) {
  return [
    "pb-2 text-sm font-medium border-b-2 transition-colors",
    isActive
      ? "border-[#E63946] text-[#E63946]"
      : "border-transparent text-neutral-600 hover:text-neutral-900",
  ].join(" ");
}

function consentBadgeClass(status: StaffVoice["consent_status"]) {
  if (status === "approved") {
    return "border-transparent bg-green-100 text-green-700";
  }
  if (status === "revoked") {
    return "border-transparent bg-red-100 text-red-700";
  }
  return "border-transparent bg-yellow-100 text-yellow-700";
}

const consentStatusLabelMap: Record<StaffVoice["consent_status"], string> = {
  pending: "保留",
  approved: "承認済み",
  revoked: "取消済み",
};

const parseCommaText = (value: string) =>
  value
    .split(",")
    .map((word) => word.trim())
    .filter(Boolean);

export default function SettingsVoicesPage() {
  const [voices, setVoices] = useState<StaffVoice[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [orgId, setOrgId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<VoiceForm>(initialForm);

  const storeMap = useMemo(
    () => new Map(stores.map((store) => [store.id, store])),
    [stores]
  );

  const fetchData = async () => {
    setLoading(true);
    setError("");

    const [voicesResult, storesResult] = await Promise.all([
      getSupabase()
        .from("staff_voices")
        .select("*")
        .order("created_at", { ascending: false }),
      getSupabase().from("stores").select("*").order("store_name", { ascending: true }),
    ]);

    if (voicesResult.error) {
      setError(voicesResult.error.message);
      setLoading(false);
      return;
    }

    if (storesResult.error) {
      setError(storesResult.error.message);
      setLoading(false);
      return;
    }

    const nextVoices = (voicesResult.data ?? []) as StaffVoice[];
    const nextStores = (storesResult.data ?? []) as Store[];

    setVoices(nextVoices);
    setStores(nextStores);

    if (nextVoices[0]?.org_id) {
      setOrgId(nextVoices[0].org_id);
    } else if (nextStores[0]?.org_id) {
      setOrgId(nextStores[0].org_id);
    }

    setLoading(false);
  };

  const resolveOrgId = async () => {
    if (orgId) {
      return orgId;
    }

    const { data: authData } = await getSupabase().auth.getUser();
    const userId = authData.user?.id;

    if (userId) {
      const { data: member } = await getSupabase()
        .from("organization_members")
        .select("org_id")
        .eq("auth_user_id", userId)
        .maybeSingle();

      if (member?.org_id) {
        setOrgId(member.org_id as string);
        return member.org_id as string;
      }
    }

    const { data: voiceWithOrg } = await getSupabase()
      .from("staff_voices")
      .select("org_id")
      .limit(1)
      .maybeSingle();

    if (voiceWithOrg?.org_id) {
      setOrgId(voiceWithOrg.org_id as string);
      return voiceWithOrg.org_id as string;
    }

    const { data: storeWithOrg } = await getSupabase()
      .from("stores")
      .select("org_id")
      .limit(1)
      .maybeSingle();

    if (storeWithOrg?.org_id) {
      setOrgId(storeWithOrg.org_id as string);
      return storeWithOrg.org_id as string;
    }

    return "";
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    const targetOrgId = await resolveOrgId();
    if (!targetOrgId) {
      setError("組織IDが見つかりません。");
      setSaving(false);
      return;
    }

    const { error: createError } = await getSupabase().from("staff_voices").insert({
      org_id: targetOrgId,
      store_id: form.store_id,
      speaker_name: form.speaker_name,
      content_raw: form.content_raw,
      highlights: parseCommaText(form.highlights),
      consent_status: "pending",
    });

    if (createError) {
      setError(createError.message);
      setSaving(false);
      return;
    }

    setIsCreateOpen(false);
    setForm(initialForm);
    await fetchData();
    setSaving(false);
  };

  const handleUpdateConsent = async (
    voiceId: string,
    consentStatus: StaffVoice["consent_status"]
  ) => {
    setError("");

    const { error: updateError } = await getSupabase()
      .from("staff_voices")
      .update({
        consent_status: consentStatus,
        consented_at: consentStatus === "approved" ? new Date().toISOString() : null,
      })
      .eq("id", voiceId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4 mb-6 border-b pb-2">
        <Link href="/settings/stores" className={navClass(false)}>
          店舗
        </Link>
        <Link href="/settings/profiles" className={navClass(false)}>
          プロフィール
        </Link>
        <Link href="/settings/members" className={navClass(false)}>
          メンバー
        </Link>
        <Link href="/settings/voices" className={navClass(true)}>
          スタッフボイス
        </Link>
        <Link href="/settings/quiz" className={navClass(false)}>
          クイズ
        </Link>
        <Link href="/settings/lists" className={navClass(false)}>
          リスト
        </Link>
      </div>

      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-[#1D3557]">設定</h1>
          <h2 className="text-xl font-semibold">スタッフボイス管理</h2>
        </div>

        <Dialog
          open={isCreateOpen}
          onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) {
              setForm(initialForm);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-[#E63946] hover:bg-[#C62F3B]">
              新規スタッフボイス
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>新規スタッフボイス</DialogTitle>
            </DialogHeader>

            <form className="space-y-4" onSubmit={handleCreate}>
              <div className="space-y-2">
                <Label htmlFor="voice-speaker-name">話者名</Label>
                <Input
                  id="voice-speaker-name"
                  value={form.speaker_name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, speaker_name: event.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="voice-store">所属店舗</Label>
                <Select
                  value={form.store_id}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, store_id: value }))
                  }
                >
                  <SelectTrigger id="voice-store">
                    <SelectValue />
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
                <Label htmlFor="voice-content">内容</Label>
                <Textarea
                  id="voice-content"
                  value={form.content_raw}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, content_raw: event.target.value }))
                  }
                  rows={5}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="voice-highlights">ハイライト</Label>
                <Input
                  id="voice-highlights"
                  value={form.highlights}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, highlights: event.target.value }))
                  }
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-[#E63946] hover:bg-[#C62F3B]"
                disabled={saving}
              >
                新規スタッフボイス
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-neutral-500">読み込み中...</p>}

      {!loading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {voices.map((voice) => {
            const store = storeMap.get(voice.store_id);
            const shortContent =
              voice.content_raw.length > 140
                ? `${voice.content_raw.slice(0, 140)}...`
                : voice.content_raw;

            return (
              <Card key={voice.id} className="rounded-md bg-white shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{voice.speaker_name}</CardTitle>
                      <p className="text-sm text-neutral-600">
                        {store
                          ? `${store.store_name} / ${store.location_text}`
                          : "-"}
                      </p>
                    </div>
                    <Badge className={consentBadgeClass(voice.consent_status)}>
                      {consentStatusLabelMap[voice.consent_status] ?? voice.consent_status}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-neutral-500">内容</p>
                    <p className="text-sm text-neutral-700 whitespace-pre-wrap">
                      {shortContent}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium text-neutral-500">同意状態</p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => void handleUpdateConsent(voice.id, "approved")}
                      >
                        承認
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => void handleUpdateConsent(voice.id, "revoked")}
                      >
                        取消
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {voice.highlights.slice(0, 4).map((item) => (
                      <Badge key={`${voice.id}-${item}`} variant="outline">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {voices.length === 0 && (
            <Card className="rounded-md bg-white shadow-sm">
              <CardContent className="pt-6 text-sm text-neutral-500">
                スタッフボイスがありません
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
