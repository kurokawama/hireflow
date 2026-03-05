"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { addCandidateToList, getList, getListMembers, removeCandidateFromList } from "@/lib/actions/candidate-lists";
import type { CandidateList, CandidateListMember } from "@/types/quiz";

type ListMemberRow = CandidateListMember & {
  candidate: {
    id: string;
    name: string | null;
    ai_score: number;
    stage: string;
  } | null;
};

function navClass(isActive: boolean) {
  return [
    "pb-2 text-sm font-medium border-b-2 transition-colors",
    isActive
      ? "border-[#E63946] text-[#E63946]"
      : "border-transparent text-neutral-600 hover:text-neutral-900",
  ].join(" ");
}

function stageBadgeClass(stage: string) {
  if (stage === "hired") return "border-transparent bg-green-100 text-green-700";
  if (stage === "rejected") return "border-transparent bg-red-100 text-red-700";
  if (stage === "interviewed") return "border-transparent bg-blue-100 text-blue-700";
  if (stage === "applied") return "border-transparent bg-purple-100 text-purple-700";
  return "border-transparent bg-neutral-100 text-neutral-700";
}

export default function CandidateListDetailPage() {
  const params = useParams<{ id: string }>();
  const listId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [list, setList] = useState<CandidateList | null>(null);
  const [members, setMembers] = useState<ListMemberRow[]>([]);
  const [candidateId, setCandidateId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    if (!listId) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [listData, membersData] = await Promise.all([getList(listId), getListMembers(listId)]);
      setList(listData);
      setMembers(membersData as ListMemberRow[]);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [listId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleAddCandidate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!listId || !candidateId) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      await addCandidateToList(listId, candidateId);
      setCandidateId("");
      await fetchData();
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "候補者の追加に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (targetCandidateId: string) => {
    if (!listId) {
      return;
    }
    const confirmed = window.confirm("この候補者をリストから外しますか？");
    if (!confirmed) {
      return;
    }
    setError("");
    try {
      await removeCandidateFromList(listId, targetCandidateId);
      await fetchData();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "候補者の削除に失敗しました");
    }
  };

  if (!listId) {
    return <p className="text-sm text-red-600">リストIDが不正です</p>;
  }

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

      <div className="space-y-2">
        <Link href="/settings/lists" className="text-sm text-neutral-600 hover:text-neutral-900">
          ← リスト一覧へ戻る
        </Link>
        <h1 className="text-2xl font-bold text-[#1D3557]">{list?.name ?? "リスト詳細"}</h1>
        {list?.description && <p className="text-sm text-neutral-600">{list.description}</p>}
      </div>

      <form
        className="rounded-md border bg-white p-4 shadow-sm space-y-3"
        onSubmit={handleAddCandidate}
      >
        <h2 className="text-base font-semibold text-[#1D3557]">メンバー管理</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-2 md:col-span-3">
            <Label htmlFor="candidate-id">Candidate ID</Label>
            <Input
              id="candidate-id"
              value={candidateId}
              onChange={(event) => setCandidateId(event.target.value)}
              placeholder="候補者IDを入力"
              required
            />
          </div>
          <div className="flex items-end">
            <Button
              type="submit"
              className="w-full bg-[#E63946] hover:bg-[#C62F3B]"
              disabled={saving}
            >
              追加
            </Button>
          </div>
        </div>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-neutral-500">Loading...</p>}

      <div className="rounded-md border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>AI Score</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Added Date</TableHead>
              <TableHead className="w-[120px]">Remove</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!loading &&
              members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.candidate?.name ?? "-"}</TableCell>
                  <TableCell>{member.candidate?.ai_score ?? "-"}</TableCell>
                  <TableCell>
                    <Badge className={stageBadgeClass(member.candidate?.stage ?? "")}>
                      {member.candidate?.stage ?? "-"}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(member.added_at).toLocaleDateString("ja-JP")}</TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => void handleRemove(member.candidate_id)}
                    >
                      削除
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

            {!loading && members.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-neutral-500">
                  メンバーがいません
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
    </div>
  );
}
