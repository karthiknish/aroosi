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
      <div className="w-full bg-neutral-light/20 rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-500"
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
                step.isComplete && "bg-success border-success",
                step.hasErrors && "bg-danger border-danger",
                step.isCurrent &&
                  !step.isComplete &&
                  !step.hasErrors &&
                  "bg-primary border-primary",
                !step.isComplete &&
                  !step.hasErrors &&
                  !step.isCurrent &&
                  "bg-neutral-light/20 border-neutral-light/30"
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
                    step.isCurrent ? "text-white" : "text-neutral-light"
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
                step.isCurrent && "font-medium text-primary",
                step.isComplete && "text-success",
                step.hasErrors && "text-danger",
                !step.isCurrent &&
                  !step.isComplete &&
                  !step.hasErrors &&
                  "text-neutral-light"
              )}
            >
              {step.title}
            </span>

            {/* Progress indicator for current step */}
            {step.isCurrent && !step.isComplete && (
              <div className="w-12 bg-neutral-light/20 rounded-full h-1">
                <div
                  className="bg-primary h-1 rounded-full transition-all duration-300"
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
      <div className="flex justify-between text-xs text-neutral-light">
        <span>
          Step {current} of {total}
        </span>
        <span>{Math.round(percentage)}%</span>
      </div>
      <div className="w-full bg-neutral-light/20 rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
