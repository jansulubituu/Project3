'use client';

interface FieldErrorProps {
  error?: string;
  className?: string;
  id?: string;
}

export default function FieldError({ error, className = '', id }: FieldErrorProps) {
  if (!error) return null;

  return (
    <p id={id} className={`mt-1 text-sm text-red-600 ${className}`} role="alert">
      {error}
    </p>
  );
}
