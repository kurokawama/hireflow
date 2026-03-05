"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  createCampaign,
  deleteCampaign,
  getCampaigns,
  updateCampaign,
} from "@/lib/actions/quiz-campaigns";
import type { QuizCampaign } from "@/types/quiz";
import type { CreateCampaignRequest } from "@/types/quiz-dto";

type CampaignForm = CreateCampaignRequest & {
  description: string;
};

const initialForm: CampaignForm = {
  name: "",
  slug: "",
  brand: "dr_stretch",
  description: "",
  is_active: true,
  is_default: false,
};

function navClass(isActive: boolean) {
  return [
    "pb-2 text-sm font-medium border-b-2 transition-colors",
    isActive
      ? "border-[#E63946] text-[#E63946]"
      : "border-transparent text-neutral-600 hover:text-neutral-900",
  ].join(" ");
}

function brandBadgeClass(brand: QuizCampaign["brand"]) {
  if (brand === "dr_stretch") {
    return "border-transparent bg-[#E63946]/10 text-[#E63946]";
  }
  if (brand === "wecle") {
    return "border-transparent bg-[#6B9080]/15 text-[#48665A]";
  }
  return "border-transparent bg-[#1D3557]/10 text-[#1D3557]";
}

export default function SettingsQuizPage() {
  const [campaigns, setCampaigns] = useState<QuizCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CampaignForm>(initialForm);
  const [editingCampaign, setEditingCampaign] = useState<QuizCampaign | null>(null);
  const [editForm, setEditForm] = useState<CampaignForm>(initialForm);

  const sortedCampaigns = useMemo(
    () =>
      [...campaigns].sort(
        (a, b) => Number(b.is_default) - Number(a.is_default) || a.name.localeCompare(b.name)
      ),
    [campaigns]
  );

  const fetchCampaigns = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getCampaigns();
      setCampaigns(data);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCampaigns();
  }, []);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await createCampaign({
        ...createForm,
        description: createForm.description || undefined,
      });
      setCreateForm(initialForm);
      setIsCreateOpen(false);
      await fetchCampaigns();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "作成に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (campaign: QuizCampaign) => {
    setEditingCampaign(campaign);
    setEditForm({
      name: campaign.name,
      slug: campaign.slug,
      brand: campaign.brand,
      description: campaign.description ?? "",
      is_active: campaign.is_active,
      is_default: campaign.is_default,
    });
  };

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingCampaign) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateCampaign(editingCampaign.id, {
        ...editForm,
        description: editForm.description || undefined,
      });
      setEditingCampaign(null);
      setEditForm(initialForm);
      await fetchCampaigns();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (campaign: QuizCampaign) => {
    if (campaign.is_default) {
      setError("デフォルトキャンペーンは削除できません");
      return;
    }
    const confirmed = window.confirm("このキャンペーンを削除しますか？");
    if (!confirmed) {
      return;
    }
    setError("");
    try {
      await deleteCampaign(campaign.id);
      await fetchCampaigns();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "削除に失敗しました");
    }
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
        <Link href="/settings/voices" className={navClass(false)}>
          スタッフボイス
        </Link>
        <Link href="/settings/quiz" className={navClass(true)}>
          クイズ
        </Link>
        <Link href="/settings/lists" className={navClass(false)}>
          リスト
        </Link>
      </div>

      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-[#1D3557]">設定</h1>
          <h2 className="text-xl font-semibold">クイズキャンペーン管理</h2>
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
            <Button className="bg-[#E63946] hover:bg-[#C62F3B]">新規キャンペーン</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新規キャンペーン</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleCreate}>
              <div className="space-y-2">
                <Label htmlFor="create-campaign-name">名前</Label>
                <Input
                  id="create-campaign-name"
                  value={createForm.name}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-campaign-slug">Slug</Label>
                <Input
                  id="create-campaign-slug"
                  value={createForm.slug}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, slug: event.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-campaign-brand">ブランド</Label>
                <Select
                  value={createForm.brand}
                  onValueChange={(value: QuizCampaign["brand"]) =>
                    setCreateForm((prev) => ({ ...prev, brand: value }))
                  }
                >
                  <SelectTrigger id="create-campaign-brand">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dr_stretch">dr_stretch</SelectItem>
                    <SelectItem value="wecle">wecle</SelectItem>
                    <SelectItem value="hq">hq</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-campaign-description">説明</Label>
                <Textarea
                  id="create-campaign-description"
                  value={createForm.description}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(createForm.is_active)}
                    onChange={(event) =>
                      setCreateForm((prev) => ({ ...prev, is_active: event.target.checked }))
                    }
                  />
                  有効
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(createForm.is_default)}
                    onChange={(event) =>
                      setCreateForm((prev) => ({ ...prev, is_default: event.target.checked }))
                    }
                  />
                  デフォルト
                </label>
              </div>

              <Button
                type="submit"
                className="w-full bg-[#E63946] hover:bg-[#C62F3B]"
                disabled={saving}
              >
                新規キャンペーン
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="rounded-md border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Default</TableHead>
              <TableHead className="w-[180px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!loading &&
              sortedCampaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/settings/quiz/${campaign.id}`}
                      className="text-[#1D3557] hover:text-[#E63946]"
                    >
                      {campaign.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge className={brandBadgeClass(campaign.brand)}>{campaign.brand}</Badge>
                  </TableCell>
                  <TableCell>{campaign.slug}</TableCell>
                  <TableCell>
                    {campaign.is_active ? (
                      <Badge className="border-transparent bg-green-100 text-green-700">
                        有効
                      </Badge>
                    ) : (
                      <Badge variant="outline">OFF</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-lg">{campaign.is_default ? "★" : "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(campaign)}
                      >
                        編集
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => void handleDelete(campaign)}
                      >
                        削除
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

            {!loading && sortedCampaigns.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-neutral-500">
                  キャンペーンがありません
                </TableCell>
              </TableRow>
            )}

            {loading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-neutral-500">
                  Loading...
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={Boolean(editingCampaign)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingCampaign(null);
            setEditForm(initialForm);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>キャンペーン編集</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleUpdate}>
            <div className="space-y-2">
              <Label htmlFor="edit-campaign-name">名前</Label>
              <Input
                id="edit-campaign-name"
                value={editForm.name}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, name: event.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-campaign-slug">Slug</Label>
              <Input
                id="edit-campaign-slug"
                value={editForm.slug}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, slug: event.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-campaign-brand">ブランド</Label>
              <Select
                value={editForm.brand}
                onValueChange={(value: QuizCampaign["brand"]) =>
                  setEditForm((prev) => ({ ...prev, brand: value }))
                }
              >
                <SelectTrigger id="edit-campaign-brand">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dr_stretch">dr_stretch</SelectItem>
                  <SelectItem value="wecle">wecle</SelectItem>
                  <SelectItem value="hq">hq</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-campaign-description">説明</Label>
              <Textarea
                id="edit-campaign-description"
                value={editForm.description}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, description: event.target.value }))
                }
                rows={3}
              />
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(editForm.is_active)}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, is_active: event.target.checked }))
                  }
                />
                有効
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(editForm.is_default)}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, is_default: event.target.checked }))
                  }
                />
                デフォルト
              </label>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#E63946] hover:bg-[#C62F3B]"
              disabled={saving}
            >
              保存
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
