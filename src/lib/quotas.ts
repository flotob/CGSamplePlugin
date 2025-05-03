import { query } from './db'; // Assuming db utility exists

// Define the trackable features enum matching the DB type
// Note: Keep this in sync with the 'feature_enum' in the DB
export enum Feature {
  AIChatMessage = 'ai_chat_message',
  WizardStepCompletion = 'wizard_step_completion',
  ApiCallGeneric = 'api_call_generic',
  ActiveWizard = 'active_wizard', // Added for resource limit
  // Add other features here as they are added to the DB enum
}

/**
 * Custom error class for quota exceeded situations.
 */
export class QuotaExceededError extends Error {
  public feature: Feature;
  public limit: number;
  public window: string; // Can be time interval string or 'static' for resource limits
  public currentCount: number | bigint; // Added to provide context to frontend

  constructor(
    message: string,
    feature: Feature,
    limit: number,
    window: string,
    currentCount: number | bigint // Added parameter
  ) {
    super(message);
    this.name = 'QuotaExceededError';
    this.feature = feature;
    this.limit = limit;
    this.window = window;
    this.currentCount = currentCount; // Store the current count
    // Ensure the prototype chain is correct for instanceof checks
    Object.setPrototypeOf(this, QuotaExceededError.prototype);
  }
}

// Define expected structure for query results for clarity
interface PlanLimitRow {
  hard_limit: string;
  time_window: string; // Only relevant for event rate limits
  plan_code: string;
}

// Structure for resource limit query (omits time_window)
interface ResourceLimitRow {
  hard_limit: string;
  plan_code: string;
}

interface UsageCountRow {
  count: string;
}

/**
 * Checks if the usage rate for a given feature by a community is within its plan limits.
 * Throws QuotaExceededError if the rate limit is reached or exceeded.
 *
 * @param communityId - The ID of the community whose quota is being checked.
 * @param feature - The specific feature being used (should be an event-rate limited feature).
 * @throws {QuotaExceededError} If usage meets or exceeds the hard limit for the relevant time window.
 * @throws {Error} If plan limits are not configured for the community/feature.
 */
export async function enforceEventRateLimit(communityId: string, feature: Feature): Promise<void> {
  // 1. Get the community's current plan and the relevant limits for the feature
  const limitsQuery = `
    SELECT
      pl.hard_limit,
      pl.time_window,
      p.code as plan_code
    FROM plan_limits pl
    JOIN plans p ON pl.plan_id = p.id
    JOIN communities c ON c.current_plan_id = p.id
    WHERE c.id = $1
      AND pl.feature = $2
      AND pl.time_window != '0 seconds'::interval -- Ensure we only get rate limits
      AND p.is_active = true;
  `;

  // Use the generic query function
  const { rows: limits } = await query<PlanLimitRow>(limitsQuery, [
    communityId,
    feature,
  ]);

  if (limits.length === 0) {
    console.warn(`No active event rate limits found for community ${communityId}, feature ${feature}. Allowing action.`);
    return; // Or throw configuration error
  }

  // 2. Check usage against each applicable limit (e.g., daily, monthly)
  for (const limit of limits) {
    const hardLimit = BigInt(limit.hard_limit);
    const timeWindow = limit.time_window;

    // 3. Count usage events within the time window
    const usageQuery = `
      SELECT COUNT(*) AS count -- Changed alias for consistency
      FROM usage_events
      WHERE community_id = $1
        AND feature = $2
        AND occurred_at >= (now() - $3::interval);
    `;

    const { rows: usageResult } = await query<UsageCountRow>(usageQuery, [
      communityId,
      feature,
      timeWindow,
    ]);

    const usedCount = BigInt(usageResult[0]?.count ?? '0');

    // 4. Compare usage count to the hard limit
    if (usedCount >= hardLimit) {
      console.warn(`Event rate limit exceeded for community ${communityId}, feature ${feature}. Limit: ${hardLimit}, Window: ${timeWindow}, Used: ${usedCount}`);
      throw new QuotaExceededError(
        `Event rate limit (${hardLimit}) for feature '${feature}' within the last ${timeWindow} reached or exceeded. Current usage: ${usedCount}. Plan: ${limit.plan_code}.`,
        feature,
        Number(hardLimit),
        timeWindow,
        usedCount // Pass the count that triggered the error
      );
    }
  }

  console.log(`Event rate limit check passed for community ${communityId}, feature ${feature}`);
}

/**
 * Checks if the current count of a specific resource for a community is within its plan limit.
 * Throws QuotaExceededError if the limit is reached or exceeded.
 *
 * @param communityId - The ID of the community whose resource limit is being checked.
 * @param resourceFeature - The specific resource feature being limited (e.g., Feature.ActiveWizard).
 * @throws {QuotaExceededError} If resource count meets or exceeds the hard limit.
 * @throws {Error} If plan limits are not configured or resource type is unknown.
 */
export async function enforceResourceLimit(communityId: string, resourceFeature: Feature): Promise<void> {
  // 1. Get the community's plan limit for this specific resource feature
  const limitQuery = `
    SELECT
      pl.hard_limit,
      p.code as plan_code
    FROM plan_limits pl
    JOIN plans p ON pl.plan_id = p.id
    JOIN communities c ON c.current_plan_id = p.id
    WHERE c.id = $1
      AND pl.feature = $2
      AND pl.time_window = '0 seconds'::interval -- Key differentiator for resource limits
      AND p.is_active = true;
  `;
  const { rows: limits } = await query<ResourceLimitRow>(limitQuery, [
    communityId,
    resourceFeature,
  ]);

  if (limits.length === 0) {
    console.warn(`No active resource limit found for community ${communityId}, feature ${resourceFeature}. Allowing action.`);
    return; // Or throw configuration error
  }
  if (limits.length > 1) {
     // Should not happen with the PK on plan_limits, but good to check
     console.error(`Configuration error: Multiple resource limits found for community ${communityId}, feature ${resourceFeature}.`);
     throw new Error('Configuration error: Multiple resource limits found.');
  }

  const limit = limits[0];
  const hardLimit = BigInt(limit.hard_limit);

  // 2. Get the current count of the specific resource for the community
  let currentCountQuery = '';
  switch (resourceFeature) {
    case Feature.ActiveWizard:
      currentCountQuery = `
        SELECT COUNT(*) AS count
        FROM onboarding_wizards
        WHERE community_id = $1 AND is_active = true;
      `;
      break;
    // Add cases for other resource types here in the future
    default:
      throw new Error(`Unknown resource feature type for limit check: ${resourceFeature}`);
  }

  const { rows: countResult } = await query<UsageCountRow>(currentCountQuery, [communityId]);
  const currentCount = BigInt(countResult[0]?.count ?? '0');

  // 3. Compare current count to the hard limit
  if (currentCount >= hardLimit) {
     console.warn(`Resource limit exceeded for community ${communityId}, feature ${resourceFeature}. Limit: ${hardLimit}, Current: ${currentCount}`);
     throw new QuotaExceededError(
       `Resource limit (${hardLimit}) for feature '${resourceFeature}' reached or exceeded. Current count: ${currentCount}. Plan: ${limit.plan_code}.`,
       resourceFeature,
       Number(hardLimit), // Convert back for error object
       'static', // Indicate it's not a time window
       currentCount // Pass the count that triggered the error
     );
  }

   console.log(`Resource limit check passed for community ${communityId}, feature ${resourceFeature}`);
}

/**
 * Logs a usage event to the database.
 *
 * @param communityId - The ID of the community performing the action.
 * @param userId - The ID of the user performing the action.
 * @param feature - The specific feature that was used.
 * @param idempotencyKey - Optional key to prevent duplicate event logging on retries.
 */
export async function logUsageEvent(
  communityId: string,
  userId: string,
  feature: Feature,
  idempotencyKey?: string
): Promise<void> {
  const insertQuery = `
    INSERT INTO usage_events (community_id, user_id, feature, idempotency_key)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (idempotency_key) DO NOTHING; -- Avoid duplicates if key provided and exists
  `;

  // Only include idempotencyKey in params if it's provided
  const params = [communityId, userId, feature, idempotencyKey ?? null];

  try {
    // We don't typically need the result of an INSERT, but we wait for it to complete.
    // Using <any> as we don't care about the row type returned by INSERT.
    await query<any>(insertQuery, params);
    console.log(
      `Usage event logged for community ${communityId}, user ${userId}, feature ${feature}`
    );
  } catch (error) {
    // Log the error but don't necessarily block the calling process
    // unless event logging is absolutely critical to halt on failure.
    console.error(
      `Failed to log usage event for community ${communityId}, feature ${feature}:`,
      error
    );
    // Optionally re-throw if logging failure should be treated as a critical error
    // throw error;
  }
}

// Example usage (would be called in API routes/middleware):
/*
async function handleApiRequest(req, res) {
  try {
    const communityId = req.user.communityId; // From JWT or session
    const userId = req.user.userId; // From JWT or session

    // Check EVENT RATE limit before performing the action
    await enforceEventRateLimit(communityId, Feature.AIChatMessage);

    // OR check RESOURCE limit before creating/activating
    // await enforceResourceLimit(communityId, Feature.ActiveWizard);

    // --- Proceed with the action (e.g., call OpenAI or create wizard) ---
    const result = await callOpenAI(...);
    // or
    // const wizard = await createWizardInDB(...);

    // --- Log the usage event *after* successful action (if applicable for the feature) ---
    // If logging AI Message:
    await logUsageEvent(communityId, userId, Feature.AIChatMessage);
    // If logging Wizard Creation (optional):
    // await logUsageEvent(communityId, userId, Feature.ActiveWizard, wizard.id); // Could use wizard ID as idempotency key

    res.status(200).json(result);

  } catch (error) {
    if (error instanceof QuotaExceededError) {
      res.status(429).json({ error: 'Quota limit exceeded', details: error.message }); // Or 402/403
    } else {
      // Handle other errors
      console.error('API request failed:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
*/ 