"use client";

import { Suspense, type FormEvent, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Logo } from "@/components/logo";
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
import { Textarea } from "@/components/ui/textarea";

export default function ApplyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">読み込み中...</div>}>
      <ApplyContent />
    </Suspense>
  );
}

function ApplyContent() {
  const searchParams = useSearchParams();
  const candidateId = searchParams.get("candidate_id") || "";

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_id: candidateId,
          name,
          phone,
          email,
          preferred_date: preferredDate,
          time_slot: timeSlot,
          message,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setErrorMessage(data.error || "送信に失敗しました");
        return;
      }

      setIsSubmitted(true);
    } catch {
      setErrorMessage("ネットワークエラーが発生しました。もう一度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFF7ED] via-[#FFFBF5] to-white px-4 py-8">
        <div className="mx-auto w-full max-w-xl space-y-6">
          <div className="flex justify-center">
            <Logo size="sm" />
          </div>
          <Card className="rounded-md border-[#6B9080]/30 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-center text-xl text-[#1D3557]">
                ご応募ありがとうございます！
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-sm text-neutral-700">
                ご応募を受け付けました。担当者より折り返しご連絡いたします。
              </p>
              <p className="text-sm text-neutral-600">
                通常1〜2営業日以内にメールまたはお電話にてご連絡いたします。
              </p>
              <Button asChild className="bg-[#1D3557] hover:bg-[#1D3557]/90">
                <a href="https://line.me/R/ti/p/@dr-stretch" target="_blank" rel="noreferrer">
                  LINEで最新情報を受け取る
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF7ED] via-[#FFFBF5] to-white px-4 py-8">
      <div className="mx-auto w-full max-w-xl space-y-6">
        <div className="flex justify-center">
          <Logo size="sm" />
        </div>
        <h1 className="text-center text-2xl font-bold text-[#1D3557]">体験・応募フォーム</h1>
        <p className="text-center text-sm text-neutral-600">
          以下の情報をご入力ください。担当者より折り返しご連絡いたします。
        </p>

        <Card className="rounded-md border-neutral-200 bg-white shadow-sm">
          <CardContent className="pt-6">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="name">お名前 *</Label>
                <Input
                  id="name"
                  required
                  placeholder="山田 太郎"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">電話番号 *</Label>
                <Input
                  id="phone"
                  type="tel"
                  required
                  placeholder="090-1234-5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="taro@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="preferred_date">希望日</Label>
                <Input
                  id="preferred_date"
                  type="date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="time_slot">希望時間帯</Label>
                <Select value={timeSlot} onValueChange={setTimeSlot}>
                  <SelectTrigger id="time_slot">
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">午前（9:00〜12:00）</SelectItem>
                    <SelectItem value="afternoon">午後（12:00〜17:00）</SelectItem>
                    <SelectItem value="evening">夕方以降（17:00〜）</SelectItem>
                    <SelectItem value="any">いつでも可</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">メッセージ・質問</Label>
                <Textarea
                  id="message"
                  placeholder="お気軽にご質問ください"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                />
              </div>

              {errorMessage ? (
                <p className="text-sm text-red-700">{errorMessage}</p>
              ) : null}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#E63946] hover:bg-[#C62F3B]"
              >
                {isSubmitting ? "送信中..." : "応募する"}
              </Button>

              <p className="text-center text-xs text-neutral-500">
                <Link href="/quiz/result" className="underline">
                  結果ページに戻る
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
