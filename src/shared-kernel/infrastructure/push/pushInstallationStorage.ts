import { createMMKV } from 'react-native-mmkv';

export type PushProvider = 'onesignal' | 'apns_voip';
export type ApnsEnvironment = 'sandbox' | 'production';

export type PushInstallationIdentity = {
  installationId: string;
  deviceSecret: string;
};

export type CachedPushToken = {
  provider: PushProvider;
  token: string;
  apnsEnvironment?: ApnsEnvironment;
  syncedUserId?: string;
};

export type PendingPushInstallationRelease = PushInstallationIdentity & {
  stagedAt: number;
};

type PushInstallationState = {
  identity?: PushInstallationIdentity;
  tokens: Partial<Record<PushProvider, CachedPushToken>>;
  pendingRelease?: PendingPushInstallationRelease;
  pendingDeactivations?: PushProvider[];
};

const STATE_KEY = 'push.installation.v2';
const storage = createMMKV({ id: 'vnseea-push-installation' });

function emptyState(): PushInstallationState {
  return { tokens: {} };
}

function readState(): PushInstallationState {
  const raw = storage.getString(STATE_KEY);
  if (!raw) return emptyState();

  try {
    const parsed = JSON.parse(raw) as Partial<PushInstallationState>;
    return {
      identity: parsed.identity,
      tokens:
        parsed.tokens && typeof parsed.tokens === 'object'
          ? parsed.tokens
          : {},
      pendingRelease: parsed.pendingRelease,
      pendingDeactivations: Array.isArray(parsed.pendingDeactivations)
        ? parsed.pendingDeactivations.filter(
            (provider): provider is PushProvider =>
              provider === 'onesignal' || provider === 'apns_voip',
          )
        : [],
    };
  } catch {
    return emptyState();
  }
}

function writeState(state: PushInstallationState) {
  storage.set(STATE_KEY, JSON.stringify(state));
}

interface SecureRandomRuntime {
  crypto?: {
    getRandomValues(values: Uint8Array): Uint8Array;
  };
}

function randomHex(bytes: number) {
  const values = new Uint8Array(bytes);
  const runtimeCrypto = (globalThis as unknown as SecureRandomRuntime).crypto;
  if (!runtimeCrypto?.getRandomValues) {
    throw new Error('Secure random generator is unavailable.');
  }
  runtimeCrypto.getRandomValues(values);
  return Array.from(values, value => value.toString(16).padStart(2, '0')).join(
    '',
  );
}

function createIdentity(): PushInstallationIdentity {
  return {
    installationId: `pi_${randomHex(24)}`,
    deviceSecret: randomHex(32),
  };
}

function sameRelease(
  left: PendingPushInstallationRelease,
  right: PendingPushInstallationRelease,
) {
  return (
    left.installationId === right.installationId &&
    left.deviceSecret === right.deviceSecret
  );
}

export const pushInstallationStorage = {
  getIdentity() {
    return readState().identity ?? null;
  },

  getOrCreateIdentity() {
    const state = readState();
    if (state.identity) return state.identity;

    const identity = createIdentity();
    writeState({ ...state, identity });
    return identity;
  },

  cacheToken(input: Omit<CachedPushToken, 'syncedUserId'>) {
    const token = input.token.trim();
    if (!token) return;

    const state = readState();
    const existing = state.tokens[input.provider];
    const wasPendingDeactivation = (
      state.pendingDeactivations ?? []
    ).includes(input.provider);
    const unchanged =
      existing?.token === token &&
      existing.apnsEnvironment === input.apnsEnvironment;
    state.tokens[input.provider] = {
      provider: input.provider,
      token,
      apnsEnvironment: input.apnsEnvironment,
      syncedUserId:
        unchanged && !wasPendingDeactivation
          ? existing?.syncedUserId
          : undefined,
    };
    state.pendingDeactivations = (state.pendingDeactivations ?? []).filter(
      provider => provider !== input.provider,
    );
    writeState(state);
  },

  getToken(provider: PushProvider) {
    return readState().tokens[provider] ?? null;
  },

  getUnsyncedTokens(userId: string) {
    const normalizedUserId = userId.trim();
    return Object.values(readState().tokens).filter(
      (token): token is CachedPushToken =>
        Boolean(token?.token) && token?.syncedUserId !== normalizedUserId,
    );
  },

  markTokenSynced(
    provider: PushProvider,
    tokenValue: string,
    userId: string,
  ) {
    const state = readState();
    const token = state.tokens[provider];
    if (!token || token.token !== tokenValue) return;
    state.tokens[provider] = {
      ...token,
      syncedUserId: userId,
    };
    writeState(state);
  },

  markProviderUnsynced(provider: PushProvider) {
    const state = readState();
    const token = state.tokens[provider];
    if (!token?.syncedUserId) return;
    state.tokens[provider] = {
      ...token,
      syncedUserId: undefined,
    };
    writeState(state);
  },

  removeToken(provider: PushProvider) {
    const state = readState();
    delete state.tokens[provider];
    writeState(state);
  },

  discardProvider(provider: PushProvider) {
    const state = readState();
    state.pendingDeactivations = (state.pendingDeactivations ?? []).filter(
      item => item !== provider,
    );
    delete state.tokens[provider];
    writeState(state);
  },

  stageProviderDeactivation(provider: PushProvider) {
    const state = readState();
    state.pendingDeactivations = Array.from(
      new Set([...(state.pendingDeactivations ?? []), provider]),
    );
    writeState(state);
  },

  getPendingProviderDeactivations() {
    return readState().pendingDeactivations ?? [];
  },

  completeProviderDeactivation(provider: PushProvider) {
    const state = readState();
    if (!(state.pendingDeactivations ?? []).includes(provider)) {
      return;
    }
    state.pendingDeactivations = (state.pendingDeactivations ?? []).filter(
      item => item !== provider,
    );
    delete state.tokens[provider];
    writeState(state);
  },

  stageRelease(): PendingPushInstallationRelease {
    const state = readState();
    const identity = state.identity ?? createIdentity();
    const pendingRelease = {
      ...identity,
      stagedAt: Date.now(),
    };
    writeState({
      ...state,
      identity,
      pendingRelease,
      pendingDeactivations: [],
      tokens: Object.fromEntries(
        Object.entries(state.tokens).map(([provider, token]) => [
          provider,
          token ? { ...token, syncedUserId: undefined } : token,
        ]),
      ),
    });
    return pendingRelease;
  },

  getPendingRelease() {
    return readState().pendingRelease ?? null;
  },

  completeRelease(release: PendingPushInstallationRelease) {
    const state = readState();
    if (!state.pendingRelease || !sameRelease(state.pendingRelease, release)) {
      return;
    }
    delete state.pendingRelease;
    writeState(state);
  },

  clear() {
    storage.remove(STATE_KEY);
  },
};
