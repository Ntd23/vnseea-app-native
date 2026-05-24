// Description: Maps raw post-like records into shared post summary objects.
import type {
  RawRecord,
  MediaAsset,
  PostSummary,
} from '../../domain/types/foundation.types';
import {
  asRecord,
  firstEntityId,
  firstString,
} from '../normalizers/resolveValue';
import { mapMediaAsset } from './mediaAssetMapper';
import { mapUserSummary } from './userSummaryMapper';

function mapPostMedia(record: RawRecord, webBaseUrl: string): MediaAsset[] {
  const mediaRecords = [record.postFile, record.postPhoto, record.postVideo]
    .map(value => {
      if (typeof value === 'string') {
        return { url: value };
      }

      return asRecord(value);
    })
    .filter(Boolean) as RawRecord[];

  return mediaRecords
    .map(mediaRecord => mapMediaAsset(mediaRecord, webBaseUrl))
    .filter(Boolean) as MediaAsset[];
}

export function mapPostSummary(
  record: RawRecord,
  webBaseUrl: string,
): PostSummary {
  const authorRecord =
    asRecord(record.publisher) ?? asRecord(record.user_data) ?? record;

  return {
    id: firstEntityId(record, ['post_id', 'id']),
    author: mapUserSummary(authorRecord, webBaseUrl),
    text: firstString(record, ['postText', 'text', 'description']),
    media: mapPostMedia(record, webBaseUrl),
    createdAt: firstString(record, ['time_text', 'created_at', 'time']),
  };
}
