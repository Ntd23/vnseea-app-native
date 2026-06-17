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
  noPages: string;
  noGroups: string;
  noChats: string;
  loadingPages: string;
  loadingGroups: string;
  loadingChats: string;
  messageUnavailable: string;
  noAccount: string;
  shareOutside: string;
  sharePostTitle: string;
  sharePostSubject: string;
  shareStoryTitle: string;
  shareStorySubject: string;
  noShareTarget: string;
  shareError: string;
  shareNow: string;
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
    noPages: 'Bạn chưa có trang để chia sẻ.',
    noGroups: 'Bạn chưa có nhóm để chia sẻ.',
    noChats: 'Bạn chưa có cuộc trò chuyện nào để chia sẻ.',
    loadingPages: 'Đang tải trang...',
    loadingGroups: 'Đang tải nhóm...',
    loadingChats: 'Đang tải cuộc trò chuyện...',
    messageUnavailable: 'Chia sẻ qua tin nhắn sẽ được bổ sung sau.',
    noAccount: 'Không tìm thấy tài khoản hiện tại.',
    shareOutside: 'Chia sẻ ngoài ứng dụng',
    sharePostTitle: 'Chia sẻ bài viết',
    sharePostSubject: 'Xem bài viết này từ VNSEEA',
    shareStoryTitle: 'Chia sẻ tin',
    shareStorySubject: 'Xem tin mới từ VNSEEA',
    noShareTarget: 'Không có nội dung để chia sẻ.',
    shareError: 'Không thể chia sẻ bài viết.',
    shareNow: 'Chia sẻ ngay',
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
    noPages: 'You do not have a page to share to.',
    noGroups: 'You do not have a group to share to.',
    noChats: 'You do not have any chats to share to.',
    loadingPages: 'Loading pages...',
    loadingGroups: 'Loading groups...',
    loadingChats: 'Loading chats...',
    messageUnavailable: 'Sharing to messages will be added later.',
    noAccount: 'Could not find the current account.',
    shareOutside: 'Share outside the app',
    sharePostTitle: 'Share post',
    sharePostSubject: 'Check out this post on VNSEEA',
    shareStoryTitle: 'Share story',
    shareStorySubject: 'Check out this story on VNSEEA',
    noShareTarget: 'Nothing to share.',
    shareError: 'Could not share this post.',
    shareNow: 'Share now',
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
