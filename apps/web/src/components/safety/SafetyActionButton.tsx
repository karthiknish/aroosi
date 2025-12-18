'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Flag, Shield, ShieldCheck, ExternalLink } from 'lucide-react';
import { ReportUserDialog } from './ReportUserDialog';
import { BlockUserDialog } from './BlockUserDialog';
import { useBlockStatus } from '@/hooks/useSafety';

interface SafetyActionButtonProps {
  userId: string;
  userName?: string;
  variant?: 'button' | 'icon';
  className?: string;
}

export const SafetyActionButton: React.FC<SafetyActionButtonProps> = ({
  userId,
  userName,
  variant = 'icon',
  className,
}) => {
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const { data: blockStatus } = useBlockStatus(userId);

  const isBlocked = blockStatus?.isBlocked || false;

  const handleSafetyGuidelines = () => {
    window.open('/safety-guidelines', '_blank');
  };

  if (variant === 'button') {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className={className}>
              <Shield className="h-4 w-4 mr-2" />
              Safety Options
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowReportDialog(true)}>
              <Flag className="h-4 w-4 mr-2" />
              Report User
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowBlockDialog(true)}>
              {isBlocked ? (
                <>
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Unblock User
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Block User
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSafetyGuidelines}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Safety Guidelines
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ReportUserDialog
          isOpen={showReportDialog}
          onClose={() => setShowReportDialog(false)}
          userId={userId}
          userName={userName}
        />
        <BlockUserDialog
          isOpen={showBlockDialog}
          onClose={() => setShowBlockDialog(false)}
          userId={userId}
          userName={userName}
          isBlocked={isBlocked}
        />
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`bg-white/95 hover:bg-white text-neutral-dark border border-neutral/20 shadow-sm ${className || ""}`}
          >
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Safety options</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="bg-white/95 backdrop-blur-sm border border-neutral/20 shadow-lg"
        >
          <DropdownMenuItem onClick={() => setShowReportDialog(true)}>
            <Flag className="h-4 w-4 mr-2" />
            Report User
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowBlockDialog(true)}>
            {isBlocked ? (
              <>
                <ShieldCheck className="h-4 w-4 mr-2" />
                Unblock User
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Block User
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSafetyGuidelines}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Safety Guidelines
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ReportUserDialog
        isOpen={showReportDialog}
        onClose={() => setShowReportDialog(false)}
        userId={userId}
        userName={userName}
      />
      <BlockUserDialog
        isOpen={showBlockDialog}
        onClose={() => setShowBlockDialog(false)}
        userId={userId}
        userName={userName}
        isBlocked={isBlocked}
      />
    </>
  );
};