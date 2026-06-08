// Description: Declares the Messages context repository contract for LiveKit calls.
import type {
  IncomingLiveKitCall,
  LiveKitCallCheckResult,
  LiveKitCallCreateResult,
  LiveKitCallType,
  LiveKitJoinPayload,
} from '../types/call.types';

export type CreateLiveKitCallInput = {
  recipientId: string;
  callType: LiveKitCallType;
};

export type LiveKitCallIdentityInput = {
  callId: string;
  callType: LiveKitCallType;
};

export type CloseLiveKitCallInput = LiveKitCallIdentityInput & {
  status: 'ended' | 'cancelled' | 'declined' | 'no_answer' | 'missed';
  duration: number;
};

export interface LiveKitCallRepository {
  createCall(input: CreateLiveKitCallInput): Promise<LiveKitCallCreateResult>;
  answerCall(input: LiveKitCallIdentityInput): Promise<LiveKitCallCheckResult>;
  getJoinPayload(input: LiveKitCallIdentityInput): Promise<LiveKitJoinPayload>;
  checkCall(input: LiveKitCallIdentityInput): Promise<LiveKitCallCheckResult>;
  closeCall(input: CloseLiveKitCallInput): Promise<LiveKitCallCheckResult>;
  getIncomingCall(
    callType?: LiveKitCallType,
  ): Promise<IncomingLiveKitCall | null>;
}
