import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { showSuccess } from '../../store/toast.slice';
import AmbulanceFooter from './AmbulanceFooter';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 768;

const AmbulanceSettings: React.FC = () => {
  const dispatch = useDispatch();
  const [settings, setSettings] = useState({
    notificationsEnabled: true,
    emergencyAlerts: true,
    autoDispatch: false,
    gpsTracking: true,
    maintenanceReminders: true,
    sms_alerts: true,
  });

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    dispatch(showSuccess(`${key.replace(/_/g, ' ')} updated`));
  };

  const handleChangePassword = () => {
    Alert.alert('Change Password', 'Password change feature coming soon!');
  };

  const handleContactSupport = () => {
    Alert.alert('Contact Support', 'Support details:\nEmail: support@ambulance.app\nPhone: 1-800-AMBULANCE');
  };

  const handleAbout = () => {
    Alert.alert(
      'About',
      'Ambulance Management System\nVersion 1.0.0\n\n© 2025 Meta Health\nAll rights reserved.'
    );
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', onPress: () => {} },
      { text: 'Logout', onPress: () => dispatch(showSuccess('Logged out successfully')) },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>Configuration</Text>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>📬 Push Notifications</Text>
              <Text style={styles.settingDescription}>Receive push notifications</Text>
            </View>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={() => toggleSetting('notificationsEnabled')}
              trackColor={{ false: '#e5e7eb', true: '#a8e6d9' }}
              thumbColor={settings.notificationsEnabled ? '#14b8a6' : '#f0f0f0'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>🚨 Emergency Alerts</Text>
              <Text style={styles.settingDescription}>Get emergency notifications</Text>
            </View>
            <Switch
              value={settings.emergencyAlerts}
              onValueChange={() => toggleSetting('emergencyAlerts')}
              trackColor={{ false: '#e5e7eb', true: '#a8e6d9' }}
              thumbColor={settings.emergencyAlerts ? '#14b8a6' : '#f0f0f0'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>💬 SMS Alerts</Text>
              <Text style={styles.settingDescription}>Receive SMS notifications</Text>
            </View>
            <Switch
              value={settings.sms_alerts}
              onValueChange={() => toggleSetting('sms_alerts')}
              trackColor={{ false: '#e5e7eb', true: '#a8e6d9' }}
              thumbColor={settings.sms_alerts ? '#14b8a6' : '#f0f0f0'}
            />
          </View>
        </View>

        {/* Dispatch & Tracking Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dispatch & Tracking</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>🤖 Auto Dispatch</Text>
              <Text style={styles.settingDescription}>Automatically assign requests</Text>
            </View>
            <Switch
              value={settings.autoDispatch}
              onValueChange={() => toggleSetting('autoDispatch')}
              trackColor={{ false: '#e5e7eb', true: '#a8e6d9' }}
              thumbColor={settings.autoDispatch ? '#14b8a6' : '#f0f0f0'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>📍 GPS Tracking</Text>
              <Text style={styles.settingDescription}>Enable real-time GPS tracking</Text>
            </View>
            <Switch
              value={settings.gpsTracking}
              onValueChange={() => toggleSetting('gpsTracking')}
              trackColor={{ false: '#e5e7eb', true: '#a8e6d9' }}
              thumbColor={settings.gpsTracking ? '#14b8a6' : '#f0f0f0'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>🔧 Maintenance Reminders</Text>
              <Text style={styles.settingDescription}>Get maintenance notifications</Text>
            </View>
            <Switch
              value={settings.maintenanceReminders}
              onValueChange={() => toggleSetting('maintenanceReminders')}
              trackColor={{ false: '#e5e7eb', true: '#a8e6d9' }}
              thumbColor={settings.maintenanceReminders ? '#14b8a6' : '#f0f0f0'}
            />
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <TouchableOpacity style={styles.button} onPress={handleChangePassword}>
            <Text style={styles.buttonText}>🔐 Change Password</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={handleContactSupport}>
            <Text style={styles.buttonText}>📞 Contact Support</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={handleAbout}>
            <Text style={styles.buttonText}>ℹ️ About</Text>
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={[styles.section, styles.dangerSection]}>
          <Text style={styles.sectionTitle}>Danger Zone</Text>

          <TouchableOpacity style={styles.dangerButton} onPress={handleLogout}>
            <Text style={styles.dangerButtonText}>🚪 Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <AmbulanceFooter active="settings" brandColor="#14b8a6" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  header: {
    backgroundColor: '#14b8a6',
    paddingHorizontal: isSmallDevice ? 16 : 24,
    paddingTop: isSmallDevice ? 20 : 24,
    paddingBottom: 24,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: isSmallDevice ? 24 : 28,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  dangerSection: {
    borderBottomWidth: 0,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  settingContent: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    color: '#999',
    fontWeight: '400',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  dangerButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  dangerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
  },
});

export default AmbulanceSettings;
