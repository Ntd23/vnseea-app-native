// Description: Defines the canonical address-only search contract shared by forms.
export type AddressSearchLanguage = 'vi' | 'en';

export type AddressLocationBias = {
  latitude: number;
  longitude: number;
};

export interface AddressSearchInput {
  query: string;
  language: AddressSearchLanguage;
  country: 'vn';
  locationBias?: AddressLocationBias;
  sessionToken: string;
}

export interface AddressSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  source: 'autocomplete' | 'geocode';
  latitude?: number;
  longitude?: number;
}

export interface ResolvedAddress {
  placeId: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  city?: string;
  district?: string;
  ward?: string;
  country?: string;
}

export interface NearbyAddressSuggestion {
  placeId: string;
  name: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  distanceMeters?: number;
}

export interface ReverseGeocodeResult extends ResolvedAddress {
  nearbySuggestions: NearbyAddressSuggestion[];
}
