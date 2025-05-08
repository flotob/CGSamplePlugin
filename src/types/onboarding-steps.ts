// Basic Quizmaster Step Types

export interface QuizQuestionOption {
  id: string; // e.g., 'opt1', 'opt2'
  text: string;
}

export interface QuizQuestion {
  id: string; // e.g., 'q1', 'q2'
  text: string;
  options: QuizQuestionOption[];
  correctOptionId: string; // References id of one of the options
  points?: number; // Optional: points for this question
}

export interface QuizmasterBasicSpecificConfig {
  questions: QuizQuestion[];
  passingScore?: number; // Optional: minimum points or percentage to pass (e.g., points or 0-100 for percentage)
  showFeedback?: boolean; // Optional: whether to show correct/incorrect after each question
}

export interface UserQuizAnswer {
  questionId: string; // References QuizQuestion.id
  selectedOptionId: string; // References QuizQuestionOption.id
  isCorrect: boolean;
  pointsAwarded?: number;
}

export interface QuizmasterBasicVerifiedData {
  answers: UserQuizAnswer[];
  totalScore: number;
  passed: boolean; // Determined by comparing totalScore against passingScore
  attemptTimestamp: string; // ISO 8601 string
}

// TODO: Add AI Quizmaster types here later (QuizmasterAiSpecificConfig, QuizmasterAiVerifiedData etc.) 