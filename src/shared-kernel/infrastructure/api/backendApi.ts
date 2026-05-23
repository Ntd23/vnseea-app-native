// Description: Keeps the legacy backendApi export pointing to the shared API bridge.
import { apiBridge } from './apiBridge';
import type {
  ApiFile,
  ApiPayload,
  MultipartApiPayload,
} from '../../domain/types/api.types';

export type BackendPayload = ApiPayload;
export type BackendFile = ApiFile;
export type MultipartPayload = MultipartApiPayload;

export { apiBridge };
export const backendApi = apiBridge;
