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
      <Alert className={`border-orange-200 bg-orange-50 ${className}`}>
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          This user has blocked you. You cannot send them messages or interests.
        </AlertDescription>
      </Alert>
    );
  }

  if (isBlocked) {
    return (
      <Alert className={`border-red-200 bg-red-50 ${className}`}>
        <Shield className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800 flex items-center justify-between">
          <span>
            You have blocked {userName || 'this user'}. They cannot send you messages or interests.
          </span>
          {onUnblock && (
            <Button
              variant="outline"
              size="sm"
              onClick={onUnblock}
              className="ml-4 border-red-300 text-red-700 hover:bg-red-100"
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