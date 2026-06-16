// Description: Defines backend API and app route names shared across bounded contexts.
// NOTE: Route paths do NOT include /api prefix - BASE_URL already contains it.
// WoWonder .htaccess: /api/{type} → api-v2.php?type={type}
export const apiRoutes = {
  auth: {
    login: 'auth',
    register: 'create-account',
    socialLogin: 'social-login',
    logout: 'delete-access-token',
    forgotPassword: 'send-reset-password-email',
    resetPassword: 'reset_password',
    confirmAccount: 'active_account_sms',
    me: 'get-current-user',
    siteSettings: 'get-site-settings',
  },
  user: {
    get: 'get-user-data',
    update: 'update-user-data',
    suggestions: 'get-user-suggestions',
    nearby: 'get-nearby-users',
    nearbyPlaces: 'nearby',
    mapDiscovery: 'map_discovery',
    friends: 'get-friends', // GET following/followers
    updateCover: 'update-user-data', // POST multipart - uses v2 endpoint that handles both avatar and cover
    verification: 'verification',
    address: 'address',
    sessions: 'sessions',
    blockedUsers: 'get-blocked-users',
  },
  reels: {
    create: 'new_post',
    hashtagSuggestions: 'hashtag-suggestions',
  },
  feed: {
    posts: 'posts',
    recommended: 'recommended-feed',
    recommendationEvents: 'recommendation-events',
    newPost: 'new_post',
    postActions: 'post-actions',
    postReactions: 'post-reactions',
    comments: 'comments',
    getPost: 'get-post-data',
    generalData: 'get-general-data',
  },
  social: {
    follow: 'follow-user',
    followRequest: 'follow-request-action',
    block: 'block-user',
    friends: 'get-friends',
    friendsList: 'get-friends',  // v2 - supports following/followers
    poke: 'poke',
  },
  search: {
    all: 'search',
  },
  poll: {
    vote: 'vote_up',
  },
  stories: {
    get: 'get-stories',
    getUserStories: 'get-user-stories',
    create: 'create-story',
    delete: 'delete-story',
    react: 'react_story',
  },
  live: {
    main: 'live',
    friends: 'get_live_friends',
  },
  messages: {
    chats: 'get_chats',
    groupChat: 'group_chat',
    send: 'send-message',
    messages: 'get_user_messages',
    read: 'read_chats',
    typing: 'set-chat-typing-status',
    delete: 'delete-conversation',
    livekit: 'livekit',
    groupCall: 'group_call',
    labels: 'tags',
  },
  products: {
    get: 'get-products',
    create: 'create-product',
    update: 'edit-product',
    getCategories: 'get-products',
  },
  events: {
    get: 'get-events',
    create: 'create-event',
    actions: 'events',
  },
  ads: {
    main: 'ads',
  },
  pages: {
    create: 'create-page',
    getMine: 'get-my-pages',
    recommended: 'fetch-recommended',
    getById: 'get-page-data',
    update: 'update-page-data',
    like: 'like-page',
    follow: 'follow-page',
    followers: 'get-page-followers',
    invites: 'get-page-invites',
    invite: 'invite-page',
    admins: 'get_page_admins',
    reviews: 'page_reviews',
    rate: 'rate_page',
    report: 'report_page',
  },
  offers: {
    get: 'offer',
    create: 'offer',
    edit: 'offer',
    delete: 'offer',
  },
  groups: {
    create: 'create-group',
    getMine: 'get-my-groups',
    recommended: 'fetch-recommended',
  },
  blogs: {
    get: 'get-articles',
    getById: 'get-blog-by-id',
    create: 'create-blog',
  },
  photos: {
    getUserAlbums: 'get-user-albums',
    create: 'albums', // POST with type=create
  },
  notifications: {
    list: 'get-general-data', // v2 API - fetch=notifications
    delete: 'notifications', // v2 API - type=delete
    markSeen: 'notifications', // v2 API - type=mark_seen
  },
  wallet: {
    overview: 'wallet-overview',
    affiliates: 'settings-affiliates',
    pointsExchange: 'points-exchange',
    stripe: 'stripe',
    sepay: 'sepay',
  },
  withdrawal: {
    overview: 'withdrawal-overview',
    request: 'withdraw',
  },
  funding: {
    list: 'funding',
    userFunding: 'funding', // type=user_funding
    detail: 'funding', // type=get_by_id
    recentDonations: 'funding', // type=get_recent_donations
    pay: 'funding', // type=pay
  },
  popular: {
    mostLiked: 'most_liked',
  },
  movies: {
    get: 'get-movies',
    comments: 'movies_comments',
  },
} as const;

export const appRoutes = {
  login: 'Login',
  register: 'Register',
  forgotPassword: 'ForgotPassword',
  feed: 'Feed',
  profile: 'Profile',
  settings: 'Settings',
  messages: 'Messages',
  chat: 'Chat',
} as const;
