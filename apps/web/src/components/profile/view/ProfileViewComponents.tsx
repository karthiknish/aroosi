import React from "react";
import { motion } from "framer-motion";

interface ProfileDetailViewProps {
  label: string;
  value?: string | null | number;
  isTextArea?: boolean;
  isSubtle?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export const ProfileDetailView: React.FC<ProfileDetailViewProps> = ({
  label,
  value,
  isTextArea = false,
  isSubtle = false,
  icon,
  className = "",
}) => {
  const displayValue = value == null || value === "" ? "-" : String(value);
  const textClass = isSubtle
    ? "text-sm text-neutral-light"
    : "text-md text-neutral-dark";

  return (
    <div
      className={`py-3 sm:grid sm:grid-cols-3 sm:gap-6 border-b border-neutral/10 last:border-b-0 ${className}`}
    >
      <dt className="text-sm font-medium text-neutral-light flex items-center gap-2">
        {icon}
        {label}
      </dt>
      <dd
        className={`mt-1 sm:mt-0 sm:col-span-2 ${
          isTextArea ? "whitespace-pre-wrap" : ""
        } ${textClass}`}
      >
        {displayValue}
      </dd>
    </div>
  );
};

interface DisplaySectionProps {
  title: React.ReactNode;
  children: React.ReactNode;
  noBorder?: boolean;
  fullWidth?: boolean;
  className?: string;
}

export const DisplaySection: React.FC<DisplaySectionProps> = ({
  title,
  children,
  noBorder = false,
  fullWidth = false,
  className = "",
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className={`space-y-6 pt-10 pb-12 ${!noBorder ? "border-b border-neutral/10" : ""} ${
      fullWidth ? "w-full" : ""
    } first:border-t-0 first:pt-0 ${className}`}
  >
    <h2 className="text-lg font-semibold text-neutral-dark mb-3 flex items-center gap-2 font-serif">
      {title}
    </h2>
    {children}
  </motion.div>
);
