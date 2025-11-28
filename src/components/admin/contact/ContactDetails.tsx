"use client";

import { Contact } from "@/lib/contactUtil";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mail, Calendar, User, MessageSquare } from "lucide-react";

interface ContactDetailsProps {
  contact: Contact | null;
  open: boolean;
  onClose: () => void;
}

export function ContactDetails({ contact, open, onClose }: ContactDetailsProps) {
  if (!contact) return null;

  const handleReply = () => {
    window.location.href = `mailto:${contact.email}?subject=Re: ${contact.subject || "Contact Inquiry"}`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-white">
        <DialogHeader>
          <DialogTitle>Contact Details</DialogTitle>
          <DialogDescription>
            Review message from {contact.name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-slate-500 flex items-center gap-2">
                <User className="h-4 w-4" /> Sender
              </h4>
              <p className="text-sm font-semibold text-slate-900">{contact.name}</p>
            </div>
            
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-slate-500 flex items-center gap-2">
                <Mail className="h-4 w-4" /> Email
              </h4>
              <p className="text-sm font-semibold text-slate-900">{contact.email}</p>
            </div>
            
            <div className="space-y-1 col-span-2">
              <h4 className="text-sm font-medium text-slate-500 flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Submitted At
              </h4>
              <p className="text-sm text-slate-900">
                {contact.createdAt
                  ? new Date(contact.createdAt).toLocaleString(undefined, {
                      dateStyle: "full",
                      timeStyle: "medium",
                    })
                  : "-"}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Message
            </h4>
            <div className="rounded-md bg-slate-50 p-4 text-sm text-slate-700 whitespace-pre-wrap border border-slate-100">
              {contact.message}
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleReply} className="gap-2">
            <Mail className="h-4 w-4" />
            Reply via Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
