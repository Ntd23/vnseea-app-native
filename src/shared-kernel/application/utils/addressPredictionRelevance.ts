export type AddressPredictionLike = {
  description?: unknown;
  main_text?: unknown;
  mainText?: unknown;
  secondary_text?: unknown;
  secondaryText?: unknown;
};

const GENERIC_ADDRESS_TOKENS = new Set([
  'so',
  'ngo',
  'ngach',
  'hem',
  'duong',
  'pho',
  'phuong',
  'quan',
  'huyen',
  'xa',
  'thi',
  'tran',
  'thanh',
  'tp',
  'city',
  'ward',
  'district',
  'street',
  'road',
]);

export function normalizeAddressSearchText(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u0110\u0111]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function uniqueTokens(value: string) {
  return Array.from(new Set(value.split(' ').filter(Boolean)));
}

function tokenEditDistance(left: string, right: string) {
  if (left === right) return 0;
  if (!left) return right.length;
  if (!right) return left.length;

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = new Array<number>(right.length + 1);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost =
        left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + substitutionCost,
      );
    }

    for (let index = 0; index <= right.length; index += 1) {
      previous[index] = current[index];
    }
  }

  return previous[right.length];
}

function tokensApproximatelyMatch(queryToken: string, candidateToken: string) {
  if (queryToken === candidateToken) return true;
  if (queryToken.length < 3 || candidateToken.length < 3) return false;

  if (
    queryToken.startsWith(candidateToken) ||
    candidateToken.startsWith(queryToken)
  ) {
    return true;
  }

  const maxLength = Math.max(queryToken.length, candidateToken.length);
  const allowedDistance = maxLength >= 8 ? 2 : 1;
  if (Math.abs(queryToken.length - candidateToken.length) > allowedDistance) {
    return false;
  }

  return tokenEditDistance(queryToken, candidateToken) <= allowedDistance;
}

export function isAddressPredictionRelevant(
  query: string,
  prediction: AddressPredictionLike,
) {
  const normalizedQuery = normalizeAddressSearchText(query);
  if (!normalizedQuery) return false;

  const normalizedCandidate = normalizeAddressSearchText([
    prediction.description,
    prediction.main_text,
    prediction.mainText,
    prediction.secondary_text,
    prediction.secondaryText,
  ].filter(Boolean).join(' '));
  if (!normalizedCandidate) return false;
  if (normalizedCandidate.includes(normalizedQuery)) return true;

  const queryTokens = uniqueTokens(normalizedQuery);
  const candidateTokens = uniqueTokens(normalizedCandidate);
  const candidateTokenSet = new Set(candidateTokens);
  const numberTokens = queryTokens.filter(token => /^\d+[a-z]?$/.test(token));

  // A house/alley number is the strongest address signal. Returning a place
  // with a different number is more confusing than returning no suggestion.
  if (numberTokens.some(token => !candidateTokenSet.has(token))) {
    return false;
  }

  const nameTokens = queryTokens.filter(
    token =>
      !/^\d+[a-z]?$/.test(token) &&
      !GENERIC_ADDRESS_TOKENS.has(token) &&
      token.length >= 2,
  );
  if (nameTokens.length === 0) return numberTokens.length > 0;

  const matchedNames = nameTokens.filter(queryToken =>
    candidateTokens.some(candidateToken =>
      tokensApproximatelyMatch(queryToken, candidateToken),
    ),
  );
  const requiredMatches =
    nameTokens.length <= 2 ? nameTokens.length : Math.max(2, Math.ceil(nameTokens.length * 0.6));

  return matchedNames.length >= requiredMatches;
}

export function filterAddressPredictions<T extends AddressPredictionLike>(
  query: string,
  predictions: T[],
) {
  return predictions.filter(prediction =>
    isAddressPredictionRelevant(query, prediction),
  );
}
