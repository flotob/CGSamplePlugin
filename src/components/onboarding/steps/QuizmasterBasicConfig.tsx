'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  QuizmasterBasicSpecificConfig,
  QuizQuestion,
  QuizQuestionOption 
} from '@/types/onboarding-steps'; // Adjust path if necessary

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { PlusCircle, Trash2, XCircle } from 'lucide-react'; // Example icons

interface QuizmasterBasicConfigProps {
  initialData?: Partial<QuizmasterBasicSpecificConfig>;
  onChange: (newConfig: QuizmasterBasicSpecificConfig) => void;
}

// Helper to generate unique IDs
const generateId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const MAX_OPTIONS = 5;

const QuizmasterBasicConfig: React.FC<QuizmasterBasicConfigProps> = ({ initialData, onChange }) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [passingScore, setPassingScore] = useState<number | undefined>(undefined);
  const [showFeedback, setShowFeedback] = useState<boolean>(false);

  // Helper to trigger onChange with the current state
  const triggerOnChange = (currentState: { questions: QuizQuestion[], passingScore?: number, showFeedback: boolean }) => {
    onChange({
      questions: currentState.questions,
      passingScore: currentState.passingScore,
      showFeedback: currentState.showFeedback,
    });
  };

  // Initialize state from initialData
  useEffect(() => {
    if (initialData) {
      const initializedQuestions = (initialData.questions || []).map(q => ({
        ...q,
        id: q.id || generateId(),
        options: (q.options || []).map(opt => ({...opt, id: opt.id || generateId()})),
        correctOptionId: q.correctOptionId || (q.options && q.options.length > 0 ? q.options[0].id : ''),
      }));
      // Only update state if initial data differs significantly to prevent loops
      // (Simple reference check for now, could be improved with deep comparison if needed)
      if (JSON.stringify(initializedQuestions) !== JSON.stringify(questions)) {
        setQuestions(initializedQuestions);
      }
      if (initialData.passingScore !== passingScore) {
        setPassingScore(initialData.passingScore);
      }
      if (initialData.showFeedback !== showFeedback) {
        setShowFeedback(initialData.showFeedback || false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]); // We only want this effect to run when initialData prop changes
                      // We accept that internal state changes might temporarily differ from initialData until onChange propagates
  
  const handlePassingScoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const score = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
    const newScore = isNaN(score!) ? undefined : score;
    setPassingScore(newScore);
    triggerOnChange({ questions, passingScore: newScore, showFeedback });
  };

  const handleShowFeedbackChange = (checked: boolean) => {
    setShowFeedback(checked);
    triggerOnChange({ questions, passingScore, showFeedback: checked });
  };

  const addQuestion = () => {
    const newOptionId = generateId();
    const newQuestion: QuizQuestion = {
      id: generateId(),
      text: '',
      options: [
        { id: newOptionId, text: 'Option 1' },
        { id: generateId(), text: 'Option 2' },
      ],
      correctOptionId: newOptionId, // Default to first option being correct
      points: 1,
    };
    const newQuestions = [...questions, newQuestion];
    setQuestions(newQuestions);
    triggerOnChange({ questions: newQuestions, passingScore, showFeedback });
  };

  const deleteQuestion = (questionId: string) => {
    const newQuestions = questions.filter(q => q.id !== questionId);
    setQuestions(newQuestions);
    triggerOnChange({ questions: newQuestions, passingScore, showFeedback });
  };

  const updateQuestionText = (questionId: string, newText: string) => {
    const newQuestions = questions.map(q => q.id === questionId ? { ...q, text: newText } : q);
    setQuestions(newQuestions);
    triggerOnChange({ questions: newQuestions, passingScore, showFeedback });
  };

  const updateQuestionPoints = (questionId: string, newPoints: string) => {
    const pointsNum = newPoints === '' ? undefined : parseInt(newPoints, 10);
    const newPointsValue = isNaN(pointsNum!) ? undefined : pointsNum;
    const newQuestions = questions.map(q => 
      q.id === questionId 
        ? { ...q, points: newPointsValue } 
        : q
    );
    setQuestions(newQuestions);
    triggerOnChange({ questions: newQuestions, passingScore, showFeedback });
  };

  const addOption = (questionId: string) => {
    let newQuestions = questions; // Start with current
    const questionIndex = questions.findIndex(q => q.id === questionId);
    if (questionIndex !== -1 && questions[questionIndex].options.length < MAX_OPTIONS) {
      const newOption = { id: generateId(), text: '' };
      newQuestions = questions.map((q, index) => 
        index === questionIndex 
          ? { ...q, options: [...q.options, newOption] } 
          : q
      );
      setQuestions(newQuestions);
      triggerOnChange({ questions: newQuestions, passingScore, showFeedback });
    }
  };

  const deleteOption = (questionId: string, optionId: string) => {
    let newQuestions = questions; // Start with current
    const questionIndex = questions.findIndex(q => q.id === questionId);
    if (questionIndex !== -1) {
      const currentQuestion = questions[questionIndex];
      const newOptions = currentQuestion.options.filter(opt => opt.id !== optionId);
      const newCorrectOptionId = currentQuestion.correctOptionId === optionId 
        ? (newOptions.length > 0 ? newOptions[0].id : '') 
        : currentQuestion.correctOptionId;
      newQuestions = questions.map((q, index) => 
        index === questionIndex 
          ? { ...q, options: newOptions, correctOptionId: newCorrectOptionId } 
          : q
      );
      setQuestions(newQuestions);
      triggerOnChange({ questions: newQuestions, passingScore, showFeedback });
    }
  };

  const updateOptionText = (questionId: string, optionId: string, newText: string) => {
    const newQuestions = questions.map(q => 
      q.id === questionId 
        ? { ...q, options: q.options.map(opt => opt.id === optionId ? { ...opt, text: newText } : opt) } 
        : q
    );
    setQuestions(newQuestions);
    triggerOnChange({ questions: newQuestions, passingScore, showFeedback });
  };

  const setCorrectOption = (questionId: string, optionId: string) => {
    const newQuestions = questions.map(q => q.id === questionId ? { ...q, correctOptionId: optionId } : q);
    setQuestions(newQuestions);
    triggerOnChange({ questions: newQuestions, passingScore, showFeedback });
  };

  // TODO: Implement UI for:
  // 1. Overall Quiz Settings (Passing Score, Show Feedback switch) (DONE for these two)
  // 2. Questions List (Accordion or Cards)
  //    - Add Question button (DONE)
  //    - For each question: (DONE - text, points, delete)
  //      - Input for question text (DONE)
  //      - Input for points (DONE)
  //      - Delete Question button (DONE)
  //      - Options List: (DONE)
  //        - Input for each option text (DONE)
  //        - RadioGroup/Select for correctOptionId (DONE)
  //        - Add Option button (DONE)
  //        - Delete Option button (DONE)

  return (
    <div className="space-y-6 p-1">
      <div>
        <h3 className="mb-4 text-lg font-medium leading-none">
          Quiz Settings
        </h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="passingScore">Passing Score (Points)</Label>
            <Input 
              id="passingScore" 
              type="number" 
              placeholder="e.g., 70" 
              value={passingScore === undefined ? '' : passingScore}
              onChange={handlePassingScoreChange}
              min="0"
            />
            <p className="text-xs text-muted-foreground">
              Minimum points required to pass the quiz. Leave blank if not applicable.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Switch 
              id="showFeedback" 
              checked={showFeedback}
              onCheckedChange={handleShowFeedbackChange}
            />
            <Label htmlFor="showFeedback">Show Instant Feedback</Label>
          </div>
          <p className="text-xs text-muted-foreground">
            If enabled, users will see if their answer was correct immediately after each question.
          </p>
        </div>
      </div>

      <hr className="my-6" />

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium leading-none">
            Questions
          </h3>
          <Button variant="outline" size="sm" onClick={addQuestion}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Question
          </Button>
        </div>
        
        {questions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No questions added yet. Click "Add Question" to start building your quiz.
          </p>
        ) : (
          <Accordion type="single" collapsible className="w-full" defaultValue={questions.length > 0 ? questions[questions.length -1].id : undefined}>
            {questions.map((question, index) => (
              <AccordionItem value={question.id} key={question.id}>
                <AccordionTrigger>
                  <div className="flex-1 text-left">
                    Question {index + 1}: {question.text || "(New Question - Click to edit)"}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor={`q-text-${question.id}`}>Question Text</Label>
                    <Input 
                      id={`q-text-${question.id}`} 
                      placeholder="Enter the question" 
                      value={question.text}
                      onChange={(e) => updateQuestionText(question.id, e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`q-points-${question.id}`}>Points</Label>
                    <Input 
                      id={`q-points-${question.id}`} 
                      type="number" 
                      placeholder="e.g., 1 or 5" 
                      value={question.points === undefined ? '' : question.points}
                      onChange={(e) => updateQuestionPoints(question.id, e.target.value)}
                      min="0"
                    />
                  </div>
                  
                  <div className="pt-2 space-y-3">
                    <h4 className="text-sm font-medium mb-1">Options:</h4>
                    <RadioGroup 
                      value={question.correctOptionId} 
                      onValueChange={(optionId) => setCorrectOption(question.id, optionId)}
                    >
                      {question.options.map((option, optIndex) => (
                        <div key={option.id} className="flex items-center space-x-2">
                          <RadioGroupItem value={option.id} id={`q-${question.id}-opt-${option.id}`} />
                          <Label htmlFor={`q-${question.id}-opt-${option.id}`} className="flex-grow">
                            <Input 
                              placeholder={`Option ${optIndex + 1}`}
                              value={option.text}
                              onChange={(e) => updateOptionText(question.id, option.id, e.target.value)}
                              className="w-full"
                            />
                          </Label>
                          {question.options.length > 1 && (
                            <Button variant="ghost" size="icon" onClick={() => deleteOption(question.id, option.id)} title="Delete option">
                              <XCircle className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </RadioGroup>
                    {question.options.length < MAX_OPTIONS && (
                      <Button variant="outline" size="sm" onClick={() => addOption(question.id)} className="mt-2">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Option
                      </Button>
                    )}
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button variant="destructive" size="sm" onClick={() => deleteQuestion(question.id)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Question
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </div>
  );
};

export default QuizmasterBasicConfig; 