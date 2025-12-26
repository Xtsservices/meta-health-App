import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import AmbulanceDriverFooter from './AmbulanceDriverFooter';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 768;

const COLORS = {
  primary: '#14b8a6',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  successLight: '#d1fae5',
  errorLight: '#fee2e2',
};

interface DriverProfile {
  firstName: string;
  lastName: string;
  mobile: string;
  email: string;
  licenseNumber: string;
  licenseExpiry: string;
  bloodGroup: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
  experience: string;
  dateOfJoining: string;
}

const AmbulanceDriverProfile: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);

  const [profile, setProfile] = useState<DriverProfile>({
    firstName: 'Rajesh',
    lastName: 'Kumar',
    mobile: '+91 98765 43210',
    email: 'rajesh.kumar@example.com',
    licenseNumber: 'MH1420190012345',
    licenseExpiry: '2027-08-15',
    bloodGroup: 'O+',
    address: '123, Andheri West, Mumbai',
    city: 'Mumbai',
    state: 'Maharashtra',
    pinCode: '400058',
    emergencyContactName: 'Sunita Kumar',
    emergencyContactNumber: '+91 98765 43211',
    experience: '8 years',
    dateOfJoining: '2020-03-15',
  });

  const [stats] = useState({
    totalTrips: 542,
    totalDistance: '12,450 km',
    rating: '4.8',
    onTimeDelivery: '96%',
  });

  const handleSaveProfile = () => {
    Alert.alert(
      'Save Changes',
      'Do you want to save the profile changes?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: () => {
            setIsEditing(false);
            Alert.alert('Success', 'Profile updated successfully!');
          },
        },
      ]
    );
  };

  const handleChangePassword = () => {
    Alert.alert(
      'Change Password',
      'This will redirect you to change password screen',
      [{ text: 'OK' }]
    );
  };

  const ProfileField = ({ 
    label, 
    value, 
    icon, 
    editable = false,
    keyName,
  }: { 
    label: string; 
    value: string; 
    icon: string; 
    editable?: boolean;
    keyName?: keyof DriverProfile;
  }) => (
    <View style={styles.fieldContainer}>
      <View style={styles.fieldHeader}>
        <Text style={styles.fieldIcon}>{icon}</Text>
        <Text style={styles.fieldLabel}>{label}</Text>
      </View>
      {isEditing && editable && keyName ? (
        <TextInput
          style={styles.fieldInput}
          value={value}
          onChangeText={(text) => setProfile({ ...profile, [keyName]: text })}
          placeholder={label}
        />
      ) : (
        <Text style={styles.fieldValue}>{value}</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
        <Text style={styles.headerSubtitle}>Manage your information</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {profile.firstName[0]}{profile.lastName[0]}
              </Text>
            </View>
            <Text style={styles.profileName}>
              {profile.firstName} {profile.lastName}
            </Text>
            <Text style={styles.profileRole}>Ambulance Driver</Text>
          </View>

          {/* Stats Section */}
          <View style={styles.statsSection}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalTrips}</Text>
              <Text style={styles.statLabel}>Total Trips</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.rating}⭐</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.onTimeDelivery}</Text>
              <Text style={styles.statLabel}>On-Time</Text>
            </View>
          </View>

          {/* Edit Button */}
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => {
              if (isEditing) {
                handleSaveProfile();
              } else {
                setIsEditing(true);
              }
            }}
          >
            <Text style={styles.editButtonText}>
              {isEditing ? '💾 Save Changes' : '✏️ Edit Profile'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.sectionContent}>
            <ProfileField
              label="First Name"
              value={profile.firstName}
              icon="👤"
              editable={true}
              keyName="firstName"
            />
            <ProfileField
              label="Last Name"
              value={profile.lastName}
              icon="👤"
              editable={true}
              keyName="lastName"
            />
            <ProfileField
              label="Mobile Number"
              value={profile.mobile}
              icon="📱"
              editable={true}
              keyName="mobile"
            />
            <ProfileField
              label="Email Address"
              value={profile.email}
              icon="✉️"
              editable={true}
              keyName="email"
            />
            <ProfileField
              label="Blood Group"
              value={profile.bloodGroup}
              icon="🩸"
              editable={true}
              keyName="bloodGroup"
            />
          </View>
        </View>

        {/* License Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>License Information</Text>
          <View style={styles.sectionContent}>
            <ProfileField
              label="License Number"
              value={profile.licenseNumber}
              icon="🪪"
              editable={false}
            />
            <ProfileField
              label="License Expiry"
              value={profile.licenseExpiry}
              icon="📅"
              editable={false}
            />
            <ProfileField
              label="Experience"
              value={profile.experience}
              icon="🎯"
              editable={false}
            />
            <ProfileField
              label="Date of Joining"
              value={profile.dateOfJoining}
              icon="📆"
              editable={false}
            />
          </View>
        </View>

        {/* Address Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Address Information</Text>
          <View style={styles.sectionContent}>
            <ProfileField
              label="Address"
              value={profile.address}
              icon="🏠"
              editable={true}
              keyName="address"
            />
            <ProfileField
              label="City"
              value={profile.city}
              icon="🏙️"
              editable={true}
              keyName="city"
            />
            <ProfileField
              label="State"
              value={profile.state}
              icon="🗺️"
              editable={true}
              keyName="state"
            />
            <ProfileField
              label="Pin Code"
              value={profile.pinCode}
              icon="📮"
              editable={true}
              keyName="pinCode"
            />
          </View>
        </View>

        {/* Emergency Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Contact</Text>
          <View style={styles.sectionContent}>
            <ProfileField
              label="Contact Name"
              value={profile.emergencyContactName}
              icon="👥"
              editable={true}
              keyName="emergencyContactName"
            />
            <ProfileField
              label="Contact Number"
              value={profile.emergencyContactNumber}
              icon="☎️"
              editable={true}
              keyName="emergencyContactNumber"
            />
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleChangePassword}
          >
            <Text style={styles.actionButtonIcon}>🔒</Text>
            <Text style={styles.actionButtonText}>Change Password</Text>
            <Text style={styles.actionButtonArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Performance Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Summary</Text>
          <View style={styles.sectionContent}>
            <View style={styles.performanceCard}>
              <View style={styles.performanceItem}>
                <Text style={styles.performanceLabel}>Total Distance Covered</Text>
                <Text style={styles.performanceValue}>{stats.totalDistance}</Text>
              </View>
              <View style={styles.performanceItem}>
                <Text style={styles.performanceLabel}>On-Time Delivery Rate</Text>
                <Text style={[styles.performanceValue, { color: COLORS.success }]}>
                  {stats.onTimeDelivery}
                </Text>
              </View>
              <View style={styles.performanceItem}>
                <Text style={styles.performanceLabel}>Customer Rating</Text>
                <Text style={[styles.performanceValue, { color: COLORS.warning }]}>
                  {stats.rating} / 5.0
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <AmbulanceDriverFooter active="profile" brandColor={COLORS.primary} />
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
  profileCard: {
    backgroundColor: '#fff',
    marginHorizontal: isSmallDevice ? 16 : 24,
    marginTop: -40,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#14b8a6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f3f4f6',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#14b8a6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#f3f4f6',
  },
  editButton: {
    backgroundColor: '#14b8a6',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  fieldIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  fieldLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
  },
  fieldValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  fieldInput: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
    borderWidth: 1,
    borderColor: '#14b8a6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f0fdfa',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  actionButtonArrow: {
    fontSize: 24,
    color: '#999',
  },
  performanceCard: {
    gap: 16,
  },
  performanceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  performanceLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  performanceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#14b8a6',
  },
});

export default AmbulanceDriverProfile;
