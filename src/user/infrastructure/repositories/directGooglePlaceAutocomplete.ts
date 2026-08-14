import type {
  MapPlacePrediction,
  MapPlacePredictionsInput,
} from '../../domain/types/user.types';

type GoogleAutocompletePrediction = {
  place_id?: string;
  description?: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
  types?: unknown[];
};

type GoogleAutocompleteResponse = {
  status?: string;
  predictions?: GoogleAutocompletePrediction[];
};

type DirectGoogleAutocompleteOptions = {
  headers?: Record<string, string>;
  timeoutMs?: number;
};

const DEFAULT_DIRECT_AUTOCOMPLETE_TIMEOUT_MS = 1400;

function hasValidOrigin(input: MapPlacePredictionsInput) {
  return (
    typeof input.lat === 'number' &&
    Number.isFinite(input.lat) &&
    typeof input.lng === 'number' &&
    Number.isFinite(input.lng)
  );
}

export function buildDirectGoogleAutocompleteParams(
  input: MapPlacePredictionsInput,
  apiKey: string,
) {
  const params = new URLSearchParams({
    input: input.query.trim(),
    components: 'country:vn',
    language: 'vi',
    key: apiKey,
  });

  if (hasValidOrigin(input)) {
    // Google treats location + radius as a ranking bias unless strictbounds is
    // supplied. Keep the nationwide search open while surfacing nearby places
    // first.
    params.set('location', `${input.lat},${input.lng}`);
    if (
      typeof input.radius === 'number' &&
      Number.isFinite(input.radius) &&
      input.radius > 0
    ) {
      params.set('radius', String(input.radius));
    }
  }

  return params;
}

function mapDirectPrediction(
  prediction: GoogleAutocompletePrediction,
): MapPlacePrediction | null {
  const placeId = String(prediction.place_id ?? '').trim();
  const description = String(prediction.description ?? '').trim();
  if (!placeId || !description) return null;

  const formatting = prediction.structured_formatting;
  return {
    source: 'google',
    placeId,
    description,
    mainText: String(formatting?.main_text || description),
    secondaryText: String(formatting?.secondary_text || '') || undefined,
    types: Array.isArray(prediction.types)
      ? prediction.types.map(String).filter(Boolean)
      : undefined,
  };
}

export function mergeMapPlacePredictions(
  fastPredictions: MapPlacePrediction[],
  enrichedPredictions: MapPlacePrediction[],
) {
  const enrichedById = new Map(
    enrichedPredictions.map(prediction => [prediction.placeId, prediction]),
  );
  const merged: MapPlacePrediction[] = [];
  const seen = new Set<string>();

  fastPredictions.forEach(prediction => {
    if (seen.has(prediction.placeId)) return;
    seen.add(prediction.placeId);
    merged.push(enrichedById.get(prediction.placeId) ?? prediction);
  });

  enrichedPredictions.forEach(prediction => {
    if (seen.has(prediction.placeId)) return;
    seen.add(prediction.placeId);
    merged.push(prediction);
  });

  return merged;
}

export async function getDirectGooglePlacePredictions(
  input: MapPlacePredictionsInput,
  apiKey: string,
  options: DirectGoogleAutocompleteOptions = {},
) {
  if (!apiKey || input.query.trim().length < 1 || input.signal?.aborted) {
    return [];
  }

  const controller = new AbortController();
  const abortRequest = () => controller.abort();
  input.signal?.addEventListener('abort', abortRequest, { once: true });
  if (input.signal?.aborted) controller.abort();
  const timeout = setTimeout(
    abortRequest,
    options.timeoutMs ?? DEFAULT_DIRECT_AUTOCOMPLETE_TIMEOUT_MS,
  );

  try {
    const params = buildDirectGoogleAutocompleteParams(input, apiKey);
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`,
      {
        signal: controller.signal,
        headers: options.headers,
      },
    );
    if (!response.ok) return [];

    const data = (await response.json()) as GoogleAutocompleteResponse;
    if (data.status !== 'OK') return [];

    return (data.predictions ?? [])
      .map(mapDirectPrediction)
      .filter(Boolean) as MapPlacePrediction[];
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
    input.signal?.removeEventListener('abort', abortRequest);
  }
}
