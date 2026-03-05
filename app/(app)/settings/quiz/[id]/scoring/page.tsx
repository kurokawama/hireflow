"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createScoringProfile, getScoringProfile, updateScoringProfile } from "@/lib/actions/scoring-profiles";
import { getCampaignWithQuestions } from "@/lib/actions/quiz-campaigns";
import type { QuizCampaignFull, QuizQuestionWithOptions, ScoringProfile, ScoringWeights } from "@/types/quiz";

function navClass(isActive: boolean) {
  return [
    "pb-2 text-sm font-medium border-b-2 transition-colors",
    isActive
      ? "border-[#E63946] text-[#E63946]"
      : "border-transparent text-neutral-600 hover:text-neutral-900",
  ].join(" ");
}

function parseNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function questionTypeLabel(type: QuizQuestionWithOptions["question_type"]) {
  if (type === "single_select") return "single_select";
  if (type === "multi_select") return "multi_select";
  return "text_input";
}

function createDefaultWeights(campaign: QuizCampaignFull | null): ScoringWeights {
  const result: ScoringWeights = {};
  for (const question of campaign?.quiz_questions ?? []) {
    if (question.question_type === "single_select") {
      const values: Record<string, number> = {};
      for (const option of question.quiz_options ?? []) {
        values[option.option_value] = 0;
      }
      result[question.question_key] = {
        max_score: 100,
        values,
      };
      continue;
    }

    if (question.question_type === "multi_select") {
      result[question.question_key] = {
        max_score: 100,
        high_value: [],
        per_match: 0,
        base: 0,
      };
      continue;
    }

    result[question.question_key] = {
      max_score: 100,
      default: 0,
    };
  }
  return result;
}

export default function QuizScoringPage() {
  const params = useParams<{ id: string }>();
  const campaignId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [campaign, setCampaign] = useState<QuizCampaignFull | null>(null);
  const [profile, setProfile] = useState<ScoringProfile | null>(null);
  const [weights, setWeights] = useState<ScoringWeights>({});
  const [profileName, setProfileName] = useState("default");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const questions = useMemo(
    () =>
      [...(campaign?.quiz_questions ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at)
      ),
    [campaign]
  );

  const fetchData = useCallback(async () => {
    if (!campaignId) {
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const [campaignData, profileData] = await Promise.all([
        getCampaignWithQuestions(campaignId),
        getScoringProfile(campaignId),
      ]);

      setCampaign(campaignData);
      setProfile(profileData);
      setProfileName(profileData?.name ?? "default");
      setIsActive(profileData?.is_active ?? true);
      setWeights((profileData?.weights_json as ScoringWeights) ?? createDefaultWeights(campaignData));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const ensureQuestionWeight = (question: QuizQuestionWithOptions) => {
    const current = weights[question.question_key];
    if (current) {
      return current;
    }
    if (question.question_type === "single_select") {
      return { max_score: 100, values: {} };
    }
    if (question.question_type === "multi_select") {
      return { max_score: 100, high_value: [], per_match: 0, base: 0 };
    }
    return { max_score: 100, default: 0 };
  };

  const updateWeight = (
    questionKey: string,
    updater: (current: ScoringWeights[string]) => ScoringWeights[string]
  ) => {
    setWeights((prev) => ({
      ...prev,
      [questionKey]: updater(prev[questionKey] ?? { max_score: 100 }),
    }));
  };

  const handleSave = async () => {
    if (!campaignId) {
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      if (profile) {
        const updated = await updateScoringProfile(profile.id, {
          name: profileName,
          is_active: isActive,
          weights_json: weights,
        });
        setProfile(updated);
      } else {
        const created = await createScoringProfile({
          campaign_id: campaignId,
          name: profileName,
          is_active: isActive,
          weights_json: weights,
        });
        setProfile(created);
      }
      setSuccess("保存しました");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (!campaignId) {
    return <p className="text-sm text-red-600">キャンペーンIDが不正です</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-4 mb-6 border-b pb-2">
        <Link href="/settings/stores" className={navClass(false)}>
          店舗
        </Link>
        <Link href="/settings/profiles" className={navClass(false)}>
          プロフィール
        </Link>
        <Link href="/settings/members" className={navClass(false)}>
          メンバー
        </Link>
        <Link href="/settings/voices" className={navClass(false)}>
          スタッフボイス
        </Link>
        <Link href="/settings/quiz" className={navClass(true)}>
          クイズ
        </Link>
        <Link href="/settings/lists" className={navClass(false)}>
          リスト
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Link
            href={`/settings/quiz/${campaignId}`}
            className="text-sm text-neutral-600 hover:text-neutral-900"
          >
            ← キャンペーン詳細へ戻る
          </Link>
          <h1 className="text-2xl font-bold text-[#1D3557]">スコア設定</h1>
          <p className="text-sm text-neutral-600">{campaign?.name ?? "Loading..."}</p>
        </div>
        <Button
          type="button"
          className="bg-[#E63946] hover:bg-[#C62F3B]"
          onClick={() => void handleSave()}
          disabled={saving || loading}
        >
          保存
        </Button>
      </div>

      <div className="rounded-md border bg-white p-4 shadow-sm space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="profile-name">プロファイル名</Label>
            <Input
              id="profile-name"
              value={profileName}
              onChange={(event) => setProfileName(event.target.value)}
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
              />
              有効
            </label>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-700">{success}</p>}
      {loading && <p className="text-sm text-neutral-500">Loading...</p>}

      {!loading &&
        questions.map((question) => {
          const weight = ensureQuestionWeight(question);
          const valuesMap = weight.values ?? {};
          const highValueText = (weight.high_value ?? []).join(", ");

          return (
            <div key={question.id} className="rounded-md border bg-white p-4 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-neutral-500">{question.question_key}</p>
                  <p className="font-medium">{question.question_text}</p>
                </div>
                <Badge variant="outline">{questionTypeLabel(question.question_type)}</Badge>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`max-score-${question.id}`}>max_score</Label>
                <Input
                  id={`max-score-${question.id}`}
                  type="number"
                  value={weight.max_score ?? 0}
                  onChange={(event) =>
                    updateWeight(question.question_key, (current) => ({
                      ...current,
                      max_score: parseNumber(event.target.value, 0),
                    }))
                  }
                />
              </div>

              {question.question_type === "single_select" && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">value → score</p>
                  <div className="space-y-2">
                    {question.quiz_options.map((option) => (
                      <div key={option.id} className="grid gap-2 md:grid-cols-3">
                        <Input value={option.option_value} readOnly />
                        <Input value={option.option_label} readOnly />
                        <Input
                          type="number"
                          value={valuesMap[option.option_value] ?? 0}
                          onChange={(event) =>
                            updateWeight(question.question_key, (current) => ({
                              ...current,
                              values: {
                                ...(current.values ?? {}),
                                [option.option_value]: parseNumber(event.target.value, 0),
                              },
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {question.question_type === "multi_select" && (
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-2 md:col-span-3">
                    <Label htmlFor={`high-value-${question.id}`}>high_value（カンマ区切り）</Label>
                    <Input
                      id={`high-value-${question.id}`}
                      value={highValueText}
                      onChange={(event) =>
                        updateWeight(question.question_key, (current) => ({
                          ...current,
                          high_value: event.target.value
                            .split(",")
                            .map((entry) => entry.trim())
                            .filter(Boolean),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`per-match-${question.id}`}>per_match</Label>
                    <Input
                      id={`per-match-${question.id}`}
                      type="number"
                      value={weight.per_match ?? 0}
                      onChange={(event) =>
                        updateWeight(question.question_key, (current) => ({
                          ...current,
                          per_match: parseNumber(event.target.value, 0),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`base-${question.id}`}>base</Label>
                    <Input
                      id={`base-${question.id}`}
                      type="number"
                      value={weight.base ?? 0}
                      onChange={(event) =>
                        updateWeight(question.question_key, (current) => ({
                          ...current,
                          base: parseNumber(event.target.value, 0),
                        }))
                      }
                    />
                  </div>
                </div>
              )}

              {question.question_type === "text_input" && (
                <div className="space-y-2">
                  <Label htmlFor={`default-${question.id}`}>default</Label>
                  <Input
                    id={`default-${question.id}`}
                    type="number"
                    value={weight.default ?? 0}
                    onChange={(event) =>
                      updateWeight(question.question_key, (current) => ({
                        ...current,
                        default: parseNumber(event.target.value, 0),
                      }))
                    }
                  />
                </div>
              )}
            </div>
          );
        })}

      {!loading && questions.length === 0 && (
        <div className="rounded-md border bg-white p-6 text-sm text-neutral-500 shadow-sm">
          質問がありません
        </div>
      )}
    </div>
  );
}
