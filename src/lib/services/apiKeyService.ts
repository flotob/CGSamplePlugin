import { query } from '@/lib/db';
import crypto from 'crypto';

export interface ApiKey {
  id: string;
  community_id: string;
  token_hash: string;
  created_at: string;
}

export async function createApiKey(communityId: string): Promise<{ id: string; token: string }> {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const result = await query<ApiKey>(
    `INSERT INTO community_api_keys (community_id, token_hash)
     VALUES ($1, $2)
     RETURNING id, community_id, token_hash, created_at`,
    [communityId, tokenHash]
  );

  if (result.rows.length === 0) {
    throw new Error('Failed to create API key');
  }

  return { id: result.rows[0].id, token };
}

export async function listApiKeys(communityId: string): Promise<ApiKey[]> {
  const result = await query<ApiKey>(
    `SELECT id, community_id, token_hash, created_at
       FROM community_api_keys
      WHERE community_id = $1
      ORDER BY created_at DESC`,
    [communityId]
  );
  return result.rows;
}

export async function deleteApiKey(id: string, communityId: string): Promise<void> {
  await query(`DELETE FROM community_api_keys WHERE id = $1 AND community_id = $2`, [id, communityId]);
}
