import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { JwtPayload } from '@/app/api/auth/session/route';
import { enforceEventRateLimit, logUsageEvent, Feature, QuotaExceededError } from '@/lib/quotas';
import { uploadImageFromUrl } from '@/lib/storage';
import OpenAI from 'openai';

// Define expected request body
interface StructuredPrompt { 
    // Define fields based on planned UI, e.g.:
    style?: string | null;
    subject?: string | null;
    mood?: string | null;
    // Add other fields as needed
}

// Extend GenerateBackgroundBody
interface GenerateBackgroundBody {
  wizardId: string;
  stepId: string;
  prompt: string; // Keep raw prompt maybe? Or just structured?
  structuredPrompt: StructuredPrompt; // Use structured prompt
}

// Initialize OpenAI client
const openaiApiKey = process.env.OPENAI_API_KEY;
let openai: OpenAI | null = null;
if (openaiApiKey) {
  openai = new OpenAI({ apiKey: openaiApiKey });
} else {
  console.warn('OPENAI_API_KEY is not set. Image generation feature will be disabled.');
}

// Style prefix for the prompt
const STYLE_PREFIX = 'Illustration, cinematic lighting, high detail: ';

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  if (!openai) {
    return NextResponse.json({ error: 'Image generation service not configured.' }, { status: 503 });
  }

  const user = req.user as JwtPayload | undefined;
  if (!user || !user.cid || !user.sub) {
    return NextResponse.json({ error: 'Missing user or community ID in token' }, { status: 401 });
  }
  const communityId = user.cid;
  const userId = user.sub; // For usage logging

  let body: GenerateBackgroundBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Use structuredPrompt for generation, ensure it exists
  const { wizardId, stepId, structuredPrompt } = body;
  if (!wizardId || !stepId || !structuredPrompt) { // Check structuredPrompt
    return NextResponse.json({ error: 'Missing wizardId, stepId, or structuredPrompt' }, { status: 400 });
  }

  // Format structured prompt into a string for OpenAI
  const textPrompt = Object.entries(structuredPrompt)
      .filter(([key, value]) => value && String(value).trim() !== '') // Filter out empty/null values
      .map(([key, value]) => `${key}: ${value}`) // Format as key: value (optional)
      .join(', '); // Combine with commas
      
  if (!textPrompt) {
      return NextResponse.json({ error: 'Prompt cannot be empty after formatting.' }, { status: 400 });
  }

  try {
    // 1. Authorize: Check if step belongs to wizard and wizard to community
    const authCheck = await query(
      `SELECT w.id 
       FROM onboarding_wizards w 
       JOIN onboarding_steps s ON s.wizard_id = w.id 
       WHERE w.id = $1 AND w.community_id = $2 AND s.id = $3`,
      [wizardId, communityId, stepId]
    );
    if (authCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Wizard/Step not found or access denied' }, { status: 404 });
    }

    // 2. Check Quota
    await enforceEventRateLimit(communityId, Feature.ImageGeneration);

    // 3. Generate Image with OpenAI
    const augmentedPrompt = STYLE_PREFIX + textPrompt; // Use formatted prompt
    console.log(`Generating image for step ${stepId} with prompt: "${augmentedPrompt}"`);
    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: augmentedPrompt,
      n: 1,
      size: "1024x1024",
      response_format: "url", // Get URL to download from
      // style: "vivid", // Optional style
    });

    const temporaryUrl = imageResponse.data?.[0]?.url;
    if (!temporaryUrl) {
      throw new Error('OpenAI did not return an image URL.');
    }
    console.log(`Generated image temporary URL: ${temporaryUrl}`);

    // 4. Upload image to persistent storage
    const pathPrefix = `${communityId}/images`; // Updated path prefix
    const persistentUrl = await uploadImageFromUrl(temporaryUrl, pathPrefix);

    // 5. Insert metadata into generated_images table
    await query(
      `INSERT INTO generated_images (user_id, community_id, storage_url, prompt_structured, is_public)
       VALUES ($1, $2, $3, $4, false)`,
       [userId, communityId, persistentUrl, JSON.stringify(structuredPrompt)] // Save structured prompt
    );
    console.log(`Saved generated image metadata for user ${userId}`);

    // 6. Log usage event AFTER successful generation and upload and DB insert
    await logUsageEvent(communityId, userId, Feature.ImageGeneration);

    // 7. Return persistent URL
    return NextResponse.json({ imageUrl: persistentUrl });

  } catch (error) {
    console.error(`Error generating background for step ${stepId}:`, error);

    // Handle specific Quota Exceeded error
    if (error instanceof QuotaExceededError) {
      return NextResponse.json(
        { error: 'Quota Exceeded', message: 'Image generation quota reached for your plan.' },
        { status: 402 } // Payment Required
      );
    }
    
    // Handle potential OpenAI errors (e.g., content policy)
    if (error instanceof OpenAI.APIError) {
        let message = `OpenAI API Error: ${error.status} ${error.name}`;
        if (error.code === 'content_policy_violation') {
             message = 'Image prompt violates content policy. Please modify your prompt.';
             return NextResponse.json({ error: 'Content Policy Violation', message }, { status: 400 });
        }
        // Add more specific OpenAI error handling if needed
        return NextResponse.json({ error: 'OpenAI Error', message }, { status: 502 }); // Bad Gateway
    }

    // Handle storage or other errors
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Image Generation Failed', message: errorMessage }, { status: 500 });
  }
}, true); // true = admin only 