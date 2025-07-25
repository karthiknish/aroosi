import React from "react";
import { CheckCircle, Circle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepStatus {
  stepNumber: number;
  title: string;
  isComplete: boolean;
  hasErrors: boolean;
  isCurrent: boolean;
  progress: number;
}

interface ProgressIndicatorProps {
  steps: StepStatus[];
  className?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  steps,
  className,
}) => {
  return (
    <div className={cn("space-y-2", className)}>
      {/* Overall progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-pink-600 h-2 rounded-full transition-all duration-500"
          style={{
            width: `${(steps.filter((s) => s.isComplete).length / steps.length) * 100}%`,
          }}
        />
      </div>

      {/* Step indicators */}
      <div className="flex justify-between items-center">
        {steps.map((step, index) => (
          <div
            key={step.stepNumber}
            className="flex flex-col items-center space-y-1"
          >
            {/* Step circle */}
            <div
              className={cn(
                "relative flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300",
                step.isComplete && "bg-green-500 border-green-500",
                step.hasErrors && "bg-red-500 border-red-500",
                step.isCurrent &&
                  !step.isComplete &&
                  !step.hasErrors &&
                  "bg-pink-500 border-pink-500",
                !step.isComplete &&
                  !step.hasErrors &&
                  !step.isCurrent &&
                  "bg-gray-200 border-gray-300"
              )}
            >
              {step.isComplete ? (
                <CheckCircle className="w-5 h-5 text-white" />
              ) : step.hasErrors ? (
                <AlertCircle className="w-5 h-5 text-white" />
              ) : (
                <span
                  className={cn(
                    "text-xs font-medium",
                    step.isCurrent ? "text-white" : "text-gray-500"
                  )}
                >
                  {step.stepNumber}
                </span>
              )}
            </div>

            {/* Step title */}
            <span
              className={cn(
                "text-xs text-center max-w-16 leading-tight",
                step.isCurrent && "font-medium text-pink-600",
                step.isComplete && "text-green-600",
                step.hasErrors && "text-red-600",
                !step.isCurrent &&
                  !step.isComplete &&
                  !step.hasErrors &&
                  "text-gray-500"
              )}
            >
              {step.title}
            </span>

            {/* Progress indicator for current step */}
            {step.isCurrent && !step.isComplete && (
              <div className="w-12 bg-gray-200 rounded-full h-1">
                <div
                  className="bg-pink-500 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${step.progress}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Simplified version for inline use
interface SimpleProgressProps {
  current: number;
  total: number;
  className?: string;
}

export const SimpleProgress: React.FC<SimpleProgressProps> = ({
  current,
  total,
  className,
}) => {
  const percentage = (current / total) * 100;

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex justify-between text-xs text-gray-600">
        <span>
          Step {current} of {total}
        </span>
        <span>{Math.round(percentage)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-pink-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
