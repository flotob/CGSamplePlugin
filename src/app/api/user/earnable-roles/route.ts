import { withAuth } from '@/lib/withAuth';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { JwtPayload } from '@/app/api/auth/session/route';
import type { CommunityInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib';

// Define Role type alias from the imported payload
type Role = CommunityInfoResponsePayload['roles'][number];

// Define the structure for the response
interface GrantingWizard {
  wizard_id: string;
  wizard_name: string;
}

interface EarnableRole {
  role_id: string;
  role_title: string;
  role_description: string | null;
  granting_wizards: GrantingWizard[];
}

// GET: List roles the user can earn via active, uncompleted wizards
export const GET = withAuth(async (req) => {
  const user = req.user as JwtPayload | undefined;
  if (!user || !user.sub || !user.cid) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const userId = user.sub;
  const communityId = user.cid;

  try {
    // 1. Fetch user's current roles
    // TODO: Verify correct table/method for fetching user roles
    const userRolesRes = await query(
      `SELECT role_id FROM user_roles WHERE user_id = $1 AND community_id = $2`, 
      [userId, communityId]
    );
    const userRoles = userRolesRes.rows.map(r => r.role_id) as string[];

    // 2. Fetch all community roles (id and title only)
    // TODO: Verify correct table name for community roles
    const communityRolesRes = await query(
      `SELECT id, title FROM roles WHERE community_id = $1`, // Select only id and title
      [communityId]
    );
    // Update type assertion
    const communityRoles = communityRolesRes.rows as Pick<Role, 'id' | 'title'>[];

    if (!communityRoles || communityRoles.length === 0) {
        console.warn('No community roles found for community:', communityId);
        return NextResponse.json({ earnable_roles: [] });
    }

    // 3. Identify unearned roles
    const unearnedRoles = communityRoles.filter(role => !userRoles.includes(role.id));
    if (unearnedRoles.length === 0) {
      return NextResponse.json({ earnable_roles: [] }); // No roles left to earn
    }
    const unearnedRoleIds = unearnedRoles.map(r => r.id);

    // 4. Fetch IDs of wizards completed by the user
    const completedWizardsRes = await query(
      `SELECT wizard_id FROM user_wizard_completions WHERE user_id = $1`,
      [userId]
    );
    const completedWizardIds = new Set(completedWizardsRes.rows.map(row => row.wizard_id));

    // 5. Fetch active wizards for the community
    const activeWizardsRes = await query(
      `SELECT id, name FROM onboarding_wizards WHERE community_id = $1 AND is_active = true`,
      [communityId]
    );
    const activeWizards = activeWizardsRes.rows as { id: string, name: string }[];

    // 6. Filter out completed wizards
    const activeUncompletedWizards = activeWizards.filter(wiz => !completedWizardIds.has(wiz.id));
    const activeUncompletedWizardIds = activeUncompletedWizards.map(wiz => wiz.id);

    if (activeUncompletedWizardIds.length === 0) {
      return NextResponse.json({ earnable_roles: [] }); // No active wizards left to complete
    }

    // 7. Fetch steps targeting unearned roles from these active, uncompleted wizards
    const stepsRes = await query(
      `SELECT wizard_id, target_role_id 
       FROM onboarding_steps 
       WHERE wizard_id = ANY($1::uuid[]) AND target_role_id = ANY($2::text[])`,
      [activeUncompletedWizardIds, unearnedRoleIds]
    );
    const relevantSteps = stepsRes.rows as { wizard_id: string, target_role_id: string }[];

    // 8. Group wizards by the role they grant
    const rolesToWizardsMap = new Map<string, GrantingWizard[]>();
    const wizardIdToNameMap = new Map(activeUncompletedWizards.map(wiz => [wiz.id, wiz.name]));

    for (const step of relevantSteps) {
      // This check might be slightly redundant now due to WHERE clause, but safe to keep
      if (!unearnedRoleIds.includes(step.target_role_id)) continue; 

      const wizardName = wizardIdToNameMap.get(step.wizard_id);
      if (!wizardName) continue; // Should exist

      const wizardInfo = { wizard_id: step.wizard_id, wizard_name: wizardName };

      if (!rolesToWizardsMap.has(step.target_role_id)) {
        rolesToWizardsMap.set(step.target_role_id, []);
      }
      const wizardsForRole = rolesToWizardsMap.get(step.target_role_id)!;
      if (!wizardsForRole.some(w => w.wizard_id === wizardInfo.wizard_id)) {
           wizardsForRole.push(wizardInfo);
      }
    }

    // 9. Construct final response
    const earnableRolesResult: EarnableRole[] = unearnedRoles
      .map(role => ({
        role_id: role.id,
        role_title: role.title,
        role_description: null, // Set description to null as it wasn't fetched
        granting_wizards: rolesToWizardsMap.get(role.id) || [],
      }))
      .filter(role => role.granting_wizards.length > 0); 

    return NextResponse.json({ earnable_roles: earnableRolesResult });

  } catch (error) {
    console.error('Error fetching earnable roles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, false); // false = requires authentication, but not admin 