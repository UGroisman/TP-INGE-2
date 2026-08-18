export interface LandingStat {
  label: string;
  value: string;
  detail: string;
}

export interface LandingAction {
  href: string;
  label: string;
  description: string;
}

export interface LandingStudyStats {
  correctAnswers: number;
  totalAttempts: number;
  accuracy: number | null;
  topicsPracticed: number;
}
