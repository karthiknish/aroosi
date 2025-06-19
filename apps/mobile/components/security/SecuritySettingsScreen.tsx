import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
// @ts-expect-error expo vector icons
import { Ionicons } from '@expo/vector-icons';
import { Colors, Layout } from '../../constants';
import { useBiometricAuth } from '../../utils/BiometricAuth';
import { useAppLock, LockMethod } from '../../utils/AppLockService';
import { useDataEncryption } from '../../utils/DataEncryption';
import { useSecurityMonitor } from '../../utils/SecurityMonitor';
import PlatformHaptics from '../../utils/PlatformHaptics';

export default function SecuritySettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [biometricSettings, setBiometricSettings] = useState<any>(null);
  const [appLockSettings, setAppLockSettings] = useState<any>(null);
  const [encryptionSettings, setEncryptionSettings] = useState<any>(null);
  const [securitySettings, setSecuritySettings] = useState<any>(null);
  const [activeThreats, setActiveThreats] = useState<any[]>([]);

  const biometricAuth = useBiometricAuth();
  const appLock = useAppLock();
  const dataEncryption = useDataEncryption();
  const securityMonitor = useSecurityMonitor();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      const [
        biometric,
        appLockData,
        encryption,
        security,
        threats,
      ] = await Promise.all([
        biometricAuth.getSettings(),
        appLock.getSettings(),
        dataEncryption.getSettings(),
        securityMonitor.getSettings(),
        securityMonitor.getActiveThreats(),
      ]);

      setBiometricSettings(biometric);
      setAppLockSettings(appLockData);
      setEncryptionSettings(encryption);
      setSecuritySettings(security);
      setActiveThreats(threats);
    } catch (error) {
      console.error('Failed to load security settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricToggle = async (enabled: boolean) => {
    try {
      await PlatformHaptics.medium();
      
      if (enabled) {
        const result = await biometricAuth.enable();
        if (result.success) {
          await PlatformHaptics.success();
          Alert.alert('Success', 'Biometric authentication enabled');
          await loadSettings();
        } else {
          await PlatformHaptics.error();
          Alert.alert('Error', result.error || 'Failed to enable biometric authentication');
        }
      } else {
        Alert.alert(
          'Disable Biometric Authentication',
          'Are you sure you want to disable biometric authentication?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Disable',
              style: 'destructive',
              onPress: async () => {
                await biometricAuth.disable();
                await PlatformHaptics.success();
                Alert.alert('Disabled', 'Biometric authentication has been disabled');
                await loadSettings();
              },
            },
          ]
        );
      }
    } catch (error) {
      await PlatformHaptics.error();
      Alert.alert('Error', 'Failed to update biometric settings');
    }
  };

  const handleAppLockToggle = async (enabled: boolean) => {
    try {
      await PlatformHaptics.medium();
      
      if (enabled) {
        // Show options for app lock methods
        Alert.alert(
          'Enable App Lock',
          'Choose your preferred unlock method:',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Biometric Only',
              onPress: async () => {
                const biometricSupported = await biometricAuth.isSupported();
                if (biometricSupported) {
                  const success = await appLock.enableAppLock({
                    methods: [LockMethod.BIOMETRIC],
                  });
                  if (success) {
                    await PlatformHaptics.success();
                    Alert.alert('Success', 'App lock enabled with biometric authentication');
                    await loadSettings();
                  }
                } else {
                  Alert.alert('Error', 'Biometric authentication is not available');
                }
              },
            },
            {
              text: 'Passcode + Biometric',
              onPress: () => {
                Alert.prompt(
                  'Set Passcode',
                  'Enter a 4-digit passcode:',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Set',
                      onPress: async (passcode) => {
                        if (passcode && passcode.length >= 4) {
                          const methods = [LockMethod.PASSCODE];
                          const biometricSupported = await biometricAuth.isSupported();
                          if (biometricSupported) {
                            methods.push(LockMethod.BIOMETRIC);
                          }
                          
                          const success = await appLock.enableAppLock({
                            methods,
                            passcode,
                          });
                          
                          if (success) {
                            await PlatformHaptics.success();
                            Alert.alert('Success', 'App lock enabled');
                            await loadSettings();
                          }
                        } else {
                          Alert.alert('Error', 'Passcode must be at least 4 digits');
                        }
                      },
                    },
                  ],
                  'secure-text'
                );
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Disable App Lock',
          'Are you sure you want to disable app lock?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Disable',
              style: 'destructive',
              onPress: async () => {
                await appLock.disableAppLock();
                await PlatformHaptics.success();
                Alert.alert('Disabled', 'App lock has been disabled');
                await loadSettings();
              },
            },
          ]
        );
      }
    } catch (error) {
      await PlatformHaptics.error();
      Alert.alert('Error', 'Failed to update app lock settings');
    }
  };

  const handleEncryptionToggle = async (enabled: boolean) => {
    try {
      await PlatformHaptics.medium();
      
      if (enabled) {
        Alert.alert(
          'Enable Data Encryption',
          'This will encrypt sensitive data stored on your device. Do you want to set a custom passphrase?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Auto Generate',
              onPress: async () => {
                const success = await dataEncryption.enableEncryption();
                if (success) {
                  await PlatformHaptics.success();
                  Alert.alert('Success', 'Data encryption enabled');
                  await loadSettings();
                } else {
                  await PlatformHaptics.error();
                  Alert.alert('Error', 'Failed to enable encryption');
                }
              },
            },
            {
              text: 'Custom Passphrase',
              onPress: () => {
                Alert.prompt(
                  'Set Encryption Passphrase',
                  'Enter a strong passphrase:',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Set',
                      onPress: async (passphrase) => {
                        if (passphrase && passphrase.length >= 8) {
                          const success = await dataEncryption.enableEncryption(passphrase);
                          if (success) {
                            await PlatformHaptics.success();
                            Alert.alert('Success', 'Data encryption enabled');
                            await loadSettings();
                          } else {
                            await PlatformHaptics.error();
                            Alert.alert('Error', 'Failed to enable encryption');
                          }
                        } else {
                          Alert.alert('Error', 'Passphrase must be at least 8 characters');
                        }
                      },
                    },
                  ],
                  'secure-text'
                );
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Disable Data Encryption',
          'This will disable encryption for stored data. Are you sure?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Disable',
              style: 'destructive',
              onPress: async () => {
                await dataEncryption.disableEncryption();
                await PlatformHaptics.success();
                Alert.alert('Disabled', 'Data encryption has been disabled');
                await loadSettings();
              },
            },
          ]
        );
      }
    } catch (error) {
      await PlatformHaptics.error();
      Alert.alert('Error', 'Failed to update encryption settings');
    }
  };

  const handleSecurityMonitoringToggle = async (enabled: boolean) => {
    try {
      await securityMonitor.updateSettings({ monitoringEnabled: enabled });
      await PlatformHaptics.success();
      await loadSettings();
    } catch (error) {
      await PlatformHaptics.error();
      Alert.alert('Error', 'Failed to update security monitoring');
    }
  };

  const viewSecurityReport = async () => {
    try {
      const report = await securityMonitor.generateSecurityReport();
      Alert.alert(
        'Security Report',
        `Device Status: ${report.threats.length === 0 ? 'Secure' : 'Threats Detected'}\n` +
        `Active Threats: ${report.threats.filter(t => !t.resolved).length}\n` +
        `Device ID: ${report.deviceFingerprint?.substring(0, 16)}...`
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to generate security report');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
        <Text style={styles.loadingText}>Loading security settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Security Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security Status</Text>
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <Ionicons 
                name={activeThreats.length === 0 ? "shield-checkmark" : "warning"} 
                size={24} 
                color={activeThreats.length === 0 ? Colors.success[500] : Colors.error[500]} 
              />
              <Text style={[
                styles.statusText,
                { color: activeThreats.length === 0 ? Colors.success[500] : Colors.error[500] }
              ]}>
                {activeThreats.length === 0 ? 'Secure' : `${activeThreats.length} Threats`}
              </Text>
            </View>
            <TouchableOpacity style={styles.reportButton} onPress={viewSecurityReport}>
              <Text style={styles.reportButtonText}>View Security Report</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.primary[500]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Biometric Authentication */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Biometric Authentication</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Enable Biometric Login</Text>
              <Text style={styles.settingDescription}>
                Use fingerprint or face recognition for quick access
              </Text>
            </View>
            <Switch
              value={biometricSettings?.enabled || false}
              onValueChange={handleBiometricToggle}
              trackColor={{ false: Colors.neutral[300], true: Colors.primary[200] }}
              thumbColor={biometricSettings?.enabled ? Colors.primary[500] : Colors.neutral[400]}
            />
          </View>
        </View>

        {/* App Lock */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Lock</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Enable App Lock</Text>
              <Text style={styles.settingDescription}>
                Require authentication when app becomes active
              </Text>
            </View>
            <Switch
              value={appLockSettings?.enabled || false}
              onValueChange={handleAppLockToggle}
              trackColor={{ false: Colors.neutral[300], true: Colors.primary[200] }}
              thumbColor={appLockSettings?.enabled ? Colors.primary[500] : Colors.neutral[400]}
            />
          </View>
          
          {appLockSettings?.enabled && (
            <View style={styles.subSettings}>
              <Text style={styles.subSettingText}>
                Lock timeout: {appLockSettings.backgroundTimeout}s
              </Text>
              <Text style={styles.subSettingText}>
                Methods: {appLockSettings.enabledMethods?.join(', ') || 'None'}
              </Text>
            </View>
          )}
        </View>

        {/* Data Encryption */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Encryption</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Encrypt Sensitive Data</Text>
              <Text style={styles.settingDescription}>
                Encrypt personal information stored on device
              </Text>
            </View>
            <Switch
              value={encryptionSettings?.encryptionEnabled || false}
              onValueChange={handleEncryptionToggle}
              trackColor={{ false: Colors.neutral[300], true: Colors.primary[200] }}
              thumbColor={encryptionSettings?.encryptionEnabled ? Colors.primary[500] : Colors.neutral[400]}
            />
          </View>
        </View>

        {/* Security Monitoring */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security Monitoring</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Real-time Monitoring</Text>
              <Text style={styles.settingDescription}>
                Monitor for security threats and suspicious activity
              </Text>
            </View>
            <Switch
              value={securitySettings?.monitoringEnabled || false}
              onValueChange={handleSecurityMonitoringToggle}
              trackColor={{ false: Colors.neutral[300], true: Colors.primary[200] }}
              thumbColor={securitySettings?.monitoringEnabled ? Colors.primary[500] : Colors.neutral[400]}
            />
          </View>
        </View>

        {/* Additional Security Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Options</Text>
          
          <TouchableOpacity style={styles.actionItem} onPress={() => {
            Alert.alert(
              'Clear Security Data',
              'This will clear all security settings and stored encryption keys. Continue?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Clear',
                  style: 'destructive',
                  onPress: async () => {
                    // Clear all security data
                    await biometricAuth.disable();
                    await appLock.disableAppLock();
                    await dataEncryption.disableEncryption();
                    await securityMonitor.clearThreats();
                    
                    Alert.alert('Cleared', 'All security data has been cleared');
                    await loadSettings();
                  },
                },
              ]
            );
          }}>
            <Ionicons name="trash-outline" size={20} color={Colors.error[500]} />
            <Text style={[styles.actionText, { color: Colors.error[500] }]}>
              Clear Security Data
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
  },

  loadingText: {
    marginTop: Layout.spacing.md,
    color: Colors.text.secondary,
    fontSize: Layout.typography.fontSize.base,
  },

  content: {
    padding: Layout.spacing.lg,
  },

  section: {
    marginBottom: Layout.spacing.xl,
  },

  sectionTitle: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.md,
  },

  statusCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: Layout.radius.md,
    padding: Layout.spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },

  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.md,
  },

  statusText: {
    marginLeft: Layout.spacing.sm,
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.medium,
  },

  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Layout.spacing.sm,
  },

  reportButtonText: {
    color: Colors.primary[500],
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.medium,
  },

  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Layout.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },

  settingInfo: {
    flex: 1,
    marginRight: Layout.spacing.md,
  },

  settingLabel: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.medium,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.xs,
  },

  settingDescription: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: Layout.typography.lineHeight.sm,
  },

  subSettings: {
    paddingLeft: Layout.spacing.md,
    paddingTop: Layout.spacing.sm,
  },

  subSettingText: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Layout.spacing.xs,
  },

  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Layout.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },

  actionText: {
    marginLeft: Layout.spacing.md,
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.medium,
  },
});