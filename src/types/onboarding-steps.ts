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

// --- AI Quizmaster Step Types ---

export interface AIModelSettings {
  model?: string; // e.g., 'gpt-4-turbo-preview', 'gpt-4', 'gpt-3.5-turbo'
  temperature?: number; // 0.0 to 2.0
  maxTokens?: number; // Max tokens to generate for a completion
  // Other OpenAI API parameters like top_p, frequency_penalty, presence_penalty could be added if needed
}

export interface QuizmasterAiSpecificConfig {
  knowledgeBase: string; // Could be plain text, Markdown, or even stringified JSON for structured content
  agentPersonality: string; // Text describing the AI's persona and high-level instructions
  taskChallenge: string; // Specific quiz task, success criteria, or questions for the AI to pose/manage
  aiModelSettings?: AIModelSettings; // Optional settings for the AI model
  // Consider if function call definitions need to be dynamic or are always hardcoded in the API route
  // example: advancedFunctions?: OpenAI.Chat.Completions.ChatCompletionCreateParams.Function[];
}

// Simplified message structure for storing in verified_data if needed (not the full Vercel AI SDK Message)
export interface StoredChatMessage {
  role: 'user' | 'assistant' | 'system' | 'function'; // Can be extended if other roles are used
  content: string | null;
  name?: string; // For function role, the name of the function that was called
  // We might not store full OpenAI.Chat.Completions.ChatCompletionMessageParam for brevity
  // Or, if storing a full transcript is too verbose, this might just be a summary string.
}

export interface QuizmasterAiVerifiedData {
  passed: boolean; // True if the AI determined the user passed (e.g., via function call)
  reason?: string; // Optional reason or summary from the AI or system about the outcome
  score?: number; // Optional: if the AI is tasked with providing a score
  chatMessageCount?: number; // Total messages exchanged in this quiz attempt (useful for usage tracking insights)
  // Option 1: Store a few key messages or a summary instead of full transcript to save space/complexity
  conversationSummary?: string; // e.g., "User correctly answered 2/3 questions about X."
  // Option 2: Store a limited number of recent messages (e.g., last 5-10 messages)
  // recentTranscript?: StoredChatMessage[]; 
  // Option 3: If function calls return data, it could be stored here
  // functionCallOutput?: Record<string, any>; 
  attemptTimestamp: string; // ISO 8601 string for when the attempt was finalized
}

// TODO: Add AI Quizmaster types here later (QuizmasterAiSpecificConfig, QuizmasterAiVerifiedData etc.)

export interface LuksoConnectProfileSpecificConfig {
  customPrompt?: string | null;
}

export interface LuksoConnectProfileVerifiedData {
  upAddress: string;
  [key: string]: unknown; // Changed from any to unknown
} 