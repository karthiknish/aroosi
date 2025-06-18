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
        "bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500 text-white border-0 shadow-sm",
        "hover:from-yellow-500 hover:via-yellow-600 hover:to-amber-600 transition-all duration-200",
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
        "fill-yellow-500 text-yellow-500 animate-pulse [animation-duration:2s]",
        className
      )} 
    />
  )
}