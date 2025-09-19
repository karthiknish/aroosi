import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Send } from "lucide-react";

interface ConfirmSendUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  userIds: string[];
  pendingExternalIds: string[];
}

export function ConfirmSendUsersDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  userIds,
  pendingExternalIds,
}: ConfirmSendUsersDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Confirm Send to Selected Users
          </DialogTitle>
          <DialogDescription>
            This will send the notification to {userIds.length} selected users.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Target Users</h4>
            <div className="flex flex-wrap gap-2">
              {userIds.slice(0, 5).map((userId) => (
                <Badge key={userId} variant="outline">
                  {userId}
                </Badge>
              ))}
              {userIds.length > 5 && (
                <Badge variant="outline">
                  +{userIds.length - 5} more
                </Badge>
              )}
            </div>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-800">External User IDs</span>
            </div>
            <p className="text-sm text-blue-700">
              {pendingExternalIds.length} user IDs will be used for targeting
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>
            <Send className="h-4 w-4 mr-2" />
            Send Notification
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
