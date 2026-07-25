import type { InputHTMLAttributes } from 'react';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function FormField({ label, error, id, ...rest }: FormFieldProps) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div>
      <label htmlFor={fieldId} className="label">
        {label}
      </label>
      <input id={fieldId} className="input" {...rest} />
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
