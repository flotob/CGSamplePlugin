'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  QuizmasterBasicSpecificConfig,
  QuizmasterBasicVerifiedData,
  QuizQuestion, // Needed to type the current question
  UserQuizAnswer 
} from '@/types/onboarding-steps'; // Adjust path if necessary
import type { UserStepProgress } from '@/app/api/user/wizards/[id]/steps/route'; // Import the correct type

// TODO: Define or import the actual UserStepProgress type.
// Assuming a structure based on user_wizard_progress table and likely usage.
// interface UserStepProgress {
//   user_id: string;
//   wizard_id: string;
//   step_id: string;
//   config?: { // This comes from the joined onboarding_steps table
//     presentation?: Record<string, unknown>;
//     specific?: Record<string, unknown>;
//   };
//   completed_at: string | null;
//   verified_data?: Record<string, unknown> | null;
// }

import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle } from 'lucide-react'; // Icons for feedback
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface QuizmasterBasicDisplayProps {
  step: UserStepProgress;
  onComplete: (verifiedData?: Record<string, unknown>) => void;
}

// Type guard to check if specific config is QuizmasterBasicSpecificConfig
function isQuizmasterBasicConfig(config: any): config is QuizmasterBasicSpecificConfig {
  return config && typeof config === 'object' && Array.isArray(config.questions);
}

const QuizmasterBasicDisplay: React.FC<QuizmasterBasicDisplayProps> = ({ step, onComplete }) => {
  // Safely extract and validate the specific configuration
  const config = useMemo(() => {
    const specificConfig = step.config?.specific;
    if (isQuizmasterBasicConfig(specificConfig)) {
      return specificConfig;
    }
    return null;
  }, [step.config?.specific]);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  // Store answers as { questionId: selectedOptionId }
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({}); 
  const [isSubmitted, setIsSubmitted] = useState<boolean>(!!step.completed_at);
  // Store the calculated results after submission
  const [results, setResults] = useState<QuizmasterBasicVerifiedData | null>(step.verified_data as QuizmasterBasicVerifiedData | null);
  // State for instant feedback
  const [feedbackStatus, setFeedbackStatus] = useState<'correct' | 'incorrect' | null>(null);

  // Derived state for easier access
  const totalQuestions = config?.questions?.length ?? 0;
  const currentQuestion: QuizQuestion | undefined = config?.questions?.[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  // Effect to potentially auto-complete if already completed (idempotency)
  useEffect(() => {
    if (step.completed_at && !results) {
      // If the step is marked completed in the prop, but we haven't processed results locally,
      // try to set results from verified_data or mark as submitted.
      setIsSubmitted(true);
      setResults(step.verified_data as QuizmasterBasicVerifiedData | null);
      // Optionally call onComplete again if needed, but might cause loops if not handled carefully
      // if (step.verified_data) {
      //   onComplete(step.verified_data);
      // }
    }
  }, [step.completed_at, step.verified_data, results, onComplete]);

  // Reset feedback when question changes
  useEffect(() => {
    setFeedbackStatus(null);
  }, [currentQuestionIndex]);

  const handleOptionSelect = (questionId: string, selectedOptionId: string) => {
    setUserAnswers(prev => ({ ...prev, [questionId]: selectedOptionId }));
    
    // Handle instant feedback
    if (config?.showFeedback && currentQuestion) {
      const isCorrect = selectedOptionId === currentQuestion.correctOptionId;
      setFeedbackStatus(isCorrect ? 'correct' : 'incorrect');
    }
  };

  const handleNextQuestion = () => {
    if (!isLastQuestion) {
      setFeedbackStatus(null); // Reset feedback before moving
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handleSubmitQuiz = () => {
    if (!config || !config.questions) return;

    let score = 0;
    const detailedAnswers: UserQuizAnswer[] = config.questions.map(q => {
      const selectedOptionId = userAnswers[q.id];
      const isCorrect = selectedOptionId === q.correctOptionId;
      const pointsAwarded = isCorrect ? (q.points ?? 1) : 0;
      if (isCorrect) {
        score += pointsAwarded;
      }
      return { 
        questionId: q.id,
        selectedOptionId: selectedOptionId || 'skipped', // Mark unanswered as skipped or similar
        isCorrect,
        pointsAwarded,
      };
    });

    const passingScore = config.passingScore ?? totalQuestions; // Default passing score if not set (e.g., all correct)
    const passed = score >= passingScore;

    const verifiedData: QuizmasterBasicVerifiedData = {
      answers: detailedAnswers,
      totalScore: score,
      passed: passed,
      attemptTimestamp: new Date().toISOString(),
    };

    setIsSubmitted(true);
    setResults(verifiedData);
    onComplete(verifiedData as unknown as Record<string, unknown>);
  };

  // Handle invalid configuration or missing questions
  if (!config || totalQuestions === 0) {
    // Optionally auto-complete if config is invalid?
    // useEffect(() => { onComplete({}); }, [onComplete]);
    return (
      <div className="p-4 text-center text-muted-foreground">
        Quiz configuration is missing or invalid.
      </div>
    );
  }

  // Handle already submitted/completed state
  if (isSubmitted) {
    // TODO: Implement results display based on `results` state
    return (
      <div className="p-4">
        <h4 className="font-semibold text-lg mb-2">Quiz Complete!</h4>
        {results ? (
          <div className="space-y-1 text-sm">
            <p>Your Score: <span className="font-medium">{results.totalScore} / {config.questions.reduce((sum, q) => sum + (q.points ?? 1), 0)}</span></p>
            <p>Result: <span className={`font-medium ${results.passed ? 'text-green-600' : 'text-destructive'}`}>{results.passed ? 'Passed' : 'Failed'}</span></p>
            {/* Optionally show detailed answers - TODO */}
          </div>
        ) : (
          <p>Results are being processed...</p>
        )}
      </div>
    );
  }

  // Render the current question
  if (!currentQuestion) {
    // Should ideally not happen if totalQuestions > 0
    return <div className="p-4 text-destructive">Error loading question.</div>;
  }

  const currentSelection = userAnswers[currentQuestion.id];

  return (
    <div className="p-4 space-y-6 w-full max-w-md">
      <div>
        <p className="text-sm text-muted-foreground mb-1">
          Question {currentQuestionIndex + 1} of {totalQuestions}
        </p>
        <h4 className="font-semibold text-lg leading-snug">
          {currentQuestion.text}
        </h4>
      </div>

      <RadioGroup 
        value={currentSelection}
        onValueChange={(value) => handleOptionSelect(currentQuestion.id, value)}
        className="space-y-3"
        disabled={!!feedbackStatus}
      >
        {currentQuestion.options.map((option) => {
          const isSelected = currentSelection === option.id;
          const isCorrect = option.id === currentQuestion.correctOptionId;
          let feedbackIcon = null;
          if (feedbackStatus && isSelected) {
            feedbackIcon = feedbackStatus === 'correct' 
              ? <CheckCircle2 className="h-5 w-5 text-green-600 ml-2 flex-shrink-0" /> 
              : <XCircle className="h-5 w-5 text-destructive ml-2 flex-shrink-0" />;
          }

          return (
            <Label 
              key={option.id} 
              htmlFor={option.id} 
              className={`flex items-center space-x-3 p-3 border rounded-md cursor-pointer transition-colors 
                ${isSelected && feedbackStatus === 'correct' ? 'border-green-500 bg-green-50' : ''}
                ${isSelected && feedbackStatus === 'incorrect' ? 'border-destructive bg-red-50' : ''}
                ${!feedbackStatus && isSelected ? 'border-primary bg-primary/5' : ''}
                ${feedbackStatus ? 'opacity-80 cursor-not-allowed' : 'hover:bg-accent'}
              `}
            >
              <RadioGroupItem value={option.id} id={option.id} disabled={!!feedbackStatus}/>
              <span className="flex-grow font-normal">{option.text}</span>
              {feedbackIcon}
            </Label>
          );
        })}
      </RadioGroup>

      {/* Display Feedback Text */}
      {feedbackStatus && (
        <div className={`text-sm font-medium mt-2 ${feedbackStatus === 'correct' ? 'text-green-600' : 'text-destructive'}`}>
          {feedbackStatus === 'correct' ? 'Correct!' : 'Incorrect.'}
        </div>
      )}

      <div className="flex justify-end space-x-2 pt-2">
        {/* TODO: Implement Previous Button? */}
        {!isLastQuestion ? (
          <Button onClick={handleNextQuestion} disabled={!currentSelection || !feedbackStatus && config?.showFeedback}>
            Next Question
          </Button>
        ) : (
          <Button onClick={handleSubmitQuiz} disabled={!currentSelection || !feedbackStatus && config?.showFeedback}>
            Submit Quiz
          </Button>
        )}
      </div>
    </div>
  );
};

export default QuizmasterBasicDisplay; 