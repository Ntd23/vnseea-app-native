// Description: Resolves backend routes and relative upload media with separate configured origins.
import { normalizeRawUrl } from '../../../foundation/application/normalizers/url';
import { apiConfig } from './env';

export function normalizeConfiguredUrl(value: string | undefined) {
  return normalizeRawUrl(
    value,
    apiConfig.webBaseUrl,
    apiConfig.mediaBaseUrl,
  );
}
