"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

type ReportReason = "harassment" | "inappropriate_content" | string;

type ReportModalProps = {
  open: boolean;
  onClose: () => void;
  onBlockUser: () => Promise<void> | void;
  onReportUser: (reason: ReportReason, description: string) => Promise<void> | void;
};

export default function ReportModal({
  open,
  onClose,
  onBlockUser,
  onReportUser,
}: ReportModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Report User</h3>
                <p className="text-gray-600 text-sm mt-1">Report inappropriate behavior or content</p>
              </div>
              <div className="space-y-3">
                <Button
                  onClick={() => onReportUser("harassment", "User engaged in harassment")}
                  className="w-full"
                  variant="outline"
                >
                  Report Harassment
                </Button>
                <Button
                  onClick={() =>
                    onReportUser("inappropriate_content", "User sent inappropriate content")
                  }
                  className="w-full"
                  variant="outline"
                >
                  Report Inappropriate Content
                </Button>
                <Button
                  onClick={onBlockUser}
                  className="w-full bg-red-500 hover:bg-red-600 text-white"
                >
                  Block User
                </Button>
              </div>
              <Button onClick={onClose} variant="ghost" className="w-full">
                Cancel
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}