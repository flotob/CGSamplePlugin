import { withAuth } from '@/lib/withAuth';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { JwtPayload } from '@/app/api/auth/session/route';

export const GET = withAuth(async (req, context) => {
  const user = req.user as JwtPayload | undefined;
  if (!user || !user.cid) {
    return NextResponse.json({ error: 'Missing community ID in token' }, { status: 400 });
  }
  const { id } = context.params;
  if (!id) {
    return NextResponse.json({ error: 'Missing wizard id' }, { status: 400 });
  }
  const result = await query(
    `SELECT * FROM onboarding_wizards WHERE id = $1 AND community_id = $2`,
    [id, user.cid]
  );
  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'Wizard not found' }, { status: 404 });
  }
  return NextResponse.json({ wizard: result.rows[0] });
}, true);

export const PUT = withAuth(async (req, context) => {
  const user = req.user as JwtPayload | undefined;
  if (!user || !user.cid) {
    return NextResponse.json({ error: 'Missing community ID in token' }, { status: 400 });
  }
  const { id } = context.params;
  if (!id) {
    return NextResponse.json({ error: 'Missing wizard id' }, { status: 400 });
  }
  let body: { name?: string; description?: string; is_active?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { name, description, is_active } = body;
  // Only update provided fields
  const fields = [];
  const values = [id, user.cid];
  let idx = 3;
  if (name !== undefined) { fields.push(`name = $${idx}`); values.push(name); idx++; }
  if (description !== undefined) { fields.push(`description = $${idx}`); values.push(description); idx++; }
  if (is_active !== undefined) { 
    fields.push(`is_active = $${idx}`); 
    // Convert boolean to string representation for PostgreSQL
    values.push(is_active.toString()); 
    idx++; 
  }
  if (fields.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }
  const sql = `UPDATE onboarding_wizards SET ${fields.join(', ')} WHERE id = $1 AND community_id = $2 RETURNING *`;
  const result = await query(sql, values);
  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'Wizard not found or not updated' }, { status: 404 });
  }
  return NextResponse.json({ wizard: result.rows[0] });
}, true);

export const DELETE = withAuth(async (req, context) => {
  const user = req.user as JwtPayload | undefined;
  if (!user || !user.cid) {
    return NextResponse.json({ error: 'Missing community ID in token' }, { status: 400 });
  }
  const { id } = context.params;
  if (!id) {
    return NextResponse.json({ error: 'Missing wizard id' }, { status: 400 });
  }
  const result = await query(
    `DELETE FROM onboarding_wizards WHERE id = $1 AND community_id = $2 RETURNING *`,
    [id, user.cid]
  );
  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'Wizard not found or not deleted' }, { status: 404 });
  }
  return NextResponse.json({ wizard: result.rows[0] });
}, true); 