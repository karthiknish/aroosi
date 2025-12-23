import { useState, useEffect } from 'react';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { Conversation, Message } from '../services/api/messages';

export function useRealTimeConversations() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const currentUser = auth().currentUser;
        if (!currentUser) {
            setLoading(false);
            return;
        }

        const userId = currentUser.uid;

        // 1. Listen to matches to get the list of people we can talk to
        const unsubscribeMatches = firestore()
            .collection('matches')
            .where('status', '==', 'matched')
            .onSnapshot(async (matchSnapshot) => {
                try {
                    const matchDocs = matchSnapshot.docs.filter(doc => {
                        const data = doc.data();
                        return data.user1Id === userId || data.user2Id === userId;
                    });

                    const conversationPromises = matchDocs.map(async (doc) => {
                        const matchData = doc.data();
                        const otherUserId = matchData.user1Id === userId ? matchData.user2Id : matchData.user1Id;
                        const matchId = doc.id;

                        // Get other user's profile
                        const userDoc = await firestore().collection('users').doc(otherUserId).get();
                        const userData = userDoc.data() || {};

                        // Get last message
                        const lastMsgSnapshot = await firestore()
                            .collection('messages')
                            .where('matchId', '==', matchId)
                            .orderBy('createdAt', 'desc')
                            .limit(1)
                            .get();
                        
                        const lastMessage = !lastMsgSnapshot.empty 
                            ? { id: lastMsgSnapshot.docs[0].id, ...lastMsgSnapshot.docs[0].data() } as Message
                            : undefined;

                        // Get unread count
                        const unreadSnapshot = await firestore()
                            .collection('messages')
                            .where('matchId', '==', matchId)
                            .where('recipientId', '==', userId)
                            .where('readAt', '==', null)
                            .get();

                        return {
                            matchId,
                            userId: otherUserId,
                            user: {
                                id: otherUserId,
                                displayName: userData.displayName || userData.fullName || 'Unknown',
                                photoURL: userData.photoURL || (userData.profileImageUrls && userData.profileImageUrls[0]) || null,
                            },
                            lastMessage,
                            unreadCount: unreadSnapshot.size,
                            updatedAt: lastMessage?.createdAt || matchData.createdAt || new Date().toISOString(),
                        } as Conversation;
                    });

                    const results = await Promise.all(conversationPromises);
                    // Sort by updatedAt desc
                    results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
                    
                    setConversations(results);
                    setLoading(false);
                } catch (err) {
                    console.error('Error in useRealTimeConversations:', err);
                    setError(err as Error);
                    setLoading(false);
                }
            }, (err) => {
                setError(err);
                setLoading(false);
            });

        return () => unsubscribeMatches();
    }, []);

    return { conversations, loading, error };
}
