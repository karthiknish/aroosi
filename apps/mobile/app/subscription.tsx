import { router } from 'expo-router';
import SubscriptionScreen from '@/src/screens/profile/SubscriptionScreen';

export default function SubscriptionRoute() {
    return <SubscriptionScreen onBack={() => router.back()} />;
}
