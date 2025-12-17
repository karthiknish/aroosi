import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Trash2, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export type ContactMessage = {
  _id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
};

interface ContactMessagesProps {
  messages: ContactMessage[] | undefined;
  loading: boolean;
  onDelete?: (id: string) => void;
}

export function ContactMessages({
  messages,
  loading,
  onDelete,
}: ContactMessagesProps) {
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const [viewed, setViewed] = useState<ContactMessage | null>(null);

  const pagedMessages = messages
    ? messages.slice(page * pageSize, (page + 1) * pageSize)
    : [];
  const total = messages?.length || 0;
  const pageCount = Math.ceil(total / pageSize);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact Messages</CardTitle>
        <CardDescription>
          View and manage contact form submissions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <Skeleton className="w-20 h-6 rounded" />
            <Skeleton className="w-40 h-4 rounded" />
            <Skeleton className="w-32 h-4 rounded" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral/10">
                <thead className="bg-neutral/5">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-light uppercase">
                      Name
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-light uppercase">
                      Email
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-light uppercase">
                      Subject
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-light uppercase">
                      Date
                    </th>
                    <th className="px-4 py-2 text-xs font-semibold text-neutral-light uppercase text-center">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-base-light divide-y divide-neutral/5">
                  {pagedMessages.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="text-center py-8 text-neutral-light"
                      >
                        No messages yet
                      </td>
                    </tr>
                  ) : (
                    pagedMessages.map((sub) => (
                      <tr
                        key={sub._id}
                        className="hover:bg-primary/5 transition"
                      >
                        <td className="px-4 py-2 font-medium text-neutral-dark whitespace-nowrap">
                          {sub.name}
                        </td>
                        <td className="px-4 py-2 text-neutral whitespace-nowrap">
                          {sub.email}
                        </td>
                        <td className="px-4 py-2 text-neutral whitespace-nowrap">
                          {sub.subject}
                        </td>
                        <td className="px-4 py-2 text-xs text-neutral-light whitespace-nowrap">
                          {new Date(sub.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-2 flex gap-2 justify-center">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setViewed(sub)}
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-danger hover:text-danger/90"
                            onClick={() => onDelete?.(sub._id)}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination controls */}
            <div className="flex items-center justify-center gap-4 mt-6 mb-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Previous
              </Button>
              <span className="text-sm text-neutral-light">
                Page {page + 1} of {Math.max(1, pageCount)}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => (p + 1 < pageCount ? p + 1 : p))}
                disabled={page + 1 >= pageCount}
              >
                Next
              </Button>
            </div>
            {/* View Modal */}
            {viewed && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="bg-base-light rounded-lg shadow-xl max-w-md w-full p-6 relative">
                  <button
                    className="absolute top-2 right-2 text-neutral-light hover:text-neutral-dark"
                    onClick={() => setViewed(null)}
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <h2 className="text-lg font-bold text-neutral-dark mb-2">Contact Message</h2>
                  <div className="mb-2 text-neutral">
                    <span className="font-semibold">Name:</span> {viewed.name}
                  </div>
                  <div className="mb-2 text-neutral">
                    <span className="font-semibold">Email:</span> {viewed.email}
                  </div>
                  <div className="mb-2 text-neutral">
                    <span className="font-semibold">Subject:</span>{" "}
                    {viewed.subject}
                  </div>
                  <div className="mb-2 text-neutral">
                    <span className="font-semibold">Date:</span>{" "}
                    {new Date(viewed.createdAt).toLocaleString()}
                  </div>
                  <div className="mb-2 text-neutral">
                    <span className="font-semibold">Message:</span>
                  </div>
                  <div className="bg-neutral/5 border border-neutral/10 rounded p-3 text-neutral whitespace-pre-line max-h-60 overflow-y-auto">
                    {viewed.message}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
