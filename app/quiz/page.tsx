"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SportsExp = "current" | "past" | "injury_break" | "spectator" | "none";
type Interest = "body_care" | "training" | "customer_service" | "health_work";
type AgeRange = "18-22" | "23-27" | "28-32" | "33+";
type StartTiming = "immediately" | "1-3months" | "exploring";

type QuizForm = {
  sports_exp: SportsExp | "";
  interests: Interest[];
  area: string;
  age_range: AgeRange | "";
  start_timing: StartTiming | "";
  name: string;
  email: string;
};

const totalSteps = 5;

const initialForm: QuizForm = {
  sports_exp: "",
  interests: [],
  area: "",
  age_range: "",
  start_timing: "",
  name: "",
  email: "",
};

const sportsExpOptions: Array<{ value: SportsExp; label: string }> = [
  { value: "current", label: "現在もやっている" },
  { value: "past", label: "以前やっていた" },
  { value: "injury_break", label: "怪我で中断した" },
  { value: "spectator", label: "観戦が好き" },
  { value: "none", label: "特になし" },
];

const interestOptions: Array<{ value: Interest; label: string }> = [
  { value: "body_care", label: "ボディケア" },
  { value: "training", label: "トレーニング指導" },
  { value: "customer_service", label: "接客" },
  { value: "health_work", label: "健康に関わる仕事" },
];

const ageOptions: Array<{ value: AgeRange; label: string }> = [
  { value: "18-22", label: "18-22" },
  { value: "23-27", label: "23-27" },
  { value: "28-32", label: "28-32" },
  { value: "33+", label: "33+" },
];

const timingOptions: Array<{ value: StartTiming; label: string }> = [
  { value: "immediately", label: "すぐに" },
  { value: "1-3months", label: "1〜3ヶ月以内" },
  { value: "exploring", label: "まだ考え中" },
];

export default function QuizPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">読み込み中...</div>}>
      <QuizContent />
    </Suspense>
  );
}

function QuizContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<QuizForm>(initialForm);

  const progress = useMemo(() => (step / totalSteps) * 100, [step]);

  const canProceed = useMemo(() => {
    if (step === 1) {
      return Boolean(form.sports_exp);
    }
    if (step === 2) {
      return form.interests.length > 0;
    }
    if (step === 3) {
      return form.area.trim().length > 0;
    }
    if (step === 4) {
      return Boolean(form.age_range);
    }
    if (step === 5) {
      return Boolean(form.start_timing);
    }
    return false;
  }, [step, form]);

  const toggleInterest = (interest: Interest) => {
    setForm((prev) => {
      if (prev.interests.includes(interest)) {
        return {
          ...prev,
          interests: prev.interests.filter((item) => item !== interest),
        };
      }
      return { ...prev, interests: [...prev.interests, interest] };
    });
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => prev - 1);
    }
  };

  const handleNextOrSubmit = async () => {
    if (!canProceed || submitting) {
      return;
    }

    if (step < totalSteps) {
      setStep((prev) => prev + 1);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sports_exp: form.sports_exp,
          interests: form.interests,
          area: form.area,
          age_range: form.age_range,
          start_timing: form.start_timing,
          name: form.name || undefined,
          email: form.email || undefined,
          utm_source: searchParams.get("utm_source") ?? undefined,
          utm_medium: searchParams.get("utm_medium") ?? undefined,
          utm_campaign: searchParams.get("utm_campaign") ?? undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Request failed.");
      }

      const payload = (await response.json()) as {
        data?: { candidate_id?: string };
      };

      const candidateId = payload.data?.candidate_id;
      if (!candidateId) {
        throw new Error("Candidate ID is missing.");
      }

      router.push(`/quiz/result?id=${candidateId}`);
    } catch (submitError) {
      if (submitError instanceof Error) {
        setError(submitError.message);
      } else {
        setError("Unknown error.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF7ED] via-[#FFFBF5] to-white px-4 py-6">
      <div className="mx-auto w-full max-w-md">
        <Card className="rounded-md border-[#F4A261]/30 bg-white shadow-sm">
          <CardHeader className="space-y-3">
            <div>
              <CardTitle className="text-2xl leading-tight text-[#1D3557]">
                あなたに合う働き方を見つけよう
              </CardTitle>
              <p className="mt-1 text-sm text-neutral-600">Dr. Stretch / Wecle</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-[#1D3557]">
                ステップ {step} / {totalSteps}
              </p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200">
                <div
                  className="h-full rounded-full bg-[#E63946] transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {step === 1 && (
              <div className="space-y-3">
                <p className="text-base font-semibold text-[#1D3557]">
                  スポーツ・フィットネスの経験は？
                </p>
                <div className="space-y-2">
                  {sportsExpOptions.map((option) => (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-3 text-sm transition-colors ${
                        form.sports_exp === option.value
                          ? "border-[#E63946] bg-[#E63946]/5 font-medium text-[#1D3557]"
                          : "border-neutral-200 bg-white hover:border-[#E63946]/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="sports_exp"
                        value={option.value}
                        checked={form.sports_exp === option.value}
                        onChange={() =>
                          setForm((prev) => ({ ...prev, sports_exp: option.value }))
                        }
                        className="h-4 w-4 accent-[#E63946]"
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <p className="text-base font-semibold text-[#1D3557]">
                  興味のある分野は？
                </p>
                <div className="space-y-2">
                  {interestOptions.map((option) => (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-3 text-sm transition-colors ${
                        form.interests.includes(option.value)
                          ? "border-[#E63946] bg-[#E63946]/5 font-medium text-[#1D3557]"
                          : "border-neutral-200 bg-white hover:border-[#E63946]/40"
                      }`}
                    >
                      <input
                        type="checkbox"
                        value={option.value}
                        checked={form.interests.includes(option.value)}
                        onChange={() => toggleInterest(option.value)}
                        className="h-4 w-4 accent-[#E63946]"
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <p className="text-base font-semibold text-[#1D3557]">希望エリアは？</p>
                <Input
                  value={form.area}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, area: event.target.value }))
                  }
                  placeholder="例: 東京都渋谷区"
                />
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3">
                <p className="text-base font-semibold text-[#1D3557]">年齢は？</p>
                <div className="space-y-2">
                  {ageOptions.map((option) => (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-3 text-sm transition-colors ${
                        form.age_range === option.value
                          ? "border-[#E63946] bg-[#E63946]/5 font-medium text-[#1D3557]"
                          : "border-neutral-200 bg-white hover:border-[#E63946]/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="age_range"
                        value={option.value}
                        checked={form.age_range === option.value}
                        onChange={() =>
                          setForm((prev) => ({ ...prev, age_range: option.value }))
                        }
                        className="h-4 w-4 accent-[#E63946]"
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <p className="text-base font-semibold text-[#1D3557]">
                    いつから始められますか？
                  </p>
                  <div className="space-y-2">
                    {timingOptions.map((option) => (
                      <label
                        key={option.value}
                        className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-3 text-sm transition-colors ${
                          form.start_timing === option.value
                            ? "border-[#E63946] bg-[#E63946]/5 font-medium text-[#1D3557]"
                            : "border-neutral-200 bg-white hover:border-[#E63946]/40"
                        }`}
                      >
                        <input
                          type="radio"
                          name="start_timing"
                          value={option.value}
                          checked={form.start_timing === option.value}
                          onChange={() =>
                            setForm((prev) => ({
                              ...prev,
                              start_timing: option.value,
                            }))
                          }
                          className="h-4 w-4 accent-[#E63946]"
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 rounded-md border border-[#F4A261]/40 bg-[#FFF9F2] p-3">
                  <div className="space-y-2">
                    <Label htmlFor="quiz-name">表示名</Label>
                    <Input
                      id="quiz-name"
                      value={form.name}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, name: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quiz-email">メールアドレス</Label>
                    <Input
                      id="quiz-email"
                      type="email"
                      value={form.email}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, email: event.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={step === 1 || submitting}
              >
                戻る
              </Button>

              <Button
                type="button"
                onClick={() => void handleNextOrSubmit()}
                disabled={!canProceed || submitting}
                className="bg-[#E63946] hover:bg-[#C62F3B]"
              >
                {step === totalSteps ? "結果を見る" : "次へ"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
