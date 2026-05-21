// Description: Defines backend API and app route names shared across bounded contexts.
export const apiRoutes = {
  auth: {
    login: '/api/auth',
    register: '/api/create-account',
    socialLogin: '/api/social-login',
    logout: '/api/delete-access-token',
    forgotPassword: '/api/send-reset-password-email',
    resetPassword: '/api/reset_password',
    confirmAccount: '/api/active_account_sms',
    me: '/api/get-current-user',
  },
  user: {
    get: '/api/get-user-data',
    update: '/api/update-user-data',
    suggestions: '/api/get-user-suggestions',
    nearby: '/api/get-nearby-users',
  },
  feed: {
    posts: '/api/posts',
    newPost: '/api/new_post',
    postActions: '/api/post-actions',
    getPost: '/api/get-post-data',
    generalData: '/api/get-general-data',
  },
  social: {
    follow: '/api/follow-user',
    followRequest: '/api/follow-request-action',
    block: '/api/block-user',
    friends: '/api/get-friends',
  },
  stories: {
    get: '/api/get-stories',
    create: '/api/create-story',
    delete: '/api/delete-story',
    react: '/api/react_story',
  },
  messages: {
    chats: '/api/get_chats',
    send: '/api/send-message',
    messages: '/api/get_user_messages',
    typing: '/api/set-chat-typing-status',
    delete: '/api/delete-conversation',
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
