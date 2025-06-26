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
        return <Clock className="w-3 h-3" />;
      case "sent":
        return <Check className="w-3 h-3" />;
      case "delivered":
        return <CheckCheck className="w-3 h-3" />;
      case "read":
        return <CheckCheck className="w-3 h-3 text-blue-300" />;
      case "failed":
        return <AlertCircle className="w-3 h-3 text-red-300" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "sending":
        return "text-gray-400";
      case "sent":
        return "text-purple-100";
      case "delivered":
        return "text-purple-100";
      case "read":
        return "text-blue-300";
      case "failed":
        return "text-red-300";
      default:
        return "text-gray-400";
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
        "flex items-center",
        getStatusColor(),
        className
      )}
      title={getStatusTitle()}
    >
      {getStatusIcon()}
    </div>
  );
}