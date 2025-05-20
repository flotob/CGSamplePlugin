import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { NextResponse } from 'next/server';
import { deleteApiKey } from '@/lib/services/apiKeyService';

interface Params { id: string }

export const DELETE = withAuth<Params>(async (req: AuthenticatedRequest, { params }) => {
  const user = req.user;
  if (!user?.cid) {
    return NextResponse.json({ error: 'Community ID missing' }, { status: 400 });
  }
  try {
    await deleteApiKey(params.id, user.cid);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error deleting API key:', err);
    return NextResponse.json({ error: 'Failed to delete API key' }, { status: 500 });
  }
}, true);
