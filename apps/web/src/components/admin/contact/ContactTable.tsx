"use client";

import { Contact } from "@/lib/api/admin/contact";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyIcon,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { ErrorState } from "@/components/ui/error-state";
import { ChevronLeft, ChevronRight, Eye, Inbox } from "lucide-react";

interface ContactTableProps {
  contacts?: Contact[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onViewContact: (contact: Contact) => void;
  onRetry: () => void;
  emptyMessage?: string;
}

export function ContactTable({
  contacts,
  isLoading,
  isError,
  error,
  page,
  pageSize,
  onPageChange,
  onViewContact,
  onRetry,
  emptyMessage = "No contacts found.",
}: ContactTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Name</TableHead>
                <TableHead className="w-[250px]">Email</TableHead>
                <TableHead>Message Preview</TableHead>
                <TableHead className="w-[180px]">Date</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        message={error?.message ?? "Failed to load contacts."}
        onRetry={onRetry}
        className="py-12"
      />
    );
  }

  if (!contacts || contacts.length === 0) {
    return (
      <Empty className="py-12">
        <EmptyIcon icon={Inbox} />
        <EmptyTitle>No contacts</EmptyTitle>
        <EmptyDescription>{emptyMessage}</EmptyDescription>
      </Empty>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border border-neutral/10 rounded-md bg-base-light shadow-sm">
        <ScrollArea className="w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-neutral/5">
                <TableHead className="font-semibold text-neutral-dark">Name</TableHead>
                <TableHead className="font-semibold text-neutral-dark">Email</TableHead>
                <TableHead className="font-semibold text-neutral-dark">Message Preview</TableHead>
                <TableHead className="font-semibold text-neutral-dark">Date</TableHead>
                <TableHead className="text-right text-neutral-dark">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact) => (
                <TableRow 
                  key={contact._id ?? contact.id ?? `${contact.email}-${contact.createdAt}`}
                  className="hover:bg-neutral/5 transition-colors border-neutral/10"
                >
                  <TableCell className="font-medium text-neutral-dark">
                    {contact.name}
                  </TableCell>
                  <TableCell className="text-neutral-light">
                    {contact.email}
                  </TableCell>
                  <TableCell className="max-w-md">
                    <p className="truncate text-neutral-light">
                      {contact.message}
                    </p>
                  </TableCell>
                  <TableCell className="text-neutral-light whitespace-nowrap">
                    {contact.createdAt
                      ? new Date(contact.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onViewContact(contact)}
                      className="h-8 w-8 text-neutral-light hover:text-info hover:bg-info/10"
                    >
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">View details</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <p className="text-sm text-neutral-light">
          Page {page}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="h-8 border-neutral/20 text-neutral-dark hover:bg-neutral/5"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={contacts.length < pageSize}
            className="h-8 border-neutral/20 text-neutral-dark hover:bg-neutral/5"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
