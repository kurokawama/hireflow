"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import type { OrganizationMember, RoleType, Store } from "@/types/database";
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type MemberForm = {
  display_name: string;
  email: string;
  password: string;
  role: RoleType;
  store_id: string;
};

const initialForm: MemberForm = {
  display_name: "",
  email: "",
  password: "",
  role: "trainer",
  store_id: "",
};

function navClass(isActive: boolean) {
  return [
    "pb-2 text-sm font-medium border-b-2 transition-colors",
    isActive
      ? "border-[#E63946] text-[#E63946]"
      : "border-transparent text-neutral-600 hover:text-neutral-900",
  ].join(" ");
}

function roleBadgeClass(role: RoleType) {
  if (role === "admin") {
    return "border-transparent bg-purple-100 text-purple-700";
  }
  if (role === "hq_staff") {
    return "border-transparent bg-blue-100 text-blue-700";
  }
  if (role === "store_manager") {
    return "border-transparent bg-green-100 text-green-700";
  }
  return "border-transparent bg-neutral-200 text-neutral-700";
}

export default function SettingsMembersPage() {
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<MemberForm>(initialForm);

  const storeMap = useMemo(
    () => new Map(stores.map((store) => [store.id, store])),
    [stores]
  );

  const fetchData = async () => {
    setLoading(true);
    setError("");

    const [membersResult, storesResult] = await Promise.all([
      supabase
        .from("organization_members")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("stores").select("*").order("store_name", { ascending: true }),
    ]);

    if (membersResult.error) {
      setError(membersResult.error.message);
      setLoading(false);
      return;
    }

    if (storesResult.error) {
      setError(storesResult.error.message);
      setLoading(false);
      return;
    }

    setMembers((membersResult.data ?? []) as OrganizationMember[]);
    setStores((storesResult.data ?? []) as Store[]);
    setLoading(false);
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const handleCreateMember = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    const response = await fetch("/api/members", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        display_name: form.display_name,
        email: form.email,
        password: form.password,
        role: form.role,
        store_id: form.store_id || undefined,
      }),
    });

    if (!response.ok) {
      let message = "Failed to create member.";
      try {
        const payload = (await response.json()) as { error?: string };
        if (payload.error) {
          message = payload.error;
        }
      } catch {
        // Ignore non-JSON response
      }
      setError(message);
      setSaving(false);
      return;
    }

    setIsCreateOpen(false);
    setForm(initialForm);
    await fetchData();
    setSaving(false);
  };

  const handleToggleActive = async (member: OrganizationMember) => {
    setError("");

    const { error: updateError } = await supabase
      .from("organization_members")
      .update({ is_active: !member.is_active })
      .eq("id", member.id);

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
        <Link href="/settings/members" className={navClass(true)}>
          メンバー
        </Link>
        <Link href="/settings/voices" className={navClass(false)}>
          スタッフボイス
        </Link>
      </div>

      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-[#1D3557]">設定</h1>
          <h2 className="text-xl font-semibold">メンバー管理</h2>
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
              メンバー追加
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>メンバー追加</DialogTitle>
            </DialogHeader>

            <form className="space-y-4" onSubmit={handleCreateMember}>
              <div className="space-y-2">
                <Label htmlFor="member-display-name">表示名</Label>
                <Input
                  id="member-display-name"
                  value={form.display_name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, display_name: event.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="member-email">メールアドレス</Label>
                <Input
                  id="member-email"
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="member-password">パスワード</Label>
                <Input
                  id="member-password"
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, password: event.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="member-role">役割</Label>
                <Select
                  value={form.role}
                  onValueChange={(value: RoleType) =>
                    setForm((prev) => ({ ...prev, role: value }))
                  }
                >
                  <SelectTrigger id="member-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">admin</SelectItem>
                    <SelectItem value="hq_staff">hq_staff</SelectItem>
                    <SelectItem value="store_manager">store_manager</SelectItem>
                    <SelectItem value="trainer">trainer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="member-store">所属店舗</Label>
                <Select
                  value={form.store_id || "none"}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      store_id: value === "none" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger id="member-store">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-</SelectItem>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.store_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                className="w-full bg-[#E63946] hover:bg-[#C62F3B]"
                disabled={saving}
              >
                メンバー追加
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
              <TableHead>表示名</TableHead>
              <TableHead>メールアドレス</TableHead>
              <TableHead>役割</TableHead>
              <TableHead>所属店舗</TableHead>
              <TableHead>有効</TableHead>
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!loading &&
              members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.display_name}</TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>
                    <Badge className={roleBadgeClass(member.role)}>
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {member.store_id ? storeMap.get(member.store_id)?.store_name : "-"}
                  </TableCell>
                  <TableCell>
                    {member.is_active ? (
                      <Badge className="border-transparent bg-green-100 text-green-700">
                        有効
                      </Badge>
                    ) : (
                      <Badge variant="outline">OFF</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleToggleActive(member)}
                    >
                      Toggle
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            {!loading && members.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-neutral-500">
                  No members
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
    </div>
  );
}
