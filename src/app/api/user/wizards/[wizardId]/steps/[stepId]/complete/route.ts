// 'use client'; // Removed directive

import { withAuth } from '@/lib/withAuth';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { JwtPayload } from '@/app/api/auth/session/route';

// Define the expected shape of the request body (optional)
interface CompleteStepRequestBody {
    verified_data?: Record<string, unknown>; // Optional data to store upon completion
}

export const POST = withAuth(async (req, context) => {
  // Type guard: ensure req.user exists
  const user = req.user as JwtPayload | undefined;
  if (!user || !user.sub || !user.cid) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const userId = user.sub;
  const communityId = user.cid;

  // Safely access parameters from context.params
  const { wizardId, stepId } = context.params;
  if (!wizardId || !stepId) {
    return NextResponse.json({ error: 'Missing wizard or step id' }, { status: 400 });
  }

  let body: CompleteStepRequestBody | null = null;
  try {
    // Try parsing body, but allow empty body
    if (req.headers.get('content-type')?.includes('application/json')) {
        body = await req.json();
    }
  } catch {
     // Ignore JSON parsing errors if body isn't expected or provided
     console.warn('Could not parse JSON body for step completion, proceeding without verified_data.');
  }

  const verifiedData = body?.verified_data ? JSON.stringify(body.verified_data) : null;

  try {
    // Verify the step exists, belongs to the wizard, and the wizard belongs to the user's community
    // Also fetch the step type to check if it requires credentials
    const stepResult = await query(
      `SELECT s.id, s.step_type_id, t.name AS step_type_name, t.requires_credentials 
       FROM onboarding_steps s
       JOIN onboarding_wizards w ON s.wizard_id = w.id
       JOIN step_types t ON s.step_type_id = t.id
       WHERE s.id = $1 AND s.wizard_id = $2 AND w.community_id = $3`,
      [stepId, wizardId, communityId]
    );

    if (stepResult.rows.length === 0) {
      return NextResponse.json({ error: 'Step not found or access denied' }, { status: 404 });
    }

    const step = stepResult.rows[0];
    
    // Insert or update the progress record
    await query(
      `INSERT INTO user_wizard_progress (user_id, wizard_id, step_id, verified_data, completed_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id, wizard_id, step_id) DO UPDATE SET
         completed_at = NOW(),
         verified_data = EXCLUDED.verified_data; -- Update verified data if re-completing`,
      [userId, wizardId, stepId, verifiedData]
    );

    // If the step type requires credentials and we have verified data,
    // also store the credential in the user_linked_credentials table
    if (step.requires_credentials && body?.verified_data) {
      // Handle different step types
      switch (step.step_type_name) {
        case 'ens':
          if (body.verified_data.ensName) {
            // Store ENS credential
            await query(
              `INSERT INTO user_linked_credentials 
               (user_id, platform, external_id, username, updated_at)
               VALUES ($1, 'ENS', $2, $3, NOW())
               ON CONFLICT (user_id, platform) DO UPDATE SET
                 external_id = EXCLUDED.external_id,
                 username = EXCLUDED.username,
                 updated_at = NOW()`,
              [userId, body.verified_data.ensName, body.verified_data.ensName]
            );
            console.log(`Stored ENS credential for user ${userId}: ${body.verified_data.ensName}`);
          }
          break;
          
        case 'discord':
          if (body.verified_data.discordId) {
            // Store Discord credential
            const discordUsername = body.verified_data.discordUsername || null;
            await query(
              `INSERT INTO user_linked_credentials 
               (user_id, platform, external_id, username, updated_at)
               VALUES ($1, 'DISCORD', $2, $3, NOW())
               ON CONFLICT (user_id, platform) DO UPDATE SET
                 external_id = EXCLUDED.external_id,
                 username = EXCLUDED.username,
                 updated_at = NOW()`,
              [userId, body.verified_data.discordId, discordUsername]
            );
            console.log(`Stored Discord credential for user ${userId}: ${body.verified_data.discordId}`);
          }
          break;
          
        case 'telegram':
          if (body.verified_data.telegramId) {
            // Store Telegram credential
            const telegramUsername = body.verified_data.telegramUsername || null;
            await query(
              `INSERT INTO user_linked_credentials 
               (user_id, platform, external_id, username, updated_at)
               VALUES ($1, 'TELEGRAM', $2, $3, NOW())
               ON CONFLICT (user_id, platform) DO UPDATE SET
                 external_id = EXCLUDED.external_id,
                 username = EXCLUDED.username,
                 updated_at = NOW()`,
              [userId, body.verified_data.telegramId, telegramUsername]
            );
            console.log(`Stored Telegram credential for user ${userId}: ${body.verified_data.telegramId}`);
          }
          break;
          
        case 'gitcoin_passport':
          if (body.verified_data.passportId) {
            // Store Gitcoin Passport credential
            await query(
              `INSERT INTO user_linked_credentials 
               (user_id, platform, external_id, username, updated_at)
               VALUES ($1, 'OTHER', $2, 'Gitcoin Passport', NOW())
               ON CONFLICT (user_id, platform) DO UPDATE SET
                 external_id = EXCLUDED.external_id,
                 username = EXCLUDED.username,
                 updated_at = NOW()`,
              [userId, body.verified_data.passportId]
            );
            console.log(`Stored Gitcoin Passport credential for user ${userId}: ${body.verified_data.passportId}`);
          }
          break;
          
        default:
          // For unrecognized step types, log a warning
          console.warn(`Unhandled credential step type: ${step.step_type_name}. No credential stored.`);
      }
    }

    // TODO: Potentially trigger role assignment here based on step.target_role_id
    // This would involve fetching the target_role_id for the stepId and then
    // calling the Common Ground API or a dedicated internal service.

    return new NextResponse(null, { status: 204 }); // Success, No Content

  } catch (error) {
    console.error('Error marking step as complete:', error);
    return NextResponse.json({ error: 'Internal server error completing step' }, { status: 500 });
  }
}, false); // false = requires authentication, but not admin 