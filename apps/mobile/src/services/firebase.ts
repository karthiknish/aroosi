/**
 * Firebase configuration and initialization
 */

import firebase from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';

// Firebase is auto-initialized from GoogleService-Info.plist (iOS)
// and google-services.json (Android) via native modules

export { firebase, auth, firestore, storage };

// Auth helpers
export const getCurrentUser = () => auth().currentUser;

export const onAuthStateChanged = (callback: (user: any) => void) => {
    return auth().onAuthStateChanged(callback);
};

// Firestore helpers
export const db = firestore();

export const getDocument = async (collection: string, docId: string) => {
    const doc = await db.collection(collection).doc(docId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
};

export const setDocument = async (collection: string, docId: string, data: any) => {
    await db.collection(collection).doc(docId).set(data, { merge: true });
};

// Storage helpers
export const uploadFile = async (path: string, uri: string) => {
    const reference = storage().ref(path);
    await reference.putFile(uri);
    return reference.getDownloadURL();
};
