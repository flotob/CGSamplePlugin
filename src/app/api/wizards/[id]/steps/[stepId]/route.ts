import { withAuth } from '@/lib/withAuth';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { JwtPayload } from '@/app/api/auth/session/route';

// PUT: Update a step
export const PUT = withAuth(async (req, context) => {
  const user = req.user as JwtPayload | undefined;
  if (!user || !user.cid) {
    return NextResponse.json({ error: 'Missing community ID in token' }, { status: 400 });
  }
  const { id: wizardId, stepId } = context.params;
  if (!wizardId || !stepId) {
    return NextResponse.json({ error: 'Missing wizard id or step id' }, { status: 400 });
  }
  // Ensure the step belongs to the wizard and community
  const stepRes = await query(
    `SELECT s.* FROM onboarding_steps s
     JOIN onboarding_wizards w ON s.wizard_id = w.id
     WHERE s.id = $1 AND s.wizard_id = $2 AND w.community_id = $3`,
    [stepId, wizardId, user.cid]
  );
  if (stepRes.rows.length === 0) {
    return NextResponse.json({ error: 'Step not found' }, { status: 404 });
  }
  let body: { step_type_id?: string; config?: object; target_role_id?: string; is_mandatory?: boolean; is_active?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { step_type_id, config, target_role_id, is_mandatory, is_active } = body;
  // Only update provided fields
  const fields = [];
  const values = [stepId];
  let idx = 2;
  if (step_type_id !== undefined) { fields.push(`step_type_id = $${idx}`); values.push(step_type_id); idx++; }
  if (config !== undefined) { fields.push(`config = $${idx}`); values.push(JSON.stringify(config)); idx++; }
  if (target_role_id !== undefined) { fields.push(`target_role_id = $${idx}`); values.push(target_role_id); idx++; }
  if (is_mandatory !== undefined) { fields.push(`is_mandatory = $${idx}`); values.push(is_mandatory.toString()); idx++; }
  if (is_active !== undefined) { fields.push(`is_active = $${idx}`); values.push(is_active.toString()); idx++; }
  if (fields.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }
  const sql = `UPDATE onboarding_steps SET ${fields.join(', ')} WHERE id = $1 RETURNING *`;
  const updateRes = await query(sql, values);
  if (updateRes.rows.length === 0) {
    return NextResponse.json({ error: 'Step not updated' }, { status: 404 });
  }
  return NextResponse.json({ step: updateRes.rows[0] });
}, true);

// DELETE: Delete a step
export const DELETE = withAuth(async (req, context) => {
  const user = req.user as JwtPayload | undefined;
  if (!user || !user.cid) {
    return NextResponse.json({ error: 'Missing community ID in token' }, { status: 400 });
  }
  const { id: wizardId, stepId } = context.params;
  if (!wizardId || !stepId) {
    return NextResponse.json({ error: 'Missing wizard id or step id' }, { status: 400 });
  }
  // Ensure the step belongs to the wizard and community
  const stepRes = await query(
    `SELECT s.* FROM onboarding_steps s
     JOIN onboarding_wizards w ON s.wizard_id = w.id
     WHERE s.id = $1 AND s.wizard_id = $2 AND w.community_id = $3`,
    [stepId, wizardId, user.cid]
  );
  if (stepRes.rows.length === 0) {
    return NextResponse.json({ error: 'Step not found' }, { status: 404 });
  }
  const deleteRes = await query(
    `DELETE FROM onboarding_steps WHERE id = $1 RETURNING *`,
    [stepId]
  );
  if (deleteRes.rows.length === 0) {
    return NextResponse.json({ error: 'Step not deleted' }, { status: 404 });
  }
  return NextResponse.json({ step: deleteRes.rows[0] });
}, true); 