import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

interface ContactMessage {
  _id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
}

interface ContactMessagesProps {
  messages: ContactMessage[] | undefined;
}

export function ContactMessages({ messages }: ContactMessagesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact Messages</CardTitle>
        <CardDescription>
          View and manage contact form submissions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {messages === undefined ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No messages yet</div>
        ) : (
          <div className="space-y-4">
            {messages.map((sub) => (
              <div
                key={sub._id}
                className="p-4 bg-white rounded-lg border border-gray-200"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{sub.name}</h3>
                    <p className="text-sm text-gray-500">{sub.email}</p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(sub.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-gray-700">
                  {sub.subject}
                </p>
                <p className="mt-1 text-sm text-gray-600">{sub.message}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
