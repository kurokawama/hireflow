"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";
import type { Profile } from "@/types/database";
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
import { Textarea } from "@/components/ui/textarea";

function getSupabase() {
  return createClient();
}

type ProfileForm = {
  profile_name: string;
  brand_name: string;
  values: string;
  tone: string;
  must_include: string;
  ng_words: string;
  compliance_note: string;
};

const initialForm: ProfileForm = {
  profile_name: "",
  brand_name: "",
  values: "",
  tone: "",
  must_include: "",
  ng_words: "",
  compliance_note: "",
};

function navClass(isActive: boolean) {
  return [
    "pb-2 text-sm font-medium border-b-2 transition-colors",
    isActive
      ? "border-[#E63946] text-[#E63946]"
      : "border-transparent text-neutral-600 hover:text-neutral-900",
  ].join(" ");
}

const parseCommaText = (value: string) =>
  value
    .split(",")
    .map((word) => word.trim())
    .filter(Boolean);

export default function SettingsProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [orgId, setOrgId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<ProfileForm>(initialForm);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState<ProfileForm>(initialForm);

  const fetchProfiles = async () => {
    setLoading(true);
    setError("");

    const { data, error: fetchError } = await getSupabase()
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    const nextProfiles = (data ?? []) as Profile[];
    setProfiles(nextProfiles);
    if (nextProfiles[0]?.org_id) {
      setOrgId(nextProfiles[0].org_id);
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

    const { data: profileWithOrg } = await getSupabase()
      .from("profiles")
      .select("org_id")
      .limit(1)
      .maybeSingle();

    if (profileWithOrg?.org_id) {
      setOrgId(profileWithOrg.org_id as string);
      return profileWithOrg.org_id as string;
    }

    return "";
  };

  useEffect(() => {
    void fetchProfiles();
  }, []);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    const targetOrgId = await resolveOrgId();
    if (!targetOrgId) {
      setError("Organization ID is missing.");
      setSaving(false);
      return;
    }

    const { error: createError } = await getSupabase().from("profiles").insert({
      org_id: targetOrgId,
      profile_name: createForm.profile_name,
      brand_name: createForm.brand_name,
      values: createForm.values,
      tone: createForm.tone,
      must_include: parseCommaText(createForm.must_include),
      ng_words: parseCommaText(createForm.ng_words),
      compliance_note: createForm.compliance_note || null,
      is_default: false,
    });

    if (createError) {
      setError(createError.message);
      setSaving(false);
      return;
    }

    setIsCreateOpen(false);
    setCreateForm(initialForm);
    await fetchProfiles();
    setSaving(false);
  };

  const openEdit = (profile: Profile) => {
    setEditingProfile(profile);
    setEditForm({
      profile_name: profile.profile_name,
      brand_name: profile.brand_name,
      values: profile.values,
      tone: profile.tone,
      must_include: profile.must_include.join(", "),
      ng_words: profile.ng_words.join(", "),
      compliance_note: profile.compliance_note ?? "",
    });
  };

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingProfile) {
      return;
    }

    setSaving(true);
    setError("");

    const { error: updateError } = await getSupabase()
      .from("profiles")
      .update({
        profile_name: editForm.profile_name,
        brand_name: editForm.brand_name,
        values: editForm.values,
        tone: editForm.tone,
        must_include: parseCommaText(editForm.must_include),
        ng_words: parseCommaText(editForm.ng_words),
        compliance_note: editForm.compliance_note || null,
      })
      .eq("id", editingProfile.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setEditingProfile(null);
    setEditForm(initialForm);
    await fetchProfiles();
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4 mb-6 border-b pb-2">
        <Link href="/settings/stores" className={navClass(false)}>
          店舗
        </Link>
        <Link href="/settings/profiles" className={navClass(true)}>
          プロフィール
        </Link>
        <Link href="/settings/members" className={navClass(false)}>
          メンバー
        </Link>
        <Link href="/settings/voices" className={navClass(false)}>
          スタッフボイス
        </Link>
      </div>

      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-[#1D3557]">設定</h1>
          <h2 className="text-xl font-semibold">プロフィール管理</h2>
        </div>

        <Dialog
          open={isCreateOpen}
          onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) {
              setCreateForm(initialForm);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-[#E63946] hover:bg-[#C62F3B]">
              新規プロフィール
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>新規プロフィール</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleCreate}>
              <div className="space-y-2">
                <Label htmlFor="create-profile-name">プロフィール名</Label>
                <Input
                  id="create-profile-name"
                  value={createForm.profile_name}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      profile_name: event.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-brand-name">ブランド名</Label>
                <Input
                  id="create-brand-name"
                  value={createForm.brand_name}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      brand_name: event.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-values">価値観</Label>
                <Textarea
                  id="create-values"
                  value={createForm.values}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      values: event.target.value,
                    }))
                  }
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-tone">トーン</Label>
                <Textarea
                  id="create-tone"
                  value={createForm.tone}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      tone: event.target.value,
                    }))
                  }
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-must-include">必須ワード</Label>
                <Input
                  id="create-must-include"
                  value={createForm.must_include}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      must_include: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-ng-words">NGワード</Label>
                <Input
                  id="create-ng-words"
                  value={createForm.ng_words}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      ng_words: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-compliance">コンプライアンス</Label>
                <Textarea
                  id="create-compliance"
                  value={createForm.compliance_note}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      compliance_note: event.target.value,
                    }))
                  }
                  rows={3}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-[#E63946] hover:bg-[#C62F3B]"
                disabled={saving}
              >
                新規プロフィール
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading && <p className="text-sm text-neutral-500">Loading...</p>}

      {!loading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {profiles.map((profile) => (
            <Card key={profile.id} className="rounded-md bg-white shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{profile.profile_name}</CardTitle>
                    <p className="text-sm text-neutral-600">{profile.brand_name}</p>
                  </div>
                  {profile.is_default && (
                    <Badge className="border-transparent bg-[#1D3557] text-white">
                      DEFAULT
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-neutral-500">トーン</p>
                  <p className="text-sm text-neutral-700">
                    {profile.tone.length > 120
                      ? `${profile.tone.slice(0, 120)}...`
                      : profile.tone}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {profile.must_include.slice(0, 3).map((word) => (
                    <Badge key={`${profile.id}-${word}`} variant="outline">
                      {word}
                    </Badge>
                  ))}
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(profile)}
                  >
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {profiles.length === 0 && (
            <Card className="rounded-md bg-white shadow-sm">
              <CardContent className="pt-6 text-sm text-neutral-500">
                No profiles
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Dialog
        open={Boolean(editingProfile)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingProfile(null);
          }
        }}
      >
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleUpdate}>
            <div className="space-y-2">
              <Label htmlFor="edit-profile-name">プロフィール名</Label>
              <Input
                id="edit-profile-name"
                value={editForm.profile_name}
                onChange={(event) =>
                  setEditForm((prev) => ({
                    ...prev,
                    profile_name: event.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-brand-name">ブランド名</Label>
              <Input
                id="edit-brand-name"
                value={editForm.brand_name}
                onChange={(event) =>
                  setEditForm((prev) => ({
                    ...prev,
                    brand_name: event.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-values">価値観</Label>
              <Textarea
                id="edit-values"
                value={editForm.values}
                onChange={(event) =>
                  setEditForm((prev) => ({
                    ...prev,
                    values: event.target.value,
                  }))
                }
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-tone">トーン</Label>
              <Textarea
                id="edit-tone"
                value={editForm.tone}
                onChange={(event) =>
                  setEditForm((prev) => ({
                    ...prev,
                    tone: event.target.value,
                  }))
                }
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-must-include">必須ワード</Label>
              <Input
                id="edit-must-include"
                value={editForm.must_include}
                onChange={(event) =>
                  setEditForm((prev) => ({
                    ...prev,
                    must_include: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-ng-words">NGワード</Label>
              <Input
                id="edit-ng-words"
                value={editForm.ng_words}
                onChange={(event) =>
                  setEditForm((prev) => ({
                    ...prev,
                    ng_words: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-compliance">コンプライアンス</Label>
              <Textarea
                id="edit-compliance"
                value={editForm.compliance_note}
                onChange={(event) =>
                  setEditForm((prev) => ({
                    ...prev,
                    compliance_note: event.target.value,
                  }))
                }
                rows={3}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-[#E63946] hover:bg-[#C62F3B]"
              disabled={saving}
            >
              Edit
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
