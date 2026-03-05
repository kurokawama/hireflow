"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import type { ConversationMessage } from "@/types/conversation";
import { RevisionActions } from "@/components/conversation/revision-actions";
import { RevisionDiff } from "@/components/conversation/revision-diff";

interface MessageBubbleProps {
  message: ConversationMessage;
  originalText?: string;
  onRevisionApplied?: (newVersion: number) => void;
}

function formatRelativeTime(createdAt: string): string {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const diffMs = Math.max(now - created, 0);
  const diffMin = Math.floor(diffMs / (1000 * 60));

  if (diffMin < 60) {
    return `${Math.max(diffMin, 1)}分前`;
  }

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return `${diffHours}時間前`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}日前`;
}

export function MessageBubble({
  message,
  originalText,
  onRevisionApplied,
}: MessageBubbleProps) {
  const params = useParams<{ id: string }>();
  const contentId = useMemo(() => {
    const value = params?.id;
    return Array.isArray(value) ? value[0] : value;
  }, [params]);

  const isHuman = message.role === "human";
  const timeLabel = formatRelativeTime(message.created_at);

  return (
    <div className={`flex w-full flex-col gap-2 ${isHuman ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[90%] rounded-md px-4 py-3 shadow-sm md:max-w-[80%] ${
          isHuman ? "bg-[#E63946] text-white" : "bg-neutral-100 text-neutral-900"
        }`}
      >
        <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
      </div>
      <p className="px-1 text-xs text-neutral-500">{timeLabel}</p>

      {message.revised_body_text && contentId ? (
        <div className="w-full space-y-2 rounded-md border bg-neutral-50 p-3">
          <RevisionDiff
            originalText={originalText || message.content}
            revisedText={message.revised_body_text}
          />
          <RevisionActions
            contentId={contentId}
            messageId={message.id}
            onRevisionApplied={onRevisionApplied || (() => undefined)}
          />
        </div>
      ) : null}
    </div>
  );
}
