import * as React from "react";
import { Label } from "@/components/ui/label";
import { Input, type InputProps } from "@/components/Input";
import { cn } from "@/utils/cn";

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  id?: string;
  helpText?: string;
  error?: string;
  inputProps?: InputProps;
}

export function Field({ label, id, helpText, error, inputProps, className, children, ...props }: FieldProps) {
  const describedBy = error ? `${id}-error` : helpText ? `${id}-help` : undefined;
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {label && (
        <Label htmlFor={id} className="eyebrow">
          {label}
        </Label>
      )}
      {children ?? <Input id={id} aria-describedby={describedBy} aria-invalid={!!error} {...inputProps} />}
      {helpText && !error && (
        <p id={`${id}-help`} className="text-sm text-muted-foreground">
          {helpText}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
