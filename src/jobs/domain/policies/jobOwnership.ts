import type { JobsItem } from '../types/jobs.types';

function normalizedId(value: string | number | null | undefined): string {
  const id = String(value ?? '').trim();
  return id !== '' && id !== '0' ? id : '';
}

export function isJobOwnedByUser(
  job: JobsItem,
  currentUserId: string | number | null | undefined,
): boolean {
  const viewerId = normalizedId(currentUserId);
  if (!viewerId) return false;

  return (
    Boolean(job.page?.is_page_onwer) ||
    normalizedId(job.user_id) === viewerId ||
    normalizedId(job.page?.user_id) === viewerId
  );
}
