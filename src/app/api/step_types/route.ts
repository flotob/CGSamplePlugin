import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  const result = await query(
    `SELECT id, name, description, requires_credentials FROM step_types ORDER BY name ASC`
  );
  return NextResponse.json({ step_types: result.rows });
} 