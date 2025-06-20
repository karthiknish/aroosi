import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils"
import { LoadingSpinner } from "./loading-spinner";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
  srOnlyText?: string; // Screen reader only text
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      loadingText = "Loading",
      srOnlyText,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    // If using asChild with Radix Slot, ensure only a single valid React element is passed
    // Filter out accidental whitespace/empty string children that can be introduced by
    // formatting (e.g., newlines).
    const filteredChildren = React.Children.toArray(children).filter(
      (child) => !(typeof child === "string" && child.trim() === "")
    );

    // When using asChild, we avoid injecting the internal LoadingSpinner because it would
    // add a second child and break Radix Slot's single-child constraint. Instead, callers
    // should render their own spinner inside the slotted component if needed.
    const content = asChild ? (
      (filteredChildren[0] ?? null)
    ) : (
      <>
        {loading && (
          <>
            <LoadingSpinner size={16} />
            <span className="sr-only">{loadingText}</span>
          </>
        )}
        {children}
        {srOnlyText && <span className="sr-only">{srOnlyText}</span>}
      </>
    );

    return (
      <Comp
        ref={ref}
        className={cn(
          buttonVariants({ variant, size, className }),
          "active:scale-95 transition-transform",
          loading && "pointer-events-none opacity-70"
        )}
        disabled={disabled || loading}
        aria-disabled={disabled || loading}
        {...props}
      >
        {content}
      </Comp>
    );
  }
);
Button.displayName = "Button"

export { Button, buttonVariants }
