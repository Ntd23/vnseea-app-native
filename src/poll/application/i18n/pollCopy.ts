import type { AppLanguage } from '../../../shared-kernel/infrastructure/storage/languageStorage';

export interface PollCopy {
  headerTitle: string;
  backA11yLabel: string;
  publishA11yLabel: string;
  publishButton: string;
  heroTitle: string;
  heroDescription: string;
  questionLabel: string;
  questionPlaceholder: string;
  optionsLabel: string;
  optionPlaceholder: (index: number) => string;
  removeOption: string;
  removeOptionA11yLabel: (index: number) => string;
  addOption: string;
  addOptionA11yLabel: string;
  tipsTitle: string;
  tipsDescription: (min: number, max: number) => string;
  readyToPublish: string;
  completeForm: string;
  underReviewSuccess: string;
  publishedSuccess: string;
  createErrorFallback: string;
  voteErrorFallback: string;
  dismissErrorA11yLabel: string;
}

export const POLL_COPY: Record<AppLanguage, PollCopy> = {
  vi: {
    headerTitle: 'Tạo cuộc thăm dò',
    backA11yLabel: 'Quay lại',
    publishA11yLabel: 'Đăng cuộc thăm dò',
    publishButton: 'Đăng',
    heroTitle: 'Hỏi ý kiến cộng đồng',
    heroDescription: 'Tạo cuộc thăm dò để thu thập ý kiến từ bạn bè',
    questionLabel: 'Câu hỏi của bạn',
    questionPlaceholder: 'Bạn muốn hỏi gì?',
    optionsLabel: 'Phương án trả lời',
    optionPlaceholder: index => `Phương án ${index}`,
    removeOption: 'Xóa phương án',
    removeOptionA11yLabel: index => `Xóa phương án ${index}`,
    addOption: 'Thêm phương án',
    addOptionA11yLabel: 'Thêm phương án trả lời',
    tipsTitle: 'Mẹo tạo cuộc thăm dò hiệu quả',
    tipsDescription: (min, max) =>
      `Cần tối thiểu ${min} phương án trả lời. Bạn có thể thêm tối đa ${max} phương án. Cuộc thăm dò sẽ được đăng lên bảng tin để bạn bè bình chọn.`,
    readyToPublish: 'Sẵn sàng đăng',
    completeForm: 'Điền đầy đủ thông tin để tiếp tục',
    underReviewSuccess: 'Đã gửi, bài đang chờ duyệt!',
    publishedSuccess: 'Đăng thành công!',
    createErrorFallback: 'Không thể tạo cuộc thăm dò',
    voteErrorFallback: 'Không thể bình chọn',
    dismissErrorA11yLabel: 'Đóng thông báo lỗi',
  },
  en: {
    headerTitle: 'Create poll',
    backA11yLabel: 'Go back',
    publishA11yLabel: 'Publish poll',
    publishButton: 'Publish',
    heroTitle: 'Ask the community',
    heroDescription: 'Create a poll to collect opinions from your friends',
    questionLabel: 'Your question',
    questionPlaceholder: 'What would you like to ask?',
    optionsLabel: 'Answer options',
    optionPlaceholder: index => `Option ${index}`,
    removeOption: 'Remove option',
    removeOptionA11yLabel: index => `Remove option ${index}`,
    addOption: 'Add option',
    addOptionA11yLabel: 'Add an answer option',
    tipsTitle: 'Tips for an effective poll',
    tipsDescription: (min, max) =>
      `At least ${min} answer options are required. You can add up to ${max} options. The poll will be published to the feed for your friends to vote.`,
    readyToPublish: 'Ready to publish',
    completeForm: 'Complete the information to continue',
    underReviewSuccess: 'Submitted and awaiting review!',
    publishedSuccess: 'Published successfully!',
    createErrorFallback: 'Unable to create the poll',
    voteErrorFallback: 'Unable to vote',
    dismissErrorA11yLabel: 'Dismiss error message',
  },
};
