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
  },
  user: {
    get: 'get-user-data',
    update: 'update-user-data',
    suggestions: 'get-user-suggestions',
    nearby: 'get-nearby-users',
  },
  reels: {
    create: 'new_post',
    hashtagSuggestions: 'hashtag-suggestions',
  },
  feed: {
    posts: 'posts',
    newPost: 'new_post',
    postActions: 'post-actions',
    comments: 'comments',
    getPost: 'get-post-data',
    generalData: 'get-general-data',
  },
  social: {
    follow: 'follow-user',
    followRequest: 'follow-request-action',
    block: 'block-user',
    friends: 'get-friends',
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
  messages: {
    chats: 'get_chats',
    send: 'send-message',
    messages: 'get_user_messages',
    typing: 'set-chat-typing-status',
    delete: 'delete-conversation',
  },
  products: {
    get: 'get-products',
    create: 'create-product',
    update: 'edit-product',
    getCategories: 'get-products',
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
