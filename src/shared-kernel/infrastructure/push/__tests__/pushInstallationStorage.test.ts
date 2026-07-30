import { pushInstallationStorage } from '../pushInstallationStorage';

describe('pushInstallationStorage', () => {
  beforeEach(() => {
    pushInstallationStorage.clear();
  });

  it('creates one stable installation identity with a non-guessable secret', () => {
    const first = pushInstallationStorage.getOrCreateIdentity();
    const second = pushInstallationStorage.getOrCreateIdentity();

    expect(second).toEqual(first);
    expect(first.installationId).toMatch(/^pi_[a-f0-9]{48}$/);
    expect(first.deviceSecret).toMatch(/^[a-f0-9]{64}$/);
  });

  it('keeps a token received before login and scopes sync ownership by user', () => {
    pushInstallationStorage.cacheToken({
      provider: 'apns_voip',
      token: 'voip-token',
      apnsEnvironment: 'sandbox',
    });

    expect(pushInstallationStorage.getUnsyncedTokens('42')).toEqual([
      expect.objectContaining({
        provider: 'apns_voip',
        token: 'voip-token',
        apnsEnvironment: 'sandbox',
      }),
    ]);

    pushInstallationStorage.markTokenSynced(
      'apns_voip',
      'voip-token',
      '42',
    );

    expect(pushInstallationStorage.getUnsyncedTokens('42')).toEqual([]);
    expect(pushInstallationStorage.getUnsyncedTokens('99')).toHaveLength(1);
  });

  it('persists a release until the exact installation is acknowledged', () => {
    const identity = pushInstallationStorage.getOrCreateIdentity();
    const pending = pushInstallationStorage.stageRelease();

    expect(pending).toEqual(expect.objectContaining(identity));
    expect(pushInstallationStorage.getPendingRelease()).toEqual(pending);

    pushInstallationStorage.completeRelease({
      ...pending,
      installationId: 'pi_other',
    });
    expect(pushInstallationStorage.getPendingRelease()).toEqual(pending);

    pushInstallationStorage.completeRelease(pending);
    expect(pushInstallationStorage.getPendingRelease()).toBeNull();
  });

  it('lets a full installation release supersede provider deactivation work', () => {
    pushInstallationStorage.stageProviderDeactivation('onesignal');

    pushInstallationStorage.stageRelease();

    expect(pushInstallationStorage.getPendingProviderDeactivations()).toEqual(
      [],
    );
  });

  it('keeps a token that is enabled again while deactivation is in flight', () => {
    pushInstallationStorage.cacheToken({
      provider: 'onesignal',
      token: 'subscription-42',
    });
    pushInstallationStorage.markTokenSynced(
      'onesignal',
      'subscription-42',
      '42',
    );
    pushInstallationStorage.stageProviderDeactivation('onesignal');

    pushInstallationStorage.cacheToken({
      provider: 'onesignal',
      token: 'subscription-42',
    });

    expect(pushInstallationStorage.getPendingProviderDeactivations()).toEqual(
      [],
    );
    expect(pushInstallationStorage.getUnsyncedTokens('42')).toEqual([
      expect.objectContaining({
        provider: 'onesignal',
        token: 'subscription-42',
      }),
    ]);

    pushInstallationStorage.completeProviderDeactivation('onesignal');
    expect(pushInstallationStorage.getToken('onesignal')).toEqual(
      expect.objectContaining({ token: 'subscription-42' }),
    );
  });
});
