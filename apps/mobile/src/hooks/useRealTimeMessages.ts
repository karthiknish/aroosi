import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import { useAuthStore } from '../store';

export interface MessageData {
  id: string;
  conversationId: string;
  fromUserId: string;
  toUserId: string;
  text: string;
  type: 'text' | 'voice' | 'image';
  audioStorageId?: string;
  mediaUrl?: string;
  duration?: number;
  fileSize?: number;
  mimeType?: string;
  isRead?: boolean;
  readAt?: number;
  createdAt: number;
  replyToMessageId?: string;
  replyToText?: string;
  replyToType?: 'text' | 'voice' | 'image';
  replyToFromUserId?: string;
  deleted?: boolean;
  edited?: boolean;
  editedAt?: number;
}

interface UseRealTimeMessagesProps {
  conversationId: string;
}

export function useRealTimeMessages({ conversationId }: UseRealTimeMessagesProps) {
  const { user } = useAuthStore();
  const userId = user?.id;
  
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const PAGE_SIZE = 50;

  // Normalize conversationId to sorted "userA_userB"
  const convKey = useMemo(() => {
    if (!conversationId) return '';
    const parts = String(conversationId).split('_');
    return parts.length === 2 ? parts.slice().sort().join('_') : conversationId;
  }, [conversationId]);

  useEffect(() => {
    if (!userId || !convKey) return;

    setIsConnected(false);
    setError(null);

    const unsubscribe = firestore()
      .collection('messages')
      .where('conversationId', '==', convKey)
      .orderBy('createdAt', 'desc')
      .limit(PAGE_SIZE)
      .onSnapshot(
        (snap) => {
          setIsConnected(true);
          const list: MessageData[] = [];
          snap.forEach((docSnap) => {
            const d = docSnap.data();
            list.push({
              id: docSnap.id,
              conversationId: d.conversationId,
              fromUserId: d.fromUserId,
              toUserId: d.toUserId,
              text: d.text || '',
              type: d.type || 'text',
              audioStorageId: d.audioStorageId,
              mediaUrl: d.mediaUrl,
              duration: d.duration,
              fileSize: d.fileSize,
              mimeType: d.mimeType,
              isRead: !!d.readAt,
              readAt: d.readAt,
              createdAt: d.createdAt || Date.now(),
              replyToMessageId: d.replyToMessageId,
              replyToText: d.replyToText,
              replyToType: d.replyToType,
              replyToFromUserId: d.replyToFromUserId,
              deleted: !!d.deleted,
              edited: !!d.edited,
              editedAt: d.editedAt,
            });
          });
          
          // Reverse to ascending for UI
          setMessages(list.reverse());
          setHasMore(snap.docs.length === PAGE_SIZE);
        },
        (err) => {
          console.error('Firestore messages subscription error', err);
          setError('Failed to load messages');
          setIsConnected(false);
        }
      );

    return () => unsubscribe();
  }, [userId, convKey]);

  const sendMessage = useCallback(
    async (text: string, toUserId: string) => {
      if (!userId || !text.trim()) return;

      const createdAt = Date.now();
      const normalizedConvId = [userId, toUserId].sort().join('_');

      try {
        const docRef = await firestore().collection('messages').add({
          conversationId: normalizedConvId,
          fromUserId: userId,
          toUserId,
          text: text.trim(),
          type: 'text',
          createdAt,
        });

        // Update conversation last message
        await firestore().collection('conversations').doc(normalizedConvId).set({
          participants: [userId, toUserId].sort(),
          lastMessage: {
            id: docRef.id,
            fromUserId: userId,
            toUserId,
            text: text.trim(),
            type: 'text',
            createdAt,
          },
          updatedAt: createdAt,
        }, { merge: true });

      } catch (err) {
        console.error('Failed to send message', err);
        throw err;
      }
    },
    [userId]
  );

  const sendImageMessage = useCallback(
    async (imageUri: string, toUserId: string) => {
      if (!userId || !imageUri) return;

      const createdAt = Date.now();
      const normalizedConvId = [userId, toUserId].sort().join('_');
      const filename = `messages/${normalizedConvId}/${Date.now()}.jpg`;

      try {
        // 1. Upload to Storage
        const reference = storage().ref(filename);
        await reference.putFile(imageUri);
        const downloadURL = await reference.getDownloadURL();

        // 2. Save to Firestore
        const docRef = await firestore().collection('messages').add({
          conversationId: normalizedConvId,
          fromUserId: userId,
          toUserId,
          text: '',
          type: 'image',
          audioStorageId: filename, // Using audioStorageId for storage path as per existing schema
          mediaUrl: downloadURL,
          createdAt,
        });

        // Update conversation last message
        await firestore().collection('conversations').doc(normalizedConvId).set({
          participants: [userId, toUserId].sort(),
          lastMessage: {
            id: docRef.id,
            fromUserId: userId,
            toUserId,
            text: 'Sent an image',
            type: 'image',
            createdAt,
          },
          updatedAt: createdAt,
        }, { merge: true });

      } catch (err) {
        console.error('Failed to send image message', err);
        throw err;
      }
    },
    [userId]
  );

  const fetchOlder = useCallback(async () => {
    if (loadingOlder || !hasMore || messages.length === 0) return;

    try {
      setLoadingOlder(true);
      const oldest = messages[0].createdAt;

      const snap = await firestore()
        .collection('messages')
        .where('conversationId', '==', convKey)
        .orderBy('createdAt', 'desc')
        .startAfter(oldest)
        .limit(PAGE_SIZE)
        .get();

      const chunk: MessageData[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        chunk.push({
          id: docSnap.id,
          conversationId: d.conversationId,
          fromUserId: d.fromUserId,
          toUserId: d.toUserId,
          text: d.text || '',
          type: d.type || 'text',
          mediaUrl: d.mediaUrl,
          createdAt: d.createdAt || Date.now(),
          isRead: !!d.readAt,
          readAt: d.readAt,
        });
      });

      if (chunk.length > 0) {
        setMessages((prev) => [...chunk.reverse(), ...prev]);
      }
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error('Fetch older messages failed', err);
    } finally {
      setLoadingOlder(false);
    }
  }, [loadingOlder, hasMore, messages, convKey]);

  const markAsRead = useCallback(async (messageIds: string[]) => {
    if (!userId || messageIds.length === 0) return;

    const batch = firestore().batch();
    const readAt = Date.now();

    messageIds.forEach((id) => {
      const ref = firestore().collection('messages').doc(id);
      batch.update(ref, { readAt });
    });

    try {
      await batch.commit();
    } catch (err) {
      console.error('Error marking messages read', err);
    }
  }, [userId]);

  return {
    messages,
    isConnected,
    sendMessage,
    sendImageMessage,
    fetchOlder,
    hasMore,
    loadingOlder,
    error,
    markAsRead,
  };
}
