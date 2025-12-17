import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface MessageFeedbackProps {
  type: "success" | "error" | "warning" | "loading";
  message: string;
  isVisible: boolean;
  onClose?: () => void;
  autoClose?: boolean;
  duration?: number;
}

export const MessageFeedback: React.FC<MessageFeedbackProps> = ({
  type,
  message,
  isVisible,
  onClose,
  autoClose = true,
  duration = 3000,
}) => {
  React.useEffect(() => {
    if (autoClose && isVisible && onClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [autoClose, isVisible, onClose, duration]);

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-success" />;
      case "error":
        return <XCircle className="w-4 h-4 text-danger" />;
      case "warning":
        return <AlertCircle className="w-4 h-4 text-warning" />;
      case "loading":
        return <Loader2 className="w-4 h-4 text-info animate-spin" />;
      default:
        return null;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case "success":
        return "bg-success/5 border-success/10";
      case "error":
        return "bg-danger/5 border-danger/10";
      case "warning":
        return "bg-warning/5 border-warning/10";
      case "loading":
        return "bg-info/5 border-info/10";
      default:
        return "bg-neutral/5 border-neutral/10";
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium",
            getBackgroundColor()
          )}
        >
          {getIcon()}
          <span className="flex-1">{message}</span>
          {onClose && type !== "loading" && (
            <button
              onClick={onClose}
              className="text-neutral-light hover:text-neutral transition-colors"
            >
              ×
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export interface ConnectionStatusProps {
  status: "connected" | "connecting" | "disconnected";
  className?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  status,
  className,
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case "connected":
        return {
          icon: <Wifi className="w-3 h-3" />,
          color: "text-success",
          bgColor: "bg-success/10",
          label: "Connected",
        };
      case "connecting":
        return {
          icon: <Loader2 className="w-3 h-3 animate-spin" />,
          color: "text-warning",
          bgColor: "bg-warning/10",
          label: "Connecting...",
        };
      case "disconnected":
        return {
          icon: <WifiOff className="w-3 h-3" />,
          color: "text-danger",
          bgColor: "bg-danger/10",
          label: "Disconnected",
        };
      default:
        return {
          icon: <WifiOff className="w-3 h-3" />,
          color: "text-neutral",
          bgColor: "bg-neutral/10",
          label: "Unknown",
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div
      className={cn(
        "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
        config.color,
        config.bgColor,
        className
      )}
      title={config.label}
    >
      {config.icon}
      <span className="hidden sm:inline">{config.label}</span>
    </div>
  );
};

export interface MessageOperationFeedbackProps {
  operation: "sending" | "sent" | "failed" | "retrying";
  attempt?: number;
  maxAttempts?: number;
  className?: string;
}

export const MessageOperationFeedback: React.FC<
  MessageOperationFeedbackProps
> = ({ operation, attempt, maxAttempts, className }) => {
  const getFeedbackConfig = () => {
    switch (operation) {
      case "sending":
        return {
          icon: <Loader2 className="w-3 h-3 animate-spin" />,
          color: "text-info",
          message: "Sending...",
        };
      case "sent":
        return {
          icon: <CheckCircle className="w-3 h-3" />,
          color: "text-success",
          message: "Sent",
        };
      case "failed":
        return {
          icon: <XCircle className="w-3 h-3" />,
          color: "text-danger",
          message: "Failed",
        };
      case "retrying":
        return {
          icon: <Loader2 className="w-3 h-3 animate-spin" />,
          color: "text-warning",
          message: `Retrying... (${attempt}/${maxAttempts})`,
        };
      default:
        return {
          icon: null,
          color: "text-neutral",
          message: "",
        };
    }
  };

  const config = getFeedbackConfig();

  if (!config.message) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={cn(
        "flex items-center gap-1 text-xs font-medium",
        config.color,
        className
      )}
    >
      {config.icon}
      <span>{config.message}</span>
    </motion.div>
  );
};

export interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  className?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  message = "Loading...",
  className,
}) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            "absolute inset-0 bg-base-light/80 backdrop-blur-sm flex items-center justify-center z-10",
            className
          )}
        >
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-info" />
            <span className="text-sm font-medium text-neutral">{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
