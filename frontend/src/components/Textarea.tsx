import { TextareaHTMLAttributes, forwardRef } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className = "", id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helperText ? `${inputId}-helper` : undefined;

    return (
      <div className="input-wrapper">
        {label && <label htmlFor={inputId} className="label">{label}</label>}
        <textarea
          ref={ref}
          id={inputId}
          className={`input textarea ${error ? "input-error" : ""} ${className}`}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={`${errorId || ""} ${helperId || ""}`.trim() || undefined}
          {...props}
        />
        {error && <p id={errorId} className="error-text" role="alert">{error}</p>}
        {helperText && !error && <p id={helperId} className="helper-text">{helperText}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";