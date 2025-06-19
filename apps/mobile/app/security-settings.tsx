import { Stack } from 'expo-router';
import SecuritySettingsScreen from '../components/security/SecuritySettingsScreen';

export default function SecuritySettings() {
  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Security Settings',
          headerShown: true,
        }} 
      />
      <SecuritySettingsScreen />
    </>
  );
}