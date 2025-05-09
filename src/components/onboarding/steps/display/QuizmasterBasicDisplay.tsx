'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  QuizmasterBasicSpecificConfig,
  QuizmasterBasicVerifiedData,
  QuizQuestion,
  UserQuizAnswer 
} from '@/types/onboarding-steps';
import type { UserStepProgress } from '@/app/api/user/wizards/[id]/steps/route';

import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

// Type guard for QuizmasterBasicSpecificConfig
function isQuizmasterBasicConfig(data: unknown): data is QuizmasterBasicSpecificConfig {
  return (
    typeof data === 'object' &&
    data !== null &&
    'questions' in data &&
    Array.isArray((data as { questions: unknown }).questions)
    // TODO: Consider adding more checks for a stricter type guard if needed
  );
}

interface QuizmasterBasicDisplayProps {
  step: UserStepProgress;
  onComplete: (verifiedData?: Record<string, unknown>) => void;
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
  const progressPercentage = totalQuestions ? Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100) : 0;

  // Effect to potentially auto-complete if already completed (idempotency)
  useEffect(() => {
    if (step.completed_at && !results) {
      setIsSubmitted(true);
      setResults(step.verified_data as QuizmasterBasicVerifiedData | null);
    }
  }, [step.completed_at, step.verified_data, results, onComplete]);

  // Reset feedback when question changes
  useEffect(() => {
    setFeedbackStatus(null);
  }, [currentQuestionIndex]);

  // Theme detection for background gradient - moved here from below
  React.useEffect(() => {
    document.documentElement.style.setProperty(
      '--bg-gradient',
      document.documentElement.classList.contains('dark')
        ? 'linear-gradient(to bottom right, rgba(30,30,40,0.85), rgba(15,15,20,0.75))'
        : 'linear-gradient(to bottom right, rgba(255,255,255,0.85), rgba(255,255,255,0.75))'
    );

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class' && mutation.target === document.documentElement) {
          document.documentElement.style.setProperty(
            '--bg-gradient',
            document.documentElement.classList.contains('dark')
              ? 'linear-gradient(to bottom right, rgba(30,30,40,0.85), rgba(15,15,20,0.75))'
              : 'linear-gradient(to bottom right, rgba(255,255,255,0.85), rgba(255,255,255,0.75))'
          );
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

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
        selectedOptionId: selectedOptionId || 'skipped',
        isCorrect,
        pointsAwarded,
      };
    });

    const passingScore = config.passingScore ?? totalQuestions;
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
    return (
      <div className="flex flex-col h-full w-full items-center justify-center pt-8 pb-4 px-2" style={{backgroundColor: 'rgba(0,0,0,0.01)'}}>
        <div className="relative max-w-lg w-full text-center animate-in fade-in-0 duration-300" style={{
          WebkitBackdropFilter: 'blur(16px)',
          backdropFilter: 'blur(16px)',
          transform: 'translateZ(0)',
        }}>
          <div className="absolute inset-0 -z-10 bg-background/70 dark:bg-background/60 backdrop-blur-xl rounded-2xl shadow-md" style={{
            WebkitBackdropFilter: 'blur(16px)',
            transform: 'translateZ(0)',
            background: 'var(--bg-gradient, linear-gradient(to bottom right, rgba(255,255,255,0.85), rgba(255,255,255,0.75)))',
          }}></div>
          
          <div className="p-6 space-y-4">
            <h2 className="text-xl font-semibold text-destructive">Configuration Error</h2>
            <p className="text-muted-foreground">
              Quiz configuration is missing or invalid. Please contact an administrator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Handle already submitted/completed state
  if (isSubmitted) {
    const totalPossibleScore = config.questions.reduce((sum, q) => sum + (q.points ?? 1), 0);
    return (
      <div className="flex flex-col h-full w-full items-center justify-center pt-8 pb-4 px-2" style={{backgroundColor: 'rgba(0,0,0,0.01)'}}>
        <div className="relative max-w-lg w-full text-center animate-in fade-in-0 duration-300" style={{
          WebkitBackdropFilter: 'blur(16px)',
          backdropFilter: 'blur(16px)',
          transform: 'translateZ(0)',
        }}>
          <div className="absolute inset-0 -z-10 bg-background/70 dark:bg-background/60 backdrop-blur-xl rounded-2xl shadow-md" style={{
            WebkitBackdropFilter: 'blur(16px)',
            transform: 'translateZ(0)',
            background: 'var(--bg-gradient, linear-gradient(to bottom right, rgba(255,255,255,0.85), rgba(255,255,255,0.75)))',
          }}></div>
          
          <div className="p-6 space-y-6">
            <div className="flex justify-center">
              {results?.passed ? (
                <div className="h-20 w-20 rounded-full bg-green-100/90 dark:bg-green-900/80 backdrop-blur-md flex items-center justify-center">
                  <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
                </div>
              ) : (
                <div className="h-20 w-20 rounded-full bg-red-100/90 dark:bg-red-900/80 backdrop-blur-md flex items-center justify-center">
                  <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Quiz Complete!</h2>
              <div className="flex items-center justify-center my-3">
                <span className="text-3xl font-bold mr-2">{results?.totalScore}</span>
                <span className="text-lg text-muted-foreground">/ {totalPossibleScore}</span>
              </div>
              <p className="text-muted-foreground max-w-md mx-auto">
                {results?.passed 
                  ? "Great job! You've successfully completed this quiz." 
                  : "You didn't pass this time. Review the material and try again."}
              </p>
            </div>
            
            <Badge className={`text-md px-4 py-1 ${
              results?.passed 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50' 
                : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50'}`}
            >
              {results?.passed ? 'Passed' : 'Failed'}
            </Badge>
          </div>
        </div>
      </div>
    );
  }

  // Render the current question
  if (!currentQuestion) {
    return (
      <div className="flex flex-col h-full w-full items-center justify-center pt-8 pb-4 px-2" style={{backgroundColor: 'rgba(0,0,0,0.01)'}}>
        <div className="relative max-w-lg w-full text-center animate-in fade-in-0 duration-300" style={{
          WebkitBackdropFilter: 'blur(16px)',
          backdropFilter: 'blur(16px)',
          transform: 'translateZ(0)',
        }}>
          <div className="absolute inset-0 -z-10 bg-background/70 dark:bg-background/60 backdrop-blur-xl rounded-2xl shadow-md" style={{
            WebkitBackdropFilter: 'blur(16px)',
            transform: 'translateZ(0)',
            background: 'var(--bg-gradient, linear-gradient(to bottom right, rgba(255,255,255,0.85), rgba(255,255,255,0.75)))',
          }}></div>
          
          <div className="p-6 space-y-4">
            <h2 className="text-xl font-semibold text-destructive">Error Loading Question</h2>
            <p className="text-muted-foreground">
              Unable to load the quiz question. Please try refreshing the page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentSelection = userAnswers[currentQuestion.id];

  return (
    <div className="flex flex-col h-full w-full items-center justify-center pt-8 pb-4 px-2" style={{backgroundColor: 'rgba(0,0,0,0.01)'}}>
      <div className="relative w-full max-w-xl animate-in fade-in-0 slide-in-from-bottom-5 duration-300" style={{
        WebkitBackdropFilter: 'blur(16px)',
        backdropFilter: 'blur(16px)',
        transform: 'translateZ(0)',
      }}>
        <div className="absolute inset-0 -z-10 bg-background/80 dark:bg-background/70 backdrop-blur-xl rounded-2xl shadow-md" style={{
          WebkitBackdropFilter: 'blur(16px)',
          transform: 'translateZ(0)',
          background: 'var(--bg-gradient, linear-gradient(to bottom right, rgba(255,255,255,0.85), rgba(255,255,255,0.75)))',
        }}></div>
        
        <div className="p-6">
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <Badge variant="outline" className="font-normal backdrop-blur-md bg-background/50">
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </Badge>
              {totalQuestions > 1 && (
                <div className="text-xs text-muted-foreground">
                  {progressPercentage}% complete
                </div>
              )}
            </div>
            {totalQuestions > 1 && (
              <Progress value={progressPercentage} className="h-1.5" />
            )}
            <h2 className="mt-4 text-xl font-semibold">
              {currentQuestion.text}
            </h2>
          </div>
          
          <div className="py-4">
            <RadioGroup 
              value={currentSelection}
              onValueChange={(value) => handleOptionSelect(currentQuestion.id, value)}
              className="space-y-3"
              disabled={!!feedbackStatus}
            >
              {currentQuestion.options.map((option) => {
                const isSelected = currentSelection === option.id;
                let feedbackIcon = null;
                
                if (feedbackStatus && isSelected) {
                  feedbackIcon = feedbackStatus === 'correct' 
                    ? <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 ml-2 flex-shrink-0" /> 
                    : <XCircle className="h-5 w-5 text-destructive ml-2 flex-shrink-0" />;
                }

                return (
                  <Label 
                    key={option.id} 
                    htmlFor={option.id} 
                    className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all
                      ${isSelected ? 'ring-2 ring-primary/50' : 'hover:bg-accent/50'}
                      ${isSelected && feedbackStatus === 'correct' ? 'border-green-600 dark:border-green-500 bg-green-50/90 dark:bg-green-900/50 animate-pulse' : ''}
                      ${isSelected && feedbackStatus === 'incorrect' ? 'border-destructive bg-destructive/20 animate-pulse' : ''}
                      ${isSelected && !feedbackStatus ? 'border-primary bg-primary/5' : 'border-muted'}
                      ${feedbackStatus ? 'opacity-95' : 'hover:opacity-100'}
                      backdrop-blur-xl bg-background/80 dark:bg-background/70
                    `}
                    style={{
                      WebkitBackdropFilter: 'blur(16px)',
                      backdropFilter: 'blur(16px)',
                      transform: 'translateZ(0)',
                    }}
                  >
                    <RadioGroupItem 
                      value={option.id} 
                      id={option.id} 
                      disabled={!!feedbackStatus}
                      className="mr-3"
                    />
                    <span className="flex-grow font-medium">{option.text}</span>
                    {feedbackIcon}
                  </Label>
                );
              })}
            </RadioGroup>

            {/* Display Feedback Text - update for dark mode */}
            {feedbackStatus && (
              <div className={`mt-4 p-3 rounded-md flex items-center text-sm font-medium backdrop-blur-xl
                ${feedbackStatus === 'correct' 
                  ? 'bg-green-100/80 dark:bg-green-900/50 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900/30' 
                  : 'bg-destructive/20 text-destructive border border-destructive/20'}`
                }
                style={{
                  WebkitBackdropFilter: 'blur(16px)',
                  backdropFilter: 'blur(16px)',
                  transform: 'translateZ(0)',
                }}
              >
                {feedbackStatus === 'correct' 
                  ? <><CheckCircle2 className="h-4 w-4 mr-2" /> Correct answer!</> 
                  : <><XCircle className="h-4 w-4 mr-2" /> That's not correct.</>
                }
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            {!isLastQuestion ? (
              <Button 
                onClick={handleNextQuestion} 
                disabled={!currentSelection || (!feedbackStatus && config?.showFeedback)}
                className="group backdrop-blur-xl bg-primary/90"
                style={{
                  WebkitBackdropFilter: 'blur(16px)',
                  backdropFilter: 'blur(16px)',
                  transform: 'translateZ(0)',
                }}
              >
                Next Question
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmitQuiz} 
                disabled={!currentSelection || (!feedbackStatus && config?.showFeedback)}
                variant="default"
                className="backdrop-blur-xl bg-primary/90"
                style={{
                  WebkitBackdropFilter: 'blur(16px)',
                  backdropFilter: 'blur(16px)',
                  transform: 'translateZ(0)',
                }}
              >
                Submit Quiz
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizmasterBasicDisplay; 