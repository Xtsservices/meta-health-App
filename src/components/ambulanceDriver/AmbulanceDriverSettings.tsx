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
import { useNavigation } from '@react-navigation/native';
import AmbulanceDriverFooter from './AmbulanceDriverFooter';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 768;

const COLORS = {
  primary: '#14b8a6',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
};

const AmbulanceDriverSettings: React.FC = () => {
  const navigation = useNavigation();

  // Notification Settings
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [assignmentAlerts, setAssignmentAlerts] = useState(true);

  // Privacy Settings
  const [locationSharing, setLocationSharing] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);

  // App Settings
  const [darkMode, setDarkMode] = useState(false);
  const [soundEffects, setSoundEffects] = useState(true);
  const [autoAcceptTrips, setAutoAcceptTrips] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          onPress: () => {
            Alert.alert('Success', 'Logged out successfully!');
            (navigation as any).navigate('Login');
          },
        },
      ]
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Success', 'Cache cleared successfully!');
          },
        },
      ]
    );
  };

  const handleHelp = () => {
    Alert.alert(
      'Help & Support',
      'Contact support at:\n\nEmail: support@metahealth.com\nPhone: 1800-123-4567\n\nWorking Hours: 24/7',
      [{ text: 'OK' }]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      'About Meta Health',
      'Version: 1.0.0\n\nMeta Health Ambulance Driver App\n\n© 2025 Meta Health. All rights reserved.',
      [{ text: 'OK' }]
    );
  };

  const SettingItem = ({
    icon,
    title,
    subtitle,
    value,
    onValueChange,
    type = 'switch',
    onPress,
    showArrow = false,
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    value?: boolean;
    onValueChange?: (value: boolean) => void;
    type?: 'switch' | 'button';
    onPress?: () => void;
    showArrow?: boolean;
  }) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={type === 'button' ? onPress : undefined}
      disabled={type === 'switch'}
      activeOpacity={type === 'button' ? 0.7 : 1}
    >
      <View style={styles.settingLeft}>
        <Text style={styles.settingIcon}>{icon}</Text>
        <View style={styles.settingTextContainer}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {type === 'switch' && (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: '#d1d5db', true: '#a7f3d0' }}
          thumbColor={value ? '#14b8a6' : '#f3f4f6'}
        />
      )}
      {showArrow && <Text style={styles.settingArrow}>›</Text>}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSubtitle}>Manage your preferences</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Notification Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon="🔔"
              title="Push Notifications"
              subtitle="Receive push notifications"
              value={pushNotifications}
              onValueChange={setPushNotifications}
            />
            <SettingItem
              icon="✉️"
              title="Email Notifications"
              subtitle="Receive email updates"
              value={emailNotifications}
              onValueChange={setEmailNotifications}
            />
            <SettingItem
              icon="💬"
              title="SMS Notifications"
              subtitle="Receive SMS alerts"
              value={smsNotifications}
              onValueChange={setSmsNotifications}
            />
            <SettingItem
              icon="📋"
              title="Assignment Alerts"
              subtitle="Get notified for new assignments"
              value={assignmentAlerts}
              onValueChange={setAssignmentAlerts}
            />
          </View>
        </View>

        {/* Privacy Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Security</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon="📍"
              title="Location Sharing"
              subtitle="Share your location during trips"
              value={locationSharing}
              onValueChange={setLocationSharing}
            />
            <SettingItem
              icon="🟢"
              title="Show Online Status"
              subtitle="Let others see when you're online"
              value={showOnlineStatus}
              onValueChange={setShowOnlineStatus}
            />
            <SettingItem
              icon="🔒"
              title="Change Password"
              type="button"
              onPress={() => Alert.alert('Change Password', 'Redirect to change password screen')}
              showArrow={true}
            />
          </View>
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon="🌙"
              title="Dark Mode"
              subtitle="Enable dark theme"
              value={darkMode}
              onValueChange={setDarkMode}
            />
            <SettingItem
              icon="🔊"
              title="Sound Effects"
              subtitle="Play sounds for notifications"
              value={soundEffects}
              onValueChange={setSoundEffects}
            />
            <SettingItem
              icon="⚡"
              title="Auto Accept Trips"
              subtitle="Automatically accept trip assignments"
              value={autoAcceptTrips}
              onValueChange={setAutoAcceptTrips}
            />
            <SettingItem
              icon="🗑️"
              title="Clear Cache"
              subtitle="Free up storage space"
              type="button"
              onPress={handleClearCache}
              showArrow={true}
            />
          </View>
        </View>

        {/* Documents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Documents</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon="🪪"
              title="My Documents"
              subtitle="View and manage your documents"
              type="button"
              onPress={() => Alert.alert('Documents', 'View your uploaded documents')}
              showArrow={true}
            />
            <SettingItem
              icon="📄"
              title="Terms & Conditions"
              type="button"
              onPress={() => Alert.alert('Terms', 'Display terms and conditions')}
              showArrow={true}
            />
            <SettingItem
              icon="🔒"
              title="Privacy Policy"
              type="button"
              onPress={() => Alert.alert('Privacy', 'Display privacy policy')}
              showArrow={true}
            />
          </View>
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon="❓"
              title="Help & Support"
              subtitle="Get help or contact support"
              type="button"
              onPress={handleHelp}
              showArrow={true}
            />
            <SettingItem
              icon="⭐"
              title="Rate App"
              subtitle="Share your feedback"
              type="button"
              onPress={() => Alert.alert('Rate App', 'Thank you for your feedback!')}
              showArrow={true}
            />
            <SettingItem
              icon="ℹ️"
              title="About"
              subtitle="App version and information"
              type="button"
              onPress={handleAbout}
              showArrow={true}
            />
          </View>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutIcon}>🚪</Text>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.versionInfo}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
          <Text style={styles.copyrightText}>© 2025 Meta Health</Text>
        </View>
      </ScrollView>

      <AmbulanceDriverFooter active="settings" brandColor={COLORS.primary} />
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
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: isSmallDevice ? 14 : 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: isSmallDevice ? 16 : 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  sectionContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#999',
    fontWeight: '400',
  },
  settingArrow: {
    fontSize: 24,
    color: '#d1d5db',
    marginLeft: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  versionInfo: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  versionText: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
  copyrightText: {
    fontSize: 12,
    color: '#bbb',
    marginTop: 4,
  },
});

export default AmbulanceDriverSettings;
