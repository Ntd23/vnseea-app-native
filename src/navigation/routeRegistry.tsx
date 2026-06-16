// Description: Centralizes app screen registrations for stack and tab navigators.
import React from 'react';
import { Bell, Hash, Home, PlaySquare, Settings } from 'lucide-react-native';
import { ROUTES } from './constants/routes';
import type { MainTabRouteName, RootStackRouteName } from './types';
import { ForgotPasswordScreen, LoginScreen, RegisterScreen } from '../auth';
import { CreatePostScreen, FeedScreen, PostDetailScreen } from '../feed';
import { ExploreScreen } from '../explore';
import { CreateReelScreen, ReelsScreen } from '../reels';
import { CreateStoryScreen, StoryViewerScreen } from '../stories';
import { NotificationsScreen } from '../notifications';
import { MemoriesScreen } from '../memories';
import { OffersScreen, PageOffersScreen, CreateOfferScreen } from '../offers';
import {
  AddressScreen,
  AdvertisingScreen,
  EditProfileScreen,
  MyInfoScreen,
  SettingsScreen,
} from '../settings';
import { CreateAdScreen } from '../advertising';
import {
  BlogDetailScreen,
  BlogFilterCategoryScreen,
  BlogsScreen,
  CreateBlogScreen,
} from '../blogs';
import { BoostedScreen } from '../boosted';
import { CreatePageScreen, PageDetailScreen, PagesScreen } from '../pages';
import { CreateProductScreen, MarketplaceScreen, ProductDetailScreen } from '../product';
import { CreateEventScreen, EventDetailScreen, EventsScreen } from '../events';
import { CreatePollScreen } from '../poll';
import {
  CreateGroupScreen,
  ExploreGroupsScreen,
  FollowingScreen,
  GroupDetailScreen,
} from '../community';
import { CreateFundingScreen, FundingDetailScreen, FundingScreen } from '../funding';
import { MoviesScreen } from '../movies';
import { CreateJobScreen, JobDetailScreen, JobsScreen } from '../jobs';
import {
  AvatarViewerScreen,
  CoverViewerScreen,
  ProfileScreen,
} from '../profile';
import { AlbumsScreen, CreateAlbumScreen, MyPhotosScreen } from '../photos';
import { MyVideosScreen } from '../videos';
import {
  CallRoomScreen,
  CallScreen,
  ChatScreen,
  CreateGroupChatScreen,
  GroupInfoScreen,
  GroupCallRoomScreen,
  MessageScreen,
} from '../messages';
import { SearchEmptyScreen, SearchFilterScreen, SearchScreen } from '../search';
import { SavedPostsScreen } from '../saved';
import {
  AffiliatesScreen,
  DepositScreen,
  EarningsScreen,
  InviteFriendsScreen,
  MyBalanceScreen,
  MyPointsScreen,
} from '../wallet';
import { PopularScreen } from '../popular';
import { WithdrawalScreen } from '../withdrawal';
import { NearbyUsersScreen } from '../user';
import { LiveScreen, LiveRoomScreen, GoLiveScreen } from '../live';

type ScreenComponent = React.ComponentType<any>;
type TabIconComponent = React.ComponentType<{
  size: number;
  color: string;
  strokeWidth: number;
}>;

export type StackRouteDefinition = {
  name: RootStackRouteName;
  component: ScreenComponent;
};

export type TabRouteDefinition = {
  name: MainTabRouteName;
  component: ScreenComponent;
  Icon: TabIconComponent;
  accessibilityLabel: string;
  isCenter?: boolean;
};

export const TAB_ROUTES: TabRouteDefinition[] = [
  {
    name: ROUTES.FEED,
    component: FeedScreen,
    Icon: Home,
    accessibilityLabel: 'Feed',
  },
  {
    name: ROUTES.EXPLORE,
    component: ExploreScreen,
    Icon: Hash,
    accessibilityLabel: 'Hashtags',
  },
  {
    name: ROUTES.REELS,
    component: ReelsScreen,
    Icon: PlaySquare,
    accessibilityLabel: 'Reels',
    isCenter: true,
  },
  {
    name: ROUTES.NOTIFICATIONS,
    component: NotificationsScreen,
    Icon: Bell,
    accessibilityLabel: 'Notifications',
  },
  {
    name: ROUTES.SETTINGS,
    component: SettingsScreen,
    Icon: Settings,
    accessibilityLabel: 'Settings',
  },
];

export function createStackRoutes(
  MainTabsComponent: ScreenComponent,
): StackRouteDefinition[] {
  return [
    { name: ROUTES.LOGIN, component: LoginScreen },
    { name: ROUTES.REGISTER, component: RegisterScreen },
    { name: ROUTES.FORGOT_PASSWORD, component: ForgotPasswordScreen },
    { name: ROUTES.MAIN_TABS, component: MainTabsComponent },
    { name: ROUTES.REELS, component: ReelsScreen },
    { name: ROUTES.POST_DETAIL, component: PostDetailScreen },
    { name: ROUTES.PROFILE, component: ProfileScreen },
    { name: ROUTES.MY_PHOTOS, component: MyPhotosScreen },
    { name: ROUTES.ALBUMS, component: AlbumsScreen },
    { name: ROUTES.CREATE_ALBUM, component: CreateAlbumScreen },
    { name: ROUTES.MY_VIDEOS, component: MyVideosScreen },
    { name: ROUTES.MESSAGES, component: MessageScreen },
    { name: ROUTES.CHAT, component: ChatScreen },
    { name: ROUTES.CALLS, component: CallScreen },
    { name: ROUTES.CALL_ROOM, component: CallRoomScreen },
    { name: ROUTES.GROUP_CALL_ROOM, component: GroupCallRoomScreen },
    { name: ROUTES.SEARCH, component: SearchScreen },
    { name: ROUTES.SEARCH_FILTER, component: SearchFilterScreen },
    { name: ROUTES.NEARBY_USERS, component: NearbyUsersScreen },
    { name: ROUTES.SAVED_POSTS, component: SavedPostsScreen },
    { name: ROUTES.SEARCH_EMPTY, component: SearchEmptyScreen },
    { name: ROUTES.PAGES, component: PagesScreen },
    { name: ROUTES.PAGE_DETAIL, component: PageDetailScreen },
    { name: ROUTES.CREATE_PAGE, component: CreatePageScreen },
    { name: ROUTES.EDIT_PAGE, component: CreatePageScreen },
    { name: ROUTES.MARKETPLACE, component: MarketplaceScreen },
    { name: ROUTES.PRODUCT_DETAIL, component: ProductDetailScreen },
    { name: ROUTES.CREATE_PRODUCT, component: CreateProductScreen },
    { name: ROUTES.CREATE_EVENT, component: CreateEventScreen },
    { name: ROUTES.EDIT_EVENT, component: CreateEventScreen },
    { name: ROUTES.EVENT_DETAIL, component: EventDetailScreen },
    { name: ROUTES.CREATE_POLL, component: CreatePollScreen },
    { name: ROUTES.CREATE_GROUP, component: CreateGroupScreen },
    { name: ROUTES.EXPLORE_GROUPS, component: ExploreGroupsScreen },
    { name: ROUTES.GROUP_DETAIL, component: GroupDetailScreen },
    { name: ROUTES.EVENTS, component: EventsScreen },
    { name: ROUTES.FUNDING, component: FundingScreen },
    { name: ROUTES.FUNDING_DETAIL, component: FundingDetailScreen },
    { name: ROUTES.CREATE_FUNDING, component: CreateFundingScreen },
    { name: ROUTES.FOLLOWING, component: FollowingScreen },
    { name: ROUTES.BOOSTED, component: BoostedScreen },
    { name: ROUTES.POPULAR, component: PopularScreen },
    { name: ROUTES.BLOGS, component: BlogsScreen },
    { name: ROUTES.BLOG_FILTER_CATEGORY, component: BlogFilterCategoryScreen },
    { name: ROUTES.BLOG_DETAIL, component: BlogDetailScreen },
    { name: ROUTES.CREATE_BLOG, component: CreateBlogScreen },
    { name: ROUTES.MOVIES, component: MoviesScreen },
    { name: ROUTES.JOBS, component: JobsScreen },
    { name: ROUTES.JOB_DETAIL, component: JobDetailScreen },
    { name: ROUTES.CREATE_JOB, component: CreateJobScreen },
    { name: ROUTES.EARNINGS, component: EarningsScreen },
    { name: ROUTES.AFFILIATES, component: AffiliatesScreen },
    { name: ROUTES.INVITE_FRIENDS, component: InviteFriendsScreen },
    { name: ROUTES.MY_POINTS, component: MyPointsScreen },
    { name: ROUTES.MY_BALANCE, component: MyBalanceScreen },
    { name: ROUTES.DEPOSIT, component: DepositScreen },
    { name: ROUTES.MEMORIES, component: MemoriesScreen },
    { name: ROUTES.OFFERS, component: OffersScreen },
    { name: ROUTES.PAGE_OFFERS, component: PageOffersScreen },
    { name: ROUTES.CREATE_OFFER, component: CreateOfferScreen },
    { name: ROUTES.SETTINGS_MY_INFO, component: MyInfoScreen },
    { name: ROUTES.SETTINGS_ADDRESS, component: AddressScreen },
    { name: ROUTES.EDIT_PROFILE, component: EditProfileScreen },
    { name: ROUTES.SETTINGS_MESSAGES, component: MessageScreen },
    { name: ROUTES.WITHDRAWAL, component: WithdrawalScreen },
    { name: ROUTES.ADVERTISING, component: AdvertisingScreen },
    { name: ROUTES.CREATE_AD, component: CreateAdScreen },
    { name: ROUTES.CREATE_REEL, component: CreateReelScreen },
    { name: ROUTES.CREATE_POST, component: CreatePostScreen },
    { name: ROUTES.CREATE_STORY, component: CreateStoryScreen },
    { name: ROUTES.STORY_VIEWER, component: StoryViewerScreen },
    { name: ROUTES.AVATAR_VIEWER, component: AvatarViewerScreen },
    { name: ROUTES.COVER_VIEWER, component: CoverViewerScreen },
    { name: ROUTES.CREATE_GROUP_CHAT, component: CreateGroupChatScreen },
    { name: ROUTES.GROUP_INFO, component: GroupInfoScreen },
    { name: ROUTES.LIVE, component: LiveScreen },
    { name: ROUTES.LIVE_ROOM, component: LiveRoomScreen },
    { name: ROUTES.GO_LIVE, component: GoLiveScreen },
  ];
}
