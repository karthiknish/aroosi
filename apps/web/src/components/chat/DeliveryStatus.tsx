"use client";

import { Check, CheckCheck, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type DeliveryStatus = "sending" | "sent" | "delivered" | "read" | "failed";

interface DeliveryStatusProps {
  status: DeliveryStatus;
  className?: string;
  isCurrentUser?: boolean;
}

export function DeliveryStatus({ status, className, isCurrentUser = false }: DeliveryStatusProps) {
  if (!isCurrentUser) return null;

  const getStatusIcon = () => {
    switch (status) {
      case "sending":
        return <Clock className="w-3 h-3 animate-pulse" />;
      case "sent":
        return <Check className="w-3 h-3" />;
      case "delivered":
        return <CheckCheck className="w-3 h-3" />;
      case "read":
        return <CheckCheck className="w-3 h-3" />;
      case "failed":
        return <AlertCircle className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "sending":
        return "text-white/50";
      case "sent":
        return "text-white/70";
      case "delivered":
        return "text-white/70";
      case "read":
        return "text-success";
      case "failed":
        return "text-danger";
      default:
        return "text-white/50";
    }
  };

  const getStatusTitle = () => {
    switch (status) {
      case "sending":
        return "Sending...";
      case "sent":
        return "Sent";
      case "delivered":
        return "Delivered";
      case "read":
        return "Read";
      case "failed":
        return "Failed to send";
      default:
        return "Unknown";
    }
  };

  return (
    <div
      className={cn(
        "flex items-center transition-colors duration-200",
        getStatusColor(),
        className
      )}
      title={getStatusTitle()}
    >
      {getStatusIcon()}
    </div>
  );
}