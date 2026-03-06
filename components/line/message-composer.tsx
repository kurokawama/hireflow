"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface MessageComposerProps {
  onSend: (userId: string, message: string) => Promise<void>;
}

const LINE_MESSAGE_LIMIT = 5000;

export function MessageComposer({ onSend }: MessageComposerProps) {
  const [userId, setUserId] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  const count = message.length;
  const isOverLimit = count > LINE_MESSAGE_LIMIT;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const trimmedUserId = userId.trim();
    const trimmedMessage = message.trim();

    if (!trimmedUserId) {
      setError("送信先を入力してください。");
      return;
    }
    if (!trimmedMessage) {
      setError("メッセージを入力してください。");
      return;
    }
    if (isOverLimit) {
      setError("メッセージは5000文字以内で入力してください。");
      return;
    }

    setIsSending(true);
    try {
      await onSend(trimmedUserId, trimmedMessage);
      setMessage("");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "送信に失敗しました。");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
      <div className="space-y-2">
        <Label htmlFor="line-user-id">送信先</Label>
        <Input
          id="line-user-id"
          placeholder="LINE user ID"
          value={userId}
          onChange={(event) => setUserId(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="line-message-content">メッセージ</Label>
          <p className={`text-xs ${isOverLimit ? "text-red-600" : "text-muted-foreground"}`}>
            {count.toLocaleString("ja-JP")} / {LINE_MESSAGE_LIMIT.toLocaleString("ja-JP")}
          </p>
        </div>
        <Textarea
          id="line-message-content"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={5}
          className={isOverLimit ? "border-red-500 focus-visible:ring-red-500" : undefined}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button
        type="submit"
        disabled={isSending || isOverLimit}
        className="bg-[#1D3557] text-white hover:bg-[#122540]"
      >
        {isSending ? "送信中..." : "送信"}
      </Button>
    </form>
  );
}
