import { POLL_COPY } from '../pollCopy';

describe('poll copy', () => {
  it('provides fully accented Vietnamese copy and dynamic option text', () => {
    const copy = POLL_COPY.vi;

    expect(copy.headerTitle).toBe('Tạo cuộc thăm dò');
    expect(copy.questionLabel).toBe('Câu hỏi của bạn');
    expect(copy.optionPlaceholder(3)).toBe('Phương án 3');
    expect(copy.tipsDescription(2, 6)).toContain(
      'Cần tối thiểu 2 phương án trả lời',
    );
    expect(copy.readyToPublish).toBe('Sẵn sàng đăng');
    expect(copy.createErrorFallback).toBe('Không thể tạo cuộc thăm dò');
  });

  it('provides equivalent English copy and dynamic option text', () => {
    const copy = POLL_COPY.en;

    expect(copy.headerTitle).toBe('Create poll');
    expect(copy.questionLabel).toBe('Your question');
    expect(copy.optionPlaceholder(3)).toBe('Option 3');
    expect(copy.tipsDescription(2, 6)).toContain(
      'At least 2 answer options are required',
    );
    expect(copy.readyToPublish).toBe('Ready to publish');
    expect(copy.createErrorFallback).toBe('Unable to create the poll');
  });
});
