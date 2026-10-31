import { Plus, X } from 'lucide-react';
import { useFieldArray, type Control, type UseFormRegister } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { UpdateFormValues } from '../schemas';

type ListName = 'highlights' | 'blockers' | 'nextDayPlan';

interface ListEditorProps {
  name: ListName;
  label: string;
  placeholder: string;
  control: Control<UpdateFormValues>;
  register: UseFormRegister<UpdateFormValues>;
}

/** An editable bullet list. Enter in the last row adds a new one. */
export function ListEditor({ name, label, placeholder, control, register }: ListEditorProps) {
  const { fields, append, remove } = useFieldArray({ control, name });

  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</legend>
      <ul className="space-y-2">
        {fields.map((field, index) => (
          <li key={field.id} className="flex gap-2">
            <Input
              placeholder={placeholder}
              aria-label={`${label} ${index + 1}`}
              {...register(`${name}.${index}.value`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (index === fields.length - 1) append({ value: '' });
                }
              }}
            />
            {fields.length > 1 && (
              <Button variant="ghost" size="icon" aria-label={`Remove ${label.toLowerCase()} ${index + 1}`} onClick={() => remove(index)}>
                <X className="size-4" />
              </Button>
            )}
          </li>
        ))}
      </ul>
      {fields.length < 20 && (
        <Button variant="ghost" size="sm" className="mt-1.5 -ml-2 text-zinc-500" onClick={() => append({ value: '' })}>
          <Plus className="size-3.5" /> Add point
        </Button>
      )}
    </fieldset>
  );
}
