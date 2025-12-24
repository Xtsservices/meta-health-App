import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import AmbulanceDriverFooter from './AmbulanceDriverFooter';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 768;

const COLORS = {
  primary: '#14b8a6',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
};

const DriverProfile: React.FC = () => {
  const [driverProfile] = useState({
    firstName: 'Rajesh',
    lastName: 'Kumar',
    phoneNo: '+91 98765 43210',
    email: 'rajesh.kumar@example.com',
    aadharNumber: '1234 5678 9012',
    licenseNumber: 'MH1420190012345',
    licenseExpiryDate: '2028-12-31',
    dateOfBirth: '1985-05-15',
    address: '123, MG Road, Andheri West, Mumbai - 400058',
    emergencyContact: '+91 98765 43211',
    bloodGroup: 'O+',
    experience: '10 years',
    status: 'active',
    joinedDate: '2020-01-15',
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleEditProfile = () => {
    Alert.alert('Edit Profile', 'Profile editing feature will be available soon', [{ text: 'OK' }]);
  };

  const handleViewDocuments = () => {
    Alert.alert('Documents', 'View documents feature will be available soon', [{ text: 'OK' }]);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {driverProfile.firstName[0]}{driverProfile.lastName[0]}
              </Text>
            </View>
            <Text style={styles.driverName}>
              {driverProfile.firstName} {driverProfile.lastName}
            </Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    driverProfile.status === 'active' ? COLORS.success : COLORS.error,
                },
              ]}
            >
              <Text style={styles.statusText}>{driverProfile.status.toUpperCase()}</Text>
            </View>
            <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
              <Text style={styles.editButtonText}>✏️ Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Personal Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Personal Information</Text>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Full Name:</Text>
            <Text style={styles.value}>
              {driverProfile.firstName} {driverProfile.lastName}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Date of Birth:</Text>
            <Text style={styles.value}>{formatDate(driverProfile.dateOfBirth)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Blood Group:</Text>
            <Text style={styles.value}>{driverProfile.bloodGroup}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Aadhar Number:</Text>
            <Text style={styles.value}>{driverProfile.aadharNumber}</Text>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contact Information</Text>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Phone:</Text>
            <Text style={styles.value}>{driverProfile.phoneNo}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{driverProfile.email}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Emergency Contact:</Text>
            <Text style={styles.value}>{driverProfile.emergencyContact}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.value}>{driverProfile.address}</Text>
          </View>
        </View>

        {/* License Information */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>License Information</Text>
            <TouchableOpacity onPress={handleViewDocuments}>
              <Text style={styles.viewDocLink}>View Docs</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>License Number:</Text>
            <Text style={styles.value}>{driverProfile.licenseNumber}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Expiry Date:</Text>
            <Text style={styles.value}>{formatDate(driverProfile.licenseExpiryDate)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Experience:</Text>
            <Text style={styles.value}>{driverProfile.experience}</Text>
          </View>
        </View>

        {/* Work Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Work Information</Text>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Joined Date:</Text>
            <Text style={styles.value}>{formatDate(driverProfile.joinedDate)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Status:</Text>
            <Text style={[styles.value, { color: COLORS.success, fontWeight: '700' }]}>
              {driverProfile.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsCard}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>📄 View Documents</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>🔔 Notification Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>🔒 Change Password</Text>
          </TouchableOpacity>
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
    paddingBottom: 100,
  },
  header: {
    backgroundColor: '#14b8a6',
    paddingHorizontal: isSmallDevice ? 16 : 24,
    paddingTop: isSmallDevice ? 30 : 40,
    paddingBottom: 30,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
  },
  driverName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: isSmallDevice ? 16 : 24,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#14b8a6',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 8,
  },
  viewDocLink: {
    fontSize: 14,
    color: '#14b8a6',
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  label: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  actionsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: isSmallDevice ? 16 : 24,
    marginTop: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButton: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  actionButtonText: {
    fontSize: 15,
    color: '#1f2937',
    fontWeight: '600',
  },
});

export default DriverProfile;
