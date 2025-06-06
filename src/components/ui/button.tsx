import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow active:scale-[0.97] active:shadow-inner",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow active:scale-[0.97] active:shadow-inner",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-accent/50 active:scale-[0.98]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.98]",
        ghost: "hover:bg-accent hover:text-accent-foreground active:bg-accent/60",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/80",
        success: "bg-success text-success-foreground shadow-sm hover:bg-success/90 hover:shadow active:scale-[0.97] active:shadow-inner",
        info: "bg-info text-info-foreground shadow-sm hover:bg-info/90 hover:shadow active:scale-[0.97] active:shadow-inner",
        warning: "bg-warning text-warning-foreground shadow-sm hover:bg-warning/90 hover:shadow active:scale-[0.97] active:shadow-inner",
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
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
