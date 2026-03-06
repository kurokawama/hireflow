"use client";

import { type FormEvent, useState } from "react";
import { issueTicketAction } from "@/lib/actions/tickets";
import type { ExperienceTicket, TicketType } from "@/types/tickets";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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

interface CandidateOption {
  id: string;
  name: string;
}

interface TicketIssueDialogProps {
  candidates: CandidateOption[];
  triggerLabel?: string;
  onIssued?: (ticket: ExperienceTicket) => void;
}

const typeLabelMap: Record<TicketType, string> = {
  dr_stretch_60min: "Dr.ストレッチ 60分体験",
  pilates_weekly: "ピラティス 週1体験",
};

export function TicketIssueDialog({
  candidates,
  triggerLabel = "Issue Ticket",
  onIssued,
}: TicketIssueDialogProps) {
  const [open, setOpen] = useState(false);
  const [candidateId, setCandidateId] = useState("");
  const [ticketType, setTicketType] = useState<TicketType>("dr_stretch_60min");
  const [expiryDays, setExpiryDays] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasCandidates = candidates.length > 0;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!candidateId) {
      setErrorMessage("Candidate is required.");
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

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

      onIssued?.(result.data);
      setOpen(false);
      setCandidateId("");
      setTicketType("dr_stretch_60min");
      setExpiryDays(30);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#1D3557] text-white hover:bg-[#1D3557]/90">{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-[#1D3557]">Issue Ticket</DialogTitle>
          <DialogDescription>Select candidate, type and expiry days.</DialogDescription>
        </DialogHeader>
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
              <Label htmlFor="candidateId">Candidate</Label>
              <Select value={candidateId} onValueChange={setCandidateId}>
                <SelectTrigger id="candidateId">
                  <SelectValue placeholder="Select candidate" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((candidate) => (
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

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Issue"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
