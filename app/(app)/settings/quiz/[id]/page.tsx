"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { Textarea } from "@/components/ui/textarea";
import { createOption, createQuestion, deleteOption, deleteQuestion, updateOption, updateQuestion } from "@/lib/actions/quiz-questions";
import { getCampaignWithQuestions } from "@/lib/actions/quiz-campaigns";
import type { QuizCampaignFull, QuizOption, QuizQuestionWithOptions } from "@/types/quiz";
import type { CreateOptionRequest, CreateQuestionRequest } from "@/types/quiz-dto";

type LocalQuestionForm = Omit<CreateQuestionRequest, "campaign_id">;
type LocalOptionForm = Omit<CreateOptionRequest, "question_id">;

const initialQuestionForm: LocalQuestionForm = {
  question_key: "",
  question_text: "",
  question_type: "single_select",
  sort_order: 1,
  is_required: true,
};

const initialOptionForm: LocalOptionForm = {
  option_value: "",
  option_label: "",
  sort_order: 1,
};

function navClass(isActive: boolean) {
  return [
    "pb-2 text-sm font-medium border-b-2 transition-colors",
    isActive
      ? "border-[#E63946] text-[#E63946]"
      : "border-transparent text-neutral-600 hover:text-neutral-900",
  ].join(" ");
}

function typeBadgeLabel(type: QuizQuestionWithOptions["question_type"]) {
  if (type === "single_select") return "単一選択";
  if (type === "multi_select") return "複数選択";
  return "テキスト";
}

export default function QuizCampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const campaignId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [campaign, setCampaign] = useState<QuizCampaignFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);
  const [questionForm, setQuestionForm] = useState<LocalQuestionForm>(initialQuestionForm);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [questionEditForm, setQuestionEditForm] = useState<LocalQuestionForm>(initialQuestionForm);
  const [optionForms, setOptionForms] = useState<Record<string, LocalOptionForm>>({});
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
  const [optionEditForm, setOptionEditForm] = useState<LocalOptionForm>(initialOptionForm);
  const [editingOptionQuestionId, setEditingOptionQuestionId] = useState<string | null>(null);

  const questions = useMemo(
    () =>
      [...(campaign?.quiz_questions ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at)
      ),
    [campaign]
  );

  const fetchCampaign = useCallback(async () => {
    if (!campaignId) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await getCampaignWithQuestions(campaignId);
      setCampaign(data);
      setQuestionForm((prev) => ({
        ...prev,
        sort_order: (data?.quiz_questions?.length ?? 0) + 1,
      }));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void fetchCampaign();
  }, [fetchCampaign]);

  const handleAddQuestion = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!campaignId) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createQuestion({
        campaign_id: campaignId,
        ...questionForm,
      });
      setQuestionForm({
        ...initialQuestionForm,
        sort_order: questions.length + 2,
      });
      setIsAddQuestionOpen(false);
      await fetchCampaign();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "質問の追加に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const openEditQuestion = (question: QuizQuestionWithOptions) => {
    setEditingQuestionId(question.id);
    setQuestionEditForm({
      question_key: question.question_key,
      question_text: question.question_text,
      question_type: question.question_type,
      sort_order: question.sort_order,
      is_required: question.is_required,
    });
  };

  const handleUpdateQuestion = async () => {
    if (!editingQuestionId) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateQuestion(editingQuestionId, questionEditForm);
      setEditingQuestionId(null);
      setQuestionEditForm(initialQuestionForm);
      await fetchCampaign();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "質問の更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    const confirmed = window.confirm("この質問を削除しますか？");
    if (!confirmed) {
      return;
    }
    setError("");
    try {
      await deleteQuestion(questionId);
      await fetchCampaign();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "質問の削除に失敗しました");
    }
  };

  const handleOptionFormChange = (
    questionId: string,
    key: keyof LocalOptionForm,
    value: string | number
  ) => {
    setOptionForms((prev) => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] ?? initialOptionForm),
        [key]: value,
      },
    }));
  };

  const handleAddOption = async (questionId: string) => {
    const form = optionForms[questionId] ?? initialOptionForm;
    if (!form.option_value || !form.option_label) {
      setError("選択肢の値とラベルを入力してください");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createOption({
        question_id: questionId,
        option_value: form.option_value,
        option_label: form.option_label,
        sort_order: Number(form.sort_order) || 1,
      });
      setOptionForms((prev) => ({
        ...prev,
        [questionId]: {
          ...initialOptionForm,
          sort_order: (form.sort_order || 1) + 1,
        },
      }));
      await fetchCampaign();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "選択肢の追加に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const openEditOption = (questionId: string, option: QuizOption) => {
    setEditingOptionId(option.id);
    setEditingOptionQuestionId(questionId);
    setOptionEditForm({
      option_value: option.option_value,
      option_label: option.option_label,
      sort_order: option.sort_order,
    });
  };

  const handleUpdateOption = async () => {
    if (!editingOptionId) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateOption(editingOptionId, {
        option_value: optionEditForm.option_value,
        option_label: optionEditForm.option_label,
        sort_order: optionEditForm.sort_order,
      });
      setEditingOptionId(null);
      setEditingOptionQuestionId(null);
      setOptionEditForm(initialOptionForm);
      await fetchCampaign();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "選択肢の更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOption = async (optionId: string) => {
    const confirmed = window.confirm("この選択肢を削除しますか？");
    if (!confirmed) {
      return;
    }
    setError("");
    try {
      await deleteOption(optionId);
      await fetchCampaign();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "選択肢の削除に失敗しました");
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Link href="/settings/quiz" className="text-sm text-neutral-600 hover:text-neutral-900">
            ← クイズ一覧へ戻る
          </Link>
          <h1 className="text-2xl font-bold text-[#1D3557]">クイズ詳細</h1>
          <p className="text-sm text-neutral-600">{campaign?.name ?? "Loading..."}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/settings/quiz/${campaignId}/scoring`}>
            <Button variant="outline">スコア設定</Button>
          </Link>
          <Dialog
            open={isAddQuestionOpen}
            onOpenChange={(open) => {
              setIsAddQuestionOpen(open);
              if (!open) {
                setQuestionForm({
                  ...initialQuestionForm,
                  sort_order: questions.length + 1,
                });
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-[#E63946] hover:bg-[#C62F3B]">質問追加</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>質問追加</DialogTitle>
              </DialogHeader>
              <form className="space-y-4" onSubmit={handleAddQuestion}>
                <div className="space-y-2">
                  <Label htmlFor="question-key">question_key</Label>
                  <Input
                    id="question-key"
                    value={questionForm.question_key}
                    onChange={(event) =>
                      setQuestionForm((prev) => ({
                        ...prev,
                        question_key: event.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="question-text">question_text</Label>
                  <Textarea
                    id="question-text"
                    value={questionForm.question_text}
                    onChange={(event) =>
                      setQuestionForm((prev) => ({
                        ...prev,
                        question_text: event.target.value,
                      }))
                    }
                    required
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="question-type">question_type</Label>
                  <Select
                    value={questionForm.question_type}
                    onValueChange={(value: QuizQuestionWithOptions["question_type"]) =>
                      setQuestionForm((prev) => ({ ...prev, question_type: value }))
                    }
                  >
                    <SelectTrigger id="question-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single_select">single_select</SelectItem>
                      <SelectItem value="multi_select">multi_select</SelectItem>
                      <SelectItem value="text_input">text_input</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="question-sort-order">sort_order</Label>
                  <Input
                    id="question-sort-order"
                    type="number"
                    value={questionForm.sort_order}
                    onChange={(event) =>
                      setQuestionForm((prev) => ({
                        ...prev,
                        sort_order: Number(event.target.value) || 1,
                      }))
                    }
                    required
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(questionForm.is_required)}
                    onChange={(event) =>
                      setQuestionForm((prev) => ({
                        ...prev,
                        is_required: event.target.checked,
                      }))
                    }
                  />
                  必須
                </label>
                <Button
                  type="submit"
                  className="w-full bg-[#E63946] hover:bg-[#C62F3B]"
                  disabled={saving}
                >
                  追加
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading && <p className="text-sm text-neutral-500">Loading...</p>}

      {!loading && !campaign && (
        <div className="rounded-md border bg-white p-6 text-sm text-neutral-500 shadow-sm">
          キャンペーンが見つかりません
        </div>
      )}

      {!loading &&
        campaign &&
        questions.map((question) => {
          const sortedOptions = [...question.quiz_options].sort(
            (a, b) => a.sort_order - b.sort_order
          );
          const optionForm = optionForms[question.id] ?? initialOptionForm;

          return (
            <div key={question.id} className="rounded-md border bg-white p-4 shadow-sm space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <p className="text-sm text-neutral-500">#{question.sort_order}</p>
                  <p className="font-medium">{question.question_text}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{typeBadgeLabel(question.question_type)}</Badge>
                    {question.is_required ? (
                      <Badge className="border-transparent bg-[#E63946]/10 text-[#E63946]">
                        必須
                      </Badge>
                    ) : (
                      <Badge variant="outline">任意</Badge>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openEditQuestion(question)}
                  >
                    編集
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => void handleDeleteQuestion(question.id)}
                  >
                    削除
                  </Button>
                </div>
              </div>

              {editingQuestionId === question.id && (
                <div className="rounded-md border bg-neutral-50 p-3 space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`edit-key-${question.id}`}>question_key</Label>
                      <Input
                        id={`edit-key-${question.id}`}
                        value={questionEditForm.question_key}
                        onChange={(event) =>
                          setQuestionEditForm((prev) => ({
                            ...prev,
                            question_key: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`edit-sort-${question.id}`}>sort_order</Label>
                      <Input
                        id={`edit-sort-${question.id}`}
                        type="number"
                        value={questionEditForm.sort_order}
                        onChange={(event) =>
                          setQuestionEditForm((prev) => ({
                            ...prev,
                            sort_order: Number(event.target.value) || 1,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`edit-text-${question.id}`}>question_text</Label>
                    <Textarea
                      id={`edit-text-${question.id}`}
                      value={questionEditForm.question_text}
                      onChange={(event) =>
                        setQuestionEditForm((prev) => ({
                          ...prev,
                          question_text: event.target.value,
                        }))
                      }
                      rows={2}
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`edit-type-${question.id}`}>question_type</Label>
                      <Select
                        value={questionEditForm.question_type}
                        onValueChange={(value: QuizQuestionWithOptions["question_type"]) =>
                          setQuestionEditForm((prev) => ({ ...prev, question_type: value }))
                        }
                      >
                        <SelectTrigger id={`edit-type-${question.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single_select">single_select</SelectItem>
                          <SelectItem value="multi_select">multi_select</SelectItem>
                          <SelectItem value="text_input">text_input</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={Boolean(questionEditForm.is_required)}
                          onChange={(event) =>
                            setQuestionEditForm((prev) => ({
                              ...prev,
                              is_required: event.target.checked,
                            }))
                          }
                        />
                        必須
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="bg-[#E63946] hover:bg-[#C62F3B]"
                      onClick={() => void handleUpdateQuestion()}
                      disabled={saving}
                    >
                      保存
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingQuestionId(null)}
                    >
                      キャンセル
                    </Button>
                  </div>
                </div>
              )}

              <details className="rounded-md border bg-neutral-50 p-3">
                <summary className="cursor-pointer text-sm font-medium">選択肢 ({sortedOptions.length})</summary>
                <div className="mt-3 space-y-3">
                  {question.question_type === "text_input" ? (
                    <p className="text-sm text-neutral-500">text_input には選択肢は不要です</p>
                  ) : (
                    <>
                      {sortedOptions.map((option) => (
                        <div
                          key={option.id}
                          className="rounded-md border bg-white px-3 py-2 text-sm"
                        >
                          {editingOptionId === option.id &&
                          editingOptionQuestionId === question.id ? (
                            <div className="grid gap-2 md:grid-cols-4">
                              <Input
                                value={optionEditForm.option_value}
                                onChange={(event) =>
                                  setOptionEditForm((prev) => ({
                                    ...prev,
                                    option_value: event.target.value,
                                  }))
                                }
                                placeholder="option_value"
                              />
                              <Input
                                value={optionEditForm.option_label}
                                onChange={(event) =>
                                  setOptionEditForm((prev) => ({
                                    ...prev,
                                    option_label: event.target.value,
                                  }))
                                }
                                placeholder="option_label"
                              />
                              <Input
                                type="number"
                                value={optionEditForm.sort_order}
                                onChange={(event) =>
                                  setOptionEditForm((prev) => ({
                                    ...prev,
                                    sort_order: Number(event.target.value) || 1,
                                  }))
                                }
                                placeholder="sort_order"
                              />
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  className="bg-[#E63946] hover:bg-[#C62F3B]"
                                  onClick={() => void handleUpdateOption()}
                                  disabled={saving}
                                >
                                  保存
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingOptionId(null);
                                    setEditingOptionQuestionId(null);
                                  }}
                                >
                                  戻す
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="font-medium">{option.option_label}</p>
                                <p className="text-xs text-neutral-500">
                                  value: {option.option_value} / sort: {option.sort_order}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditOption(question.id, option)}
                                >
                                  編集
                                </Button>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => void handleDeleteOption(option.id)}
                                >
                                  削除
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      <div className="rounded-md border bg-white p-3">
                        <p className="mb-2 text-sm font-medium">選択肢を追加</p>
                        <div className="grid gap-2 md:grid-cols-4">
                          <Input
                            placeholder="option_value"
                            value={optionForm.option_value}
                            onChange={(event) =>
                              handleOptionFormChange(question.id, "option_value", event.target.value)
                            }
                          />
                          <Input
                            placeholder="option_label"
                            value={optionForm.option_label}
                            onChange={(event) =>
                              handleOptionFormChange(question.id, "option_label", event.target.value)
                            }
                          />
                          <Input
                            type="number"
                            placeholder="sort_order"
                            value={optionForm.sort_order}
                            onChange={(event) =>
                              handleOptionFormChange(
                                question.id,
                                "sort_order",
                                Number(event.target.value) || 1
                              )
                            }
                          />
                          <Button
                            type="button"
                            className="bg-[#E63946] hover:bg-[#C62F3B]"
                            onClick={() => void handleAddOption(question.id)}
                            disabled={saving}
                          >
                            追加
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </details>
            </div>
          );
        })}
    </div>
  );
}
