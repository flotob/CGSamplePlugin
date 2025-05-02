import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { isValidEnsDomain, isValidAgeDays } from '@/lib/step-logic/ens';
import { AlertCircle } from 'lucide-react';

export interface EnsSpecificConfig {
  domain_name?: string | null;
  minimum_age_days?: number | null;
}

interface EnsStepConfigProps {
  initialData?: EnsSpecificConfig | null;
  onChange: (newConfig: Record<string, unknown>) => void;
  disabled?: boolean;
}

const ageOptions = [
  { value: '0', label: 'Any age' },
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '180', label: '180 days' },
  { value: '365', label: '1 year (365 days)' },
  { value: 'custom', label: 'Custom...' },
];

export const EnsStepConfig: React.FC<EnsStepConfigProps> = ({
  initialData,
  onChange,
  disabled = false,
}) => {
  const [checkSpecificDomain, setCheckSpecificDomain] = React.useState(false);
  const [checkMinimumAge, setCheckMinimumAge] = React.useState(false);

  const [domainName, setDomainName] = React.useState('');
  const [selectedAgeOption, setSelectedAgeOption] = React.useState<string>('7');
  const [customAgeDays, setCustomAgeDays] = React.useState<string>('');

  const [domainError, setDomainError] = React.useState<string | null>(null);
  const [ageError, setAgeError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const hasInitialDomain = initialData?.domain_name !== null && initialData?.domain_name !== undefined;
    const hasInitialAge = initialData?.minimum_age_days !== null && initialData?.minimum_age_days !== undefined;

    setCheckSpecificDomain(hasInitialDomain);
    setDomainName(hasInitialDomain ? initialData!.domain_name! : '');
    
    setCheckMinimumAge(hasInitialAge);
    if (hasInitialAge) {
      const initialAge = initialData!.minimum_age_days!;
      const existingOption = ageOptions.find(opt => opt.value === initialAge.toString());
      if (existingOption) {
        setSelectedAgeOption(existingOption.value);
        setCustomAgeDays('');
      } else {
        setSelectedAgeOption('custom');
        setCustomAgeDays(initialAge.toString());
      }
    } else {
      setSelectedAgeOption('7');
      setCustomAgeDays('');
    }

    setDomainError(null); 
    setAgeError(null);

  }, [initialData]);

  React.useEffect(() => {
    let currentDomainError: string | null = null;
    if (checkSpecificDomain && !domainName.trim()) {
      currentDomainError = 'Domain name or pattern is required when check is enabled.';
    } else if (checkSpecificDomain && !isValidEnsDomain(domainName)) {
      currentDomainError = 'Invalid format (or potentially invalid regex). Check syntax.'; 
    }
    setDomainError(currentDomainError);

    let currentAgeError: string | null = null;
    let finalAgeNum: number | null = null;

    if (checkMinimumAge) {
      if (selectedAgeOption === 'custom') {
        if (customAgeDays === '') {
          currentAgeError = 'Custom age requires a value when check is enabled.';
        } else {
          finalAgeNum = parseInt(customAgeDays, 10);
          if (isNaN(finalAgeNum) || !isValidAgeDays(finalAgeNum)) {
            currentAgeError = 'Custom age must be a non-negative integer.';
            finalAgeNum = null; 
          }
        }
      } else {
        finalAgeNum = parseInt(selectedAgeOption, 10);
        if (isNaN(finalAgeNum) || !isValidAgeDays(finalAgeNum)) {
             currentAgeError = 'Selected age must be a non-negative integer.';
             finalAgeNum = null; 
        }
      }
      if (finalAgeNum === 0) finalAgeNum = null; 
    } else {
      finalAgeNum = null;
    }
    setAgeError(currentAgeError);

    if (currentDomainError === null && currentAgeError === null) {
      onChange({
        domain_name: checkSpecificDomain ? domainName.trim() : null,
        minimum_age_days: finalAgeNum,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkSpecificDomain, domainName, checkMinimumAge, selectedAgeOption, customAgeDays]); 

  return (
    <div className="space-y-6">
      <div className="space-y-3 p-4 border rounded-md bg-muted/20">
         <div className="flex items-center space-x-3">
           <Checkbox 
             id="check-specific-domain"
             checked={checkSpecificDomain}
             onCheckedChange={(checked) => setCheckSpecificDomain(Boolean(checked))}
             disabled={disabled}
           />
           <Label htmlFor="check-specific-domain" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
             Verify Specific Domain/Pattern
           </Label>
         </div>
         <p className="text-xs text-muted-foreground pl-7">
            Enable this to require the user's primary ENS name to match a specific name or regex pattern. If disabled, any primary ENS is sufficient (unless other checks apply).
         </p>
         {checkSpecificDomain && (
            <div className="space-y-1.5 pl-7 pt-2">
              <Label htmlFor="ens-domain-name">Required Domain Name or Regex Pattern</Label>
               <p className="text-xs text-muted-foreground">
                 Enter the exact ENS domain (e.g., `vitalik.eth`) or a Javascript regex pattern (e.g., `/^\d+\.eth$/` for numeric ENS names).
               </p>
              <Input 
                id="ens-domain-name"
                value={domainName}
                onChange={(e) => setDomainName(e.target.value)}
                placeholder="e.g., yourproject.eth or /^.+\.mydao\.eth$/"
                disabled={disabled}
                required
                className="mt-1"
              />
              {domainError && (
                <p className="text-xs text-destructive flex items-center gap-1 pt-1">
                    <AlertCircle className="h-3.5 w-3.5"/> {domainError}
                </p>
              )}
            </div>
         )}
       </div>

       <div className="space-y-3 p-4 border rounded-md bg-muted/20">
         <div className="flex items-center space-x-3">
           <Checkbox 
             id="check-minimum-age"
             checked={checkMinimumAge}
             onCheckedChange={(checked) => setCheckMinimumAge(Boolean(checked))}
             disabled={disabled}
           />
           <Label htmlFor="check-minimum-age" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
             Verify Minimum Registration Age
           </Label>
         </div>
          <p className="text-xs text-muted-foreground pl-7">
             Enable this to require the user's primary ENS name to have been registered for a minimum duration.
         </p>
         {checkMinimumAge && (
          <div className="space-y-3 pl-7 pt-2">
             <Select 
               value={selectedAgeOption}
               onValueChange={setSelectedAgeOption}
               disabled={disabled}
             >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select minimum age..." />
              </SelectTrigger>
              <SelectContent>
                {ageOptions.map(option => (
                   <SelectItem key={option.value} value={option.value} disabled={option.value === '0'}>
                     {option.label}
                   </SelectItem>
                ))}
              </SelectContent>
             </Select>

            {selectedAgeOption === 'custom' && (
              <div className="space-y-1.5 pt-2">
                <Label htmlFor="ens-custom-age">Custom Minimum Age (Days)</Label>
                <Input 
                  id="ens-custom-age"
                  type="number"
                  value={customAgeDays}
                  onChange={(e) => setCustomAgeDays(e.target.value)}
                  placeholder="Enter number of days"
                  min="1"
                  step="1"
                  disabled={disabled}
                  required
                />
              </div>
            )}
             {ageError && (
                <p className="text-xs text-destructive flex items-center gap-1 pt-1">
                    <AlertCircle className="h-3.5 w-3.5"/> {ageError}
                </p>
              )}
           </div>
         )}
       </div>

    </div>
  );
}; 