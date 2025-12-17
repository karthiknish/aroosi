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
import { Smartphone, Send } from "lucide-react";

interface ConfirmSendDevicesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  playerIds: string[];
  pendingPlayerIds: string[];
}

export function ConfirmSendDevicesDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  playerIds,
  pendingPlayerIds,
}: ConfirmSendDevicesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Confirm Send to Selected Devices
          </DialogTitle>
          <DialogDescription>
            This will send the notification to {playerIds.length} selected devices.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Target Devices</h4>
            <div className="flex flex-wrap gap-2">
              {playerIds.slice(0, 5).map((playerId) => (
                <Badge key={playerId} variant="outline" className="font-mono text-xs">
                  {playerId.slice(0, 8)}...
                </Badge>
              ))}
              {playerIds.length > 5 && (
                <Badge variant="outline">
                  +{playerIds.length - 5} more
                </Badge>
              )}
            </div>
          </div>

          <div className="bg-success/5 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Smartphone className="h-4 w-4 text-success" />
              <span className="font-medium text-success">Player IDs</span>
            </div>
            <p className="text-sm text-success/80">
              {pendingPlayerIds.length} device IDs will be used for targeting
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
