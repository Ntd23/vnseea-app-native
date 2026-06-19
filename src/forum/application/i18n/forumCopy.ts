// Forum i18n copy
// Port từ: client/src/forum/application/i18n/

import type { AppLanguage } from '../../../shared-kernel/infrastructure/storage/languageStorage';

export const forumCopy: Record<AppLanguage, ForumCopy> = {
  vi: {
    title: 'Diễn đàn',
    searchPlaceholder: 'Tìm kiếm diễn đàn...',
    noForums: 'Không có diễn đàn nào',
    posts: 'Bài viết',
    threads: 'Chủ đề',
    replies: 'Trả lời',
    views: 'Lượt xem',
    createThread: 'Tạo chủ đề',
    reply: 'Trả lời',
    loading: 'Đang tải...',
    error: 'Có lỗi xảy ra',
    myThreads: 'Chủ đề của tôi',
    allThreads: 'Tất cả chủ đề',
    threadTitle: 'Tiêu đề',
    threadContent: 'Nội dung',
    submit: 'Gửi',
    cancel: 'Hủy',
    back: 'Quay lại',
    forumNotFound: 'Không tìm thấy diễn đàn',
    threadNotFound: 'Không tìm thấy chủ đề',
    createThreadSuccess: 'Đã tạo chủ đề thành công',
    replySuccess: 'Đã trả lời thành công',
    titleRequired: 'Tiêu đề là bắt buộc',
    contentRequired: 'Nội dung là bắt buộc',
    titleTooShort: 'Tiêu đề phải có ít nhất 10 ký tự',
    contentTooShort: 'Nội dung phải có ít nhất 32 ký tự',
  },
  en: {
    title: 'Forum',
    searchPlaceholder: 'Search forums...',
    noForums: 'No forums available',
    posts: 'Posts',
    threads: 'Threads',
    replies: 'Replies',
    views: 'Views',
    createThread: 'Create Thread',
    reply: 'Reply',
    loading: 'Loading...',
    error: 'An error occurred',
    myThreads: 'My Threads',
    allThreads: 'All Threads',
    threadTitle: 'Title',
    threadContent: 'Content',
    submit: 'Submit',
    cancel: 'Cancel',
    back: 'Back',
    forumNotFound: 'Forum not found',
    threadNotFound: 'Thread not found',
    createThreadSuccess: 'Thread created successfully',
    replySuccess: 'Reply sent successfully',
    titleRequired: 'Title is required',
    contentRequired: 'Content is required',
    titleTooShort: 'Title must be at least 10 characters',
    contentTooShort: 'Content must be at least 32 characters',
  },
};

export type ForumCopyKey = keyof typeof forumCopy.vi;

export interface ForumCopy {
  title: string;
  searchPlaceholder: string;
  noForums: string;
  posts: string;
  threads: string;
  replies: string;
  views: string;
  createThread: string;
  reply: string;
  loading: string;
  error: string;
  myThreads: string;
  allThreads: string;
  threadTitle: string;
  threadContent: string;
  submit: string;
  cancel: string;
  back: string;
  forumNotFound: string;
  threadNotFound: string;
  createThreadSuccess: string;
  replySuccess: string;
  titleRequired: string;
  contentRequired: string;
  titleTooShort: string;
  contentTooShort: string;
}
