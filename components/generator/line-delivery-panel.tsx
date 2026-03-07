"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import {
  getDeliveryLogs,
  getLineEnabledCandidates,
  sendQuizLinkMulticast,
} from "@/lib/actions/line-multicast";
import type { LineCandidate, LineDeliveryLog } from "@/types/line-broadcast";

interface LineDeliveryPanelProps {
  campaignId: string;
}

export function LineDeliveryPanel({ campaignId }: LineDeliveryPanelProps) {
  const [candidates, setCandidates] = useState<LineCandidate[]>([]);
  const [logs, setLogs] = useState<LineDeliveryLog[]>([]);
  const [selectedLineUserIds, setSelectedLineUserIds] = useState<string[]>([]);
  const [minScore, setMinScore] = useState("");
  const [message, setMessage] = useState("");
  const [includeQuizUrl, setIncludeQuizUrl] = useState(true);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(true);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const parsedMinScore = useMemo(() => {
    if (!minScore.trim()) return undefined;
    const number = Number(minScore);
    return Number.isFinite(number) ? number : undefined;
  }, [minScore]);

  const loadCandidates = useCallback(async () => {
    setIsLoadingCandidates(true);
    setError("");
    try {
      const data = await getLineEnabledCandidates({
        campaign_id: campaignId,
        min_score: parsedMinScore,
      });
      setCandidates(data);
      setSelectedLineUserIds((prev) => prev.filter((lineUserId) => data.some((c) => c.line_user_id === lineUserId)));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load candidates.");
    } finally {
      setIsLoadingCandidates(false);
    }
  }, [campaignId, parsedMinScore]);

  const loadLogs = useCallback(async () => {
    setIsLoadingLogs(true);
    try {
      const data = await getDeliveryLogs(campaignId, 10);
      setLogs(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load logs.");
    } finally {
      setIsLoadingLogs(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void loadCandidates();
  }, [loadCandidates]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const toggleSelect = (lineUserId: string) => {
    setSelectedLineUserIds((prev) => {
      if (prev.includes(lineUserId)) {
        return prev.filter((id) => id !== lineUserId);
      }
      return [...prev, lineUserId];
    });
  };

  const allChecked = candidates.length > 0 && selectedLineUserIds.length === candidates.length;

  const handleSend = async () => {
    setError("");
    if (!message.trim()) {
      setError("Message is required.");
      return;
    }
    if (selectedLineUserIds.length === 0) {
      setError("Recipient is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await sendQuizLinkMulticast({
        campaign_id: campaignId,
        line_user_ids: selectedLineUserIds,
        message: message.trim(),
        include_quiz_url: includeQuizUrl,
      });
      if (!result.success) {
        setError(result.error || "Failed to send message.");
        return;
      }
      setSelectedLineUserIds([]);
      await loadLogs();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Failed to send message.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="rounded-md border border-neutral-200 bg-white">
      <CardHeader>
        <CardTitle className="text-neutral-900">LINE配信</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="line-min-score">min score</Label>
          <Input
            id="line-min-score"
            type="number"
            value={minScore}
            onChange={(event) => setMinScore(event.target.value)}
          />
        </div>

        <div className="space-y-3">
          {isLoadingCandidates ? (
            <div className="animate-pulse rounded-md bg-neutral-100 h-8" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-neutral-200">
                  <TableHead className="w-[40px]">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={(event) => {
                        if (event.target.checked) {
                          setSelectedLineUserIds(candidates.map((candidate) => candidate.line_user_id));
                          return;
                        }
                        setSelectedLineUserIds([]);
                      }}
                    />
                  </TableHead>
                  <TableHead>name</TableHead>
                  <TableHead>score</TableHead>
                  <TableHead>stage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((candidate) => (
                  <TableRow key={candidate.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedLineUserIds.includes(candidate.line_user_id)}
                        onChange={() => toggleSelect(candidate.line_user_id)}
                      />
                    </TableCell>
                    <TableCell className="text-neutral-900">{candidate.name}</TableCell>
                    <TableCell className="text-neutral-600">{candidate.ai_score ?? "-"}</TableCell>
                    <TableCell className="text-neutral-600">{candidate.stage}</TableCell>
                  </TableRow>
                ))}
                {candidates.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-neutral-500">
                      データなし
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="line-message">message</Label>
          <Textarea
            id="line-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={4}
          />
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-neutral-600">
          <input
            type="checkbox"
            checked={includeQuizUrl}
            onChange={(event) => setIncludeQuizUrl(event.target.checked)}
          />
          クイズURLを含める
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button
          type="button"
          onClick={() => void handleSend()}
          disabled={isSubmitting}
          className="bg-[#1D3557] text-white hover:bg-[#122540]"
        >
          {isSubmitting ? (
            <span className="inline-flex items-center gap-2">
              <Check className="h-4 w-4" />
              Sending...
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <Send className="h-4 w-4" />
              送信
            </span>
          )}
        </Button>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-neutral-900">delivery logs</h3>
          {isLoadingLogs ? (
            <div className="animate-pulse rounded-md bg-neutral-100 h-8" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-neutral-200">
                  <TableHead>sent_at</TableHead>
                  <TableHead>recipient_count</TableHead>
                  <TableHead>status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-neutral-600">
                      {new Date(log.sent_at).toLocaleString("ja-JP")}
                    </TableCell>
                    <TableCell className="text-neutral-600">{log.recipient_count}</TableCell>
                    <TableCell className="text-neutral-600">{log.status}</TableCell>
                  </TableRow>
                ))}
                {logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-neutral-500">
                      データなし
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
