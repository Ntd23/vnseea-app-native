export type ContentAudience = 'public' | 'friends' | 'followers' | 'only_me';

export const CONTENT_AUDIENCE_CONTRACT = 'audience_v2' as const;

export type ContentAudienceWireContract =
  | typeof CONTENT_AUDIENCE_CONTRACT
  | 'legacy_feed'
  | 'legacy_reel';

export interface DecodeContentAudienceOptions {
  fallback: ContentAudience;
  contract?: ContentAudienceWireContract | string;
}

export interface DecodedContentAudience {
  audience: ContentAudience;
  isAnonymous: boolean;
  isValid: boolean;
}

const AUDIENCE_TO_WIRE: Record<ContentAudience, '0' | '1' | '2' | '3'> = {
  public: '0',
  friends: '1',
  followers: '2',
  only_me: '3',
};

export function audienceToWire(audience: ContentAudience): '0' | '1' | '2' | '3' {
  return AUDIENCE_TO_WIRE[audience];
}

export function audienceFromWire(
  value: unknown,
  options: DecodeContentAudienceOptions,
): DecodedContentAudience {
  const wireValue =
    typeof value === 'number' || typeof value === 'string'
      ? String(value).trim()
      : '';
  const contract = options.contract ?? 'legacy_feed';

  if (contract === 'legacy_reel' && wireValue === '2') {
    return { audience: 'only_me', isAnonymous: false, isValid: true };
  }

  switch (wireValue) {
    case '0':
      return { audience: 'public', isAnonymous: false, isValid: true };
    case '1':
      return { audience: 'friends', isAnonymous: false, isValid: true };
    case '2':
      return { audience: 'followers', isAnonymous: false, isValid: true };
    case '3':
      return { audience: 'only_me', isAnonymous: false, isValid: true };
    // Legacy WoWonder anonymous posts remain visible as public posts,
    // while retaining their identity protection in the presentation layer.
    case '4':
      return { audience: 'public', isAnonymous: true, isValid: true };
    default:
      return {
        audience: options.fallback,
        isAnonymous: false,
        isValid: false,
      };
  }
}
