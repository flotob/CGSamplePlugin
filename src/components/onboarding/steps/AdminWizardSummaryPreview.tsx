import React from 'react';
import type { StepType } from '@/hooks/useStepTypesQuery';
import { Badge } from '@/components/ui/badge';
import { ListChecks, UserCheck } from 'lucide-react'; // Icons

// Simplified Role interface for props
interface PreviewRole {
  id: string;
  title: string;
}

interface AdminWizardSummaryPreviewProps {
  includedStepTypes: StepType[];
  potentialRoles: PreviewRole[];
}

export const AdminWizardSummaryPreview: React.FC<AdminWizardSummaryPreviewProps> = ({
  includedStepTypes,
  potentialRoles,
}) => {
  return (
    <div className="space-y-6">
      <div className="p-4 border rounded-lg bg-card">
        <h3 className="flex items-center gap-2 text-md font-semibold mb-3 text-muted-foreground">
          <ListChecks className="h-5 w-5" />
          Included Step Types
        </h3>
        {includedStepTypes.length > 0 ? (
          <ul className="space-y-1 list-disc list-inside pl-2 text-sm">
            {includedStepTypes.map(type => (
              <li key={type.id}>
                {type.label || type.name.replace(/_/g, ' ')}
                {type.description && <span className="text-xs text-muted-foreground ml-2"> - {type.description}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No steps configured yet.</p>
        )}
      </div>

      <div className="p-4 border rounded-lg bg-card">
        <h3 className="flex items-center gap-2 text-md font-semibold mb-3 text-muted-foreground">
          <UserCheck className="h-5 w-5" />
          Potential Roles Granted
        </h3>
        {potentialRoles.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {potentialRoles.map(role => (
              <Badge key={role.id} variant="secondary">
                {role.title}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No roles will be assigned upon completion.</p>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground text-center pt-2">
        This is a preview based on the current wizard configuration. Actual results for users depend on their successful completion of mandatory steps.
      </p>
    </div>
  );
}; 