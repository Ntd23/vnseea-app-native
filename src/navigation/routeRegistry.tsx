// Description: Centralizes app screen registrations for stack and tab navigators.
import React from 'react';
import { Platform } from 'react-native';
import {
  Bell,
  CircleUser,
  Hash,
  Home,
  MapPinned,
  PlaySquare,
  Settings,
  ShoppingBag,
} from 'lucide-react-native';
import { ROUTES } from './constants/routes';
import type { MainTabRouteName, RootStackRouteName } from './types';
import {
  EmailVerificationScreen,
  ForgotPasswordScreen,
  LoginScreen,
  RegisterScreen,
} from '../auth';
import {
  CreatePostScreen,
  FeedScreen,
  PostDetailScreen,
} from '../feed';
import { ExploreScreen } from '../explore';
import { CreateReelScreen, ReelsScreen } from '../reels';
import { CreateStoryScreen, StoriesListScreen, StoryViewerScreen } from '../stories';
import { NotificationsScreen } from '../notifications';
import { MemoriesScreen } from '../memories';
import { OffersScreen, PageOffersScreen, CreateOfferScreen } from '../offers';
import {
  AddressScreen,
  AdvertisingScreen,
  EditProfileScreen,
 MyInfoScreen,
  SettingsScreen,
  UserDashboardScreen,
} from '../settings';
import { CreateAdScreen, AdDetailsScreen } from '../advertising';
import {
  BlogDetailScreen,
  BlogFilterCategoryScreen,
  BlogsScreen,
  CreateBlogScreen,
  MyArticlesScreen,
} from '../blogs';
import { BoostedScreen } from '../boosted';
import { CreatePageScreen, PageDetailScreen, PageSettingsScreen, PagesScreen } from '../pages';
import {
  CreateProductScreen,
  MarketplaceScreen,
  MyProductsScreen,
  ProductDetailScreen,
  SellerStoreScreen,
} from '../product';
import { CartScreen, CheckoutScreen, ShippingAddressScreen } from '../checkout';
import { OrderDetailScreen } from '../orders';
import { CreateEventScreen, EventDetailScreen, EventsScreen } from '../events';
import { CreatePollScreen } from '../poll';
import {
  CreateGroupScreen,
  ExploreGroupsScreen,
  FollowingScreen,
  GroupDetailScreen,
} from '../community';
import { CreateFundingScreen, FundingDetailScreen, FundingScreen } from '../funding';
import { CreateMovieScreen, MovieDetailScreen, MoviesScreen } from '../movies';
import { CreateJobScreen, JobDetailScreen, JobsScreen } from '../jobs';
import {
  AvatarViewerScreen,
  CoverViewerScreen,
  ProfileFriendsScreen,
  ProfileMoreScreen,
  ProfileScreen,
} from '../profile';
import { AlbumsScreen, CreateAlbumScreen, MyPhotosScreen } from '../photos';
import { MyVideosScreen } from '../videos';
import { WatchScreen } from '../watch';
import {
  CallRoomScreen,
  CallScreen,
  ChatScreen,
  ConversationDetailsScreen,
  ConversationMediaScreen,
  ConversationPinnedScreen,
  ConversationSearchScreen,
  CreateGroupChatScreen,
  GroupInfoScreen,
  GroupCallRoomScreen,
  MessageLabelsScreen,
  MessageScreen,
} from '../messages';
import { SearchEmptyScreen, SearchFilterScreen, SearchScreen } from '../search';
import { ActivityCenterScreen } from '../activity';
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
import { PokeScreen } from '../poke';
import ForumScreen from '../forum/presentation/screens/ForumScreen';

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

export const IOS_NATIVE_TAB_ROUTES: TabRouteDefinition[] = [
  {
    name: ROUTES.FEED,
    component: FeedScreen,
    Icon: Home,
    accessibilityLabel: 'Feed',
  },
  {
    name: ROUTES.REELS,
    component: ReelsScreen,
    Icon: PlaySquare,
    accessibilityLabel: 'Video',
  },
  {
    name: ROUTES.MARKETPLACE,
    component: MarketplaceScreen,
    Icon: ShoppingBag,
    accessibilityLabel: 'Marketplace',
  },
  {
    name: ROUTES.NEARBY_USERS,
    component: NearbyUsersScreen,
    Icon: MapPinned,
    accessibilityLabel: 'Nearby Map',
  },
  {
    name: ROUTES.PROFILE,
    component: ProfileScreen,
    Icon: CircleUser,
    accessibilityLabel: 'Profile',
  },
];

export function createStackRoutes(
  MainTabsComponent: ScreenComponent,
): StackRouteDefinition[] {
  return [
    { name: ROUTES.LOGIN, component: LoginScreen },
    { name: ROUTES.REGISTER, component: RegisterScreen },
    { name: ROUTES.EMAIL_VERIFICATION, component: EmailVerificationScreen },
    { name: ROUTES.FORGOT_PASSWORD, component: ForgotPasswordScreen },
    { name: ROUTES.MAIN_TABS, component: MainTabsComponent },
    { name: ROUTES.REELS, component: ReelsScreen },
    ...(Platform.OS === 'ios'
      ? [{ name: ROUTES.NOTIFICATIONS, component: NotificationsScreen }]
      : []),
    { name: ROUTES.POST_DETAIL, component: PostDetailScreen },
    { name: ROUTES.PROFILE, component: ProfileScreen },
    { name: ROUTES.USER_PROFILE, component: ProfileScreen },
    { name: ROUTES.PROFILE_MORE, component: ProfileMoreScreen },
    { name: ROUTES.PROFILE_FRIENDS, component: ProfileFriendsScreen },
    { name: ROUTES.MY_PHOTOS, component: MyPhotosScreen },
    { name: ROUTES.ALBUMS, component: AlbumsScreen },
    { name: ROUTES.CREATE_ALBUM, component: CreateAlbumScreen },
    { name: ROUTES.MY_VIDEOS, component: MyVideosScreen },
    { name: ROUTES.WATCH, component: WatchScreen },
    { name: ROUTES.MESSAGES, component: MessageScreen },
    { name: ROUTES.MESSAGE_LABELS, component: MessageLabelsScreen },
    { name: ROUTES.CHAT, component: ChatScreen },
    { name: ROUTES.CONVERSATION_DETAILS, component: ConversationDetailsScreen },
    { name: ROUTES.CONVERSATION_SEARCH, component: ConversationSearchScreen },
    { name: ROUTES.CONVERSATION_MEDIA, component: ConversationMediaScreen },
    { name: ROUTES.CONVERSATION_PINNED, component: ConversationPinnedScreen },
    { name: ROUTES.CALLS, component: CallScreen },
    { name: ROUTES.CALL_ROOM, component: CallRoomScreen },
    { name: ROUTES.GROUP_CALL_ROOM, component: GroupCallRoomScreen },
    { name: ROUTES.SEARCH, component: SearchScreen },
    { name: ROUTES.SEARCH_FILTER, component: SearchFilterScreen },
    { name: ROUTES.NEARBY_USERS, component: NearbyUsersScreen },
    { name: ROUTES.ACTIVITY_CENTER, component: ActivityCenterScreen },
    { name: ROUTES.SAVED_POSTS, component: ActivityCenterScreen },
    { name: ROUTES.SEARCH_EMPTY, component: SearchEmptyScreen },
    { name: ROUTES.PAGES, component: PagesScreen },
    { name: ROUTES.PAGE_DETAIL, component: PageDetailScreen },
    { name: ROUTES.PAGE_SETTINGS, component: PageSettingsScreen },
    { name: ROUTES.CREATE_PAGE, component: CreatePageScreen },
    { name: ROUTES.EDIT_PAGE, component: CreatePageScreen },
    { name: ROUTES.MARKETPLACE, component: MarketplaceScreen },
    { name: ROUTES.MY_PRODUCTS, component: MyProductsScreen },
    { name: ROUTES.ORDER_DETAIL, component: OrderDetailScreen },
    { name: ROUTES.PRODUCT_DETAIL, component: ProductDetailScreen },
    { name: ROUTES.SELLER_STORE, component: SellerStoreScreen },
    { name: ROUTES.CART, component: CartScreen },
    { name: ROUTES.CHECKOUT, component: CheckoutScreen },
    { name: ROUTES.SHIPPING_ADDRESS, component: ShippingAddressScreen },
    { name: ROUTES.CREATE_PRODUCT, component: CreateProductScreen },
    { name: ROUTES.EDIT_PRODUCT, component: CreateProductScreen },
    { name: ROUTES.CREATE_EVENT, component: CreateEventScreen },
    { name: ROUTES.EDIT_EVENT, component: CreateEventScreen },
    { name: ROUTES.EVENT_DETAIL, component: EventDetailScreen },
    { name: ROUTES.CREATE_POLL, component: CreatePollScreen },
    { name: ROUTES.CREATE_GROUP, component: CreateGroupScreen },
    { name: ROUTES.EDIT_GROUP, component: CreateGroupScreen },
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
    { name: ROUTES.MY_ARTICLES, component: MyArticlesScreen },
    { name: ROUTES.BLOG_FILTER_CATEGORY, component: BlogFilterCategoryScreen },
    { name: ROUTES.BLOG_DETAIL, component: BlogDetailScreen },
    { name: ROUTES.CREATE_BLOG, component: CreateBlogScreen },
    { name: ROUTES.EDIT_BLOG, component: CreateBlogScreen },
    { name: ROUTES.MOVIES, component: MoviesScreen },
    { name: ROUTES.MOVIE_DETAIL, component: MovieDetailScreen },
    { name: ROUTES.CREATE_MOVIE, component: CreateMovieScreen },
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
    { name: ROUTES.USER_DASHBOARD, component: UserDashboardScreen },
    { name: ROUTES.SETTINGS_MY_INFO, component: MyInfoScreen },
    { name: ROUTES.SETTINGS_ADDRESS, component: AddressScreen },
    { name: ROUTES.EDIT_PROFILE, component: EditProfileScreen },
    { name: ROUTES.SETTINGS_MESSAGES, component: MessageScreen },
    { name: ROUTES.WITHDRAWAL, component: WithdrawalScreen },
    { name: ROUTES.ADVERTISING, component: AdvertisingScreen },
    { name: ROUTES.AD_DETAILS, component: AdDetailsScreen },
    { name: ROUTES.CREATE_AD, component: CreateAdScreen },
    { name: ROUTES.CREATE_REEL, component: CreateReelScreen },
    { name: ROUTES.CREATE_POST, component: CreatePostScreen },
    { name: ROUTES.CREATE_STORY, component: CreateStoryScreen },
    { name: ROUTES.STORY_VIEWER, component: StoryViewerScreen },
    { name: ROUTES.STORIES_LIST, component: StoriesListScreen },
    { name: ROUTES.AVATAR_VIEWER, component: AvatarViewerScreen },
    { name: ROUTES.COVER_VIEWER, component: CoverViewerScreen },
    { name: ROUTES.CREATE_GROUP_CHAT, component: CreateGroupChatScreen },
    { name: ROUTES.GROUP_INFO, component: GroupInfoScreen },
    { name: ROUTES.LIVE, component: LiveScreen },
    { name: ROUTES.LIVE_ROOM, component: LiveRoomScreen },
    { name: ROUTES.GO_LIVE, component: GoLiveScreen },
    { name: ROUTES.POKE, component: PokeScreen },
    { name: ROUTES.FORUM, component: ForumScreen },
  ];
}
