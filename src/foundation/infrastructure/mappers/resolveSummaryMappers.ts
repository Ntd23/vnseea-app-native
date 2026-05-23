// Description: Resolves shared summary mappers using the configured web base URL.
import type { RawRecord } from '../../domain/types/foundation.types';
import { mapGroupSummary } from '../../application/mappers/groupSummaryMapper';
import { mapMediaAsset } from '../../application/mappers/mediaAssetMapper';
import { mapPageSummary } from '../../application/mappers/pageSummaryMapper';
import { mapPostSummary } from '../../application/mappers/postSummaryMapper';
import { mapUserSummary } from '../../application/mappers/userSummaryMapper';
import { apiConfig } from '../../../shared-kernel/infrastructure/config/env';

export const resolveSummaryMappers = {
  user(record: RawRecord) {
    return mapUserSummary(record, apiConfig.webBaseUrl);
  },

  page(record: RawRecord) {
    return mapPageSummary(record, apiConfig.webBaseUrl);
  },

  group(record: RawRecord) {
    return mapGroupSummary(record, apiConfig.webBaseUrl);
  },

  post(record: RawRecord) {
    return mapPostSummary(record, apiConfig.webBaseUrl);
  },

  media(record: RawRecord) {
    return mapMediaAsset(record, apiConfig.webBaseUrl);
  },
};
