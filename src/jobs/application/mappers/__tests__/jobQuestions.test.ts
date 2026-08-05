import { mapJobQuestions } from '../jobQuestions';

describe('mapJobQuestions', () => {
  it('maps free-text, yes-no and multiple-choice questions in display order', () => {
    expect(
      mapJobQuestions({
        question_one: 'Vì sao bạn phù hợp?',
        question_one_type: 'free_text_question',
        question_two: 'Bạn có thể đi làm ngay?',
        question_two_type: 'yes_no_question',
        question_three: 'Kinh nghiệm của bạn?',
        question_three_type: 'multiple_choice_question',
        question_three_answers: ['Dưới 1 năm', '1-3 năm', 'Trên 3 năm'],
      }),
    ).toEqual([
      {
        key: 'one',
        prompt: 'Vì sao bạn phù hợp?',
        type: 'free_text_question',
        options: [],
      },
      {
        key: 'two',
        prompt: 'Bạn có thể đi làm ngay?',
        type: 'yes_no_question',
        options: [],
      },
      {
        key: 'three',
        prompt: 'Kinh nghiệm của bạn?',
        type: 'multiple_choice_question',
        options: [
          { value: '0', label: 'Dưới 1 năm' },
          { value: '1', label: '1-3 năm' },
          { value: '2', label: 'Trên 3 năm' },
        ],
      },
    ]);
  });

  it('accepts JSON encoded legacy option data and ignores empty questions', () => {
    expect(
      mapJobQuestions({
        question_one: '',
        question_two: 'Chọn ca làm',
        question_two_type: 'multiple_choice_question',
        question_two_answers: '{"0":"Ca sáng","1":"Ca tối"}',
      }),
    ).toEqual([
      {
        key: 'two',
        prompt: 'Chọn ca làm',
        type: 'multiple_choice_question',
        options: [
          { value: '0', label: 'Ca sáng' },
          { value: '1', label: 'Ca tối' },
        ],
      },
    ]);
  });
});
