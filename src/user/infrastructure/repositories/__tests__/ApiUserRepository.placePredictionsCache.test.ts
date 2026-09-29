// Description: Verifies map search predictions are cached only when the backend supplied coordinates.
const mockPost = jest.fn();

jest.mock('../../../../shared-kernel/infrastructure/api/apiBridge', () => ({
  apiBridge: {
    get: jest.fn(),
    multipart: jest.fn(),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

jest.mock('../../../../shared-kernel/infrastructure/config/env', () => ({
  apiConfig: {
    webBaseUrl: 'https://vnseea.example',
    mediaBaseUrl: 'https://cdn.vnseea.example',
    googleMapsApiKey: 'test-key',
    googleMapsAndroidPackage: '',
    googleMapsAndroidCertSha1: '',
  },
}));

jest.mock('../../../../shared-kernel/infrastructure/storage/sessionStorage', () => ({
  sessionStorage: { getSession: jest.fn(() => ({ userId: '42' })) },
}));

import { createUserRepository } from '../ApiUserRepository';

const origin = { lat: 10.7769, lng: 106.7009 };
const mockFetch = jest.fn();

function directAutocompleteResponse(placeId: string, name: string) {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        status: 'OK',
        predictions: [
          {
            place_id: placeId,
            description: `${name}, Quận 1`,
            structured_formatting: { main_text: name, secondary_text: 'Quận 1' },
          },
        ],
      }),
  };
}

function backendPlace(placeId: string, name: string) {
  return {
    place_id: placeId,
    description: `${name}, Quận 1`,
    main_text: name,
    secondary_text: 'Quận 1',
    lat: 10.777,
    lng: 106.701,
  };
}

function backendCalls() {
  return mockPost.mock.calls.filter(
    ([, payload]) => (payload as { type?: string })?.type === 'place_autocomplete',
  ).length;
}

const typeaheadInput = (query: string) => ({
  query,
  ...origin,
  radius: 5000,
  fast: true,
  globalSearch: true,
});

const committedInput = (query: string) => ({
  ...typeaheadInput(query),
  radius: 20000,
});

describe('ApiUserRepository place prediction cache', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockFetch.mockReset();
    (globalThis as { fetch?: unknown }).fetch = mockFetch;
  });

  it('asks the backend again when the previous backend request failed', async () => {
    mockFetch.mockResolvedValue(directAutocompleteResponse('cafe-1', 'Cafe Một'));
    mockPost
      .mockRejectedValueOnce(new Error('Too many map requests.'))
      .mockResolvedValueOnce({ predictions: [backendPlace('cafe-1', 'Cafe Một')] });

    const repository = createUserRepository();
    const typeahead = await repository.getPlacePredictions(typeaheadInput('cafe'));
    const committed = await repository.getPlacePredictions(committedInput('cafe'));

    expect(typeahead[0].lat).toBeUndefined();
    expect(backendCalls()).toBe(2);
    expect(committed[0]).toMatchObject({ placeId: 'cafe-1', lat: 10.777, lng: 106.701 });
  });

  it('does not cache a list when the backend returned no places', async () => {
    mockFetch.mockResolvedValue(directAutocompleteResponse('tea-1', 'Trà Một'));
    mockPost.mockResolvedValue({ predictions: [] });

    const repository = createUserRepository();
    await repository.getPlacePredictions(typeaheadInput('tra sua'));
    await repository.getPlacePredictions(typeaheadInput('tra sua'));

    expect(backendCalls()).toBe(2);
  });

  it('reuses a complete list for typeahead but refetches for an explicit search', async () => {
    mockFetch.mockResolvedValue(directAutocompleteResponse('pho-1', 'Phở Một'));
    mockPost.mockResolvedValue({ predictions: [backendPlace('pho-1', 'Phở Một')] });

    const repository = createUserRepository();
    await repository.getPlacePredictions(typeaheadInput('pho'));
    await repository.getPlacePredictions(typeaheadInput('pho'));
    expect(backendCalls()).toBe(1);

    await repository.getPlacePredictions({
      ...committedInput('pho'),
      revalidate: true,
    });
    expect(backendCalls()).toBe(2);
  });

  it('pins cached places at once while an explicit search revalidates them', async () => {
    mockFetch.mockResolvedValue(directAutocompleteResponse('lau-1', 'Lẩu Một'));
    mockPost.mockResolvedValueOnce({
      predictions: [backendPlace('lau-1', 'Lẩu Một')],
    });
    const repository = createUserRepository();
    await repository.getPlacePredictions(typeaheadInput('lau'));

    mockPost.mockReturnValueOnce(new Promise(() => undefined));
    const onPartialPredictions = jest.fn();
    repository
      .getPlacePredictions({
        ...committedInput('lau'),
        revalidate: true,
        onPartialPredictions,
      })
      .catch(() => undefined);

    expect(onPartialPredictions).toHaveBeenCalledWith([
      expect.objectContaining({ placeId: 'lau-1', lat: 10.777, lng: 106.701 }),
    ]);
  });

  it('keeps cached coordinates when revalidation cannot reach the backend', async () => {
    mockFetch.mockResolvedValue(directAutocompleteResponse('nem-1', 'Nem Một'));
    mockPost
      .mockResolvedValueOnce({ predictions: [backendPlace('nem-1', 'Nem Một')] })
      .mockRejectedValueOnce(new Error('Network Error'));
    const repository = createUserRepository();
    await repository.getPlacePredictions(typeaheadInput('nem'));

    await expect(
      repository.getPlacePredictions({
        ...committedInput('nem'),
        revalidate: true,
      }),
    ).resolves.toEqual([
      expect.objectContaining({ placeId: 'nem-1', lat: 10.777, lng: 106.701 }),
    ]);
  });

  it('reuses the typeahead backend request that is still running when Search is pressed', async () => {
    mockFetch.mockResolvedValue(directAutocompleteResponse('xoi-1', 'Xôi Một'));
    let respond!: (value: unknown) => void;
    mockPost.mockReturnValue(
      new Promise(resolve => {
        respond = resolve;
      }),
    );
    const repository = createUserRepository();
    const typing = new AbortController();

    const typeahead = repository.getPlacePredictions({
      ...typeaheadInput('xoi'),
      signal: typing.signal,
    });
    await Promise.resolve();
    expect(backendCalls()).toBe(1);

    // The view-model aborts the typeahead as the explicit search starts.
    typing.abort();
    const committed = repository.getPlacePredictions({
      ...committedInput('xoi'),
      revalidate: true,
    });
    await new Promise<void>(resolve => setTimeout(() => resolve(), 5));
    respond({ predictions: [backendPlace('xoi-1', 'Xôi Một')] });

    await expect(committed).resolves.toEqual([
      expect.objectContaining({ placeId: 'xoi-1', lat: 10.777 }),
    ]);
    await typeahead.catch(() => undefined);
    expect(backendCalls()).toBe(1);
    const sharedSignal = (mockPost.mock.calls[0][2] as { signal: AbortSignal })
      .signal;
    expect(sharedSignal.aborted).toBe(false);
  });

  it('skips the backend when typing continues during the idle delay', async () => {
    jest.useFakeTimers();
    try {
      mockFetch.mockResolvedValue(directAutocompleteResponse('bun-1', 'Bún Một'));
      mockPost.mockResolvedValue({ predictions: [backendPlace('bun-1', 'Bún Một')] });
      const controller = new AbortController();

      const repository = createUserRepository();
      const request = repository.getPlacePredictions({
        ...typeaheadInput('bun'),
        backendDelayMs: 300,
        signal: controller.signal,
      });
      await jest.advanceTimersByTimeAsync(100);
      controller.abort();
      await jest.advanceTimersByTimeAsync(300);
      await request;

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(backendCalls()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it('calls the backend once typing has paused for the idle delay', async () => {
    jest.useFakeTimers();
    try {
      mockFetch.mockResolvedValue(directAutocompleteResponse('com-1', 'Cơm Một'));
      mockPost.mockResolvedValue({ predictions: [backendPlace('com-1', 'Cơm Một')] });

      const repository = createUserRepository();
      const request = repository.getPlacePredictions({
        ...typeaheadInput('com tam'),
        backendDelayMs: 300,
      });
      await jest.advanceTimersByTimeAsync(299);
      expect(backendCalls()).toBe(0);
      await jest.advanceTimersByTimeAsync(1);

      await expect(request).resolves.toEqual([
        expect.objectContaining({ placeId: 'com-1', lat: 10.777 }),
      ]);
      expect(backendCalls()).toBe(1);
    } finally {
      jest.useRealTimers();
    }
  });
});
