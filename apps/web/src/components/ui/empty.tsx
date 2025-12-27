import * as React from "react"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface EmptyProps extends React.HTMLAttributes<HTMLDivElement> {}

const Empty = React.forwardRef<HTMLDivElement, EmptyProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex min-h-[400px] flex-col items-center justify-center rounded-md border border-dashed p-8 text-center animate-in fade-in-50",
        className
      )}
      {...props}
    />
  )
)
Empty.displayName = "Empty"

interface EmptyIconProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: LucideIcon
}

const EmptyIcon = ({ icon: Icon, className, ...props }: EmptyIconProps) => (
  <div
    className={cn(
      "flex h-20 w-20 items-center justify-center rounded-full bg-muted",
      className
    )}
    {...props}
  >
    <Icon className="h-10 w-10 text-muted-foreground" />
  </div>
)
EmptyIcon.displayName = "EmptyIcon"

const EmptyTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("mt-4 text-lg font-semibold", className)}
    {...props}
  />
))
EmptyTitle.displayName = "EmptyTitle"

const EmptyDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      "mb-4 mt-2 text-sm font-normal leading-6 text-muted-foreground",
      className
    )}
    {...props}
  />
))
EmptyDescription.displayName = "EmptyDescription"

export { Empty, EmptyIcon, EmptyTitle, EmptyDescription }
