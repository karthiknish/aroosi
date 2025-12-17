'use client';

import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BlockedUserBannerProps {
  isBlocked?: boolean;
  isBlockedBy?: boolean;
  userName?: string;
  onUnblock?: () => void;
  className?: string;
}

export const BlockedUserBanner: React.FC<BlockedUserBannerProps> = ({
  isBlocked,
  isBlockedBy,
  userName,
  onUnblock,
  className,
}) => {
  if (!isBlocked && !isBlockedBy) return null;

  if (isBlockedBy) {
    return (
      <Alert className={`border-warning/20 bg-warning/5 ${className}`}>
        <AlertTriangle className="h-4 w-4 text-warning" />
        <AlertDescription className="text-warning">
          This user has blocked you. You cannot send them messages or interests.
        </AlertDescription>
      </Alert>
    );
  }

  if (isBlocked) {
    return (
      <Alert className={`border-danger/20 bg-danger/5 ${className}`}>
        <Shield className="h-4 w-4 text-danger" />
        <AlertDescription className="text-danger flex items-center justify-between">
          <span>
            You have blocked {userName || 'this user'}. They cannot send you messages or interests.
          </span>
          {onUnblock && (
            <Button
              variant="outline"
              size="sm"
              onClick={onUnblock}
              className="ml-4 border-danger/30 text-danger hover:bg-danger/10"
            >
              Unblock
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};