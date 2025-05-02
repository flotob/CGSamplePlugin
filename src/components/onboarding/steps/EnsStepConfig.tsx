import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle } from 'lucide-react';
import { validateEnsDomainOrPattern } from '@/lib/validationUtils';

export interface EnsSpecificConfig {
  domain_name?: string | null;
  minimum_age_days?: number | null;
  disabled?: boolean;
}

interface EnsStepConfigProps {
  initialData?: EnsSpecificConfig | null;
  onChange: (newConfig: Record<string, unknown>) => void;
  disabled?: boolean;
}

export const EnsStepConfig: React.FC<EnsStepConfigProps> = ({
  initialData,
  onChange,
  disabled = false,
}) => {
  // Keep minimal state for UI interaction logic if necessary
  const [customAgeInput, setCustomAgeInput] = React.useState<string>(() => {
    // Initialize custom input if initial age is custom
    const initialAge = initialData?.minimum_age_days;
    if (initialAge === null || initialAge === undefined) return '';
    const isStandard = [0, 7, 30, 90, 180, 365].includes(initialAge);
    return isStandard ? '' : initialAge.toString();
  });
  const [domainError, setDomainError] = React.useState<string | null>(null);
  const [ageError, setAgeError] = React.useState<string | null>(null);

  // Derive values directly from props (initialData) + minimal state
  const checkSpecificDomain = initialData?.domain_name !== null && initialData?.domain_name !== undefined;
  const domainNameValue = initialData?.domain_name || '';
  
  const checkMinimumAge = initialData?.minimum_age_days !== null && initialData?.minimum_age_days !== undefined;
  const ageValue = initialData?.minimum_age_days;
  let selectedAgeOption = '0'; // Default to 'Any age' value
  if (ageValue === 7) selectedAgeOption = '7';
  else if (ageValue === 30) selectedAgeOption = '30';
  else if (ageValue === 90) selectedAgeOption = '90';
  else if (ageValue === 180) selectedAgeOption = '180';
  else if (ageValue === 365) selectedAgeOption = '365';
  else if (ageValue !== null && ageValue !== undefined && ageValue > 0) selectedAgeOption = 'custom';

  // --- Simplified Validation Effect (runs only when relevant props change) ---
  React.useEffect(() => {
    let currentDomainError: string | null = null;
    if (checkSpecificDomain) {
      const validationResult = validateEnsDomainOrPattern(domainNameValue);
      if (!validationResult.isValid) {
        currentDomainError = validationResult.error;
      }
    }
    setDomainError(currentDomainError);

    let currentAgeError: string | null = null;
    if (checkMinimumAge && selectedAgeOption === 'custom') {
      const num = parseInt(customAgeInput, 10);
      if (isNaN(num) || !Number.isInteger(num) || num <= 0) {
         currentAgeError = 'Custom age must be a positive integer.';
      }
    }
    setAgeError(currentAgeError);

  }, [checkSpecificDomain, domainNameValue, checkMinimumAge, selectedAgeOption, customAgeInput]);

  // --- Direct onChange Handlers --- 

  const handleDomainCheckChange = (checked: boolean) => {
    onChange({
      ...initialData, // Keep existing specific config
      domain_name: checked ? '' : null, // Set to empty string to prompt input, or null if disabled
    });
  };

  const handleDomainInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...initialData,
      domain_name: e.target.value, // Pass raw input value
    });
  };

  const handleAgeCheckChange = (checked: boolean) => {
    onChange({
      ...initialData,
      minimum_age_days: checked ? 7 : null, // Default to 7 days if enabled, or null if disabled
    });
    if (!checked) setCustomAgeInput(''); // Clear custom input if disabled
  };

  const handleAgeSelectChange = (value: string) => {
    if (value === 'custom') {
      // Keep existing custom input if switching to custom, otherwise prompt
      const currentCustomNum = parseInt(customAgeInput || '0', 10);
      onChange({ ...initialData, minimum_age_days: currentCustomNum > 0 ? currentCustomNum : 1 }); // Default custom to 1 day
    } else {
      const numValue = parseInt(value, 10);
      onChange({ ...initialData, minimum_age_days: isNaN(numValue) || numValue <= 0 ? null : numValue }); // Allow setting back to 'Any age' (null)
      setCustomAgeInput(''); // Clear custom input if standard option selected
    }
  };
  
  const handleCustomAgeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    setCustomAgeInput(rawValue); // Update local state for the input field
    const num = parseInt(rawValue, 10);
    // Update parent state only if it's a valid positive number
    if (!isNaN(num) && Number.isInteger(num) && num > 0) {
       onChange({ ...initialData, minimum_age_days: num });
    }
     // If invalid, we don't update the parent state, rely on validation effect for error msg
  };

  const ageOptions = [
    { value: '0', label: 'Any age' },
    { value: '7', label: '7 days' },
    { value: '30', label: '30 days' },
    { value: '90', label: '90 days' },
    { value: '180', label: '180 days' },
    { value: '365', label: '1 year (365 days)' },
    { value: 'custom', label: 'Custom...' },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-3 p-4 border rounded-md bg-muted/20">
         <div className="flex items-center space-x-3">
           <Checkbox 
             id="check-specific-domain"
             checked={checkSpecificDomain}
             onCheckedChange={handleDomainCheckChange}
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
                 Enter the exact domain (e.g., `vitalik.eth`) or a JS regex pattern (e.g., `/^\\d+\\.eth$/`).
               </p>
              <Input 
                id="ens-domain-name"
                value={domainNameValue}
                onChange={handleDomainInputChange}
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
             onCheckedChange={handleAgeCheckChange}
             disabled={true}
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
               onValueChange={handleAgeSelectChange}
               disabled={true}
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
                  value={customAgeInput}
                  onChange={handleCustomAgeInputChange}
                  placeholder="Enter number of days"
                  min="1"
                  step="1"
                  disabled={true}
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