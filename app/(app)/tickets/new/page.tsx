"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { issueTicketAction, listTicketsAction } from "@/lib/actions/tickets";
import type { TicketType, TicketWithCandidate } from "@/types/tickets";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const typeLabelMap: Record<TicketType, string> = {
  dr_stretch_60min: "Dr.ストレッチ 60分体験",
  pilates_weekly: "ピラティス 週1体験",
};

export default function NewTicketPage() {
  const router = useRouter();
  const [sourceTickets, setSourceTickets] = useState<TicketWithCandidate[]>([]);
  const [candidateId, setCandidateId] = useState("");
  const [ticketType, setTicketType] = useState<TicketType>("dr_stretch_60min");
  const [expiryDays, setExpiryDays] = useState(30);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadCandidates() {
      setIsLoading(true);
      const result = await listTicketsAction({ limit: 200 });
      if (result.error) {
        setErrorMessage(result.error);
      } else {
        setSourceTickets(result.data);
      }
      setIsLoading(false);
    }

    void loadCandidates();
  }, []);

  const candidateOptions = useMemo(() => {
    const map = new Map<string, string>();

    for (const ticket of sourceTickets) {
      if (!ticket.candidates) continue;
      const name = ticket.candidates.name?.trim() ? ticket.candidates.name : ticket.candidates.id;
      map.set(ticket.candidates.id, name);
    }

    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [sourceTickets]);

  const hasCandidates = candidateOptions.length > 0;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!candidateId) {
      setErrorMessage("Candidate is required.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await issueTicketAction({
        candidateId,
        ticketType,
        issuedVia: "manual",
        expiryDays,
      });

      if (result.error || !result.data) {
        setErrorMessage(result.error ?? "Failed to issue ticket.");
        return;
      }

      router.push(`/tickets/${result.data.ticket_code}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-bold text-[#1D3557]">チケット管理</h1>
        <Button asChild variant="outline" className="border-neutral-200">
          <Link href="/tickets">Back</Link>
        </Button>
      </div>

      <Card className="rounded-md border-neutral-200">
        <CardHeader>
          <CardTitle className="text-[#1D3557]">Manual Issue</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="candidateIdInput">Candidate ID</Label>
              <Input
                id="candidateIdInput"
                value={candidateId}
                onChange={(event) => setCandidateId(event.target.value)}
                placeholder="Candidate ID"
              />
            </div>

            {hasCandidates ? (
              <div className="space-y-2">
                <Label htmlFor="candidate">Candidate</Label>
                <Select value={candidateId} onValueChange={setCandidateId} disabled={isLoading}>
                  <SelectTrigger id="candidate">
                    <SelectValue placeholder="Select candidate" />
                  </SelectTrigger>
                  <SelectContent>
                    {candidateOptions.map((candidate) => (
                      <SelectItem key={candidate.id} value={candidate.id}>
                        {candidate.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="ticketType">Ticket Type</Label>
              <Select
                value={ticketType}
                onValueChange={(value: TicketType) => setTicketType(value)}
              >
                <SelectTrigger id="ticketType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dr_stretch_60min">
                    {typeLabelMap.dr_stretch_60min}
                  </SelectItem>
                  <SelectItem value="pilates_weekly">{typeLabelMap.pilates_weekly}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiryDays">Expiry Days</Label>
              <Input
                id="expiryDays"
                type="number"
                min={1}
                value={expiryDays}
                onChange={(event) => setExpiryDays(Number(event.target.value))}
              />
            </div>

            {errorMessage ? <p className="text-sm text-red-700">{errorMessage}</p> : null}

            <Button
              type="submit"
              className="bg-[#1D3557] text-white hover:bg-[#1D3557]/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Issue Ticket"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
