import type {
  JobQuestion,
  JobQuestionKey,
  JobQuestionType,
} from '../../domain/types/jobs.types';

const QUESTION_KEYS: JobQuestionKey[] = ['one', 'two', 'three'];
const QUESTION_TYPES = new Set<JobQuestionType>([
  'free_text_question',
  'yes_no_question',
  'multiple_choice_question',
]);

function parseOptions(value: unknown): Array<{ value: string; label: string }> {
  let source = value;
  if (typeof source === 'string') {
    try {
      source = JSON.parse(source);
    } catch {
      return [];
    }
  }

  if (!source || typeof source !== 'object') return [];
  return Object.entries(source as Record<string, unknown>)
    .map(([key, label]) => ({
      value: key,
      label: String(label ?? '').trim(),
    }))
    .filter(option => option.label.length > 0);
}

export function mapJobQuestions(
  raw: Record<string, unknown>,
): JobQuestion[] {
  return QUESTION_KEYS.flatMap(key => {
    const prompt = String(raw[`question_${key}`] ?? '').trim();
    const typeValue = String(raw[`question_${key}_type`] ?? '').trim();
    if (!prompt || !QUESTION_TYPES.has(typeValue as JobQuestionType)) {
      return [];
    }

    const type = typeValue as JobQuestionType;
    return [{
      key,
      prompt,
      type,
      options:
        type === 'multiple_choice_question'
          ? parseOptions(raw[`question_${key}_answers`])
          : [],
    }];
  });
}
