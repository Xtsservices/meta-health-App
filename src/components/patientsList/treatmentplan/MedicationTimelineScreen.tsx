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
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
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
import { RootState } from '../../../store/store';
import { AuthFetch, AuthPatch } from '../../../auth/auth';
import { formatTime, formatDate } from '../../../utils/dateTime';
import Footer from '../../dashboard/footer';

// Import responsive utilities
import { 
  isTablet,
  SPACING,
  FONT_SIZE,
  ICON_SIZE,
  FOOTER_HEIGHT
} from '../../../utils/responsive';
import { COLORS } from '../../../utils/colour';
import { medicineCategory } from '../../../utils/medicines';
import { Reminder } from '../../../store/zustandstore';
import { showError } from '../../../store/toast.slice';

// Import colors

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
const dispatch = useDispatch()
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
        dispatch(showError('Authentication token not found'));
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
        return <CheckCircleIcon size={ICON_SIZE.sm} color={COLORS.success} />;
      case 2:
        return <XIcon size={ICON_SIZE.sm} color={COLORS.danger} />;
      default:
        return <Clock4Icon size={ICON_SIZE.sm} color={COLORS.warning} />;
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
        return COLORS.success;
      case 2:
        return COLORS.danger;
      default:
        return COLORS.warning;
    }
  };

  const getMedicineIcon = (medicineType: number) => {
    const iconProps = { 
      size: ICON_SIZE.sm, 
      color: COLORS.sub 
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
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.card} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.brand} />
          <Text style={styles.loadingText}>Loading timeline...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.card} />

      {/* Main Content Area */}
      <View style={styles.contentWrapper}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: FOOTER_HEIGHT + SPACING.md + insets.bottom }
          ]}
          showsVerticalScrollIndicator={false}
        >
          {groupedReminders?.length === 0 ? (
            <View style={styles.emptyContainer}>
              <CalendarIcon size={isTablet ? 48 : 40} color={COLORS.sub} />
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
                    <ClockIcon size={ICON_SIZE.md} color={COLORS.brand} />
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
                              <ActivityIndicator size="small" color={COLORS.brand} />
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
        <Footer active={"patients"} brandColor={COLORS.brand} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.card,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.card,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: isTablet ? FONT_SIZE.md : FONT_SIZE.sm,
    color: COLORS.sub,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: isTablet ? FONT_SIZE.lg : FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  patientName: {
    fontSize: isTablet ? FONT_SIZE.sm : FONT_SIZE.xs,
    color: COLORS.sub,
    marginTop: 2,
  },
  placeholder: {
    width: ICON_SIZE.lg,
  },
  contentWrapper: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  emptyContainer: {
    flex: 1,
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: isTablet ? FONT_SIZE.md : FONT_SIZE.sm,
    color: COLORS.sub,
    marginTop: SPACING.sm,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: isTablet ? FONT_SIZE.sm : FONT_SIZE.xs,
    color: COLORS.placeholder,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  timeGroup: {
    marginBottom: isTablet ? SPACING.lg : SPACING.md,
    backgroundColor: COLORS.bg,
    borderRadius: SPACING.sm,
    padding: isTablet ? SPACING.md : SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isTablet ? SPACING.md : SPACING.sm,
  },
  groupTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isTablet ? SPACING.xs : 6,
  },
  groupTimeText: {
    fontSize: isTablet ? FONT_SIZE.md : FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  completionContainer: {
    alignItems: 'flex-end',
  },
  completionText: {
    fontSize: isTablet ? FONT_SIZE.xs : FONT_SIZE.xs - 1,
    color: COLORS.brand,
    fontWeight: '600',
    marginBottom: 4,
  },
  progressBar: {
    width: isTablet ? 100 : 80,
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.brand,
    borderRadius: 3,
  },
  medicinesList: {
    gap: isTablet ? SPACING.sm : SPACING.xs,
  },
  medicineCard: {
    backgroundColor: COLORS.card,
    borderRadius: SPACING.xs,
    padding: isTablet ? SPACING.sm : SPACING.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.pill,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medicineInfo: {
    flex: 1,
    marginRight: isTablet ? SPACING.sm : SPACING.xs,
  },
  medicineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: isTablet ? SPACING.xs : 6,
    gap: isTablet ? SPACING.xs : 6,
  },
  medicineType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  medicineTypeText: {
    fontSize: isTablet ? FONT_SIZE.xs : FONT_SIZE.xs - 1,
    color: COLORS.sub,
    fontWeight: '500',
  },
  medicineName: {
    flex: 1,
    fontSize: isTablet ? FONT_SIZE.sm : FONT_SIZE.xs,
    fontWeight: '600',
    color: COLORS.text,
  },
  medicineDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: isTablet ? SPACING.xs : 6,
  },
  dosageText: {
    fontSize: isTablet ? FONT_SIZE.xs : FONT_SIZE.xs - 1,
    color: COLORS.text,
    fontWeight: '500',
  },
  medicationTime: {
    fontSize: isTablet ? FONT_SIZE.xs : FONT_SIZE.xs - 1,
    color: COLORS.sub,
    flex: 1,
    textAlign: 'right',
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  timestampLabel: {
    fontSize: isTablet ? FONT_SIZE.xs - 1 : FONT_SIZE.xs - 2,
    color: COLORS.placeholder,
    marginRight: 4,
  },
  timestampValue: {
    fontSize: isTablet ? FONT_SIZE.xs - 1 : FONT_SIZE.xs - 2,
    color: COLORS.sub,
    fontWeight: '500',
  },
  givenByContainer: {
    marginTop: 4,
  },
  givenByText: {
    fontSize: isTablet ? FONT_SIZE.xs - 1 : FONT_SIZE.xs - 2,
    color: COLORS.brand,
    fontWeight: '500',
  },
  statusSection: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minWidth: isTablet ? 80 : 70,
  },
  currentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: isTablet ? SPACING.xs : 6,
  },
  statusText: {
    fontSize: isTablet ? FONT_SIZE.xs : FONT_SIZE.xs - 1,
    fontWeight: '600',
  },
  updateButton: {
    backgroundColor: COLORS.brand,
    paddingHorizontal: isTablet ? SPACING.sm : SPACING.xs,
    paddingVertical: isTablet ? SPACING.xs : 5,
    borderRadius: 6,
    minWidth: isTablet ? 70 : 60,
  },
  updateButtonText: {
    color: COLORS.buttonText,
    fontSize: isTablet ? FONT_SIZE.xs : FONT_SIZE.xs - 1,
    fontWeight: '600',
    textAlign: 'center',
  },
  footerContainer: {
    left: 0,
    right: 0,
    height: FOOTER_HEIGHT,
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
});

export default MedicationTimelineScreen;