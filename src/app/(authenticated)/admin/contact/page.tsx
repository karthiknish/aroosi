"use client";

import { useState } from "react";
import { fetchAllContactsAdmin } from "@/lib/contactUtil";
import { useAuthContext } from "@/components/AuthProvider";
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
  const { token } = useAuthContext();
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const {
    data: contacts,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["admin-contacts", token],
    queryFn: () => fetchAllContactsAdmin(token ?? ""),
    enabled: !!token,
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
        <p className="text-red-500">
          Error loading contacts: {error?.message || "Unknown error"}
        </p>
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
          <Modal
            open={modalOpen}
            onClose={handleCloseModal}
            contact={selectedContact ?? ({} as Contact)}
          />
        </div>
      ) : (
        <p>No contact form submissions found.</p>
      )}
    </div>
  );
}
