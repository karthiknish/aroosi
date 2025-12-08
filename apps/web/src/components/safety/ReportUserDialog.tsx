'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertTriangle, Flag, Shield, CheckCircle2, Loader2, ChevronLeft } from 'lucide-react';
import { useReportUser, useBlockUser } from '@/hooks/useSafety';
import type { ReportReason } from '@/lib/api/safety';

const reportReasons: { value: ReportReason; label: string; description: string }[] = [
  {
    value: 'inappropriate_content',
    label: 'Inappropriate Content',
    description: 'Photos or messages that are inappropriate or offensive',
  },
  {
    value: 'harassment',
    label: 'Harassment',
    description: 'Unwanted contact, bullying, or threatening behavior',
  },
  {
    value: 'fake_profile',
    label: 'Fake Profile',
    description: 'Profile appears to be fake or using someone else\'s photos',
  },
  {
    value: 'spam',
    label: 'Spam',
    description: 'Sending repetitive or unwanted messages',
  },
  {
    value: 'safety_concern',
    label: 'Safety Concern',
    description: 'Behavior that makes you feel unsafe or uncomfortable',
  },
  {
    value: 'inappropriate_behavior',
    label: 'Inappropriate Behavior',
    description: 'Behavior that violates community guidelines',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Please describe the issue in detail',
  },
];

interface ReportUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName?: string;
  onReportSuccess?: () => void;
  onBlockSuccess?: () => void;
}

type DialogStep = 'report' | 'block_confirm' | 'success_report' | 'success_block';

export const ReportUserDialog: React.FC<ReportUserDialogProps> = ({
  isOpen,
  onClose,
  userId,
  userName,
  onReportSuccess,
  onBlockSuccess,
}) => {
  const [step, setStep] = useState<DialogStep>('report');
  const [selectedReason, setSelectedReason] = useState<ReportReason>('inappropriate_content');
  const [description, setDescription] = useState('');
  
  const reportUserMutation = useReportUser();
  const blockUserMutation = useBlockUser();

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setStep('report');
      setSelectedReason('inappropriate_content');
      setDescription('');
    }
  }, [isOpen]);

  const handleReportSubmit = async () => {
    const reportData = {
      reportedUserId: userId,
      reason: selectedReason,
      description: selectedReason === 'other' || description.trim() ? description.trim() : undefined,
    };

    reportUserMutation.mutate(reportData, {
      onSuccess: () => {
        setStep('success_report');
        onReportSuccess?.();
        // Auto close after a delay
        setTimeout(() => {
          onClose();
        }, 2000);
      },
    });
  };

  const handleBlockSubmit = async () => {
    blockUserMutation.mutate(userId, {
      onSuccess: () => {
        setStep('success_block');
        onBlockSuccess?.();
        setTimeout(() => {
          onClose();
        }, 2000);
      },
    });
  };

  const handleClose = () => {
    onClose();
  };

  const isDescriptionRequired = selectedReason === 'other';
  const canSubmitReport = selectedReason && (!isDescriptionRequired || description.trim().length > 0);
  const isPending = reportUserMutation.isPending || blockUserMutation.isPending;

  const renderContent = () => {
    switch (step) {
      case 'success_report':
        return (
          <div className="flex flex-col items-center justify-center py-8 space-y-4 text-center animate-in fade-in zoom-in duration-300">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Report Submitted</h3>
              <p className="text-sm text-gray-500 mt-1">
                Thank you for keeping our community safe. We will review your report shortly.
              </p>
            </div>
            <Button variant="outline" onClick={handleClose} className="mt-4">
              Close
            </Button>
          </div>
        );

      case 'success_block':
        return (
          <div className="flex flex-col items-center justify-center py-8 space-y-4 text-center animate-in fade-in zoom-in duration-300">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
              <Shield className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">User Blocked</h3>
              <p className="text-sm text-gray-500 mt-1">
                You will no longer see messages or content from this user.
              </p>
            </div>
            <Button variant="outline" onClick={handleClose} className="mt-4">
              Close
            </Button>
          </div>
        );

      case 'block_confirm':
        return (
          <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-800">
                  <p className="font-medium mb-2">Are you sure you want to block {userName || 'this user'}?</p>
                  <ul className="text-xs space-y-1.5 list-disc list-inside opacity-90">
                    <li>They won&apos;t be able to send you messages</li>
                    <li>You won&apos;t see their profile in search results</li>
                    <li>They won&apos;t be notified that you blocked them</li>
                    <li>You can unblock them anytime from settings</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-3 pt-2">
              <Button
                onClick={handleBlockSubmit}
                disabled={isPending}
                variant="destructive"
                className="w-full"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Blocking...
                  </>
                ) : (
                  'Confirm Block'
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setStep('report')}
                disabled={isPending}
                className="w-full"
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Report
              </Button>
            </div>
          </div>
        );

      case 'report':
      default:
        return (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">Safety First</p>
                  <p className="text-xs">
                    If you simply don&apos;t want to interact with this user, you can block them instead.
                    Reports are for serious violations.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-medium">
                Why are you reporting this user?
              </Label>
              <div className="max-h-[240px] overflow-y-auto pr-2 -mr-2">
                <RadioGroup
                  value={selectedReason}
                  onValueChange={(value) => setSelectedReason(value as ReportReason)}
                  className="space-y-3"
                >
                  {reportReasons.map((reason) => (
                    <div key={reason.value} className="flex items-start space-x-2 p-2 rounded-md hover:bg-gray-50 transition-colors">
                      <RadioGroupItem
                        value={reason.value}
                        id={reason.value}
                        className="mt-1"
                      />
                      <div className="grid gap-1 leading-none w-full">
                        <Label
                          htmlFor={reason.value}
                          className="text-sm font-medium leading-none cursor-pointer"
                        >
                          {reason.label}
                        </Label>
                        <p className="text-xs text-gray-500">
                          {reason.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </div>

            {(selectedReason === "other" || selectedReason) && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <Label htmlFor="description" className="text-sm font-medium">
                  {isDescriptionRequired
                    ? "Please describe the issue *"
                    : "Additional details (optional)"}
                </Label>
                <Textarea
                  id="description"
                  placeholder={
                    isDescriptionRequired
                      ? "Please provide details about the issue..."
                      : "Provide any additional context..."
                  }
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                  className="min-h-[80px] resize-none"
                />
                <div className="text-xs text-gray-500 text-right">
                  {description.length}/500
                </div>
              </div>
            )}

            <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('block_confirm')}
                className="sm:mr-auto text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                Block User Instead
              </Button>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="ghost" onClick={handleClose} className="flex-1 sm:flex-none">
                  Cancel
                </Button>
                <Button
                  onClick={handleReportSubmit}
                  disabled={!canSubmitReport || isPending}
                  className="bg-red-600 hover:bg-red-700 flex-1 sm:flex-none"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Report"
                  )}
                </Button>
              </div>
            </DialogFooter>
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'block_confirm' ? (
              <>
                <Shield className="h-5 w-5 text-red-500" />
                Block User
              </>
            ) : step.startsWith('success') ? (
              <span className="sr-only">Success</span>
            ) : (
              <>
                <Flag className="h-5 w-5 text-red-500" />
                Report User
              </>
            )}
          </DialogTitle>
          {!step.startsWith('success') && (
            <DialogDescription>
              {step === 'block_confirm' 
                ? 'Prevent this user from contacting you' 
                : 'Help us keep the community safe'}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-2">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
};
