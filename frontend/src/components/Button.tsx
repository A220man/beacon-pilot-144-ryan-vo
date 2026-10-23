import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, disabled, children, className = "", ...props }, ref) => {
    const baseClass = "btn";
    const variantClass = `btn-${variant}`;
    const sizeClass = size === "sm" ? "btn-sm" : size === "lg" ? "btn-lg" : "";

    return (
      <button
        ref={ref}
        className={`${baseClass} ${variantClass} ${sizeClass} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <span className="loading-spinner" aria-hidden="true">⟳</span>}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";