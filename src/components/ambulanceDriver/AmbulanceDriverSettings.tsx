import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import AmbulanceDriverFooter from './AmbulanceDriverFooter';
import { showSuccess } from '../../store/toast.slice';

const COLORS = {
  primary: '#14b8a6',
  success: '#10b981',
  error: '#ef4444',
};

const AmbulanceDriverSettings: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();

  const handleEditProfile = () => {
    dispatch(showSuccess('Profile editing feature coming soon'));
  };

  const handleChangePassword = () => {
    dispatch(showSuccess('Password change feature coming soon'));
  };

  const handleNotifications = () => {
    dispatch(showSuccess('Notification settings feature coming soon'));
  };

  const handleHelp = () => {
    dispatch(showSuccess('Help center feature coming soon'));
  };

  const handleLogout = () => {
    // Navigate directly to Login without Alert confirmation
    navigation.navigate('Login');
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity style={styles.settingItem} onPress={handleEditProfile}>
            <Text style={styles.settingLabel}>Edit Profile</Text>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={handleChangePassword}>
            <Text style={styles.settingLabel}>Change Password</Text>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          <TouchableOpacity style={styles.settingItem} onPress={handleNotifications}>
            <Text style={styles.settingLabel}>Notifications</Text>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <TouchableOpacity style={styles.settingItem} onPress={handleHelp}>
            <Text style={styles.settingLabel}>Help & Support</Text>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingLabel}>About</Text>
            <Text style={styles.settingValue}>Version 1.0.0</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: 20,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    paddingVertical: 12,
    textTransform: 'uppercase',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
  },
  settingValue: {
    fontSize: 14,
    color: '#999',
  },
  settingArrow: {
    fontSize: 24,
    color: '#ccc',
  },
  logoutButton: {
    backgroundColor: COLORS.error,
    marginHorizontal: 16,
    marginTop: 32,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AmbulanceDriverSettings;
