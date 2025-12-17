'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle } from 'lucide-react';
import { useBlockUser, useUnblockUser } from '@/hooks/useSafety';

interface BlockUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName?: string;
  isBlocked?: boolean;
}

export const BlockUserDialog: React.FC<BlockUserDialogProps> = ({
  isOpen,
  onClose,
  userId,
  userName,
  isBlocked = false,
}) => {
  const blockUserMutation = useBlockUser();
  const unblockUserMutation = useUnblockUser();

  const handleAction = async () => {
    if (isBlocked) {
      unblockUserMutation.mutate(userId, {
        onSuccess: () => onClose(),
      });
    } else {
      blockUserMutation.mutate(userId, {
        onSuccess: () => onClose(),
      });
    }
  };

  const isPending = blockUserMutation.isPending || unblockUserMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className={`h-5 w-5 ${isBlocked ? 'text-success' : 'text-danger'}`} />
            {isBlocked ? 'Unblock User' : 'Block User'}
          </DialogTitle>
          <DialogDescription>
            {isBlocked
              ? `Are you sure you want to unblock ${userName || 'this user'}?`
              : `Are you sure you want to block ${userName || 'this user'}?`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isBlocked ? (
            <div className="bg-danger/5 border border-danger/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-danger mt-0.5 flex-shrink-0" />
                <div className="text-sm text-danger">
                  <p className="font-medium mb-2">When you block this user:</p>
                  <ul className="text-xs space-y-1 list-disc list-inside">
                    <li>They won&apos;t be able to send you messages or interests</li>
                    <li>You won&apos;t see their profile in search results</li>
                    <li>They won&apos;t see your profile in their search results</li>
                    <li>Any existing conversations will be hidden</li>
                    <li>You can unblock them at any time</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-success/5 border border-success/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                <div className="text-sm text-success">
                  <p className="font-medium mb-2">When you unblock this user:</p>
                  <ul className="text-xs space-y-1 list-disc list-inside">
                    <li>They&apos;ll be able to send you messages and interests again</li>
                    <li>You&apos;ll see their profile in search results</li>
                    <li>They&apos;ll see your profile in their search results</li>
                    <li>Previous conversations will remain hidden</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {!isBlocked && (
            <div className="bg-info/5 border border-info/20 rounded-lg p-3">
              <div className="text-sm text-info">
                <p className="font-medium mb-1">Alternative options:</p>
                <p className="text-xs">
                  If this user is violating our community guidelines, consider reporting them instead. 
                  You can also adjust your profile visibility settings to control who can contact you.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAction}
            disabled={isPending}
            variant={isBlocked ? "default" : "destructive"}
          >
            {isPending 
              ? (isBlocked ? 'Unblocking...' : 'Blocking...') 
              : (isBlocked ? 'Unblock User' : 'Block User')
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};