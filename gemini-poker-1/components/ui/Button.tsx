
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline';
  size?: 'default' | 'sm' | 'lg';
}

const variantClasses = {
  default: 'bg-amber-500 text-slate-900 hover:bg-amber-500/90',
  destructive: 'bg-red-600 text-red-50 hover:bg-red-600/90',
  outline: 'border border-amber-500 bg-transparent hover:bg-amber-500/10 text-amber-400',
};

const sizeClasses = {
  default: 'h-10 px-4 py-2 text-sm',
  sm: 'h-9 rounded-md px-3 text-xs',
  lg: 'h-14 rounded-md px-8 text-lg',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        className={`inline-flex items-center justify-center whitespace-nowrap rounded-md font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${className}`}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
