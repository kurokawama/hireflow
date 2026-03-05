"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type QuestionType = "single_select" | "multi_select" | "text_input";

type QuizOption = {
  id: string;
  option_value: string;
  option_label: string;
  sort_order: number;
};

type QuizQuestion = {
  id: string;
  question_key: string;
  question_text: string;
  question_type: QuestionType;
  sort_order: number;
  is_required: boolean;
  quiz_options: QuizOption[];
};

type QuizCampaign = {
  id: string;
  name: string;
  brand: string;
};

type QuizConfigData = {
  campaign_id?: string;
  campaign_name?: string;
  brand?: string;
  questions?: QuizQuestion[];
};

type QuizConfigResponse = {
  data?: QuizConfigData;
  campaign?: QuizCampaign;
  questions?: QuizQuestion[];
  error?: string;
};

type QuizSubmitResponse = {
  data?: { candidate_id?: string };
  error?: string;
};

type Answers = Record<string, string | string[]>;

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
  const campaignSlug = searchParams.get("campaign");

  const [campaign, setCampaign] = useState<QuizCampaign | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [step, setStep] = useState(1);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const totalSteps = questions.length;

  useEffect(() => {
    let isCancelled = false;

    const loadQuizConfig = async () => {
      setLoadingConfig(true);
      setConfigError("");

      try {
        const endpoint = campaignSlug
          ? `/api/quiz/config?campaign=${encodeURIComponent(campaignSlug)}`
          : "/api/quiz/config";
        const response = await fetch(endpoint);
        const payload = (await response.json()) as QuizConfigResponse;

        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load quiz configuration.");
        }

        const campaignId = payload.data?.campaign_id ?? payload.campaign?.id ?? "";
        const campaignName = payload.data?.campaign_name ?? payload.campaign?.name ?? "";
        const brand = payload.data?.brand ?? payload.campaign?.brand ?? "";
        const normalizedQuestions = (payload.data?.questions ?? payload.questions ?? [])
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((question) => ({
            ...question,
            quiz_options: (question.quiz_options ?? [])
              .slice()
              .sort((a, b) => a.sort_order - b.sort_order),
          }));

        if (!campaignId) {
          throw new Error("Campaign not found");
        }

        if (!isCancelled) {
          setCampaign({ id: campaignId, name: campaignName, brand });
          setQuestions(normalizedQuestions);
          setAnswers({});
          setStep(1);
        }
      } catch (loadError) {
        if (!isCancelled) {
          if (loadError instanceof Error) {
            setConfigError(loadError.message);
          } else {
            setConfigError("Unknown error.");
          }
          setCampaign(null);
          setQuestions([]);
          setAnswers({});
          setStep(1);
        }
      } finally {
        if (!isCancelled) {
          setLoadingConfig(false);
        }
      }
    };

    void loadQuizConfig();
    return () => {
      isCancelled = true;
    };
  }, [campaignSlug]);

  const currentQuestion = useMemo(
    () => questions[Math.max(step - 1, 0)] ?? null,
    [questions, step]
  );
  const progress = useMemo(
    () => (totalSteps > 0 ? (step / totalSteps) * 100 : 0),
    [step, totalSteps]
  );

  const canProceed = useMemo(() => {
    if (!currentQuestion) {
      return false;
    }
    if (!currentQuestion.is_required) {
      return true;
    }

    const answer = answers[currentQuestion.question_key];
    if (currentQuestion.question_type === "multi_select") {
      return Array.isArray(answer) && answer.length > 0;
    }
    if (currentQuestion.question_type === "text_input") {
      return typeof answer === "string" && answer.trim().length > 0;
    }
    return typeof answer === "string" && answer.length > 0;
  }, [answers, currentQuestion]);

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => prev - 1);
    }
  };

  const updateSingleSelect = (questionKey: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionKey]: value }));
  };

  const toggleMultiSelect = (questionKey: string, value: string) => {
    setAnswers((prev) => {
      const previousAnswer = prev[questionKey];
      const selectedValues = Array.isArray(previousAnswer) ? previousAnswer : [];
      const exists = selectedValues.includes(value);
      return {
        ...prev,
        [questionKey]: exists
          ? selectedValues.filter((item) => item !== value)
          : [...selectedValues, value],
      };
    });
  };

  const updateTextInput = (questionKey: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionKey]: value }));
  };

  const handleNextOrSubmit = async () => {
    if (!currentQuestion || !canProceed || submitting) {
      return;
    }

    if (step < totalSteps) {
      setStep((prev) => prev + 1);
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const response = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campaign_id: campaign?.id,
          answers,
          name: name || undefined,
          email: email || undefined,
          utm_source: searchParams.get("utm_source") ?? undefined,
          utm_medium: searchParams.get("utm_medium") ?? undefined,
          utm_campaign: searchParams.get("utm_campaign") ?? undefined,
        }),
      });

      const payload = (await response.json()) as QuizSubmitResponse;
      if (!response.ok) {
        throw new Error(payload.error ?? "Request failed.");
      }

      const candidateId = payload.data?.candidate_id;
      if (!candidateId) {
        throw new Error("Candidate ID is missing.");
      }

      router.push(`/quiz/result?id=${candidateId}`);
    } catch (submitError) {
      if (submitError instanceof Error) {
        setSubmitError(submitError.message);
      } else {
        setSubmitError("Unknown error.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuestionInput = (question: QuizQuestion) => {
    const answer = answers[question.question_key];

    if (question.question_type === "single_select") {
      return (
        <fieldset className="space-y-3">
          <legend className="text-base font-semibold text-[#1D3557]">{question.question_text}</legend>
          <div className="space-y-2">
            {question.quiz_options.map((option) => {
              const checked = answer === option.option_value;
              return (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-3 text-sm transition-colors ${
                    checked
                      ? "border-[#E63946] bg-[#E63946]/10 font-medium text-[#1D3557]"
                      : "border-neutral-200 bg-white hover:border-[#E63946]/40"
                  }`}
                >
                  <input
                    type="radio"
                    name={question.question_key}
                    value={option.option_value}
                    checked={checked}
                    onChange={() => updateSingleSelect(question.question_key, option.option_value)}
                    className="h-4 w-4 accent-[#E63946]"
                    aria-label={option.option_label}
                  />
                  <span>{option.option_label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      );
    }

    if (question.question_type === "multi_select") {
      const selectedValues = Array.isArray(answer) ? answer : [];
      return (
        <fieldset className="space-y-3">
          <legend className="text-base font-semibold text-[#1D3557]">{question.question_text}</legend>
          <div className="space-y-2">
            {question.quiz_options.map((option) => {
              const checked = selectedValues.includes(option.option_value);
              return (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-3 text-sm transition-colors ${
                    checked
                      ? "border-[#E63946] bg-[#E63946]/10 font-medium text-[#1D3557]"
                      : "border-neutral-200 bg-white hover:border-[#E63946]/40"
                  }`}
                >
                  <input
                    type="checkbox"
                    value={option.option_value}
                    checked={checked}
                    onChange={() => toggleMultiSelect(question.question_key, option.option_value)}
                    className="h-4 w-4 accent-[#E63946]"
                    aria-label={option.option_label}
                    aria-required={question.is_required}
                  />
                  <span>{option.option_label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      );
    }

    return (
      <div className="space-y-3">
        <p className="text-base font-semibold text-[#1D3557]">{question.question_text}</p>
        <Input
          value={typeof answer === "string" ? answer : ""}
          onChange={(event) => updateTextInput(question.question_key, event.target.value)}
          placeholder={question.question_key === "area" ? "例: 東京都渋谷区" : undefined}
          aria-label={question.question_text}
          aria-required={question.is_required}
        />
      </div>
    );
  };

  if (loadingConfig) {
    return (
      <div className="min-h-screen bg-neutral-50 px-4 py-6">
        <div className="mx-auto w-full max-w-md">
          <Card className="rounded-md border-[#F4A261]/30 bg-white shadow-sm">
            <CardHeader className="space-y-3">
              <div className="h-8 w-2/3 animate-pulse rounded bg-neutral-200" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-neutral-200" />
              <div className="h-2 w-full animate-pulse rounded bg-neutral-200" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-12 w-full animate-pulse rounded bg-neutral-200" />
              <div className="h-12 w-full animate-pulse rounded bg-neutral-200" />
              <div className="h-12 w-full animate-pulse rounded bg-neutral-200" />
              <p className="sr-only">読み込み中...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (configError) {
    return (
      <div className="min-h-screen bg-neutral-50 px-4 py-6">
        <div className="mx-auto w-full max-w-md">
          <Card className="rounded-md border-[#F4A261]/30 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl leading-tight text-[#1D3557]">
                あなたに合う働き方を見つけよう
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-red-600" role="alert">
                {configError}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-50 px-4 py-6">
        <div className="mx-auto w-full max-w-md">
          <Card className="rounded-md border-[#F4A261]/30 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl leading-tight text-[#1D3557]">
                あなたに合う働き方を見つけよう
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-600">No questions available.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-6">
      <div className="mx-auto w-full max-w-md">
        <Card className="rounded-md border-[#F4A261]/30 bg-white shadow-sm">
          <CardHeader className="space-y-3">
            <div>
              <CardTitle className="text-2xl leading-tight text-[#1D3557]">
                あなたに合う働き方を見つけよう
              </CardTitle>
              <p className="mt-1 text-sm text-neutral-600">
                {campaign?.name || "Dr. Stretch / Wecle"}
              </p>
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
            {currentQuestion && renderQuestionInput(currentQuestion)}

            {step === totalSteps && (
              <div className="space-y-4">
                <div className="space-y-3 rounded-md border border-[#F4A261]/40 bg-[#FFF9F2] p-3">
                  <div className="space-y-2">
                    <Label htmlFor="quiz-name">表示名</Label>
                    <Input
                      id="quiz-name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      aria-label="表示名"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quiz-email">メールアドレス</Label>
                    <Input
                      id="quiz-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      aria-label="メールアドレス"
                    />
                  </div>
                </div>
              </div>
            )}

            {submitError && (
              <p className="text-sm text-red-600" role="alert">
                {submitError}
              </p>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={step === 1 || submitting}
                aria-label="戻る"
              >
                戻る
              </Button>

              <Button
                type="button"
                onClick={() => void handleNextOrSubmit()}
                disabled={!canProceed || submitting}
                className="bg-[#E63946] hover:bg-[#C62F3B]"
                aria-label={step === totalSteps ? "結果を見る" : "次へ"}
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
