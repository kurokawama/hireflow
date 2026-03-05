"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";
import type { Store } from "@/types/database";
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

function getSupabase() {
  return createClient();
}

type StoreForm = {
  store_name: string;
  brand: "dr_stretch" | "wecle";
  location_text: string;
  memo: string;
};

const initialForm: StoreForm = {
  store_name: "",
  brand: "dr_stretch",
  location_text: "",
  memo: "",
};

function navClass(isActive: boolean) {
  return [
    "pb-2 text-sm font-medium border-b-2 transition-colors",
    isActive
      ? "border-[#E63946] text-[#E63946]"
      : "border-transparent text-neutral-600 hover:text-neutral-900",
  ].join(" ");
}

function brandBadgeClass(brand: Store["brand"]) {
  if (brand === "dr_stretch") {
    return "border-transparent bg-[#E63946]/10 text-[#E63946]";
  }
  return "border-transparent bg-[#6B9080]/15 text-[#48665A]";
}

export default function SettingsStoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [orgId, setOrgId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<StoreForm>(initialForm);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [editForm, setEditForm] = useState<StoreForm>(initialForm);

  const fetchStores = async () => {
    setLoading(true);
    setError("");

    const { data, error: fetchError } = await getSupabase()
      .from("stores")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    const nextStores = (data ?? []) as Store[];
    setStores(nextStores);
    if (nextStores[0]?.org_id) {
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
    void fetchStores();
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

    const { error: createError } = await getSupabase().from("stores").insert({
      org_id: targetOrgId,
      store_name: createForm.store_name,
      brand: createForm.brand,
      location_text: createForm.location_text,
      memo: createForm.memo || null,
      is_active: true,
    });

    if (createError) {
      setError(createError.message);
      setSaving(false);
      return;
    }

    setIsCreateOpen(false);
    setCreateForm(initialForm);
    await fetchStores();
    setSaving(false);
  };

  const openEdit = (store: Store) => {
    setEditingStore(store);
    setEditForm({
      store_name: store.store_name,
      brand: store.brand,
      location_text: store.location_text,
      memo: store.memo ?? "",
    });
  };

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingStore) {
      return;
    }

    setSaving(true);
    setError("");

    const { error: updateError } = await getSupabase()
      .from("stores")
      .update({
        store_name: editForm.store_name,
        brand: editForm.brand,
        location_text: editForm.location_text,
        memo: editForm.memo || null,
      })
      .eq("id", editingStore.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setEditingStore(null);
    setEditForm(initialForm);
    await fetchStores();
    setSaving(false);
  };

  const handleDelete = async (storeId: string) => {
    const isConfirmed = window.confirm("Delete this store?");
    if (!isConfirmed) {
      return;
    }

    setError("");
    const { error: deleteError } = await getSupabase()
      .from("stores")
      .delete()
      .eq("id", storeId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    await fetchStores();
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4 mb-6 border-b pb-2">
        <Link href="/settings/stores" className={navClass(true)}>
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
        <Link href="/settings/lists" className={navClass(false)}>
          リスト
        </Link>
      </div>

      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-[#1D3557]">設定</h1>
          <h2 className="text-xl font-semibold">店舗管理</h2>
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
            <Button className="bg-[#E63946] hover:bg-[#C62F3B]">新規店舗</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新規店舗</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleCreate}>
              <div className="space-y-2">
                <Label htmlFor="create-store-name">店舗名</Label>
                <Input
                  id="create-store-name"
                  value={createForm.store_name}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      store_name: event.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-store-brand">ブランド</Label>
                <Select
                  value={createForm.brand}
                  onValueChange={(value: "dr_stretch" | "wecle") =>
                    setCreateForm((prev) => ({ ...prev, brand: value }))
                  }
                >
                  <SelectTrigger id="create-store-brand">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dr_stretch">dr_stretch</SelectItem>
                    <SelectItem value="wecle">wecle</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-store-location">所在地</Label>
                <Input
                  id="create-store-location"
                  value={createForm.location_text}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      location_text: event.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-store-memo">メモ</Label>
                <Input
                  id="create-store-memo"
                  value={createForm.memo}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      memo: event.target.value,
                    }))
                  }
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-[#E63946] hover:bg-[#C62F3B]"
                disabled={saving}
              >
                新規店舗
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
              <TableHead>店舗名</TableHead>
              <TableHead>ブランド</TableHead>
              <TableHead>所在地</TableHead>
              <TableHead>有効</TableHead>
              <TableHead className="w-[180px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!loading &&
              stores.map((store) => (
                <TableRow key={store.id}>
                  <TableCell className="font-medium">{store.store_name}</TableCell>
                  <TableCell>
                    <Badge className={brandBadgeClass(store.brand)}>
                      {store.brand}
                    </Badge>
                  </TableCell>
                  <TableCell>{store.location_text}</TableCell>
                  <TableCell>
                    {store.is_active ? (
                      <Badge className="border-transparent bg-green-100 text-green-700">
                        有効
                      </Badge>
                    ) : (
                      <Badge variant="outline">OFF</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(store)}
                      >
                        編集
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => void handleDelete(store.id)}
                      >
                        削除
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            {!loading && stores.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-neutral-500">
                  No stores
                </TableCell>
              </TableRow>
            )}
            {loading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-neutral-500">
                  Loading...
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={Boolean(editingStore)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingStore(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>編集</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleUpdate}>
            <div className="space-y-2">
              <Label htmlFor="edit-store-name">店舗名</Label>
              <Input
                id="edit-store-name"
                value={editForm.store_name}
                onChange={(event) =>
                  setEditForm((prev) => ({
                    ...prev,
                    store_name: event.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-store-brand">ブランド</Label>
              <Select
                value={editForm.brand}
                onValueChange={(value: "dr_stretch" | "wecle") =>
                  setEditForm((prev) => ({ ...prev, brand: value }))
                }
              >
                <SelectTrigger id="edit-store-brand">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dr_stretch">dr_stretch</SelectItem>
                  <SelectItem value="wecle">wecle</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-store-location">所在地</Label>
              <Input
                id="edit-store-location"
                value={editForm.location_text}
                onChange={(event) =>
                  setEditForm((prev) => ({
                    ...prev,
                    location_text: event.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-store-memo">メモ</Label>
              <Input
                id="edit-store-memo"
                value={editForm.memo}
                onChange={(event) =>
                  setEditForm((prev) => ({
                    ...prev,
                    memo: event.target.value,
                  }))
                }
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-[#E63946] hover:bg-[#C62F3B]"
              disabled={saving}
            >
              編集
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
