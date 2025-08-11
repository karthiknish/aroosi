"use client";

import { useState } from "react";
import { fetchAllContactsAdmin } from "@/lib/contactUtil";
import { useAuthContext } from "@/components/ClerkAuthProvider";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Contact } from "@/lib/contactUtil";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

// Simple Modal component
function Modal({
  open,
  onClose,
  contact,
}: {
  open: boolean;
  onClose: () => void;
  contact: Contact;
}) {
  if (!open || !contact) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
          onClick={onClose}
          aria-label="Close"
        >
          &times;
        </button>
        <h2 className="text-xl font-bold mb-4">Contact Details</h2>
        <div className="mb-2">
          <span className="font-semibold">Name:</span> {contact.name}
        </div>
        <div className="mb-2">
          <span className="font-semibold">Email:</span> {contact.email}
        </div>
        <div className="mb-2">
          <span className="font-semibold">Message:</span>
          <div className="whitespace-pre-line border rounded p-2 mt-1 bg-gray-50">
            {contact.message}
          </div>
        </div>
        <div className="mb-2">
          <span className="font-semibold">Submitted At:</span>{" "}
          {contact.createdAt
            ? new Date(contact.createdAt).toLocaleString()
            : "-"}
        </div>
      </div>
    </div>
  );
}

export default function AdminContactPage() {
  // Cookie-auth; no token in context
  useAuthContext();
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const {
    data: contacts,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    // Remove token from query key and rely on server HttpOnly cookies
    queryKey: ["admin-contacts", { page, pageSize }],
    queryFn: () => fetchAllContactsAdmin("", { page, pageSize }),
    enabled: true,
  });

  const handleRowClick = (contact: Contact) => {
    setSelectedContact(contact);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedContact(null);
  };

  return (
    <div className="max-w-4xl my-10 mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Contact Form Submissions</h1>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : isError ? (
        <ErrorState
          message={error?.message ?? "Failed to load contacts."}
          onRetry={() => refetch()}
          className="py-16"
        />
      ) : contacts && contacts.length > 0 ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Submitted At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact: Contact) => (
                <TableRow
                  key={
                    contact._id ??
                    contact.id ??
                    `${contact.email}-${contact.createdAt}`
                  }
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => handleRowClick(contact)}
                >
                  <TableCell>{contact.name}</TableCell>
                  <TableCell>{contact.email}</TableCell>
                  <TableCell>{contact.subject}</TableCell>
                  <TableCell>{contact.message}</TableCell>
                  <TableCell>
                    {contact.createdAt
                      ? new Date(contact.createdAt).toLocaleString()
                      : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {/* Pagination controls */}
          <div className="flex items-center justify-between gap-4 py-3">
            <span className="text-sm text-gray-600">Page {page}</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => p + 1)}
                disabled={!contacts || contacts.length < pageSize}
              >
                Next
              </Button>
            </div>
          </div>

          <Modal
            open={modalOpen}
            onClose={handleCloseModal}
            contact={selectedContact ?? ({} as Contact)}
          />
        </div>
      ) : (
        <EmptyState message="No contact form submissions found." />
      )}
    </div>
  );
}
