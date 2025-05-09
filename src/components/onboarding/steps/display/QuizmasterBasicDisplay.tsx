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
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

// Type guard for QuizmasterBasicSpecificConfig
function isQuizmasterBasicConfig(data: any): data is QuizmasterBasicSpecificConfig {
  return !!data && Array.isArray(data.questions);
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
      <div className="flex items-center justify-center h-full w-full">
        <Card className="w-full max-w-xl shadow-md">
          <CardHeader className="bg-muted/50">
            <CardTitle className="text-destructive">Configuration Error</CardTitle>
          </CardHeader>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Quiz configuration is missing or invalid.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle already submitted/completed state
  if (isSubmitted) {
    const totalPossibleScore = config.questions.reduce((sum, q) => sum + (q.points ?? 1), 0);
    return (
      <div className="flex items-center justify-center h-full w-full">
        <Card className="w-full max-w-xl shadow-md animate-in fade-in-0 slide-in-from-bottom-5 duration-300">
          <CardHeader className="text-center bg-muted">
            <CardTitle className="text-2xl font-bold">Quiz Complete!</CardTitle>
          </CardHeader>
          <CardContent className="p-8 flex flex-col items-center justify-center space-y-6">
            {results?.passed ? (
              <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="h-12 w-12 text-red-600" />
              </div>
            )}
            
            <div className="space-y-3 text-center">
              <h4 className="text-xl font-semibold">Your Score</h4>
              <div className="flex items-center justify-center">
                <span className="text-3xl font-bold mr-2">{results?.totalScore}</span>
                <span className="text-lg text-muted-foreground">/ {totalPossibleScore}</span>
              </div>
              <Badge className={`text-md px-3 py-1 ${results?.passed ? 'bg-green-100 text-green-800 hover:bg-green-100' : 'bg-red-100 text-red-800 hover:bg-red-100'}`}>
                {results?.passed ? 'Passed' : 'Failed'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render the current question
  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <Card className="w-full max-w-xl shadow-md">
          <CardContent className="p-6">
            <p className="text-destructive text-center">Error loading question.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentSelection = userAnswers[currentQuestion.id];

  return (
    <div className="flex items-center justify-center h-full w-full">
      <Card className="w-full max-w-xl shadow-md animate-in fade-in-0 slide-in-from-bottom-5 duration-300">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center mb-2">
            <Badge variant="outline" className="font-normal">
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
          <CardTitle className="mt-4 text-xl">
            {currentQuestion.text}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="pt-4">
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
                  className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all
                    ${isSelected ? 'ring-2 ring-primary/50' : 'hover:bg-accent/50'}
                    ${isSelected && feedbackStatus === 'correct' ? 'border-green-500 bg-green-50 animate-pulse' : ''}
                    ${isSelected && feedbackStatus === 'incorrect' ? 'border-destructive bg-red-50 animate-pulse' : ''}
                    ${isSelected && !feedbackStatus ? 'border-primary bg-primary/5' : 'border-muted'}
                    ${feedbackStatus ? 'opacity-90' : 'hover:opacity-100'}
                  `}
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

          {/* Display Feedback Text */}
          {feedbackStatus && (
            <div className={`mt-4 p-3 rounded-md flex items-center text-sm font-medium
              ${feedbackStatus === 'correct' 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'}`
              }
            >
              {feedbackStatus === 'correct' 
                ? <><CheckCircle2 className="h-4 w-4 mr-2" /> Correct answer!</> 
                : <><XCircle className="h-4 w-4 mr-2" /> That's not correct.</>
              }
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-end pt-2">
          {!isLastQuestion ? (
            <Button 
              onClick={handleNextQuestion} 
              disabled={!currentSelection || (!feedbackStatus && config?.showFeedback)}
              className="group"
            >
              Next Question
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmitQuiz} 
              disabled={!currentSelection || (!feedbackStatus && config?.showFeedback)}
              variant="default"
            >
              Submit Quiz
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default QuizmasterBasicDisplay; 