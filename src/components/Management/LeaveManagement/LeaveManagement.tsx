// src/components/LeaveManagement/LeaveManagement.tsx

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { RootState } from '../../../store/store';
import { AuthFetch, AuthDelete } from '../../../auth/auth';
import { showError, showSuccess } from '../../../store/toast.slice';

import { COLORS } from '../../../utils/colour';
import { FONT_SIZE, SPACING, moderateScale } from '../../../utils/responsive';
import { 
  PlusIcon, 
  TrashIcon, 
  CalendarIcon, 
  UsersIcon, 
  FileTextIcon,
  ClockIcon 
} from '../../../utils/SvgIcons';

/* ================= TYPES ================= */

interface Leave {
  id: number;
  userID: number;
  name: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  approvedBy: number | null;
  addedOn?: string;
}

/* ================= COMPONENT ================= */

const LeaveManagement: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.currentUser);

  const [leaveData, setLeaveData] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(false);

  /* Pagination */
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;

  // Fetch data on focus
  useFocusEffect(
    useCallback(() => {
      fetchLeaveData();
      return () => {};
    }, [])
  );

  // Fetch leave data
  const fetchLeaveData = async () => {
    const token = await AsyncStorage.getItem('token');
    try {
      setLoading(true);
      const res = await AuthFetch(
        `nurse/getstaffleaves/${user?.hospitalID}`,
        token
      ) as any;
      console.log("Leave data response:", res);
      
      if (res?.data?.message === 'success') {
        // Filter only doctor leaves (role 4001 or 4000)
        // The API returns all staff leaves, so we need to filter doctors
        // Note: You might need to adjust this based on your actual API response
        const allLeaves = res.data.data || [];
        
        // For now, show all leaves. If you need to filter doctors only,
        // you'll need to fetch doctor list and filter by userID
        const sortedData = allLeaves.sort((a: Leave, b: Leave) => {
          const aTime = a.addedOn && new Date(a.addedOn).getTime();
          const bTime = b.addedOn && new Date(b.addedOn).getTime();
          return (bTime || 0) - (aTime || 0);
        });
        setLeaveData(sortedData);
      } else {
        setLeaveData([]);
      }
    } catch (error) {
      console.error("Error fetching leave data:", error);
      dispatch(showError('Failed to fetch leave data'));
    } finally {
      setLoading(false);
    }
  };

  // Check if delete is allowed within 1 hour
  const canDeleteWithinOneHour = (addedOn?: string) => {
    if (!addedOn) return true;
    
    const addedTime = new Date(addedOn).getTime();
    const currentTime = new Date().getTime();
    const oneHourInMs = 60 * 60 * 1000;
    
    return (currentTime - addedTime) <= oneHourInMs;
  };

  const handleDeleteLeave = async (id: number, addedOn?: string) => {
    // Check if deletion is allowed
    if (!canDeleteWithinOneHour(addedOn)) {
      Alert.alert(
        'Cannot Delete',
        'Record is older than 1 hour. Deletion is not allowed.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    Alert.alert('Delete Leave', 'Are you sure you want to delete this leave?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const token = await AsyncStorage.getItem('token');
          try {
            // Use the same endpoint as nurses for now
            const res = await AuthDelete(
              `nurse/deletestaffleave/${user?.hospitalID}/${id}`,
              token
            ) as any;
            if (res?.data?.message === 'success') {
              dispatch(showSuccess('Leave deleted successfully'));
              fetchLeaveData();
            } else {
              dispatch(showError(res?.data?.message || 'Failed to delete leave'));
            }
          } catch (error) {
            console.error("Error deleting leave:", error);
            dispatch(showError('Failed to delete leave'));
          }
        },
      },
    ]);
  };

  // Navigation to Add Leave screen
  const handleAddLeave = () => {
    navigation.navigate('AddDoctorLeave' as never);
  };

  const formatDateDisplay = (d: string) => {
    const date = new Date(d);
    return `${date.getDate().toString().padStart(2, '0')} ${
      date.toLocaleString('default', { month: 'short' })
    } ${date.getFullYear()}`;
  };

  const paginatedData = Array.isArray(leaveData)
    ? leaveData.slice(
        currentPage * itemsPerPage,
        (currentPage + 1) * itemsPerPage
      )
    : [];

  /* ================= UI ================= */

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header with heading and plus button */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Doctor Leave Management</Text>
            <TouchableOpacity
              style={styles.plusButton}
              onPress={handleAddLeave}
              activeOpacity={0.7}
            >
              <PlusIcon size={moderateScale(24)} color={COLORS.buttonText} />
            </TouchableOpacity>
          </View>
        </View>

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
              <FileTextIcon size={64} color={COLORS.sub} />
              <Text style={styles.emptyTitle}>No Leave Records Found</Text>
              <Text style={styles.emptySub}>No leave requests available</Text>
            </View>
          ) : (
            paginatedData.map(item => {
              const canDelete = canDeleteWithinOneHour(item.addedOn);
              const isApproved = item.approvedBy !== null;

              return (
                <View key={item.id} style={styles.card}>
                  {/* Header with status */}
                  <View style={styles.cardHeader}>
                    <View style={styles.userInfo}>
                      <View style={styles.nameRow}>
                        <UsersIcon size={16} color={COLORS.text} />
                        <Text style={styles.cardTitle}>{item.name}</Text>
                      </View>
                      <Text style={styles.cardSub}>ID: {item.userID}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusChip,
                        isApproved ? styles.approved : styles.pending,
                      ]}
                    >
                      <Text style={styles.statusText}>
                        {isApproved ? 'Approved' : 'Pending'}
                      </Text>
                    </View>
                  </View>

                  {/* Leave details */}
                  <View style={styles.detailRow}>
                    <View style={styles.iconLabel}>
                      <FileTextIcon size={14} color={COLORS.sub} />
                      <Text style={styles.label}>Leave Type</Text>
                    </View>
                    <Text style={styles.value}>{item.leaveType}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.iconLabel}>
                      <CalendarIcon size={14} color={COLORS.sub} />
                      <Text style={styles.label}>From Date</Text>
                    </View>
                    <Text style={styles.value}>
                      {formatDateDisplay(item.fromDate)}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.iconLabel}>
                      <CalendarIcon size={14} color={COLORS.sub} />
                      <Text style={styles.label}>To Date</Text>
                    </View>
                    <Text style={styles.value}>
                      {formatDateDisplay(item.toDate)}
                    </Text>
                  </View>

                  {/* Added timestamp */}
                  {item.addedOn && (
                    <View style={styles.detailRow}>
                      <View style={styles.iconLabel}>
                        <ClockIcon size={14} color={COLORS.sub} />
                        <Text style={styles.label}>Added On</Text>
                      </View>
                      <Text style={[styles.value, !canDelete && styles.readOnlyText]}>
                        {new Date(item.addedOn).toLocaleString()}
                      </Text>
                    </View>
                  )}

                  {/* Delete button */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      onPress={() => handleDeleteLeave(item.id, item.addedOn)}
                      disabled={!canDelete}
                      style={[
                        styles.deleteButton,
                        !canDelete && styles.disabledDeleteButton
                      ]}
                    >
                      <TrashIcon size={18} color={canDelete ? COLORS.error : COLORS.sub} />
                      <Text style={[
                        styles.deleteText,
                        { color: canDelete ? COLORS.error : COLORS.sub }
                      ]}>
                        Delete Leave
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}

          {/* Pagination */}
          {leaveData.length > itemsPerPage && (
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
                {Math.ceil(leaveData.length / itemsPerPage)}
              </Text>

              <TouchableOpacity
                disabled={
                  currentPage >= Math.ceil(leaveData.length / itemsPerPage) - 1
                }
                onPress={() => setCurrentPage(p => p + 1)}
                style={[
                  styles.pageBtn,
                  currentPage >= Math.ceil(leaveData.length / itemsPerPage) - 1 && styles.disabledBtn
                ]}
              >
                <Text style={[
                  styles.pageBtnText,
                  currentPage >= Math.ceil(leaveData.length / itemsPerPage) - 1 && styles.disabledBtnText
                ]}>
                  Next
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default LeaveManagement;

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
    fontStyle: "italic",
    fontWeight: '500',
    color: "#000000",
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
  paddingVertical: SPACING.md,
  paddingHorizontal: 0,   // ✅ removes left-right gap
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
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
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
  cardTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  cardSub: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  approved: {
    backgroundColor: '#DCFCE7',
  },
  pending: {
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  iconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flex: 1,
  },
  label: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    fontWeight: '500',
  },
  value: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.text,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: SPACING.md,
  },
  readOnlyText: {
    color: COLORS.sub,
    fontStyle: 'italic',
  },
  actionRow: {
    marginTop: SPACING.md,
    alignItems: 'flex-end',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  disabledDeleteButton: {
    opacity: 0.5,
  },
  deleteText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
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
});