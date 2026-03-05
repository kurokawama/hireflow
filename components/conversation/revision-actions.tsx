"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface RevisionActionsProps {
  contentId: string;
  messageId: string;
  onRevisionApplied: (newVersion: number) => void;
}

interface ApplyRevisionApiResponse {
  data?: {
    success: boolean;
    newVersion: number;
  };
  error?: string;
}

export function RevisionActions({
  contentId,
  messageId,
  onRevisionApplied,
}: RevisionActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isApplying, setIsApplying] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const handleApply = async () => {
    setIsApplying(true);
    try {
      const response = await fetch(`/api/conversations/${contentId}/revise`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message_id: messageId }),
      });

      const payload = (await response.json()) as ApplyRevisionApiResponse;
      if (!response.ok || !payload.data?.success) {
        throw new Error(payload.error || "Failed to apply revision");
      }

      onRevisionApplied(payload.data.newVersion);
      setIsDismissed(true);
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Request failed",
        variant: "destructive",
      });
    } finally {
      setIsApplying(false);
    }
  };

  if (isDismissed) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        onClick={handleApply}
        disabled={isApplying}
        aria-label="採用"
        className="bg-[#E63946] text-white shadow-sm transition-colors hover:bg-[#C62F3B] focus-visible:ring-2 focus-visible:ring-[#E63946] motion-reduce:transition-none"
      >
        {isApplying ? "..." : "採用"}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsDismissed(true)}
        disabled={isApplying}
        aria-label="却下"
        className="shadow-sm motion-reduce:transition-none"
      >
        却下
      </Button>
    </div>
  );
}
