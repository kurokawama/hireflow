"use client";

import { useEffect, useState } from "react";
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
import { createList, deleteList, getLists, updateList } from "@/lib/actions/candidate-lists";
import type { CandidateListWithCount } from "@/types/quiz";
import type { CreateListRequest } from "@/types/quiz-dto";

type ListForm = CreateListRequest;

const initialForm: ListForm = {
  name: "",
  brand: "",
  purpose: "",
  description: "",
};

function navClass(isActive: boolean) {
  return [
    "pb-2 text-sm font-medium border-b-2 transition-colors",
    isActive
      ? "border-[#E63946] text-[#E63946]"
      : "border-transparent text-neutral-600 hover:text-neutral-900",
  ].join(" ");
}

function brandBadgeClass(brand: string | null) {
  if (brand === "dr_stretch") {
    return "border-transparent bg-[#E63946]/10 text-[#E63946]";
  }
  if (brand === "wecle") {
    return "border-transparent bg-[#6B9080]/15 text-[#48665A]";
  }
  if (brand === "hq") {
    return "border-transparent bg-[#1D3557]/10 text-[#1D3557]";
  }
  return "border-transparent bg-neutral-100 text-neutral-700";
}

export default function SettingsListsPage() {
  const [lists, setLists] = useState<CandidateListWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<ListForm>(initialForm);
  const [editingList, setEditingList] = useState<CandidateListWithCount | null>(null);
  const [editForm, setEditForm] = useState<ListForm>(initialForm);

  const fetchLists = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getLists();
      setLists(data);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchLists();
  }, []);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await createList({
        ...createForm,
        brand: createForm.brand || undefined,
        purpose: createForm.purpose || undefined,
        description: createForm.description || undefined,
      });
      setCreateForm(initialForm);
      setIsCreateOpen(false);
      await fetchLists();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "作成に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (list: CandidateListWithCount) => {
    setEditingList(list);
    setEditForm({
      name: list.name,
      brand: list.brand ?? "",
      purpose: list.purpose ?? "",
      description: list.description ?? "",
    });
  };

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingList) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateList(editingList.id, {
        ...editForm,
        brand: editForm.brand || undefined,
        purpose: editForm.purpose || undefined,
        description: editForm.description || undefined,
      });
      setEditingList(null);
      setEditForm(initialForm);
      await fetchLists();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (listId: string) => {
    const confirmed = window.confirm("このリストを削除しますか？");
    if (!confirmed) {
      return;
    }
    setError("");
    try {
      await deleteList(listId);
      await fetchLists();
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
        <Link href="/settings/quiz" className={navClass(false)}>
          クイズ
        </Link>
        <Link href="/settings/lists" className={navClass(true)}>
          リスト
        </Link>
      </div>

      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-[#1D3557]">設定</h1>
          <h2 className="text-xl font-semibold">候補者リスト管理</h2>
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
            <Button className="bg-[#E63946] hover:bg-[#C62F3B]">新規リスト</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新規リスト</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleCreate}>
              <div className="space-y-2">
                <Label htmlFor="create-list-name">名前</Label>
                <Input
                  id="create-list-name"
                  value={createForm.name}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-list-brand">ブランド</Label>
                <Select
                  value={createForm.brand || "none"}
                  onValueChange={(value) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      brand: value === "none" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger id="create-list-brand">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-</SelectItem>
                    <SelectItem value="dr_stretch">dr_stretch</SelectItem>
                    <SelectItem value="wecle">wecle</SelectItem>
                    <SelectItem value="hq">hq</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-list-purpose">用途</Label>
                <Input
                  id="create-list-purpose"
                  value={createForm.purpose}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, purpose: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-list-description">説明</Label>
                <Textarea
                  id="create-list-description"
                  value={createForm.description}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                  rows={3}
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-[#E63946] hover:bg-[#C62F3B]"
                disabled={saving}
              >
                新規リスト
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
              <TableHead>Purpose</TableHead>
              <TableHead>Member Count</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[180px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!loading &&
              lists.map((list) => (
                <TableRow key={list.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/settings/lists/${list.id}`}
                      className="text-[#1D3557] hover:text-[#E63946]"
                    >
                      {list.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge className={brandBadgeClass(list.brand)}>{list.brand ?? "-"}</Badge>
                  </TableCell>
                  <TableCell>{list.purpose || "-"}</TableCell>
                  <TableCell>{list.member_count}</TableCell>
                  <TableCell>{new Date(list.created_at).toLocaleDateString("ja-JP")}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(list)}
                      >
                        編集
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => void handleDelete(list.id)}
                      >
                        削除
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

            {!loading && lists.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-neutral-500">
                  リストがありません
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
        open={Boolean(editingList)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingList(null);
            setEditForm(initialForm);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>リスト編集</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleUpdate}>
            <div className="space-y-2">
              <Label htmlFor="edit-list-name">名前</Label>
              <Input
                id="edit-list-name"
                value={editForm.name}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, name: event.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-list-brand">ブランド</Label>
              <Select
                value={editForm.brand || "none"}
                onValueChange={(value) =>
                  setEditForm((prev) => ({
                    ...prev,
                    brand: value === "none" ? "" : value,
                  }))
                }
              >
                <SelectTrigger id="edit-list-brand">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-</SelectItem>
                  <SelectItem value="dr_stretch">dr_stretch</SelectItem>
                  <SelectItem value="wecle">wecle</SelectItem>
                  <SelectItem value="hq">hq</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-list-purpose">用途</Label>
              <Input
                id="edit-list-purpose"
                value={editForm.purpose}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, purpose: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-list-description">説明</Label>
              <Textarea
                id="edit-list-description"
                value={editForm.description}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, description: event.target.value }))
                }
                rows={3}
              />
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
