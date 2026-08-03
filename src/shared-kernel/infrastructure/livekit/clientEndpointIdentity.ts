import { pushInstallationStorage } from '../push/pushInstallationStorage';

export function getClientEndpointIdentity() {
  return pushInstallationStorage.getOrCreateIdentity().installationId;
}

export function isCurrentClientEndpoint(endpointId?: string | null) {
  const normalized = endpointId?.trim();
  if (!normalized) return false;
  return normalized === getClientEndpointIdentity();
}
