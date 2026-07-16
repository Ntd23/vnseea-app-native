// Description: Centralized i18n copy for the post-share bottom sheet.
// Mirrors the AppLanguage + Record<AppLanguage, Record<key, string>> pattern
// used by notificationCopy.ts and useSettingsViewModel. Consuming components
// read this through useAppLanguage() so language changes propagate the same
// way as the comment sheet, settings, and notifications.

import type { AppLanguage } from '../../../shared-kernel/infrastructure/storage/languageStorage';

export interface ShareCopy {
  closeAria: string;
  title: string;
  orShareTo: string;
  addNotePlaceholder: string;
  destinationLabel: string;
  destTimeline: string;
  destPage: string;
  destGroup: string;
  destMessage: string;
  myProfile: string;
  myProfileDesc: string;
  myPages: string;
  myGroups: string;
  sendToFriends: string;
  sendViaMessages: string;
  shareTo: string;
  destStory: string;
  noPages: string;
  noGroups: string;
  noChats: string;
  loadingPages: string;
  loadingGroups: string;
  loadingChats: string;
  chatLoadFailed: string;
  chatLoadPartial: string;
  retryChats: string;
  selectMessageRecipient: string;
  selectedRecipients: (count: number, maximum: number) => string;
  recipientLimitReached: (maximum: number) => string;
  recipientPending: string;
  recipientSending: string;
  recipientSent: string;
  recipientFailed: string;
  messagePartialFailure: (sent: number, failed: number) => string;
  messageShareSuccess: (count: number) => string;
  noAccount: string;
  shareOutside: string;
  sharePostTitle: string;
  sharePostSubject: string;
  shareStoryTitle: string;
  shareStorySubject: string;
  noShareTarget: string;
  shareError: string;
  shareNow: string;
  shareTimeline: string;
  sharePage: string;
  shareGroup: string;
  shareStory: string;
  storyShareSuccess: string;
  storyShareFailed: string;
  storyPreparing: string;
  sendMessageRecipients: (count: number) => string;
  retryMessageRecipients: (count: number) => string;
  copyLink: string;
  more: string;
  copied: string;
  copyFailed: string;
  shareFailed: string;
}

export const SHARE_COPY: Record<AppLanguage, ShareCopy> = {
  vi: {
    closeAria: 'Đóng chia sẻ',
    title: 'Chia sẻ bài viết',
    orShareTo: 'hoặc chia sẻ lên',
    addNotePlaceholder: 'Thêm ghi chú cho bài chia sẻ...',
    destinationLabel: 'Đích chia sẻ',
    destTimeline: 'Dòng thời gian',
    destPage: 'Trang',
    destGroup: 'Nhóm',
    destMessage: 'Tin nhắn',
    myProfile: 'Trang cá nhân của tôi',
    myProfileDesc: 'Bài chia sẻ sẽ xuất hiện trên dòng thời gian cá nhân.',
    myPages: 'Trang của tôi',
    myGroups: 'Nhóm của tôi',
    sendToFriends: 'Gửi tới bạn bè',
    sendViaMessages: 'Gửi qua Tin nhắn',
    shareTo: 'Chia sẻ đến',
    destStory: 'Tin của bạn',
    noPages: 'Bạn chưa có trang để chia sẻ.',
    noGroups: 'Bạn chưa có nhóm để chia sẻ.',
    noChats: 'Bạn chưa có cuộc trò chuyện nào để chia sẻ.',
    loadingPages: 'Đang tải trang...',
    loadingGroups: 'Đang tải nhóm...',
    loadingChats: 'Đang tải cuộc trò chuyện...',
    chatLoadFailed: 'Không tải được danh sách cuộc trò chuyện.',
    chatLoadPartial: 'Một phần danh sách cuộc trò chuyện chưa tải được.',
    retryChats: 'Thử tải lại',
    selectMessageRecipient: 'Chọn ít nhất một người nhận.',
    selectedRecipients: (count, maximum) => `Đã chọn ${count}/${maximum}`,
    recipientLimitReached: maximum =>
      `Mỗi lần chỉ có thể chọn tối đa ${maximum} cuộc trò chuyện.`,
    recipientPending: 'Chờ gửi',
    recipientSending: 'Đang gửi',
    recipientSent: 'Đã gửi',
    recipientFailed: 'Gửi thất bại',
    messagePartialFailure: (sent, failed) =>
      `Đã gửi đến ${sent} cuộc trò chuyện, còn ${failed} cuộc chưa nhận được.`,
    messageShareSuccess: count =>
      `Đã gửi bài viết đến ${count} cuộc trò chuyện.`,
    noAccount: 'Không tìm thấy tài khoản hiện tại.',
    shareOutside: 'Chia sẻ ngoài ứng dụng',
    sharePostTitle: 'Chia sẻ bài viết',
    sharePostSubject: 'Xem bài viết này từ VNSEEA',
    shareStoryTitle: 'Chia sẻ tin',
    shareStorySubject: 'Xem tin mới từ VNSEEA',
    noShareTarget: 'Không có nội dung để chia sẻ.',
    shareError: 'Không thể chia sẻ bài viết.',
    shareNow: 'Chia sẻ ngay',
    shareTimeline: 'Chia sẻ lên dòng thời gian',
    sharePage: 'Chia sẻ lên Trang',
    shareGroup: 'Chia sẻ vào Nhóm',
    shareStory: 'Đăng lên Tin',
    storyShareSuccess: 'Đã đăng bài viết lên Tin của bạn.',
    storyShareFailed: 'Không thể tạo Tin từ bài viết này.',
    storyPreparing: 'Đang chuẩn bị thẻ Tin...',
    sendMessageRecipients: count => `Gửi đến ${count} cuộc trò chuyện`,
    retryMessageRecipients: count => `Thử lại ${count} cuộc trò chuyện`,
    copyLink: 'Sao chép',
    more: 'Khác',
    copied: 'Đã sao chép liên kết',
    copyFailed: 'Không thể sao chép liên kết',
    shareFailed: 'Không thể chia sẻ bài viết',
  },
  en: {
    closeAria: 'Close share',
    title: 'Share post',
    orShareTo: 'or share to',
    addNotePlaceholder: 'Add a note to this share...',
    destinationLabel: 'Share destination',
    destTimeline: 'Timeline',
    destPage: 'Page',
    destGroup: 'Group',
    destMessage: 'Message',
    myProfile: 'My profile',
    myProfileDesc: 'The shared post will appear on your profile timeline.',
    myPages: 'My pages',
    myGroups: 'My groups',
    sendToFriends: 'Send to friends',
    sendViaMessages: 'Send via Messages',
    shareTo: 'Share to',
    destStory: 'Your story',
    noPages: 'You do not have a page to share to.',
    noGroups: 'You do not have a group to share to.',
    noChats: 'You do not have any chats to share to.',
    loadingPages: 'Loading pages...',
    loadingGroups: 'Loading groups...',
    loadingChats: 'Loading chats...',
    chatLoadFailed: 'Could not load conversations.',
    chatLoadPartial: 'Some conversations could not be loaded.',
    retryChats: 'Try loading again',
    selectMessageRecipient: 'Select at least one recipient.',
    selectedRecipients: (count, maximum) => `Selected ${count}/${maximum}`,
    recipientLimitReached: maximum =>
      `You can select up to ${maximum} conversations at a time.`,
    recipientPending: 'Pending',
    recipientSending: 'Sending',
    recipientSent: 'Sent',
    recipientFailed: 'Failed',
    messagePartialFailure: (sent, failed) =>
      `Sent to ${sent} conversations; ${failed} conversations have not received it.`,
    messageShareSuccess: count => `Post sent to ${count} conversations.`,
    noAccount: 'Could not find the current account.',
    shareOutside: 'Share outside the app',
    sharePostTitle: 'Share post',
    sharePostSubject: 'Check out this post on VNSEEA',
    shareStoryTitle: 'Share story',
    shareStorySubject: 'Check out this story on VNSEEA',
    noShareTarget: 'Nothing to share.',
    shareError: 'Could not share this post.',
    shareNow: 'Share now',
    shareTimeline: 'Share to timeline',
    sharePage: 'Share to Page',
    shareGroup: 'Share to Group',
    shareStory: 'Post to Story',
    storyShareSuccess: 'Post added to your Story.',
    storyShareFailed: 'Could not create a Story from this post.',
    storyPreparing: 'Preparing Story card...',
    sendMessageRecipients: count => `Send to ${count} conversations`,
    retryMessageRecipients: count => `Retry ${count} conversations`,
    copyLink: 'Copy',
    more: 'More',
    copied: 'Link copied',
    copyFailed: 'Could not copy link',
    shareFailed: 'Could not share this post',
  },
};

export function getShareCopy(language: AppLanguage): ShareCopy {
  return SHARE_COPY[language];
}
