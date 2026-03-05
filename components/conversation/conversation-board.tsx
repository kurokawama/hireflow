"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { MessageBubble } from "@/components/conversation/message-bubble";
import { PlatformTabs } from "@/components/conversation/platform-tabs";
import type { ConversationMessage, ConversationResponse } from "@/types/conversation";
import type { Platform } from "@/types/database";
import type { SNSPlatform } from "@/types/sns";

interface ConversationBoardProps {
  contentId: string;
  platforms: Array<SNSPlatform | Platform>;
  initialPlatform: SNSPlatform | Platform;
  originalText: string;
}

interface GetConversationApiResponse {
  data?: ConversationResponse;
  error?: string;
}

interface SendMessageApiResponse {
  data?: {
    human_message: ConversationMessage;
    ai_message: ConversationMessage;
  };
  error?: string;
}

export function ConversationBoard({
  contentId,
  platforms,
  initialPlatform,
  originalText,
}: ConversationBoardProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [activePlatform, setActivePlatform] = useState<SNSPlatform | Platform>(initialPlatform);
  const endRef = useRef<HTMLDivElement | null>(null);

  const hasMessages = messages.length > 0;

  useEffect(() => {
    const fetchConversation = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/conversations/${contentId}`, {
          method: "GET",
          cache: "no-store",
        });
        const payload = (await response.json()) as GetConversationApiResponse;
        if (!response.ok || !payload.data) {
          throw new Error(payload.error || "Failed to load conversation");
        }
        setMessages(payload.data.messages);
      } catch (fetchError) {
        const message =
          fetchError instanceof Error ? fetchError.message : "Failed to load conversation";
        setError(message);
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    void fetchConversation();
  }, [contentId, toast]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isSending]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSending || isLoading) {
      return;
    }

    const message = inputValue.trim();
    if (!message) {
      return;
    }

    setIsSending(true);
    setError(null);
    try {
      const response = await fetch(`/api/conversations/${contentId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });
      const payload = (await response.json()) as SendMessageApiResponse;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error || "Failed to send message");
      }

      setMessages((prev) => [...prev, payload.data!.human_message, payload.data!.ai_message]);
      setInputValue("");
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : "Failed to send message";
      setError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <Card className="rounded-md shadow-sm">
        <CardHeader className="space-y-4">
          <CardTitle className="font-semibold text-neutral-900">Conversation</CardTitle>
          <PlatformTabs
            platforms={platforms}
            activePlatform={activePlatform}
            onPlatformChange={setActivePlatform}
          />
        </CardHeader>

        <CardContent className="space-y-4">
          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="h-[420px] overflow-y-auto rounded-md border bg-white p-4">
            {isLoading ? (
              <div className="space-y-3">
                <div className="h-16 w-[70%] animate-pulse rounded-md bg-neutral-100 motion-reduce:animate-none" />
                <div className="ml-auto h-16 w-[65%] animate-pulse rounded-md bg-neutral-100 motion-reduce:animate-none" />
                <div className="h-16 w-[60%] animate-pulse rounded-md bg-neutral-100 motion-reduce:animate-none" />
              </div>
            ) : hasMessages ? (
              <div className="space-y-4">
                {messages.map((messageItem) => (
                  <MessageBubble
                    key={messageItem.id}
                    message={messageItem}
                    originalText={originalText}
                    onRevisionApplied={() => undefined}
                  />
                ))}
                {isSending ? (
                  <div className="inline-flex items-center gap-2 rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-600">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600 motion-reduce:animate-none" />
                    <span>...</span>
                  </div>
                ) : null}
                <div ref={endRef} />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center rounded-md border border-dashed bg-neutral-50 text-sm text-neutral-500">
                Empty
              </div>
            )}
          </div>

          <form className="space-y-3" onSubmit={handleSubmit}>
            <Textarea
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              rows={4}
              aria-label="message input"
              placeholder="Message"
              disabled={isSending}
              className="resize-none rounded-md shadow-sm focus-visible:ring-[#1D3557]"
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                aria-label="send message"
                disabled={isSending || isLoading || !inputValue.trim()}
                className="bg-[#1D3557] text-white shadow-sm transition-colors hover:bg-[#14253d] focus-visible:ring-2 focus-visible:ring-[#1D3557] motion-reduce:transition-none"
              >
                {isSending ? "..." : "Send"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Toaster />
    </>
  );
}
