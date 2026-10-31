import { Check, Copy, Wand2 } from 'lucide-react';
import { useState } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { generatePassword } from '../schemas';

interface PasswordFieldProps {
  label: string;
  registration: UseFormRegisterReturn;
  value: string;
  onGenerate: (password: string) => void;
  error?: string;
}

/** Visible password input with generate + copy, for passwords an admin hands to someone else. */
export function PasswordField({ label, registration, value, onGenerate, error }: PasswordFieldProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked; the password is visible to copy by hand.
    }
  };

  return (
    <Field label={label} htmlFor={registration.name} error={error} hint="Share it with the user privately. They can change it from their profile.">
      <div className="flex gap-2">
        <Input id={registration.name} autoComplete="new-password" className="font-mono" invalid={!!error} {...registration} />
        <Button variant="secondary" size="icon" onClick={() => onGenerate(generatePassword())} aria-label="Generate password" title="Generate password">
          <Wand2 className="size-4" />
        </Button>
        <Button variant="secondary" size="icon" onClick={copy} disabled={!value} aria-label="Copy password" title="Copy password">
          {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
        </Button>
      </div>
    </Field>
  );
}
