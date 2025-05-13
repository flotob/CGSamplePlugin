// 'use client'; // This directive is not strictly necessary for route handlers but often included in App Router files.
// Removed: export const runtime = "edge"; // Switch to Node.js runtime for pg compatibility

import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { Feature, enforceEventRateLimit, QuotaExceededError, logUsageEvent } from '@/lib/quotas';
import type { QuizmasterAiSpecificConfig, QuizmasterAiVerifiedData } from '@/types/onboarding-steps';

// Vercel AI SDK v4.x imports
import { streamText, CoreMessage } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { markStepAsCompletedInDB } from '@/lib/onboardingDbService';

// Test comment to trigger linter
interface ChatRequestBody {
  messages: CoreMessage[]; // Use CoreMessage from 'ai' for chat history
  wizardId: string; 
  stepId: string;
  stepConfig: QuizmasterAiSpecificConfig;
}

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  const user = req.user;
  if (!user || !user.sub || !user.cid) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const userId = user.sub;
  const communityId = user.cid;

  let payload: ChatRequestBody;
  try {
    payload = await req.json();
    if (!payload.messages || !Array.isArray(payload.messages) || payload.messages.length === 0) {
      return NextResponse.json({ error: 'Invalid request body: messages array is required.' }, { status: 400 });
    }
    if (!payload.stepConfig || typeof payload.stepConfig !== 'object') {
      return NextResponse.json({ error: 'Invalid request body: stepConfig is required.' }, { status: 400 });
    }
    if (!payload.wizardId || typeof payload.wizardId !== 'string') {
      return NextResponse.json({ error: 'Invalid request body: wizardId is required.' }, { status: 400 });
    }
    if (!payload.stepId || typeof payload.stepId !== 'string') {
      return NextResponse.json({ error: 'Invalid request body: stepId is required.' }, { status: 400 });
    }
    // TODO: Add validation that userId has access to wizardId/stepId.
  } catch (error) {
    console.error('Error parsing chat request body:', error);
    return NextResponse.json({ error: 'Invalid JSON in request body.' }, { status: 400 });
  }

  const { messages: chatHistory, stepConfig, wizardId, stepId } = payload;

  // --- 1. Quota Check --- 
  try {
    await enforceEventRateLimit(communityId, Feature.AIChatMessage);
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      // Standardized Quota Exceeded Response
      return NextResponse.json({
        error: "QuotaExceeded", // Machine-readable code
        message: error.message, // User-friendly message from the error object
        details: {
          feature: error.feature,
          limit: error.limit,
          currentCount: Number(error.currentCount), // Ensure currentCount is a number
          window: error.window,
        }
      }, { status: 402 }); // Payment Required
    }
    console.error('Error checking quota for AI chat:', error);
    return NextResponse.json({ error: 'Internal server error checking quota.' }, { status: 500 });
  }

  // --- 2. Prompt Construction & Tool Definition --- 
  const systemMessageContent = 
    `${stepConfig.agentPersonality || "You are a helpful quiz assistant."}\n` + 
    `Knowledge Base: ${stepConfig.knowledgeBase || "No knowledge base provided."}\n` + 
    `Task: ${stepConfig.taskChallenge || "Quiz the user based on the knowledge base. If they succeed, call the markTestPassed function."}`;

  const messagesForAI: CoreMessage[] = [
    { role: "system", content: systemMessageContent },
    // Assuming chatHistory from Vercel AI SDK useChat hook is already CoreMessage[] compatible
    // or streamText can handle the VercelAIMessage[] directly.
    // The Vercel SDK aims for smooth interoperability here.
    ...chatHistory, 
  ];
  
  // --- 3. Call AI using streamText with Tool Calling --- 
  try {
    const result = await streamText({
      model: openai(stepConfig.aiModelSettings?.model || "gpt-4o"), 
      messages: messagesForAI,
      tools: {
        markTestPassed: {
          description: "Call this function when the user has successfully completed the quiz or task as described in the initial instructions to the AI.",
          parameters: z.object({}), 
          execute: async () => {
            const verifiedData: QuizmasterAiVerifiedData = {
              passed: true,
              reason: "Quiz completed successfully as determined by AI.",
              chatMessageCount: chatHistory.length + 1, 
              attemptTimestamp: new Date().toISOString(),
            };
            try {
              await markStepAsCompletedInDB(userId, wizardId, stepId, verifiedData);
              console.log(`DB update successful for step completion: user ${userId}, wizard ${wizardId}, step ${stepId}`);
              return { success: true, messageForAI: "The user has passed and the step has been marked complete in the system." }; 
            } catch (dbError: unknown) {
              console.error(`Database error completing step ${stepId} for user ${userId}:`, dbError);
              // Inform the AI that the backend action failed
              const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown database error';
              return { success: false, errorForAI: `An internal error occurred while trying to mark the step as complete: ${errorMessage}` };
            }
          }
        }
      },
      temperature: stepConfig.aiModelSettings?.temperature || 0.7,
      maxSteps: 3, 
    });

    // --- 4. Log Usage Event (after successful API call initiation) --- 
    try {
      await logUsageEvent(communityId, userId, Feature.AIChatMessage);
    } catch (logError) {
      console.error('Failed to log AI chat usage event:', logError);
    }

    // --- 5. Return Streaming Response --- 
    // return result.toTextStreamResponse(); // Changed to toDataStreamResponse as per linter and docs
    // return result.toDataStreamResponse(); // This returns a standard Response

    // Wrap the standard Response from toDataStreamResponse() in a NextResponse
    const standardResponse = result.toDataStreamResponse();
    const headers = new Headers(standardResponse.headers); // Clone headers
    
    // Ensure essential streaming headers are preserved if not already set by toDataStreamResponse
    // Vercel AI SDK's toDataStreamResponse() should set these correctly.
    // if (!headers.has('Content-Type')) {
    //   headers.set('Content-Type', 'text/event-stream; charset=utf-8');
    // }
    // if (!headers.has('Cache-Control')) {
    //   headers.set('Cache-Control', 'no-cache, no-transform');
    // }
    // if (!headers.has('Connection')) {
    //   headers.set('Connection', 'keep-alive');
    // }

    return new NextResponse(standardResponse.body, {
      status: standardResponse.status,
      statusText: standardResponse.statusText,
      headers: headers, 
    });

  } catch (error: unknown) {
    console.error(`Error with AI chat (streamText):`, error);
    if (error instanceof Error && error.name === 'RateLimitError') { 
        return NextResponse.json({ error: 'AI rate limit exceeded.', message: error.message }, { status: 429 });
    }
    // Add more specific error handling for OpenAI API errors if possible from the error structure
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'AI Chat Failed', message: errorMessage }, { status: 500 });
  }
}); 