"use client";

import { useState } from "react";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Contact } from "@/lib/contactUtil";
import { useAdminContacts } from "@/hooks/useAdminContacts";
import { ContactTable } from "@/components/admin/contact/ContactTable";
import { ContactDetails } from "@/components/admin/contact/ContactDetails";
import { Mail, Star } from "lucide-react";

export default function AdminContactPage() {
  useAuthContext();
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  // State for Aroosi tab
  const [aroosiPage, setAroosiPage] = useState(1);
  const aroosiQuery = useAdminContacts({ 
    page: aroosiPage, 
    pageSize: 20, 
    source: "aroosi" 
  });

  // State for VIP tab
  const [vipPage, setVipPage] = useState(1);
  const vipQuery = useAdminContacts({ 
    page: vipPage, 
    pageSize: 20, 
    source: "vip" 
  });

  const handleViewContact = (contact: Contact) => {
    setSelectedContact(contact);
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setTimeout(() => setSelectedContact(null), 300); // Clear after animation
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Contact Submissions</h1>
        <p className="text-slate-500 mt-1">Manage inquiries from users and VIP clients.</p>
      </div>

      <Tabs defaultValue="aroosi" className="space-y-6">
        <TabsList className="bg-slate-100 p-1 border border-slate-200">
          <TabsTrigger value="aroosi" className="data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
            <Mail className="h-4 w-4" />
            General Inquiries
          </TabsTrigger>
          <TabsTrigger value="vip" className="data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
            <Star className="h-4 w-4 text-amber-500" />
            VIP Requests
          </TabsTrigger>
        </TabsList>

        <TabsContent value="aroosi" className="focus-visible:outline-none">
          <ContactTable
            contacts={aroosiQuery.contacts}
            isLoading={aroosiQuery.isLoading}
            isError={aroosiQuery.isError}
            error={aroosiQuery.error}
            page={aroosiPage}
            pageSize={20}
            onPageChange={setAroosiPage}
            onViewContact={handleViewContact}
            onRetry={aroosiQuery.refetch}
            emptyMessage="No general inquiries found."
          />
        </TabsContent>

        <TabsContent value="vip" className="focus-visible:outline-none">
          <ContactTable
            contacts={vipQuery.contacts}
            isLoading={vipQuery.isLoading}
            isError={vipQuery.isError}
            error={vipQuery.error}
            page={vipPage}
            pageSize={20}
            onPageChange={setVipPage}
            onViewContact={handleViewContact}
            onRetry={vipQuery.refetch}
            emptyMessage="No VIP requests found."
          />
        </TabsContent>
      </Tabs>

      <ContactDetails
        contact={selectedContact}
        open={detailsOpen}
        onClose={handleCloseDetails}
      />
    </div>
  );
}
