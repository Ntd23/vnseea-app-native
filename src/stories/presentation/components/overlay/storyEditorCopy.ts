// Description: Vietnamese and English copy for the full-screen story editor.
import type { StoryFilterId } from '../../../domain/types/stories.types';

export type StoryEditorCopy = {
  tools: {
    sticker: string;
    text: string;
    filter: string;
    mention: string;
    link: string;
  };
  share: string;
  done: string;
  cancel: string;
  textPlaceholder: string;
  textStyle: string;
  stickerTitle: string;
  filters: Record<StoryFilterId, string>;
  mentionTitle: string;
  mentionSearch: string;
  mentionEmpty: string;
  linkTitle: string;
  linkPlaceholder: string;
  linkInvalid: string;
  dragToDelete: string;
  maxItems: (count: number) => string;
  audienceTitle: string;
};

export const STORY_EDITOR_COPY: Record<'vi' | 'en', StoryEditorCopy> = {
  vi: {
    tools: {
      sticker: 'Nhãn dán',
      text: 'Văn bản',
      filter: 'Bộ lọc',
      mention: 'Nhắc đến',
      link: 'Liên kết',
    },
    share: 'Chia sẻ',
    done: 'Xong',
    cancel: 'Huỷ',
    textPlaceholder: 'Nhập nội dung…',
    textStyle: 'Đổi kiểu chữ',
    stickerTitle: 'Nhãn dán',
    filters: {
      none: 'Gốc',
      warm: 'Ấm',
      cool: 'Lạnh',
      rose: 'Hồng',
      vintage: 'Cổ điển',
      dusk: 'Hoàng hôn',
    },
    mentionTitle: 'Nhắc đến',
    mentionSearch: 'Tìm người bạn đang theo dõi',
    mentionEmpty: 'Không tìm thấy ai phù hợp',
    linkTitle: 'Thêm liên kết',
    linkPlaceholder: 'Dán hoặc nhập liên kết',
    linkInvalid: 'Liên kết không hợp lệ. Chỉ hỗ trợ trang web http:// hoặc https://.',
    dragToDelete: 'Kéo vào đây để xoá',
    maxItems: count => `Mỗi tin có tối đa ${count} mục.`,
    audienceTitle: 'Ai có thể xem tin này?',
  },
  en: {
    tools: {
      sticker: 'Stickers',
      text: 'Text',
      filter: 'Filters',
      mention: 'Mention',
      link: 'Link',
    },
    share: 'Share',
    done: 'Done',
    cancel: 'Cancel',
    textPlaceholder: 'Start typing…',
    textStyle: 'Change text style',
    stickerTitle: 'Stickers',
    filters: {
      none: 'Original',
      warm: 'Warm',
      cool: 'Cool',
      rose: 'Rose',
      vintage: 'Vintage',
      dusk: 'Dusk',
    },
    mentionTitle: 'Mention',
    mentionSearch: 'Search people you follow',
    mentionEmpty: 'No one matches',
    linkTitle: 'Add link',
    linkPlaceholder: 'Paste or type a link',
    linkInvalid: 'Invalid link. Only http:// or https:// web pages are supported.',
    dragToDelete: 'Drag here to delete',
    maxItems: count => `A story can have up to ${count} items.`,
    audienceTitle: 'Who can see this story?',
  },
};
