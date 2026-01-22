import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Modal,
  Dimensions,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

import { RootState } from '../../../store/store';
import { AuthFetch, AuthDelete } from '../../../auth/auth';
import { showError, showSuccess } from '../../../store/toast.slice';

import { COLORS } from '../../../utils/colour';
import { FONT_SIZE, FOOTER_HEIGHT, moderateScale, SPACING } from '../../../utils/responsive';
import { PlusIcon, TrashIcon, CalendarClockIcon, ClockIcon, UsersIcon, Edit2Icon, MoreVerticalIcon } from '../../../utils/SvgIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/* ================= TYPES ================= */
interface ShiftSchedule {
  id: number;
  userID: number;
  name: string;
  fromDate: string;
  toDate: string;
  shiftTimings: string;
  scope: number;
  departmenName: string;
  wardName: string;
  addedOn?: string;
}

/* ================= COMPONENT ================= */
const ShiftManagementScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.currentUser);

  const [shiftSchedules, setShiftSchedules] = useState<ShiftSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedShift, setSelectedShift] = useState<ShiftSchedule | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  /* Pagination */
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchShiftSchedules();
  }, []);

  const fetchShiftSchedules = async () => {
    const token = await AsyncStorage.getItem('token');
    try {
      setLoading(true);
      const res = await AuthFetch(
        `nurse/shiftschedule/${user?.hospitalID}`,
        token
      ) as any;
      if (res?.data?.message === 'success') {
        // Sort by addedOn date (newest first)
        const sortedData = (res.data.data || []).sort((a: ShiftSchedule, b: ShiftSchedule) => {
          const aTime = a.addedOn ? new Date(a.addedOn).getTime() : 0;
          const bTime = b.addedOn ? new Date(b.addedOn).getTime() : 0;
          return bTime - aTime;
        });
        setShiftSchedules(sortedData);
      } else {
        setShiftSchedules([]);
      }
    } catch {
      dispatch(showError('Failed to fetch shift schedules'));
    } finally {
      setLoading(false);
    }
  };

  // Check if delete/edit is allowed within 1 hour
  const canDeleteWithinOneHour = (addedOn?: string) => {
    if (!addedOn) return true;
    
    const addedTime = new Date(addedOn).getTime();
    const currentTime = new Date().getTime();
    const oneHourInMs = 60 * 60 * 1000;
  
    return (currentTime - addedTime) <= oneHourInMs;
  };

  // Handle menu press
  const handleMenuPress = (shift: ShiftSchedule, event: any) => {
    const { pageX, pageY } = event.nativeEvent;
    setSelectedShift(shift);
    setMenuPosition({ x: pageX - 100, y: pageY + 10 });
    setMenuVisible(true);
  };

  // Close menu
  const closeMenu = () => {
    setMenuVisible(false);
    setSelectedShift(null);
  };

  // Add edit function
  const handleEditShift = (shift: ShiftSchedule) => {
    closeMenu();
    
    // Check if edit is allowed
    if (!canDeleteWithinOneHour(shift.addedOn)) {
      Alert.alert(
        'Cannot Edit',
        'Record is older than 1 hour. Edit is not allowed.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }
    
    // Navigate to EditShiftScreen with shift data
    navigation.navigate('EditShift' as never, { shiftData: shift });
  };

  const handleDeleteShift = async (shift: ShiftSchedule) => {
    closeMenu();
    
    // Check if deletion is allowed
    if (!canDeleteWithinOneHour(shift.addedOn)) {
      Alert.alert(
        'Cannot Delete',
        'Record is older than 1 hour. Deletion is not allowed.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    Alert.alert(
      'Delete Shift',
      'Are you sure you want to delete this shift?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const token = await AsyncStorage.getItem('token');
            try {
              const res = await AuthDelete(
                `nurse/deleteshiftschedule/${user?.hospitalID}/${shift.id}`,
                token
              ) as any;
              if (res?.data?.message === 'success') {
                dispatch(showSuccess('Shift deleted successfully'));
                fetchShiftSchedules();
              } else {
                dispatch(showError(res?.message || 'Failed to delete shift'));
              }
            } catch (error) {
              dispatch(showError('Failed to delete shift'));
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Navigation to Add Shift screen
  const handleAddShift = () => {
    navigation.navigate('AddShift' as never);
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${date.getDate().toString().padStart(2, '0')} ${
      date.toLocaleString('default', { month: 'short' })
    } ${date.getFullYear()}`;
  };

  const insets = useSafeAreaInsets();

  // Format time display
  const extractTimings = (shiftTimings: string) => {
    if (!shiftTimings) return { fromTiming: '', toTiming: '' };
    const [fromTiming, toTiming] = shiftTimings.split(' - ');
    return { fromTiming, toTiming };
  };

  const paginatedData = Array.isArray(shiftSchedules)
    ? shiftSchedules.slice(
        currentPage * itemsPerPage,
        (currentPage + 1) * itemsPerPage
      )
    : [];

  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  /* ================= UI ================= */
  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header with heading and plus button */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Nurse Management</Text>
            <TouchableOpacity
              style={styles.plusButton}
              onPress={handleAddShift}
              activeOpacity={0.7}
            >
              <PlusIcon size={moderateScale(24)} color={COLORS.buttonText} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.container}>
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={COLORS.brand} />
              </View>
            ) : paginatedData.length === 0 ? (
              <View style={styles.emptyBox}>
                <CalendarClockIcon size={64} color={COLORS.sub} />
                <Text style={styles.emptyTitle}>No Shifts Found</Text>
                <Text style={styles.emptySub}>No shift schedules available</Text>
              </View>
            ) : (
              paginatedData.map(item => {
                const isIPD = item.scope === 1;
                const { fromTiming, toTiming } = extractTimings(item.shiftTimings);
                const canDelete = canDeleteWithinOneHour(item.addedOn);

                return (
                  <View key={item.id} style={styles.card}>
                    {/* Header with dots menu */}
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.userInfo}>
                        <View style={styles.nameRow}>
                          <UsersIcon size={16} color={COLORS.text} />
                          <Text style={styles.primaryText}>{item.name}</Text>
                        </View>
                        <Text style={styles.secondaryText}>
                          ID: {item.userID}
                        </Text>
                      </View>

                      <View style={styles.headerActions}>
                        <View
                          style={[
                            styles.badge,
                            {
                              backgroundColor: isIPD
                                ? '#DBEAFE'
                                : COLORS.brandSoft,
                            },
                          ]}
                        >
                          <Text style={styles.badgeText}>
                            {isIPD ? 'IPD' : 'OPD'}
                          </Text>
                        </View>
                        
                        {/* Dots Menu Button */}
                        <TouchableOpacity
                          onPress={(e) => handleMenuPress(item, e)}
                          style={styles.dotsButton}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <MoreVerticalIcon 
                            size={20} 
                            color={COLORS.sub} 
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Meta rows */}
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>Department</Text>
                      <Text style={styles.metaValue}>
                        {item.departmenName}
                      </Text>
                    </View>

                    <View style={styles.metaRow}>
                      <View style={styles.iconLabel}>
                        <CalendarClockIcon size={14} color={COLORS.sub} />
                        <Text style={styles.metaLabel}>Shift Dates</Text>
                      </View>
                      <Text style={styles.metaValue}>
                        {formatDate(item.fromDate)} – {formatDate(item.toDate)}
                      </Text>
                    </View>

                    <View style={styles.metaRow}>
                      <View style={styles.iconLabel}>
                        <ClockIcon size={14} color={COLORS.sub} />
                        <Text style={styles.metaLabel}>Shift Time</Text>
                      </View>
                      <View style={styles.timeChipContainer}>
                        <View style={styles.timeChip}>
                          <Text style={styles.timeChipText}>{fromTiming}</Text>
                        </View>
                        <Text style={styles.timeSeparator}>→</Text>
                        <View style={styles.timeChip}>
                          <Text style={styles.timeChipText}>{toTiming}</Text>
                        </View>
                      </View>
                    </View>

                    {isIPD && (
                      <View style={styles.metaRow}>
                        <Text style={styles.metaLabel}>Ward</Text>
                        <Text style={styles.metaValue}>{item.wardName}</Text>
                      </View>
                    )}

                    {/* Added timestamp */}
                    {item.addedOn && (
                      <View style={styles.metaRow}>
                        <Text style={styles.metaLabel}>Added On</Text>
                        <Text style={[styles.metaValue, !canDelete && styles.readOnlyText]}>
                          {new Date(item.addedOn).toLocaleString()}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}

            {/* Pagination */}
            {shiftSchedules.length > itemsPerPage && (
              <View style={styles.pagination}>
                <TouchableOpacity
                  disabled={currentPage === 0}
                  onPress={() => setCurrentPage(p => p - 1)}
                  style={[styles.pageBtn, currentPage === 0 && styles.disabledBtn]}
                >
                  <Text style={[styles.pageBtnText, currentPage === 0 && styles.disabledBtnText]}>
                    Previous
                  </Text>
                </TouchableOpacity>

                <Text style={styles.pageInfo}>
                  Page {currentPage + 1} of{' '}
                  {Math.ceil(shiftSchedules.length / itemsPerPage)}
                </Text>

                <TouchableOpacity
                  disabled={
                    currentPage >=
                    Math.ceil(shiftSchedules.length / itemsPerPage) - 1
                  }
                  onPress={() => setCurrentPage(p => p + 1)}
                  style={[
                    styles.pageBtn,
                    currentPage >= Math.ceil(shiftSchedules.length / itemsPerPage) - 1 && styles.disabledBtn
                  ]}
                >
                  <Text style={[
                    styles.pageBtnText,
                    currentPage >= Math.ceil(shiftSchedules.length / itemsPerPage) - 1 && styles.disabledBtnText
                  ]}>
                    Next
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>

      {/* Options Menu Modal */}
      <Modal
        transparent={true}
        visible={menuVisible}
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={closeMenu}
        >
          <View style={[
            styles.menuContainer,
            {
              top: menuPosition.y,
              left: menuPosition.x,
              maxWidth: screenWidth - menuPosition.x - 20
            }
          ]}>
            {/* Edit Option */}
            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => selectedShift && handleEditShift(selectedShift)}
              disabled={selectedShift && !canDeleteWithinOneHour(selectedShift.addedOn)}
            >
              <Edit2Icon size={18} color={selectedShift && canDeleteWithinOneHour(selectedShift.addedOn) ? COLORS.brand : COLORS.sub} />
              <Text style={[
                styles.menuOptionText,
                { color: selectedShift && canDeleteWithinOneHour(selectedShift.addedOn) ? COLORS.text : COLORS.sub }
              ]}>
                Edit
              </Text>
            </TouchableOpacity>

            {/* Delete Option */}
            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => selectedShift && handleDeleteShift(selectedShift)}
              disabled={selectedShift && !canDeleteWithinOneHour(selectedShift.addedOn)}
            >
              <TrashIcon size={18} color={selectedShift && canDeleteWithinOneHour(selectedShift.addedOn) ? COLORS.error : COLORS.sub} />
              <Text style={[
                styles.menuOptionText,
                { color: selectedShift && canDeleteWithinOneHour(selectedShift.addedOn) ? COLORS.error : COLORS.sub }
              ]}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  // Header styles
  header: {
    paddingHorizontal: SPACING.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: FONT_SIZE.md,
    fontStyle:'italic',
    fontWeight: '500',
    color: '#000000',
    flex: 1,
  },
  plusButton: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(22),
    backgroundColor: '#14b8a6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: moderateScale(72),
  },
  card: {
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    position: 'relative',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  primaryText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  secondaryText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    color: '#111827',
  },
  dotsButton: {
    padding: 4,
    marginLeft: SPACING.xs,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    alignItems: 'center',
  },
  iconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  metaLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
  },
  metaValue: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.text,
    textAlign: 'right',
    lineHeight: 16,
    fontWeight: '500',
    flex: 1,
    marginLeft: SPACING.sm,
  },
  timeChipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  timeChip: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timeChipText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.text,
    fontWeight: '500',
  },
  timeSeparator: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.lg,
    marginVertical: SPACING.xl,
  },
  pageBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pageBtnText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.brand,
  },
  disabledBtn: {
    backgroundColor: COLORS.background + '80',
    borderColor: COLORS.border + '80',
  },
  disabledBtnText: {
    color: COLORS.sub,
  },
  pageInfo: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    fontWeight: '500',
  },
  loadingBox: {
    paddingVertical: SPACING.xl * 2,
    alignItems: 'center',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  emptySub: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    marginBottom: SPACING.lg,
  },
  readOnlyText: {
    color: COLORS.sub,
    fontStyle: 'italic',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  menuContainer: {
    position: 'absolute',
    backgroundColor: COLORS.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    paddingVertical: SPACING.xs,
    minWidth: 120,
    zIndex: 1000,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  menuOptionText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '500',
    flex: 1,
  },
});

export default ShiftManagementScreen;