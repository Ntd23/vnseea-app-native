// Description: Poll domain types based on WoWonder API responses.

export type PollOption = {
  id: string;
  text: string;
  optionVotes: number;
  percentage: string;
  percentageNum: number;
  all: number;
};

export type Poll = {
  pollId: number;
  options: PollOption[];
  votedId: string | null; // null = chưa vote, otherwise option id đã vote
};

export type CreatePollPayload = {
  question: string;
  options: string[]; // 2-6 options
};

export type PollVoteResponse = {
  options: PollOption[];
};