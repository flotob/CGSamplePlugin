import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { NextResponse } from 'next/server';
import { createApiKey, listApiKeys } from '@/lib/services/apiKeyService';

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  const user = req.user;
  if (!user?.cid) {
    return NextResponse.json({ error: 'Community ID missing' }, { status: 400 });
  }
  try {
    const result = await createApiKey(user.cid);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error('Error creating API key:', err);
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
  }
}, true);

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  const user = req.user;
  if (!user?.cid) {
    return NextResponse.json({ error: 'Community ID missing' }, { status: 400 });
  }
  try {
    const keys = await listApiKeys(user.cid);
    return NextResponse.json({ keys });
  } catch (err) {
    console.error('Error listing API keys:', err);
    return NextResponse.json({ error: 'Failed to list API keys' }, { status: 500 });
  }
}, true);
