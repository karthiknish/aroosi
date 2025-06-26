'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertTriangle, Flag } from 'lucide-react';
import { useReportUser } from '@/hooks/useSafety';
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
    description: 'Profile appears to be fake or using someone else&apos;s photos',
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
}

export const ReportUserDialog: React.FC<ReportUserDialogProps> = ({
  isOpen,
  onClose,
  userId,
  userName,
}) => {
  const [selectedReason, setSelectedReason] = useState<ReportReason>('inappropriate_content');
  const [description, setDescription] = useState('');
  const reportUserMutation = useReportUser();

  const handleSubmit = async () => {
    const reportData = {
      reportedUserId: userId,
      reason: selectedReason,
      description: selectedReason === 'other' || description.trim() ? description.trim() : undefined,
    };

    reportUserMutation.mutate(reportData, {
      onSuccess: () => {
        onClose();
        setSelectedReason('inappropriate_content');
        setDescription('');
      },
    });
  };

  const handleClose = () => {
    onClose();
    setSelectedReason('inappropriate_content');
    setDescription('');
  };

  const isDescriptionRequired = selectedReason === 'other';
  const canSubmit = selectedReason && (!isDescriptionRequired || description.trim().length > 0);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-red-500" />
            Report User{userName ? ` - ${userName}` : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Before reporting</p>
                <p>Please consider blocking this user if you simply don&apos;t want to interact with them. Reports are for serious violations of our community guidelines.</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="report-reason" className="text-base font-medium">
              Why are you reporting this user?
            </Label>
            <RadioGroup
              value={selectedReason}
              onValueChange={(value) => setSelectedReason(value as ReportReason)}
              className="space-y-3"
            >
              {reportReasons.map((reason) => (
                <div key={reason.value} className="flex items-start space-x-2">
                  <RadioGroupItem
                    value={reason.value}
                    id={reason.value}
                    className="mt-1"
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor={reason.value}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {reason.label}
                    </Label>
                    <p className="text-xs text-gray-600">{reason.description}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {(selectedReason === 'other' || selectedReason) && (
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                {isDescriptionRequired ? 'Please describe the issue *' : 'Additional details (optional)'}
              </Label>
              <Textarea
                id="description"
                placeholder={
                  isDescriptionRequired
                    ? 'Please provide details about the issue...'
                    : 'Provide any additional context that might help us understand the situation...'
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                className="min-h-[80px]"
              />
              <div className="text-xs text-gray-500 text-right">
                {description.length}/500 characters
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">What happens next?</p>
              <ul className="text-xs space-y-1 list-disc list-inside">
                <li>Our team will review your report within 24-48 hours</li>
                <li>We may take action including warnings or account suspension</li>
                <li>You&apos;ll be notified if we need additional information</li>
                <li>All reports are kept confidential</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || reportUserMutation.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {reportUserMutation.isPending ? 'Submitting...' : 'Submit Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};