import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootState } from '../../store/store';
import { showSuccess } from '../../store/toast.slice';
import { COLORS } from '../../utils/colour';
import { SPACING, FONT_SIZE } from '../../utils/responsive';
import {
  UserIcon,
  BellIcon,
  LogOutIcon,
  ChevronRightIcon,
  HelpCircleIcon,
  PhoneIcon,
} from '../../utils/SvgIcons';
import AmbulanceStaffFooter from './AmbulanceStaffFooter';

const AmbulanceStaffSettings: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.currentUser);

  const [notifications, setNotifications] = useState(true);
  const [tripAlerts, setTripAlerts] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('token');
              await AsyncStorage.removeItem('userID');
              dispatch(showSuccess('Logged out successfully'));
              (navigation as any).reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const renderSettingItem = (
    icon: React.ElementType,
    title: string,
    subtitle?: string,
    onPress?: () => void,
    showArrow = true,
    rightComponent?: React.ReactNode
  ) => {
    const IconComponent = icon;
    return (
      <TouchableOpacity
        style={styles.settingItem}
        onPress={onPress}
        disabled={!onPress}
        activeOpacity={onPress ? 0.7 : 1}
      >
        <View style={styles.settingLeft}>
          <View style={styles.iconContainer}>
            <IconComponent size={20} color={COLORS.brand} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>{title}</Text>
            {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
          </View>
        </View>
        {rightComponent ? (
          rightComponent
        ) : showArrow ? (
          <ChevronRightIcon size={20} color={COLORS.sub} />
        ) : null}
      </TouchableOpacity>
    );
  };

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSubtitle}>Manage your preferences</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        {renderSection(
          'Profile',
          <>
            {renderSettingItem(
              UserIcon,
              user?.name || 'User',
              user?.email || 'user@example.com',
              undefined,
              false
            )}
          </>
        )}

        {/* Notifications Section */}
        {renderSection(
          'Notifications',
          <>
            {renderSettingItem(
              BellIcon,
              'Push Notifications',
              'Receive notifications for new trips',
              undefined,
              false,
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: '#e2e8f0', true: COLORS.brand + '80' }}
                thumbColor={notifications ? COLORS.brand : '#f4f3f4'}
              />
            )}
            {renderSettingItem(
              BellIcon,
              'Trip Alerts',
              'Get alerted for urgent assignments',
              undefined,
              false,
              <Switch
                value={tripAlerts}
                onValueChange={setTripAlerts}
                trackColor={{ false: '#e2e8f0', true: COLORS.brand + '80' }}
                thumbColor={tripAlerts ? COLORS.brand : '#f4f3f4'}
              />
            )}
            {renderSettingItem(
              BellIcon,
              'Sound',
              'Enable notification sounds',
              undefined,
              false,
              <Switch
                value={soundEnabled}
                onValueChange={setSoundEnabled}
                trackColor={{ false: '#e2e8f0', true: COLORS.brand + '80' }}
                thumbColor={soundEnabled ? COLORS.brand : '#f4f3f4'}
              />
            )}
          </>
        )}

        {/* Support Section */}
        {renderSection(
          'Support',
          <>
            {renderSettingItem(
              HelpCircleIcon,
              'Help & FAQ',
              'Get answers to common questions',
              () => {
                // Navigate to help screen
                Alert.alert('Help', 'Help & FAQ screen coming soon');
              }
            )}
            {renderSettingItem(
              PhoneIcon,
              'Contact Support',
              'Get in touch with our team',
              () => {
                Alert.alert('Contact Support', 'Support contact details:\nPhone: +1 234 567 8900\nEmail: support@example.com');
              }
            )}
          </>
        )}

        {/* About Section */}
        {renderSection(
          'About',
          <>
            {renderSettingItem(
              HelpCircleIcon,
              'Version',
              '1.0.0',
              undefined,
              false
            )}
            {renderSettingItem(
              HelpCircleIcon,
              'Terms & Conditions',
              'Read our terms and policies',
              () => {
                Alert.alert('Terms & Conditions', 'Terms & Conditions screen coming soon');
              }
            )}
          </>
        )}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOutIcon size={20} color={COLORS.danger} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      <AmbulanceStaffFooter />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: COLORS.brand,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: FONT_SIZE.md,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.sub,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  sectionContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  settingLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: '#fff',
    paddingVertical: SPACING.md,
    borderRadius: 12,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: '#fee2e2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  logoutText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.danger,
  },
});

export default AmbulanceStaffSettings;
