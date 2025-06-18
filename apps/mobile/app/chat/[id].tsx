// @ts-expect-error gift chat types
import { GiftedChat, IMessage } from "react-native-gifted-chat";
import React, { useState, useCallback } from "react";
import { useLocalSearchParams } from "expo-router";

export default function ChatScreen() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id } = useLocalSearchParams<{ id: string }>();
  const [messages, setMessages] = useState<IMessage[]>([]);

  const onSend = useCallback((newMessages: IMessage[] = []) => {
    setMessages((previous) => GiftedChat.append(previous, newMessages));
  }, []);

  return <GiftedChat messages={messages} onSend={onSend} user={{ _id: 1 }} />;
}
