"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";

interface Props {
  onConfirm: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const CancelSubscriptionButton: React.FC<Props> = ({
  onConfirm,
  disabled,
  isLoading,
  className,
  children,
}) => {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        className={className}
        disabled={disabled}
      >
        {children ?? "Cancel Subscription"}
      </Button>

      <ConfirmationModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          onConfirm();
        }}
        title="Cancel subscription?"
        description="Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period."
        confirmText="Confirm Cancel"
        cancelText="Keep Subscription"
        isLoading={isLoading}
      />
    </>
  );
};

export default CancelSubscriptionButton;
