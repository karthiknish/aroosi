// Placeholder for match messages API functions
export const getMatchMessages = async (params: {
  conversationId: string;
  token: string;
  limit: number;
  before?: number;
}) => {
  // Implementation would go here
  return [];
};

export const sendMatchMessage = async (message: { text: string; toUserId: string; fromUserId: string }) => {
  // Implementation would go here
  return null;
};