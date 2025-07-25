import React from "react";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorSummaryProps {
  errors: Record<string, string>;
  isValid: boolean;
  progress: number;
  requiredFields: string[];
  completedFields: string[];
  className?: string;
}

export const ErrorSummary: React.FC<ErrorSummaryProps> = ({
  errors,
  isValid,
  progress,
  requiredFields,
  completedFields,
  className,
}) => {
  const errorCount = Object.keys(errors).length;
  const missingRequired = requiredFields.filter(
    (field) => !completedFields.includes(field)
  );
  const hasErrors = errorCount > 0;
  const hasMissingFields = missingRequired.length > 0;

  // Don't show anything if everything is complete and valid
  if (isValid && !hasMissingFields && !hasErrors) {
    return (
      <div
        className={cn(
          "flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg",
          className
        )}
      >
        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-green-800">
            Step completed successfully!
          </p>
          <p className="text-xs text-green-600">
            All required information has been provided.
          </p>
        </div>
      </div>
    );
  }

  // Show progress if there are missing fields but no errors
  if (!hasErrors && hasMissingFields) {
    return (
      <div
        className={cn(
          "flex items-center space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg",
          className
        )}
      >
        <Clock className="h-5 w-5 text-blue-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-800">
            {missingRequired.length} required field
            {missingRequired.length > 1 ? "s" : ""} remaining
          </p>
          <div className="mt-1">
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-blue-600 mt-1">{progress}% complete</p>
          </div>
        </div>
      </div>
    );
  }

  // Show errors
  if (hasErrors) {
    return (
      <div
        className={cn(
          "p-3 bg-red-50 border border-red-200 rounded-lg",
          className
        )}
      >
        <div className="flex items-start space-x-2">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">
              {errorCount} error{errorCount > 1 ? "s" : ""} need
              {errorCount === 1 ? "s" : ""} to be fixed
            </p>

            {/* List of errors */}
            <ul className="mt-2 space-y-1">
              {Object.entries(errors).map(([field, error]) => (
                <li key={field} className="text-xs text-red-700">
                  • {error}
                </li>
              ))}
            </ul>

            {/* Progress bar if there are also missing fields */}
            {hasMissingFields && (
              <div className="mt-3">
                <div className="w-full bg-red-200 rounded-full h-2">
                  <div
                    className="bg-red-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-red-600 mt-1">
                  {completedFields.length} of {requiredFields.length} required
                  fields completed
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};
