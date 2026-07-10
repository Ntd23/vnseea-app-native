// Description: Defines typed navigation parameter lists shared across app navigators.
import type { NavigatorScreenParams } from '@react-navigation/native';
import { ROUTES } from './constants/routes';
import type { StoryItem } from '../stories/domain/types/stories.types';
import type { ChatItem } from '../messages/domain/types/messages.types';
import type { LiveKitCallRouteParams } from '../messages/domain/types/call.types';
import type { GroupLiveKitCallRouteParams } from '../messages/domain/types/groupCall.types';
import type { PagesItem } from '../pages/domain/types/pages.types';
import type { GroupItem } from '../community/domain/types/community.types';
import type { LiveSession } from '../live/domain/types/live.types';
import type { ProductItem } from '../product/domain/types/product.types';
import type { FeedPost } from '../feed/domain/types/feed.types';
import type { AdItem } from '../advertising/domain/types/ads.types';
import type { EventsItem } from '../events/domain/types/events.types';
import type { UserProfile } from '../user/domain/types/user.types';

export type MainTabParamList = {
  [ROUTES.FEED]:
    | {
        filter?: 'photos';
      }
    | undefined;
  [ROUTES.EXPLORE]: undefined;
  [ROUTES.REELS]:
    | {
        initialVideoId?: string;
        post?: FeedPost;
        source?: ReelSource;
        seekTime?: number;
      }
    | undefined;
  [ROUTES.MARKETPLACE]: undefined;
  [ROUTES.NEARBY_USERS]: undefined;
  [ROUTES.NOTIFICATIONS]: undefined;
  [ROUTES.PROFILE]: undefined;
  [ROUTES.SETTINGS]:
    | {
        initialPanel?: SettingsPanelRouteParam;
        fromDashboard?: boolean;
      }
    | undefined;
};

export type SettingsPanelRouteParam =
  | 'main'
  | 'general'
  | 'earnings'
  | 'general-common'
  | 'general-profile'
  | 'general-social-links'
  | 'general-address'
  | 'general-privacy'
  | 'general-blocked-users'
  | 'general-sessions'
  | 'general-avatar'
  | 'general-password'
  | 'general-two-factor'
  | 'general-notifications'
  | 'general-verification';

/**
 * Where a Reels screen was opened from. Used by the back FAB to
 * restore the user's previous surface (Page Detail, Profile, Saved,
 * My Videos, or the Home feed) instead of always jumping to the
 * Feed tab. Optional — when absent, the back button does a plain
 * `goBack()` and falls back to the Feed tab only if there's
 * nothing to pop.
 */
export type ReelSource = 'home' | 'profile' | 'page' | 'saved' | 'myVideos';

export type RootStackParamList = {
  [ROUTES.LOGIN]: undefined;
  [ROUTES.REGISTER]: undefined;
  [ROUTES.FORGOT_PASSWORD]: undefined;
  [ROUTES.MAIN_TABS]: NavigatorScreenParams<MainTabParamList> | undefined;
  [ROUTES.REELS]:
    | {
        initialVideoId?: string;
        post?: FeedPost;
        source?: ReelSource;
        seekTime?: number;
      }
    | undefined;
  [ROUTES.POST_DETAIL]: {
    postId: string;
    post?: FeedPost;
  };
  [ROUTES.PROFILE]: undefined;
  [ROUTES.USER_PROFILE]: { userId: string };
  [ROUTES.PROFILE_FRIENDS]: {
    userId: string;
    title?: string;
    initialFriends?: UserProfile[];
  };
  [ROUTES.MY_PHOTOS]: undefined;
  [ROUTES.ALBUMS]: undefined;
  [ROUTES.CREATE_ALBUM]: undefined;
  [ROUTES.MY_VIDEOS]: undefined;
  [ROUTES.MESSAGES]: undefined;
  [ROUTES.CREATE_GROUP_CHAT]: undefined;
  [ROUTES.CHAT]: { chat: ChatItem; product?: ProductItem };
  [ROUTES.GROUP_INFO]: {
    groupId: number;
    groupName: string;
    avatar: string;
    memberCount: number;
  };
  [ROUTES.CALLS]: undefined;
  [ROUTES.CALL_ROOM]: LiveKitCallRouteParams;
  [ROUTES.GROUP_CALL_ROOM]: GroupLiveKitCallRouteParams;
  [ROUTES.SEARCH]: { q?: string } | undefined;
  [ROUTES.SEARCH_FILTER]: undefined;
  [ROUTES.NEARBY_USERS]: undefined;
  [ROUTES.SAVED_POSTS]: undefined;
  [ROUTES.SEARCH_EMPTY]: undefined;
  [ROUTES.PAGES]: undefined;
  [ROUTES.PAGE_DETAIL]: { page: PagesItem };
  [ROUTES.PAGE_SETTINGS]: { pageId: string; page?: PagesItem };
  [ROUTES.CREATE_PAGE]: undefined;
  [ROUTES.EDIT_PAGE]: { page: PagesItem };
  [ROUTES.MARKETPLACE]: undefined;
  [ROUTES.MY_PRODUCTS]:
    | {
        initialTab?: 'products' | 'purchased' | 'orders';
        userId?: string;
      }
    | undefined;
  [ROUTES.PRODUCT_DETAIL]: {
    productId: number;
    product?: ProductItem;
  };
  [ROUTES.CART]: undefined;
  [ROUTES.CHECKOUT]:
    | {
        selectedProductIds?: number[];
        selectedAddressId?: string;
      }
    | undefined;
  [ROUTES.SHIPPING_ADDRESS]:
    | {
        selectedProductIds?: number[];
        selectedAddressId?: string;
      }
    | undefined;
  [ROUTES.CREATE_PRODUCT]: undefined;
  [ROUTES.EDIT_PRODUCT]: { product: ProductItem };
  [ROUTES.CREATE_EVENT]: undefined;
  [ROUTES.EDIT_EVENT]: { event: EventsItem };
  [ROUTES.EVENT_DETAIL]: { event: EventsItem };
  [ROUTES.CREATE_POLL]: undefined;
  [ROUTES.CREATE_GROUP]: undefined;
  [ROUTES.EDIT_GROUP]: { group: GroupItem };
  [ROUTES.EXPLORE_GROUPS]: undefined;
  [ROUTES.GROUP_DETAIL]: { group?: GroupItem } | undefined;
  [ROUTES.EVENTS]: undefined;
  [ROUTES.FUNDING]: undefined;
  [ROUTES.FUNDING_DETAIL]: { fundId: string };
  [ROUTES.CREATE_FUNDING]: undefined;
  [ROUTES.FOLLOWING]: undefined;
  [ROUTES.BOOSTED]: undefined;
  [ROUTES.POPULAR]: undefined;
  [ROUTES.BLOGS]: { category?: string; searchQuery?: string; sortBy?: string; myPostsOnly?: boolean } | undefined;
  [ROUTES.MY_ARTICLES]: undefined;
  [ROUTES.BLOG_FILTER_CATEGORY]: { currentCategory?: string; searchQuery?: string; sortBy?: string; myPostsOnly?: boolean } | undefined;
  [ROUTES.BLOG_DETAIL]: { blogId: string };
  [ROUTES.CREATE_BLOG]: undefined;
  [ROUTES.EDIT_BLOG]: { blogId: string };
  [ROUTES.MOVIES]: undefined;
  [ROUTES.CREATE_MOVIE]: undefined;
  [ROUTES.JOBS]: undefined;
  [ROUTES.JOB_DETAIL]: { jobId?: string; job?: any };
  [ROUTES.CREATE_JOB]: { pageId?: string; pageName?: string } | undefined;
  [ROUTES.EARNINGS]: undefined;
  [ROUTES.AFFILIATES]: undefined;
  [ROUTES.INVITE_FRIENDS]: undefined;
  [ROUTES.MY_POINTS]: undefined;
  [ROUTES.MY_BALANCE]: undefined;
  [ROUTES.DEPOSIT]: { returnTo?: string };
  [ROUTES.WITHDRAWAL]: undefined;
  [ROUTES.MEMORIES]: undefined;
  [ROUTES.OFFERS]: undefined;
  [ROUTES.PAGE_OFFERS]: { pageId: number; pageName?: string; isOwner?: boolean };
  [ROUTES.CREATE_OFFER]: { pageId: number; pageName?: string };
  [ROUTES.SETTINGS_MY_INFO]: undefined;
  [ROUTES.USER_DASHBOARD]: undefined;
  [ROUTES.SETTINGS_ADDRESS]: undefined;
  [ROUTES.EDIT_PROFILE]: undefined;
  [ROUTES.SETTINGS_MESSAGES]: undefined;
  [ROUTES.ADVERTISING]: undefined;
  [ROUTES.AD_DETAILS]: { ad: AdItem };
  [ROUTES.CREATE_AD]: { ad?: AdItem } | undefined;
  [ROUTES.CREATE_REEL]: undefined;
  [ROUTES.CREATE_POST]: { page?: PagesItem; groupId?: string; initialAction?: 'photo' | 'video' | 'product' | 'poll' } | undefined;
  [ROUTES.CREATE_STORY]: undefined;
  /**
   * Pass the full stories list + the user-index to open at. The viewer
   * uses these as its initial state and manages segment progression
   * locally. Stories are JSON-serialisable (just primitives + URLs) so
   * RN Navigation accepts them as params without complaint.
   */
  [ROUTES.STORY_VIEWER]: {
    stories: StoryItem[];
    initialUserIndex: number;
  };
  [ROUTES.STORIES_LIST]:
    | {
        stories?: StoryItem[];
        title?: string;
      }
    | undefined;
  [ROUTES.AVATAR_VIEWER]: {
    avatarUrl: string;
    userName: string;
    userId?: string;
  };
  [ROUTES.COVER_VIEWER]: {
    coverUrl: string;
    userName: string;
    userId?: string;
  };
  [ROUTES.LIVE]: undefined;
  [ROUTES.LIVE_ROOM]: {
    postId: number;
    isHost?: boolean;
    liveSession?: LiveSession;
  };
  [ROUTES.GO_LIVE]: undefined;
  [ROUTES.POKE]: undefined;
  [ROUTES.FORUM]: undefined;
  [ROUTES.SELLER_STORE]: {
    sellerId: number;
    sellerName?: string;
    sellerUsername?: string;
    sellerAvatar?: string;
  };
};

export type MainTabRouteName = keyof MainTabParamList;
export type RootStackRouteName = keyof RootStackParamList;
