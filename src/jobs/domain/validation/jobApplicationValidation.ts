import type { AppLanguage } from '../../../shared-kernel/infrastructure/storage/languageStorage';
import type {
  JobApplicationDraft,
  JobApplicationPayload,
  JobQuestion,
} from '../types/jobs.types';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_ALLOWED = /^\+?[\d\s().-]+$/;

function normalizePhone(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || !PHONE_ALLOWED.test(trimmed)) return null;
  const normalized = trimmed.replace(/[\s().-]/g, '');
  const digits = normalized.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15 ? normalized : null;
}

export type JobApplicationValidationResult =
  | { ok: true; value: JobApplicationPayload }
  | { ok: false; errors: Record<string, string> };

export function validateJobApplication(
  draft: JobApplicationDraft,
  questions: JobQuestion[],
  language: AppLanguage,
): JobApplicationValidationResult {
  const errors: Record<string, string> = {};
  const required = language === 'vi' ? 'Trường này là bắt buộc.' : 'This field is required.';
  const userName = draft.userName.trim();
  const phoneNumber = normalizePhone(draft.phoneNumber);
  const email = draft.email.trim().toLowerCase();
  const location = draft.location.trim();

  if (!userName) errors.userName = required;
  if (!phoneNumber) {
    errors.phoneNumber = language === 'vi'
      ? 'Số điện thoại phải có từ 8 đến 15 chữ số.'
      : 'Phone number must contain 8 to 15 digits.';
  }
  if (!EMAIL_PATTERN.test(email)) {
    errors.email = language === 'vi' ? 'Email không hợp lệ.' : 'Email is invalid.';
  }
  if (!location) errors.location = required;

  const answers = { ...draft.answers };
  questions.forEach(question => {
    const answer = String(answers[question.key] ?? '').trim();
    const valid = question.type === 'yes_no_question'
      ? answer === 'yes' || answer === 'no'
      : question.type === 'multiple_choice_question'
        ? question.options.some(option => option.value === answer)
        : answer.length > 0;
    if (!valid) {
      errors[`question_${question.key}`] = required;
    } else {
      answers[question.key] = answer;
    }
  });

  if (Object.keys(errors).length > 0 || !phoneNumber) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      userName,
      phoneNumber,
      email,
      location,
      position: draft.position.trim(),
      workplace: draft.workplace.trim(),
      experienceDescription: draft.experienceDescription.trim(),
      experienceStartDate: draft.experienceStartDate.trim(),
      experienceEndDate: draft.currentlyWork
        ? ''
        : draft.experienceEndDate.trim(),
      currentlyWork: draft.currentlyWork,
      answers,
    },
  };
}
