import { withAuth } from '@/lib/withAuth';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { JwtPayload } from '@/app/api/auth/session/route';

// GET: List all steps for a wizard
export const GET = withAuth(async (req, context) => {
  const user = req.user as JwtPayload | undefined;
  if (!user || !user.cid) {
    return NextResponse.json({ error: 'Missing community ID in token' }, { status: 400 });
  }
  const { id: wizardId } = context.params;
  if (!wizardId) {
    return NextResponse.json({ error: 'Missing wizard id' }, { status: 400 });
  }
  // Ensure the wizard belongs to the community
  const wizardRes = await query(
    `SELECT * FROM onboarding_wizards WHERE id = $1 AND community_id = $2`,
    [wizardId, user.cid]
  );
  if (wizardRes.rows.length === 0) {
    return NextResponse.json({ error: 'Wizard not found' }, { status: 404 });
  }
  // Fetch steps for the wizard
  const stepsRes = await query(
    `SELECT * FROM onboarding_steps WHERE wizard_id = $1 ORDER BY step_order ASC`,
    [wizardId]
  );
  return NextResponse.json({ steps: stepsRes.rows });
}, true);

// POST: Create a new step for a wizard
export const POST = withAuth(async (req, context) => {
  const user = req.user as JwtPayload | undefined;
  if (!user || !user.cid) {
    return NextResponse.json({ error: 'Missing community ID in token' }, { status: 400 });
  }
  const { id: wizardId } = context.params;
  if (!wizardId) {
    return NextResponse.json({ error: 'Missing wizard id' }, { status: 400 });
  }
  // Ensure the wizard belongs to the community
  const wizardRes = await query(
    `SELECT * FROM onboarding_wizards WHERE id = $1 AND community_id = $2`,
    [wizardId, user.cid]
  );
  if (wizardRes.rows.length === 0) {
    return NextResponse.json({ error: 'Wizard not found' }, { status: 404 });
  }
  let body: { step_type_id?: string; config?: object; target_role_id?: string; is_mandatory?: boolean; is_active?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { step_type_id, config, target_role_id, is_mandatory, is_active } = body;
  if (!step_type_id || !target_role_id) {
    return NextResponse.json({ error: 'step_type_id and target_role_id are required' }, { status: 400 });
  }
  // Find the next step_order
  const orderRes = await query(
    `SELECT COALESCE(MAX(step_order), 0) + 1 AS next_order FROM onboarding_steps WHERE wizard_id = $1`,
    [wizardId]
  );
  const step_order = orderRes.rows[0]?.next_order || 1;
  // Insert the new step - convert boolean values to strings
  const insertRes = await query(
    `INSERT INTO onboarding_steps (wizard_id, step_type_id, step_order, config, target_role_id, is_mandatory, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      wizardId, 
      step_type_id, 
      step_order, 
      config ? JSON.stringify(config) : '{}', 
      target_role_id, 
      (is_mandatory !== false).toString(), 
      (is_active !== false).toString()
    ]
  );
  return NextResponse.json({ step: insertRes.rows[0] }, { status: 201 });
}, true); 