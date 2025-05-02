import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { isValidEnsDomain, isValidAgeDays } from '@/lib/step-logic/ens';
import { AlertCircle } from 'lucide-react';

export interface EnsSpecificConfig {
  requirement_type?: 'any_primary' | 'specific_domain' | null;
  domain_name?: string | null;
  minimum_age_days?: number | null;
}

interface EnsStepConfigProps {
  initialData?: EnsSpecificConfig | null;
  onChange: (newConfig: Record<string, unknown>) => void;
  disabled?: boolean;
}

const DEFAULT_REQUIREMENT_TYPE = 'any_primary';

export const EnsStepConfig: React.FC<EnsStepConfigProps> = ({
  initialData,
  onChange,
  disabled = false,
}) => {
  const [requirementType, setRequirementType] = React.useState(initialData?.requirement_type ?? DEFAULT_REQUIREMENT_TYPE);
  const [domainName, setDomainName] = React.useState(initialData?.domain_name ?? '');
  const [minAgeDays, setMinAgeDays] = React.useState<string>(initialData?.minimum_age_days?.toString() ?? ''); // Store as string for input

  const [domainError, setDomainError] = React.useState<string | null>(null);
  const [ageError, setAgeError] = React.useState<string | null>(null);

  // Update local state if initialData changes
  React.useEffect(() => {
    setRequirementType(initialData?.requirement_type ?? DEFAULT_REQUIREMENT_TYPE);
    setDomainName(initialData?.domain_name ?? '');
    setMinAgeDays(initialData?.minimum_age_days?.toString() ?? '');
    setDomainError(null); // Clear errors on step change
    setAgeError(null);
  }, [initialData]);

  // Validate and notify parent on change
  React.useEffect(() => {
    let currentDomainError: string | null = null;
    if (requirementType === 'specific_domain' && !domainName.trim()) {
      currentDomainError = 'Domain name is required for specific domain requirement.';
    } else if (requirementType === 'specific_domain' && !isValidEnsDomain(domainName)) {
      currentDomainError = 'Invalid ENS domain name format.';
    }
    setDomainError(currentDomainError);

    let currentAgeError: string | null = null;
    const ageNum = minAgeDays === '' ? null : parseInt(minAgeDays, 10);
    if (minAgeDays !== '' && (isNaN(ageNum ?? NaN) || !isValidAgeDays(ageNum))) {
       currentAgeError = 'Minimum age must be a non-negative integer.';
    }
    setAgeError(currentAgeError);

    // Only call onChange if data is valid
    if (currentDomainError === null && currentAgeError === null) {
      onChange({
        requirement_type: requirementType,
        domain_name: requirementType === 'specific_domain' ? domainName.trim() : null,
        minimum_age_days: ageNum,
      });
    }
    // We want this to run whenever inputs change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requirementType, domainName, minAgeDays]); // Exclude onChange to prevent loops

  return (
    <div className="space-y-4 border-t border-border/30 pt-4 mt-4">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">ENS Configuration</h3>
      
      <div className="space-y-1.5">
        <Label>Requirement Type</Label>
        <RadioGroup 
          value={requirementType}
          onValueChange={(value: 'any_primary' | 'specific_domain') => setRequirementType(value)}
          className="flex items-center gap-6 pt-1"
          disabled={disabled}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="any_primary" id="ens-any" />
            <Label htmlFor="ens-any" className="font-normal">Any Primary ENS</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="specific_domain" id="ens-specific" />
            <Label htmlFor="ens-specific" className="font-normal">Specific ENS Domain</Label>
          </div>
        </RadioGroup>
      </div>

      {requirementType === 'specific_domain' && (
        <div className="space-y-1.5">
          <Label htmlFor="ens-domain-name">Required Domain Name</Label>
          <Input 
            id="ens-domain-name"
            value={domainName}
            onChange={(e) => setDomainName(e.target.value)}
            placeholder="e.g., yourproject.eth"
            disabled={disabled}
            required
          />
          {domainError && (
            <p className="text-xs text-destructive flex items-center gap-1 pt-1">
                <AlertCircle className="h-3.5 w-3.5"/> {domainError}
            </p>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="ens-min-age">Minimum Age (Days, Optional)</Label>
        <Input 
          id="ens-min-age"
          type="number"
          value={minAgeDays}
          onChange={(e) => setMinAgeDays(e.target.value)}
          placeholder="e.g., 30 (requires ENS to be registered for 30 days)"
          min="0"
          step="1"
          disabled={disabled}
        />
         {ageError && (
            <p className="text-xs text-destructive flex items-center gap-1 pt-1">
                <AlertCircle className="h-3.5 w-3.5"/> {ageError}
            </p>
          )}
      </div>
    </div>
  );
}; 