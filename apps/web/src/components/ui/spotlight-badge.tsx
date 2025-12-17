import React from "react"
import { Zap } from "lucide-react"
import { Badge } from "./badge"
import { cn } from "@/lib/utils"

interface SpotlightBadgeProps {
  className?: string
  size?: "sm" | "default" | "lg"
  showText?: boolean
}

export function SpotlightBadge({ 
  className, 
  size = "default",
  showText = true 
}: SpotlightBadgeProps) {
  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5 [&>svg]:size-2.5",
    default: "text-xs px-2 py-0.5 [&>svg]:size-3",
    lg: "text-sm px-3 py-1 [&>svg]:size-4"
  }

  return (
    <Badge
      className={cn(
        "bg-gradient-to-r from-warning-light via-warning to-warning-dark text-white border-0 shadow-sm",
        "hover:from-warning hover:via-warning-dark hover:to-warning-dark transition-all duration-200",
        "animate-pulse [animation-duration:2s]",
        sizeClasses[size],
        className
      )}
    >
      <Zap className="fill-current" />
      {showText && "Spotlight"}
    </Badge>
  )
}

export function SpotlightIcon({ className }: { className?: string }) {
  return (
    <Zap 
      className={cn(
        "fill-warning text-warning animate-pulse [animation-duration:2s]",
        className
      )} 
    />
  )
}