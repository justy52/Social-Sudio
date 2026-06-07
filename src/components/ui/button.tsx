import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'border border-primary/35 bg-primary text-primary-foreground shadow-[0_0_28px_rgba(56,189,248,0.26)] hover:bg-primary/90 hover:shadow-[0_0_34px_rgba(56,189,248,0.42)]',
        secondary:
          'border border-border/60 bg-secondary/80 text-secondary-foreground shadow-[0_14px_38px_rgba(2,6,23,0.22)] hover:border-primary/35 hover:bg-secondary',
        outline:
          'border border-input/80 bg-card/40 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-primary/50 hover:bg-primary/10 hover:text-primary',
        ghost:
          'text-muted-foreground hover:bg-primary/10 hover:text-primary hover:shadow-[0_0_24px_rgba(56,189,248,0.14)]',
        destructive:
          'border border-destructive/45 bg-destructive text-destructive-foreground shadow-[0_0_24px_rgba(239,68,68,0.2)] hover:bg-destructive/90',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
