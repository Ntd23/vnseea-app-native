// Description: Verifies shared API bridge response normalization and error mapping.
import {
  ApiBridgeError,
  assertApiSuccess,
  getApiErrorMessage,
  isApiSuccessStatus,
  normalizeApiStatus,
} from '../apiResponse';

describe('apiResponse bridge helpers', () => {
  it('normalizes API statuses consistently', () => {
    expect(normalizeApiStatus(200)).toBe('200');
    expect(normalizeApiStatus('220')).toBe('220');
    expect(normalizeApiStatus(undefined)).toBeUndefined();
  });

  it('treats WoWonder success statuses as successful envelopes', () => {
    expect(isApiSuccessStatus(200)).toBe(true);
    expect(isApiSuccessStatus('220')).toBe(true);
    expect(isApiSuccessStatus(400)).toBe(false);
    expect(isApiSuccessStatus(undefined)).toBe(true);
  });

  it('extracts the most useful API error message', () => {
    expect(
      getApiErrorMessage({
        api_status: 400,
        errors: {
          error_id: '6',
          error_text: 'Too many login attempts please try again later',
        },
      }),
    ).toBe('Too many login attempts please try again later');

    expect(
      getApiErrorMessage({
        api_status: 400,
        message: 'Password is incorrect',
      }),
    ).toBe('Password is incorrect');
  });

  it('throws ApiBridgeError for failed API envelopes', () => {
    expect(() =>
      assertApiSuccess({
        api_status: '400',
        errors: {
          error_id: '5',
          error_text: 'Password is incorrect',
        },
      }),
    ).toThrow(ApiBridgeError);

    try {
      assertApiSuccess({
        api_status: '400',
        errors: {
          error_id: '5',
          error_text: 'Password is incorrect',
        },
      });
    } catch (error) {
      expect(error).toBeInstanceOf(ApiBridgeError);
      expect((error as ApiBridgeError).message).toBe('Password is incorrect');
      expect((error as ApiBridgeError).apiStatus).toBe('400');
      expect((error as ApiBridgeError).errorId).toBe('5');
    }
  });

  it('returns successful envelopes unchanged', () => {
    const envelope = {
      api_status: 200,
      data: {
        id: 1,
      },
    };

    expect(assertApiSuccess(envelope)).toBe(envelope);
  });
});
