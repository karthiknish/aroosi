import { router } from 'expo-router';
import EditProfileScreen from '@/src/screens/profile/EditProfileScreen';

export default function EditProfileRoute() {
    return (
        <EditProfileScreen
            onBack={() => router.back()}
            onSave={() => router.back()}
        />
    );
}
