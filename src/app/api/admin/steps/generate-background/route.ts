import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import OpenAI from 'openai';
import { uploadImageFromUrl } from '@/lib/storage';
import { Feature, enforceEventRateLimit, QuotaExceededError, logUsageEvent } from '@/lib/quotas';

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
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  const user = req.user;
  if (!user || !user.sub || !user.cid) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const userId = user.sub;
  const communityId = user.cid;

  let payload: GenerateBackgroundBody;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { structuredPrompt } = payload;

  // --- 1. Quota Check --- 
  try {
    await enforceEventRateLimit(communityId, Feature.ImageGeneration);
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return NextResponse.json({ error: error.message, quotaError: true }, { status: 429 }); // Too Many Requests
    }
    console.error('Error checking quota:', error);
    return NextResponse.json({ error: 'Internal server error checking quota' }, { status: 500 });
  }

  // --- 2. Format Prompt (Simple example) --- 
  let formattedPrompt = '';
  if (structuredPrompt) {
    // Example: "A cyberpunk style image of a cat sleeping on a futuristic couch, mood is calm."
    // More sophisticated formatting could happen here.
    formattedPrompt = [
      structuredPrompt.style,
      structuredPrompt.subject,
      structuredPrompt.mood
    ].filter(Boolean).join(', '); 
    // Add a base style/prefix if desired
    // formattedPrompt = `cinematic photo, ${formattedPrompt}`; 
  }

  if (!formattedPrompt) {
    return NextResponse.json({ error: 'Prompt cannot be empty after formatting.' }, { status: 400 });
  }

  // --- 3. Call OpenAI --- 
  try {
    console.log(`Generating image for prompt: "${formattedPrompt}"`);
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: formattedPrompt,
      n: 1,
      size: "1024x1024", // Standard size for DALL-E 3
      quality: "standard", // or "hd"
      response_format: "url", // Get temporary URL
    });

    // Check if response.data exists before accessing it
    if (!response.data || response.data.length === 0) {
      throw new Error('OpenAI response did not contain image data.');
    }

    const temporaryUrl = response.data[0]?.url;
    if (!temporaryUrl) {
      throw new Error('OpenAI did not return an image URL.');
    }

    // --- 4. Upload to Storage --- 
    console.log('Uploading image from temporary URL:', temporaryUrl);
    const persistentUrl = await uploadImageFromUrl(temporaryUrl, communityId);
    console.log('Image uploaded successfully:', persistentUrl);

    // --- 5. Save Metadata to DB --- 
    const insertQuery = `
      INSERT INTO generated_images (user_id, community_id, storage_url, prompt_structured, is_public, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id;
    `;
    // Remove unused 'key' variable from structured prompt before saving
    // const { key: _key, ...promptToSave } = structuredPrompt;
    const { rows } = await query(insertQuery, [
      userId,
      communityId,
      persistentUrl,
      JSON.stringify(structuredPrompt), // Save the original structured prompt
      false // Default to private
    ]);
    const newImageId = rows[0]?.id;
    console.log('Image metadata saved to DB with ID:', newImageId);

    // --- 6. Track Usage Event (Using correct function name) --- 
    await logUsageEvent(communityId, userId, Feature.ImageGeneration);

    // --- 7. Return Success --- 
    return NextResponse.json({ imageUrl: persistentUrl });

  } catch (error: unknown) {
    console.error(`Error generating background for step:`, error);

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