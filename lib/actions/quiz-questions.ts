"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/authz";
import type { QuizQuestion, QuizOption } from "@/types/quiz";
import type {
  CreateQuestionRequest,
  UpdateQuestionRequest,
  CreateOptionRequest,
  UpdateOptionRequest,
} from "@/types/quiz-dto";

// --- Questions ---

export async function createQuestion(
  input: CreateQuestionRequest
): Promise<QuizQuestion> {
  await requireAuth();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("quiz_questions")
    .insert({
      campaign_id: input.campaign_id,
      question_key: input.question_key,
      question_text: input.question_text,
      question_type: input.question_type,
      sort_order: input.sort_order,
      is_required: input.is_required ?? true,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateQuestion(
  questionId: string,
  input: UpdateQuestionRequest
): Promise<QuizQuestion> {
  await requireAuth();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("quiz_questions")
    .update(input)
    .eq("id", questionId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteQuestion(questionId: string): Promise<void> {
  await requireAuth();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("quiz_questions")
    .delete()
    .eq("id", questionId);

  if (error) throw new Error(error.message);
}

export async function reorderQuestions(
  updates: Array<{ id: string; sort_order: number }>
): Promise<void> {
  await requireAuth();
  const supabase = createAdminClient();

  for (const { id, sort_order } of updates) {
    const { error } = await supabase
      .from("quiz_questions")
      .update({ sort_order })
      .eq("id", id);

    if (error) throw new Error(error.message);
  }
}

// --- Options ---

export async function createOption(
  input: CreateOptionRequest
): Promise<QuizOption> {
  await requireAuth();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("quiz_options")
    .insert({
      question_id: input.question_id,
      option_value: input.option_value,
      option_label: input.option_label,
      sort_order: input.sort_order,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateOption(
  optionId: string,
  input: UpdateOptionRequest
): Promise<QuizOption> {
  await requireAuth();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("quiz_options")
    .update(input)
    .eq("id", optionId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteOption(optionId: string): Promise<void> {
  await requireAuth();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("quiz_options")
    .delete()
    .eq("id", optionId);

  if (error) throw new Error(error.message);
}
