"use client";

import { useEffect, useMemo, useState } from "react";
import type { FollowUpMessage, LineSettings } from "@/types/tracking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface LineSettingsFormProps {
  settings: LineSettings | null;
  onSave: (data: Partial<LineSettings>) => Promise<void>;
}

interface SwitchProps {
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function Switch({ id, checked, onCheckedChange }: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={[
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
        checked ? "bg-[#1D3557]" : "bg-neutral-300",
      ].join(" ")}
    >
      <span
        className={[
          "inline-block h-5 w-5 transform rounded-full bg-white transition-transform",
          checked ? "translate-x-5" : "translate-x-0.5",
        ].join(" ")}
      />
    </button>
  );
}

function isValidFollowUpMessages(value: unknown): value is FollowUpMessage[] {
  if (!Array.isArray(value)) return false;
  return value.every((item) => {
    if (!item || typeof item !== "object") return false;
    const target = item as { delay_hours?: unknown; message_text?: unknown };
    return (
      typeof target.delay_hours === "number" &&
      Number.isFinite(target.delay_hours) &&
      target.delay_hours >= 0 &&
      typeof target.message_text === "string"
    );
  });
}

const EMPTY_MESSAGE: FollowUpMessage = {
  delay_hours: 24,
  message_text: "",
};

export function LineSettingsForm({ settings, onSave }: LineSettingsFormProps) {
  const [interviewBookingUrl, setInterviewBookingUrl] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [followUpMessages, setFollowUpMessages] = useState<FollowUpMessage[]>([]);
  const [jsonValue, setJsonValue] = useState("[]");
  const [formError, setFormError] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setInterviewBookingUrl(settings?.interview_booking_url ?? "");
    setWelcomeMessage(settings?.welcome_message ?? "");
    setIsActive(settings?.is_active ?? true);
    setFollowUpMessages(settings?.follow_up_messages ?? []);
  }, [settings]);

  useEffect(() => {
    setJsonValue(JSON.stringify(followUpMessages, null, 2));
  }, [followUpMessages]);

  const hasFollowUpError = useMemo(
    () => followUpMessages.some((item) => !item.message_text.trim()),
    [followUpMessages]
  );

  const handleMove = (index: number, direction: "up" | "down") => {
    setFollowUpMessages((prev) => {
      const next = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      const [current] = next.splice(index, 1);
      next.splice(targetIndex, 0, current);
      return next;
    });
  };

  const handleFollowUpFieldChange = (
    index: number,
    field: keyof FollowUpMessage,
    value: number | string
  ) => {
    setFollowUpMessages((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]:
                field === "delay_hours"
                  ? Number.isFinite(Number(value))
                    ? Math.max(0, Number(value))
                    : 0
                  : String(value),
            }
          : item
      )
    );
  };

  const handleJsonChange = (value: string) => {
    setJsonValue(value);
    if (!value.trim()) {
      setFollowUpMessages([]);
      setJsonError("");
      return;
    }

    try {
      const parsed = JSON.parse(value) as unknown;
      if (!isValidFollowUpMessages(parsed)) {
        setJsonError("フォローアップメッセージのJSON形式が正しくありません。");
        return;
      }
      setFollowUpMessages(parsed);
      setJsonError("");
    } catch {
      setJsonError("フォローアップメッセージのJSON形式が正しくありません。");
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    const trimmedUrl = interviewBookingUrl.trim();
    if (trimmedUrl) {
      try {
        const parsed = new URL(trimmedUrl);
        if (!["http:", "https:"].includes(parsed.protocol)) {
          throw new Error("invalid protocol");
        }
      } catch {
        setFormError("面接予約URLの形式が正しくありません。");
        return;
      }
    }

    if (jsonError) {
      setFormError("JSONエラーを解消してから保存してください。");
      return;
    }

    if (hasFollowUpError) {
      setFormError("フォローアップメッセージの内容を入力してください。");
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        interview_booking_url: trimmedUrl || null,
        welcome_message: welcomeMessage,
        follow_up_messages: followUpMessages,
        is_active: isActive,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={(event) => void handleSubmit(event)}>
      <div className="space-y-2">
        <Label htmlFor="line-booking-url">面接予約URL</Label>
        <Input
          id="line-booking-url"
          placeholder="https://example.com/book"
          value={interviewBookingUrl}
          onChange={(event) => setInterviewBookingUrl(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="line-welcome-message">ウェルカムメッセージ</Label>
        <Textarea
          id="line-welcome-message"
          value={welcomeMessage}
          onChange={(event) => setWelcomeMessage(event.target.value)}
          rows={4}
        />
      </div>

      <div className="flex items-center justify-between rounded-md border border-neutral-200 p-4">
        <div className="space-y-1">
          <Label htmlFor="line-is-active">LINE連携を有効化</Label>
          <p className="text-xs text-muted-foreground">
            無効にすると自動メッセージ配信を停止します。
          </p>
        </div>
        <Switch id="line-is-active" checked={isActive} onCheckedChange={setIsActive} />
      </div>

      <div className="space-y-3 rounded-md border border-neutral-200 p-4">
        <div className="flex items-center justify-between">
          <Label>フォローアップメッセージ</Label>
          <Button
            type="button"
            variant="outline"
            onClick={() => setFollowUpMessages((prev) => [...prev, { ...EMPTY_MESSAGE }])}
          >
            追加
          </Button>
        </div>

        {followUpMessages.length === 0 && (
          <p className="text-sm text-muted-foreground">フォローアップメッセージは未設定です。</p>
        )}

        {followUpMessages.map((message, index) => (
          <div key={`${index}-${message.delay_hours}`} className="space-y-3 rounded-md border p-3">
            <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
              <div className="space-y-2">
                <Label htmlFor={`follow-up-delay-${index}`}>送信遅延（時間）</Label>
                <Input
                  id={`follow-up-delay-${index}`}
                  type="number"
                  min={0}
                  value={message.delay_hours}
                  onChange={(event) =>
                    handleFollowUpFieldChange(index, "delay_hours", event.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`follow-up-message-${index}`}>メッセージ内容</Label>
                <Textarea
                  id={`follow-up-message-${index}`}
                  rows={3}
                  value={message.message_text}
                  onChange={(event) =>
                    handleFollowUpFieldChange(index, "message_text", event.target.value)
                  }
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleMove(index, "up")}
                disabled={index === 0}
              >
                上へ
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleMove(index, "down")}
                disabled={index === followUpMessages.length - 1}
              >
                下へ
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() =>
                  setFollowUpMessages((prev) =>
                    prev.filter((_, itemIndex) => itemIndex !== index)
                  )
                }
              >
                削除
              </Button>
            </div>
          </div>
        ))}

        <div className="space-y-2">
          <Label htmlFor="line-follow-up-json">フォローアップメッセージ（JSON）</Label>
          <Textarea
            id="line-follow-up-json"
            rows={8}
            value={jsonValue}
            onChange={(event) => handleJsonChange(event.target.value)}
            className={jsonError ? "border-red-500 focus-visible:ring-red-500" : undefined}
          />
          {jsonError && <p className="text-sm text-red-600">{jsonError}</p>}
        </div>
      </div>

      {formError && <p className="text-sm text-red-600">{formError}</p>}

      <Button
        type="submit"
        disabled={isSaving}
        className="bg-[#1D3557] text-white hover:bg-[#122540]"
      >
        {isSaving ? "保存中..." : "保存"}
      </Button>
    </form>
  );
}
