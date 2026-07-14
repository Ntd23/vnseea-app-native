export type ParsedPointsQr = {
  userId: string;
  username: string;
  points: number | null;
  legacy: boolean;
};

export function parsePositivePoints(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 && value <= 2147483647
      ? value
      : null;
  }
  if (typeof value !== 'string' || !/^[1-9][0-9]*$/.test(value)) {
    return null;
  }
  const points = Number(value);
  return Number.isSafeInteger(points) && points <= 2147483647 ? points : null;
}

export function encodePointsQrPayload(input: {
  recipientUserId: number;
  points?: number | null;
}) {
  const recipientUserId = parsePositivePoints(input.recipientUserId);
  if (!recipientUserId) {
    throw new Error('recipientUserId must be a positive integer');
  }
  const points = input.points == null ? null : parsePositivePoints(input.points);
  if (input.points != null && !points) {
    throw new Error('points must be a positive integer');
  }
  return `POINTS|to=${recipientUserId}${
    points ? `|points=${points}|amount=${points}` : ''
  }`;
}

function parseRecipient(value: unknown) {
  const normalized = String(value ?? '').trim();
  return /^[1-9][0-9]*$/.test(normalized)
    ? {userId: normalized, username: ''}
    : {userId: '', username: normalized.replace(/^@/, '')};
}

function parsePointFields(pointsValue: unknown, amountValue: unknown) {
  const hasPoints = pointsValue !== undefined && pointsValue !== null && pointsValue !== '';
  const hasAmount = amountValue !== undefined && amountValue !== null && amountValue !== '';
  if (!hasPoints && !hasAmount) {
    return null;
  }
  const points = hasPoints ? parsePositivePoints(pointsValue) : parsePositivePoints(amountValue);
  const amount = hasAmount ? parsePositivePoints(amountValue) : points;
  if (!points || !amount || points !== amount) {
    return undefined;
  }
  return points;
}

export function parsePointsQrPayload(value: string): ParsedPointsQr | null {
  const raw = String(value || '').trim().replace(/^["'`]+|["'`]+$/g, '');
  if (!raw) return null;

  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const type = String(parsed.type || '').toLowerCase();
      if (!['points', 'wallet', 'send'].includes(type)) return null;
      if (
        type === 'points' &&
        parsed.amount !== undefined &&
        (parsed.points === undefined || parsed.points === null || parsed.points === '')
      ) {
        return null;
      }
      const recipient = parseRecipient(parsed.to);
      if (!recipient.userId && !recipient.username) return null;
      const points = parsePointFields(parsed.points, parsed.amount);
      if (points === undefined) return null;
      return {...recipient, points, legacy: type !== 'points'};
    } catch {
      return null;
    }
  }

  if (!raw.includes('|')) return null;
  const parts = raw.split('|');
  const prefix = String(parts.shift() || '').toUpperCase();
  if (prefix !== 'POINTS' && prefix !== 'WALLET') return null;
  const fields = new Map<string, string>();
  parts.forEach(part => {
    const separator = part.indexOf('=');
    if (separator > 0) {
      fields.set(part.slice(0, separator).trim().toLowerCase(), part.slice(separator + 1).trim());
    }
  });
  const recipient = parseRecipient(fields.get('to'));
  if (!recipient.userId && !recipient.username) return null;
  if (prefix === 'POINTS' && fields.has('amount') && !fields.has('points')) {
    return null;
  }
  const points = parsePointFields(fields.get('points'), fields.get('amount'));
  if (points === undefined) return null;
  return {...recipient, points, legacy: prefix === 'WALLET'};
}
