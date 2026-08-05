import { validateJobApplication } from '../jobApplicationValidation';

const questions = [
  {
    key: 'one' as const,
    prompt: 'Bạn có thể đi làm ngay?',
    type: 'yes_no_question' as const,
    options: [],
  },
];

describe('validateJobApplication', () => {
  it('normalizes valid contact data and answers', () => {
    expect(
      validateJobApplication(
        {
          userName: ' Nguyễn Văn A ',
          phoneNumber: '090 123 4567',
          email: ' USER@example.com ',
          location: ' Hà Nội ',
          position: '',
          workplace: '',
          experienceDescription: '',
          experienceStartDate: '',
          experienceEndDate: '',
          currentlyWork: false,
          answers: { one: 'yes' },
        },
        questions,
        'vi',
      ),
    ).toEqual({
      ok: true,
      value: expect.objectContaining({
        userName: 'Nguyễn Văn A',
        phoneNumber: '0901234567',
        email: 'user@example.com',
        location: 'Hà Nội',
        answers: { one: 'yes' },
      }),
    });
  });

  it('requires every contact field and configured question', () => {
    const result = validateJobApplication(
      {
        userName: '',
        phoneNumber: '123',
        email: 'invalid',
        location: '',
        position: '',
        workplace: '',
        experienceDescription: '',
        experienceStartDate: '',
        experienceEndDate: '',
        currentlyWork: false,
        answers: {},
      },
      questions,
      'vi',
    );

    expect(result).toEqual({
      ok: false,
      errors: expect.objectContaining({
        userName: expect.any(String),
        phoneNumber: expect.any(String),
        email: expect.any(String),
        location: expect.any(String),
        question_one: expect.any(String),
      }),
    });
  });
});
