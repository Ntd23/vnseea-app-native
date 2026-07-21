// Description: Defines the user repository contract for profile and user discovery APIs.
import type {
  FriendsInput,
  FriendsResult,
  GetUserProfileInput,
  NearbyPlace,
  NearbyPagesInput,
  NearbyPlacesInput,
  MapPlacePrediction,
  MapRoute,
  MapRouteInput,
  NearbyUsersInput,
  UpdateCurrentUserInput,
  UpdateCurrentUserResult,
  UserProfile,
  UserProfileResult,
  UserSuggestionsInput,
} from '../types/user.types';

export interface UserRepository {
  getCurrentUser(): Promise<UserProfile | null>;
  getUserProfile(input?: GetUserProfileInput): Promise<UserProfileResult>;
  getSuggestions(input?: UserSuggestionsInput): Promise<UserProfile[]>;
  getNearbyUsers(input?: NearbyUsersInput): Promise<UserProfile[]>;
  getNearbyPlaces(input?: NearbyPlacesInput): Promise<NearbyPlace[]>;
  getNearbyPages(input?: NearbyPagesInput): Promise<NearbyPlace[]>;
  getPlacePredictions(input: {
    query: string;
    category?: string;
    lat?: number;
    lng?: number;
    radius?: number;
  }): Promise<MapPlacePrediction[]>;
  getPlaceDetails(placeId: string): Promise<NearbyPlace | null>;
  getRoute(input: MapRouteInput): Promise<MapRoute>;
  getRoutes(input: MapRouteInput): Promise<MapRoute[]>;
  getFriends(input: FriendsInput): Promise<FriendsResult>;
  updateCurrentUser(
    input: UpdateCurrentUserInput,
  ): Promise<UpdateCurrentUserResult>;
}
