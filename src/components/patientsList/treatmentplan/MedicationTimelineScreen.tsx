import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  ArrowLeftIcon,
  ClockIcon,
  CalendarIcon,
  PillIcon,
  SyringeIcon,
  DropletIcon,
  TestTubeIcon,
  BandageIcon,
  ActivityIcon,
  WindIcon,
  SquareIcon,
  BeakerIcon,
  CheckCircleIcon,
  XIcon,
  ClockIcon as Clock4Icon,
} from '../../../utils/SvgIcons';
import { medicineCategory, Reminder } from '../../../utils/types';
import { RootState } from '../../../store/store';
import { AuthFetch, AuthPatch } from '../../../auth/auth';
import { formatTime, formatDate } from '../../../utils/dateTime';
import Footer from '../../dashboard/footer';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type RouteParams = {
  timelineID: number;
  patientName: string;
  patientId: number;
};

type GroupedReminder = {
  dosageTime: string;
  medicine: Reminder[];
  percentage?: number;
};

const MedicationTimelineScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { timelineID, patientName } = route.params as RouteParams;
  
  const user = useSelector((s: RootState) => s.currentUser);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [groupedReminders, setGroupedReminders] = useState<GroupedReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);

  const getMedicineReminderApi = useRef(true);

  const getMedicineReminder = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await AuthFetch(`medicine/${timelineID}/reminders/all`, token);
      
      if (response?.data?.message === 'success') {
        const sortedReminders = (response?.data?.reminders || [])?.sort(compareDates);
        setReminders(sortedReminders);
        
        const grouped: GroupedReminder[] = sortedReminders?.reduce<GroupedReminder[]>(
          (acc, reminder) => {
            const dosageTime = reminder?.dosageTime;
            const existingGroup = acc?.find(group => group?.dosageTime === dosageTime);

            if (existingGroup) {
              existingGroup?.medicine?.push(reminder);
            } else {
              acc?.push({
                dosageTime: dosageTime,
                medicine: [reminder],
              });
            }
            return acc;
          }, []
        );

        const groupsWithPercentage = grouped?.map(group => {
          const percentage =
            (group?.medicine?.filter(medicine => medicine?.doseStatus === 1)?.length /
              group?.medicine?.length) * 100;
          return { ...group, percentage };
        });

        setGroupedReminders(groupsWithPercentage);
      }
    } catch (error) {
      setReminders([]);
      setGroupedReminders([]);
    } finally {
      setLoading(false);
    }
  };

  const compareDates = (a: Reminder, b: Reminder) => {
    return new Date(a?.dosageTime)?.valueOf() - new Date(b?.dosageTime)?.valueOf();
  };

  useEffect(() => {
    if (timelineID && getMedicineReminderApi.current) {
      getMedicineReminderApi.current = false;
      getMedicineReminder();
    }
  }, [timelineID]);

  const handleStatusUpdate = async (medicineId: number, newStatus: number) => {
    try {
      setUpdating(medicineId);
      
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Authentication token not found');
        return;
      }

      const medicine = reminders?.find(r => r?.id === medicineId);
      if (!medicine) return;

      const payload = {
        userID: user?.id,
        doseStatus: newStatus,
        medicineID: medicine?.medicineID,
        medicationTime: medicine?.medicationTime,
      };

      const response = await AuthPatch(
        `medicineReminder/${medicineId}`,
        payload,
        token,
      );

      if (response?.status === 'success' || response?.message === 'success') {
        const updatedReminders = reminders?.map(reminder =>
          reminder?.id === medicineId
            ? { 
                ...reminder, 
                doseStatus: newStatus,
                givenTime: new Date().toISOString(),
                firstName: user?.firstName 
              }
            : reminder
        );

        setReminders(updatedReminders);
        
        const grouped: GroupedReminder[] = updatedReminders?.reduce<GroupedReminder[]>(
          (acc, reminder) => {
            const dosageTime = reminder?.dosageTime;
            const existingGroup = acc?.find(group => group?.dosageTime === dosageTime);

            if (existingGroup) {
              existingGroup?.medicine?.push(reminder);
            } else {
              acc?.push({
                dosageTime: dosageTime,
                medicine: [reminder],
              });
            }
            return acc;
          }, []
        );

        const groupsWithPercentage = grouped?.map(group => {
          const percentage =
            (group?.medicine?.filter(med => med?.doseStatus === 1)?.length /
              group?.medicine?.length) * 100;
          return { ...group, percentage };
        });

        setGroupedReminders(groupsWithPercentage);

        Alert.alert('Success', 'Medicine status updated successfully');
      } else {
        Alert.alert('Error', response?.message || 'Failed to update status');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to update medicine status');
    } finally {
      setUpdating(null);
    }
  };

  const getStatusIcon = (status: number) => {
    switch (status) {
      case 1:
        return <CheckCircleIcon size={SCREEN_WIDTH < 375 ? 14 : 16} color="#10b981" />;
      case 2:
        return <XIcon size={SCREEN_WIDTH < 375 ? 14 : 16} color="#ef4444" />;
      default:
        return <Clock4Icon size={SCREEN_WIDTH < 375 ? 14 : 16} color="#f59e0b" />;
    }
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case 1:
        return 'Completed';
      case 2:
        return 'Not Required';
      default:
        return 'Pending';
    }
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case 1:
        return '#10b981';
      case 2:
        return '#ef4444';
      default:
        return '#f59e0b';
    }
  };

  const getMedicineIcon = (medicineType: number) => {
    const iconProps = { 
      size: SCREEN_WIDTH < 375 ? 14 : 16, 
      color: '#64748b' 
    };
    
    switch (medicineType) {
      case medicineCategory.capsules:
        return <PillIcon {...iconProps} />;
      case medicineCategory.syrups:
        return <BeakerIcon {...iconProps} />;
      case medicineCategory.tablets:
        return <SquareIcon {...iconProps} />;
      case medicineCategory.injections:
        return <SyringeIcon {...iconProps} />;
      case medicineCategory.ivLine:
        return <ActivityIcon {...iconProps} />;
      case medicineCategory.Tubing:
        return <TestTubeIcon {...iconProps} />;
      case medicineCategory.Topical:
        return <BandageIcon {...iconProps} />;
      case medicineCategory.Drops:
        return <DropletIcon {...iconProps} />;
      case medicineCategory.Spray:
        return <WindIcon {...iconProps} />;
      case medicineCategory.Ventilator:
        return <WindIcon {...iconProps} />;
      default:
        return <PillIcon {...iconProps} />;
    }
  };

  const getDosageUnit = (medicineType: number): string => {
    if (medicineType === medicineCategory.capsules || medicineType === medicineCategory.tablets) return 'mg';
    if (medicineType === medicineCategory.Tubing) return 'g';
    return 'ml';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#14b8a6" />
          <Text style={styles.loadingText}>Loading timeline...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeftIcon size={SCREEN_WIDTH < 375 ? 20 : 24} color="#374151" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Medication Timeline</Text>
          <Text style={styles.patientName}>{patientName}</Text>
        </View>
        
        <View style={styles.placeholder} />
      </View>

      {/* Main Content Area */}
      <View style={styles.contentWrapper}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 80 } // Extra padding for footer
          ]}
          showsVerticalScrollIndicator={false}
        >
          {groupedReminders?.length === 0 ? (
            <View style={styles.emptyContainer}>
              <CalendarIcon size={SCREEN_WIDTH < 375 ? 40 : 48} color="#94a3b8" />
              <Text style={styles.emptyText}>No medication timeline found</Text>
              <Text style={styles.emptySubtext}>
                No medication schedule available for this patient.
              </Text>
            </View>
          ) : (
            groupedReminders?.map((group, groupIndex) => (
              <View key={groupIndex} style={styles.timeGroup}>
                {/* Group Header */}
                <View style={styles.groupHeader}>
                  <View style={styles.groupTime}>
                    <ClockIcon size={SCREEN_WIDTH < 375 ? 16 : 18} color="#14b8a6" />
                    <Text style={styles.groupTimeText}>
                      {formatTime(group?.dosageTime)}
                    </Text>
                  </View>
                  <View style={styles.completionContainer}>
                    <Text style={styles.completionText}>
                      {Math.round(group?.percentage || 0)}% Completed
                    </Text>
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill,
                          { width: `${group?.percentage || 0}%` }
                        ]} 
                      />
                    </View>
                  </View>
                </View>

                {/* Medicines List */}
                <View style={styles.medicinesList}>
                  {group?.medicine?.map((medicine, medicineIndex) => (
                    <View key={medicineIndex} style={styles.medicineCard}>
                      {/* Medicine Info */}
                      <View style={styles.medicineInfo}>
                        <View style={styles.medicineHeader}>
                          <View style={styles.medicineType}>
                            {getMedicineIcon(medicine?.medicineType)}
                            <Text style={styles.medicineTypeText}>
                              {getDosageUnit(medicine?.medicineType)}
                            </Text>
                          </View>
                          <Text style={styles.medicineName} numberOfLines={2}>
                            {medicine?.medicineName?.slice(0, 1)?.toUpperCase() +
                             medicine?.medicineName?.slice(1)?.toLowerCase()}
                          </Text>
                        </View>

                        <View style={styles.medicineDetails}>
                          <Text style={styles.dosageText}>
                            {medicine?.doseCount} {getDosageUnit(medicine?.medicineType)}
                          </Text>
                          <Text style={styles.medicationTime} numberOfLines={1}>
                            {medicine?.medicationTime || '-'}
                          </Text>
                        </View>

                        <View style={styles.timestampContainer}>
                          <Text style={styles.timestampLabel}>Given At:</Text>
                          <Text style={styles.timestampValue}>
                            {medicine?.givenTime ? formatTime(medicine?.givenTime) : 'Not given'}
                          </Text>
                        </View>

                        {medicine?.firstName && (
                          <View style={styles.givenByContainer}>
                            <Text style={styles.givenByText}>
                              By: {medicine?.firstName}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Status Section */}
                      <View style={styles.statusSection}>
                        <View style={styles.currentStatus}>
                          {getStatusIcon(medicine?.doseStatus)}
                          <Text style={[
                            styles.statusText,
                            { color: getStatusColor(medicine?.doseStatus) }
                          ]}>
                            {getStatusText(medicine?.doseStatus)}
                          </Text>
                        </View>

                        {medicine?.doseStatus === 0 && (
                          <TouchableOpacity
                            style={styles.updateButton}
                            onPress={() => {
                              Alert.alert(
                                'Update Status',
                                'Mark medicine as:',
                                [
                                  { text: 'Cancel', style: 'cancel' },
                                  { 
                                    text: 'Completed', 
                                    onPress: () => handleStatusUpdate(medicine?.id!, 1)
                                  },
                                  { 
                                    text: 'Not Required', 
                                    onPress: () => handleStatusUpdate(medicine?.id!, 2),
                                    style: 'destructive'
                                  },
                                ]
                              );
                            }}
                            disabled={updating === medicine?.id}
                          >
                            {updating === medicine?.id ? (
                              <ActivityIndicator size="small" color="#14b8a6" />
                            ) : (
                              <Text style={styles.updateButtonText}>
                                Pending
                              </Text>
                            )}
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* Footer - Fixed at bottom */}
      <View style={[styles.footerContainer, { bottom: insets.bottom }]}>
        <Footer active={"patients"} brandColor="#14b8a6" />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: SCREEN_WIDTH < 375 ? 14 : 16,
    color: '#64748b',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SCREEN_WIDTH < 375 ? 12 : 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 4,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: SCREEN_WIDTH < 375 ? 16 : 18,
    fontWeight: '600',
    color: '#374151',
  },
  patientName: {
    fontSize: SCREEN_WIDTH < 375 ? 12 : 14,
    color: '#64748b',
    marginTop: 2,
  },
  placeholder: {
    width: SCREEN_WIDTH < 375 ? 20 : 24,
  },
  contentWrapper: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SCREEN_WIDTH < 375 ? 12 : 16,
  },
  emptyContainer: {
    flex: 1,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: SCREEN_WIDTH < 375 ? 14 : 16,
    color: '#64748b',
    marginTop: 12,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: SCREEN_WIDTH < 375 ? 12 : 14,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
  },
  timeGroup: {
    marginBottom: SCREEN_WIDTH < 375 ? 20 : 24,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: SCREEN_WIDTH < 375 ? 12 : 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SCREEN_WIDTH < 375 ? 12 : 16,
  },
  groupTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SCREEN_WIDTH < 375 ? 6 : 8,
  },
  groupTimeText: {
    fontSize: SCREEN_WIDTH < 375 ? 14 : 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  completionContainer: {
    alignItems: 'flex-end',
  },
  completionText: {
    fontSize: SCREEN_WIDTH < 375 ? 10 : 12,
    color: '#14b8a6',
    fontWeight: '600',
    marginBottom: 4,
  },
  progressBar: {
    width: SCREEN_WIDTH < 375 ? 80 : 100,
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#14b8a6',
    borderRadius: 3,
  },
  medicinesList: {
    gap: SCREEN_WIDTH < 375 ? 10 : 12,
  },
  medicineCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: SCREEN_WIDTH < 375 ? 10 : 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medicineInfo: {
    flex: 1,
    marginRight: SCREEN_WIDTH < 375 ? 10 : 12,
  },
  medicineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SCREEN_WIDTH < 375 ? 6 : 8,
    gap: SCREEN_WIDTH < 375 ? 6 : 8,
  },
  medicineType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  medicineTypeText: {
    fontSize: SCREEN_WIDTH < 375 ? 10 : 12,
    color: '#64748b',
    fontWeight: '500',
  },
  medicineName: {
    flex: 1,
    fontSize: SCREEN_WIDTH < 375 ? 13 : 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  medicineDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SCREEN_WIDTH < 375 ? 6 : 8,
  },
  dosageText: {
    fontSize: SCREEN_WIDTH < 375 ? 12 : 13,
    color: '#374151',
    fontWeight: '500',
  },
  medicationTime: {
    fontSize: SCREEN_WIDTH < 375 ? 11 : 12,
    color: '#64748b',
    flex: 1,
    textAlign: 'right',
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  timestampLabel: {
    fontSize: SCREEN_WIDTH < 375 ? 10 : 11,
    color: '#94a3b8',
    marginRight: 4,
  },
  timestampValue: {
    fontSize: SCREEN_WIDTH < 375 ? 10 : 11,
    color: '#64748b',
    fontWeight: '500',
  },
  givenByContainer: {
    marginTop: 4,
  },
  givenByText: {
    fontSize: SCREEN_WIDTH < 375 ? 10 : 11,
    color: '#14b8a6',
    fontWeight: '500',
  },
  statusSection: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minWidth: SCREEN_WIDTH < 375 ? 70 : 80,
  },
  currentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: SCREEN_WIDTH < 375 ? 6 : 8,
  },
  statusText: {
    fontSize: SCREEN_WIDTH < 375 ? 10 : 12,
    fontWeight: '600',
  },
  updateButton: {
    backgroundColor: '#14b8a6',
    paddingHorizontal: SCREEN_WIDTH < 375 ? 10 : 12,
    paddingVertical: SCREEN_WIDTH < 375 ? 5 : 6,
    borderRadius: 6,
    minWidth: SCREEN_WIDTH < 375 ? 60 : 70,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: SCREEN_WIDTH < 375 ? 10 : 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  footerContainer: {
    left: 0,
    right: 0,
    height: 70,
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
});

export default MedicationTimelineScreen;