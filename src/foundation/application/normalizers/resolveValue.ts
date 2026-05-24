// Description: Resolves primitive raw API values without leaking transport quirks into contexts.
import type { RawRecord, EntityId } from '../../domain/types/foundation.types';

export function asRecord(value: unknown): RawRecord | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as RawRecord;
  }

  return undefined;
}

export function asString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

export function asEntityId(value: unknown): EntityId | undefined {
  return asString(value);
}

export function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

export function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    if (value === 1) {
      return true;
    }

    if (value === 0) {
      return false;
    }
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (['1', 'true', 'yes', 'on'].includes(normalized)) {
      return true;
    }

    if (['0', 'false', 'no', 'off'].includes(normalized)) {
      return false;
    }
  }

  return undefined;
}

export function firstValue(record: RawRecord, keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) {
      return record[key];
    }
  }

  return undefined;
}

export function firstString(
  record: RawRecord,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = asString(record[key]);

    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

export function firstEntityId(
  record: RawRecord,
  keys: string[],
): EntityId | undefined {
  for (const key of keys) {
    const value = asEntityId(record[key]);

    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

export function firstBoolean(
  record: RawRecord,
  keys: string[],
): boolean | undefined {
  for (const key of keys) {
    const value = asBoolean(record[key]);

    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}
