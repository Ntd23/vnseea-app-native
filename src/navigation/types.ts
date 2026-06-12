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

export type MainTabParamList = {
  [ROUTES.FEED]: undefined;
  [ROUTES.EXPLORE]: undefined;
  [ROUTES.REELS]: undefined;
  [ROUTES.NOTIFICATIONS]: undefined;
  [ROUTES.SETTINGS]: undefined;
};

export type RootStackParamList = {
  [ROUTES.LOGIN]: undefined;
  [ROUTES.REGISTER]: undefined;
  [ROUTES.FORGOT_PASSWORD]: undefined;
  [ROUTES.MAIN_TABS]: NavigatorScreenParams<MainTabParamList> | undefined;
  [ROUTES.POST_DETAIL]: {
    postId: string;
    post?: FeedPost;
  };
  [ROUTES.PROFILE]: { userId?: string } | undefined;
  [ROUTES.MY_PHOTOS]: undefined;
  [ROUTES.ALBUMS]: undefined;
  [ROUTES.CREATE_ALBUM]: undefined;
  [ROUTES.MY_VIDEOS]: undefined;
  [ROUTES.MESSAGES]: undefined;
  [ROUTES.CREATE_GROUP_CHAT]: undefined;
  [ROUTES.CHAT]: { chat: ChatItem };
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
  [ROUTES.CREATE_PAGE]: undefined;
  [ROUTES.EDIT_PAGE]: { page: PagesItem };
  [ROUTES.MARKETPLACE]: undefined;
  [ROUTES.PRODUCT_DETAIL]: {
    productId: number;
    product?: ProductItem;
  };
  [ROUTES.CREATE_PRODUCT]: undefined;
  [ROUTES.CREATE_EVENT]: undefined;
  [ROUTES.CREATE_POLL]: undefined;
  [ROUTES.CREATE_GROUP]: undefined;
  [ROUTES.EXPLORE_GROUPS]: undefined;
  [ROUTES.GROUP_DETAIL]: { group?: GroupItem } | undefined;
  [ROUTES.EVENTS]: undefined;
  [ROUTES.FUNDING]: undefined;
  [ROUTES.FUNDING_DETAIL]: { fundId: string };
  [ROUTES.CREATE_FUNDING]: undefined;
  [ROUTES.FOLLOWING]: undefined;
  [ROUTES.BOOSTED]: undefined;
  [ROUTES.POPULAR]: undefined;
  [ROUTES.BLOGS]: undefined;
  [ROUTES.BLOG_FILTER_CATEGORY]: undefined;
  [ROUTES.BLOG_DETAIL]: { blogId: string };
  [ROUTES.MOVIES]: undefined;
  [ROUTES.JOBS]: undefined;
  [ROUTES.JOB_DETAIL]: { jobId?: string; job?: any };
  [ROUTES.CREATE_JOB]: undefined;
  [ROUTES.EARNINGS]: undefined;
  [ROUTES.AFFILIATES]: undefined;
  [ROUTES.INVITE_FRIENDS]: undefined;
  [ROUTES.MY_POINTS]: undefined;
  [ROUTES.MY_BALANCE]: undefined;
  [ROUTES.DEPOSIT]: { returnTo?: string };
  [ROUTES.WITHDRAWAL]: undefined;
  [ROUTES.MEMORIES]: undefined;
  [ROUTES.OFFERS]: undefined;
  [ROUTES.SETTINGS_MY_INFO]: undefined;
  [ROUTES.SETTINGS_ADDRESS]: undefined;
  [ROUTES.EDIT_PROFILE]: undefined;
  [ROUTES.SETTINGS_MESSAGES]: undefined;
  [ROUTES.ADVERTISING]: undefined;
  [ROUTES.CREATE_AD]: undefined;
  [ROUTES.CREATE_REEL]: undefined;
  [ROUTES.CREATE_POST]: undefined;
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
};

export type MainTabRouteName = keyof MainTabParamList;
export type RootStackRouteName = keyof RootStackParamList;
