"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { bulkIssueTicketsAction } from "@/lib/actions/tickets";
import type { TicketType } from "@/types/tickets";
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

type CandidateOption = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  ai_score: number;
  stage: string;
  created_at: string;
};

interface BulkIssueDialogProps {
  onIssued?: (result: { issued: number; failed: number }) => void;
}

const ticketTypeLabels: Record<TicketType, string> = {
  dr_stretch_60min: "Dr.ストレッチ 60分体験",
  pilates_weekly: "ピラティス 週1体験",
};

export function BulkIssueDialog({ onIssued }: BulkIssueDialogProps) {
  const [open, setOpen] = useState(false);
  const [candidates, setCandidates] = useState<CandidateOption[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [ticketType, setTicketType] = useState<TicketType>("dr_stretch_60min");
  const [expiryDays, setExpiryDays] = useState<number>(30);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ issued: number; failed: number; error: string | null } | null>(
    null
  );

  const loadCandidates = useCallback(async () => {
    setIsLoadingCandidates(true);
    setError("");

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("認証エラー");
      }

      const { data: member, error: memberError } = await supabase
        .from("organization_members")
        .select("org_id")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (memberError || !member?.org_id) {
        throw new Error(memberError?.message || "組織が見つかりません");
      }

      const { data, error: candidatesError } = await supabase
        .from("candidates")
        .select("id, name, email, phone, ai_score, stage, created_at")
        .eq("org_id", member.org_id)
        .order("created_at", { ascending: false })
        .limit(300);

      if (candidatesError) {
        throw new Error(candidatesError.message);
      }

      setCandidates((data ?? []) as CandidateOption[]);
    } catch (loadError) {
      setCandidates([]);
      setError(loadError instanceof Error ? loadError.message : "候補者の読み込みに失敗しました");
    } finally {
      setIsLoadingCandidates(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setSearchTerm("");
    setSelectedCandidateIds([]);
    setResult(null);
    setError("");
    void loadCandidates();
  }, [loadCandidates, open]);

  const filteredCandidates = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return candidates;
    return candidates.filter((candidate) => {
      const haystack = `${candidate.name ?? ""} ${candidate.email ?? ""} ${candidate.phone ?? ""}`.toLowerCase();
      return haystack.includes(keyword);
    });
  }, [candidates, searchTerm]);

  const toggleCandidate = (candidateId: string) => {
    setSelectedCandidateIds((prev) =>
      prev.includes(candidateId) ? prev.filter((id) => id !== candidateId) : [...prev, candidateId]
    );
  };

  const handleSelectAllFiltered = () => {
    const next = new Set(selectedCandidateIds);
    for (const candidate of filteredCandidates) {
      next.add(candidate.id);
    }
    setSelectedCandidateIds(Array.from(next));
  };

  const handleClearSelection = () => {
    setSelectedCandidateIds([]);
  };

  const handleIssue = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResult(null);
    setError("");

    if (selectedCandidateIds.length === 0) {
      setError("候補者を選択してください");
      return;
    }
    if (!Number.isFinite(expiryDays) || expiryDays < 1) {
      setError("有効日数は1以上にしてください");
      return;
    }

    setIsIssuing(true);
    try {
      const issueResult = await bulkIssueTicketsAction({
        candidateIds: selectedCandidateIds,
        ticketType,
        issuedVia: "manual",
        expiryDays,
      });
      setResult(issueResult);

      if (!issueResult.error) {
        onIssued?.({ issued: issueResult.issued, failed: issueResult.failed });
      }
    } catch (issueError) {
      setError(issueError instanceof Error ? issueError.message : "チケット発行に失敗しました");
    } finally {
      setIsIssuing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" className="bg-[#1D3557] text-white hover:bg-[#122540]">
          一括発行
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl border-neutral-200 bg-white">
        <DialogHeader>
          <DialogTitle className="text-[#1D3557]">一括発行</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={(event) => void handleIssue(event)}>
          <div className="space-y-2">
            <Label htmlFor="bulk-candidate-search">候補者</Label>
            <Input
              id="bulk-candidate-search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="名前 / メール / 電話番号で検索"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={handleSelectAllFiltered}>
              表示中を全選択
            </Button>
            <Button type="button" variant="outline" onClick={handleClearSelection}>
              選択解除
            </Button>
            <p className="text-sm text-neutral-600">選択済み: {selectedCandidateIds.length}</p>
          </div>

          <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border border-neutral-200 p-3">
            {isLoadingCandidates && <p className="text-sm text-neutral-600">読み込み中...</p>}
            {!isLoadingCandidates && filteredCandidates.length === 0 && (
              <p className="text-sm text-neutral-600">候補者なし</p>
            )}
            {!isLoadingCandidates &&
              filteredCandidates.map((candidate) => (
                <label
                  key={candidate.id}
                  className="flex items-start gap-3 rounded-md border border-neutral-200 p-2 hover:bg-neutral-50"
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4"
                    checked={selectedCandidateIds.includes(candidate.id)}
                    onChange={() => toggleCandidate(candidate.id)}
                  />
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate text-sm font-medium text-[#1D3557]">{candidate.name ?? "-"}</p>
                    <p className="truncate text-xs text-neutral-600">{candidate.email ?? "-"}</p>
                    <p className="truncate text-xs text-neutral-600">{candidate.phone ?? "-"}</p>
                  </div>
                </label>
              ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bulk-ticket-type">チケットタイプ</Label>
              <Select value={ticketType} onValueChange={(value: TicketType) => setTicketType(value)}>
                <SelectTrigger id="bulk-ticket-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dr_stretch_60min">
                    {ticketTypeLabels.dr_stretch_60min}
                  </SelectItem>
                  <SelectItem value="pilates_weekly">{ticketTypeLabels.pilates_weekly}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk-expiry-days">有効日数</Label>
              <Input
                id="bulk-expiry-days"
                type="number"
                min={1}
                value={expiryDays}
                onChange={(event) => setExpiryDays(Number(event.target.value))}
              />
            </div>
          </div>

          {isIssuing && <p className="text-sm text-neutral-600">発行中...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {result && (
            <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm text-[#1D3557]">
              <p>発行済み: {result.issued}</p>
              <p>失敗: {result.failed}</p>
              {result.error && <p className="text-red-600">{result.error}</p>}
            </div>
          )}

          <Button type="submit" disabled={isIssuing} className="w-full bg-[#1D3557] text-white hover:bg-[#122540]">
            {isIssuing ? "..." : "一括発行"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
