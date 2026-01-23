// components/ConsultationFeeScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
  Platform,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { X, Plus } from 'lucide-react-native';
import { AuthFetch, AuthPatch, AuthPost } from '../../auth/auth';
import { RootState } from '../../store/store';
import { 
  formatDate, 
  formatDateTime 
} from '../../utils/dateTime';
import { 
  moderateScale, 
  responsiveHeight,
  SPACING,
  FONT_SIZE,
  BORDER_RADIUS,
  ELEVATION,
  getResponsiveFontSize,
  getDeviceSpecificValue,
  hasNotch,
  getSafeAreaInsets,
  SCREEN_HEIGHT
} from '../../utils/responsive';
import { showError, showSuccess } from '../../store/toast.slice';

// Types
interface ConsultationFee {
  id?: number;
  doctorID?: number;
  hospitalID?: number;
  doctorProfileID?: number | null;
  fee?: number;
  status?: 'pending' | 'approved' | 'rejected';
  doctorApproval?: 0 | 1;
  adminApproval?: 0 | 1;
  rejectedBy?: string;
  rejectionReason?: string;
  history?: any[];
  startDate?: string;
  endDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: number;
  updatedBy?: number | null;
}

interface FeeHistory {
  id?: number;
  doctorID?: number;
  hospitalID?: number;
  doctorProfileID?: number | null;
  fee?: number;
  status?: string;
  doctorApproval?: 0 | 1;
  adminApproval?: 0 | 1;
  rejectedBy?: string | null;
  rejectionReason?: string | null;
  history?: Array<{
    by?: string;
    fee?: number;
    action?: string;
    timestamp?: string;
    reason?: string;
  }>;
}

// Design Constants
const COLORS = {
  primary: '#14b8a6',
  card: '#ffffff',
  text: '#0f172a',
  subText: '#64748b',
  border: '#e2e8f0',
  chip: '#eef2f7',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#f43f5e',
  info: '#3b82f6',
  background: '#f8fafc',
  modalOverlay: 'rgba(0, 0, 0, 0.5)',
  tagFee: '#0ea5e9',
  placeholder: '#94a3b8',
};

const ConsultationFeeScreen = () => {
  const [fees, setFees] = useState<ConsultationFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFee, setSelectedFee] = useState<ConsultationFee | null>(null);
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [newFee, setNewFee] = useState('');
  const [feeHistory, setFeeHistory] = useState<FeeHistory | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const user = useSelector((state: RootState) => state.currentUser);
  const dispatch = useDispatch();


  const loadData = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      await loadFees();
    } catch (error) {
      showError('Failed to load fee data');
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }, [ showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadFees = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setFees([]);
        return;
      }

      const response = await AuthFetch(
        'user/consultationFee/doctor/pending',
        token
      ) as any;
      
      if (response?.status === 'success') {
        setFees(response?.data?.data || []);
      } else {
        setFees([]);
      }
    } catch (error) {
      setFees([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(false);
    setRefreshing(false);
  };

  const handleFeePropose = async () => {
    if (!newFee || isNaN(Number(newFee))) {
      showError('Please enter a valid fee amount');
      return;
    }

    if (parseFloat(newFee) <= 0) {
      showError('Fee amount must be greater than zero');
      return;
    }

    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem('token');
      if (!token || !user?.id || !user?.hospitalID) {
        showError('Missing required information');
        return;
      }

      const requestBody = {
        fee: parseFloat(newFee),
        doctorID: user.id,
        hospitalID: user.hospitalID,
      };

      const response = await AuthPost(
        'user/consultationFee/save',
        requestBody,
        token
      ) as any;
      
      if (response?.status === 'success') {
        showSuccess('Fee proposed successfully');
        loadData(false);
        setNewFee('');
        setShowFeeModal(false);
      } else {
        showError(response?.message || 'Failed to propose fee');
      }
    } catch (error) {
      showError('Failed to propose fee');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFeeApprove = async (feeId: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        showError('Please login to continue');
        return;
      }

      const response = await AuthPatch(
        `user/consultationFee/doctorApprove/${feeId}`,
        {},
        token
      ) as any;
      
      if (response?.status === 'success') {
        showSuccess('Fee approved successfully');
        loadData(false);
      } else {
        showError(response?.message || 'Failed to approve fee');
      }
    } catch (error) {
      showError('Failed to approve fee');
    }
  };

  const loadFeeHistory = async (feeId: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        showError('Please login to continue');
        return;
      }

      const response = await AuthFetch(
        `user/consultationFee/history/${feeId}`,
        token
      ) as any;
      
      if (response?.status === 'success') {
        setFeeHistory(response?.data?.data || null);
        setShowHistoryModal(true);
      } else {
        showError(response?.message || 'Failed to load history');
      }
    } catch (error) {
      showError('Failed to load history');
    }
  };

  const getStatusColor = (doctorApproval?: number, adminApproval?: number) => {
    if (doctorApproval === 1 && adminApproval === 1) return COLORS.success;
    if (doctorApproval === 0 && adminApproval === 0) return COLORS.warning;
    if (doctorApproval === 1 && adminApproval === 0) return COLORS.info;
    return COLORS.subText;
  };

  const getStatusText = (doctorApproval?: number, adminApproval?: number) => {
    if (doctorApproval === 1 && adminApproval === 1) return 'APPROVED';
    if (doctorApproval === 0 && adminApproval === 0) return 'PENDING';
    if (doctorApproval === 1 && adminApproval === 0) return 'DOCTOR APPROVED';
    return 'UNKNOWN';
  };

  const FeeCard = ({ item }: { item: ConsultationFee }) => {
    const statusColor = getStatusColor(item?.doctorApproval, item?.adminApproval);
    const statusText = getStatusText(item?.doctorApproval, item?.adminApproval);
    
    return (
      <TouchableOpacity
        style={[styles.card, { borderColor: COLORS.border }]}
        onPress={() => {
          setSelectedFee(item);
          loadFeeHistory(item?.id || 0);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Fee Proposal</Text>
          <View style={[styles.tagBadge, { backgroundColor: COLORS.tagFee }]}>
            <Text style={styles.tagText}>CONSULTATION FEE</Text>
          </View>
        </View>
        
        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <View style={styles.infoSection}>
              <Text style={styles.fieldLabel}>Fee Amount</Text>
              <Text style={styles.infoValue}>₹{item?.fee}</Text>
            </View>
            
            <View style={styles.infoSection}>
              <Text style={styles.fieldLabel}>Status</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                <Text style={styles.statusText}>{statusText}</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.dateRow}>
            <Text style={styles.dateText}>Proposed On: {formatDate(item?.createdAt)}</Text>
            <Text style={styles.dateText}>Start Date: {formatDate(item?.startDate)}</Text>
          </View>
          
          {item?.rejectionReason && (
            <View style={styles.rejectionBox}>
              <Text style={styles.rejectionLabel}>Rejection Reason</Text>
              <Text style={styles.rejectionText}>{item?.rejectionReason}</Text>
            </View>
          )}
          
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.historyButton]}
              onPress={() => loadFeeHistory(item?.id || 0)}
            >
              <Text style={styles.historyButtonText}>View History</Text>
            </TouchableOpacity>
            
            {item?.doctorApproval === 0 && (
              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton]}
                onPress={() => handleFeeApprove(item?.id || 0)}
              >
                <Text style={styles.actionButtonText}>Approve</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFeeModal = () => (
    <Modal
      visible={showFeeModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => !submitting && setShowFeeModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[
          styles.modalContent,
          { maxHeight: SCREEN_HEIGHT * 0.6 }
        ]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Propose New Fee</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => !submitting && setShowFeeModal(false)}
              disabled={submitting}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={moderateScale(20)} color={COLORS.subText} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalBody}>
            <Text style={styles.modalSubtitle}>Enter the consultation fee amount you want to propose</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Fee Amount (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 500"
                placeholderTextColor={COLORS.placeholder}
                value={newFee}
                onChangeText={setNewFee}
                keyboardType="numeric"
                editable={!submitting}
              />
            </View>
            
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleFeePropose}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={COLORS.card} />
              ) : (
                <Text style={styles.submitButtonText}>Propose Fee</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderHistoryModal = () => (
    <Modal
      visible={showHistoryModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowHistoryModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[
          styles.modalContent,
          { maxHeight: SCREEN_HEIGHT * 0.8 }
        ]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Fee History - #{feeHistory?.id}</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowHistoryModal(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={moderateScale(20)} color={COLORS.subText} />
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
          >
            {feeHistory && (
              <>
                <View style={styles.detailGrid}>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Current Fee</Text>
                    <Text style={styles.detailValue}>₹{feeHistory?.fee}</Text>
                  </View>
                  
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <View style={[styles.statusBadge, { 
                      backgroundColor: getStatusColor(feeHistory?.doctorApproval, feeHistory?.adminApproval) 
                    }]}>
                      <Text style={styles.statusText}>
                        {getStatusText(feeHistory?.doctorApproval, feeHistory?.adminApproval)}
                      </Text>
                    </View>
                  </View>
                </View>
                
                {feeHistory?.rejectionReason && (
                  <View style={styles.rejectionSection}>
                    <Text style={styles.sectionTitle}>Rejection Details</Text>
                    <View style={styles.rejectionBox}>
                      <Text style={styles.rejectionLabel}>Reason</Text>
                      <Text style={styles.rejectionText}>{feeHistory?.rejectionReason}</Text>
                      {feeHistory?.rejectedBy && (
                        <Text style={styles.rejectionBy}>By: {feeHistory?.rejectedBy}</Text>
                      )}
                    </View>
                  </View>
                )}
                
                <View style={styles.historySection}>
                  <Text style={styles.sectionTitle}>History Log</Text>
                  {feeHistory?.history?.length > 0 ? (
                    feeHistory?.history?.map((history, index) => (
                      <View key={index} style={styles.historyItem}>
                        <View style={styles.historyHeader}>
                          <Text style={styles.historyBy}>{history?.by || 'System'}</Text>
                          <Text style={styles.historyTime}>
                            {formatDateTime(history?.timestamp)}
                          </Text>
                        </View>
                        <Text style={styles.historyAction}>
                          {history?.action || 'Fee Updated'} {history?.fee ? `₹${history?.fee}` : ''}
                        </Text>
                        {history?.reason && (
                          <Text style={styles.historyReason}>Reason: {history?.reason}</Text>
                        )}
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noHistoryText}>No history available</Text>
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>No Fee Proposals</Text>
      <Text style={styles.emptyStateText}>
        You haven't proposed any consultation fees yet.
      </Text>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowFeeModal(true)}
      >
        <Plus size={moderateScale(16)} color="#ffffff" />
        <Text style={styles.addButtonText}>Propose Your First Fee</Text>
      </TouchableOpacity>
    </View>
  );

  const safeAreaInsets = getSafeAreaInsets();
  const bottomPadding = hasNotch() ? safeAreaInsets.bottom : moderateScale(20);

  return (
    <View style={styles.container}>
      {/* Header with Actions */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Fee Proposals</Text>
        
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowFeeModal(true)}
          activeOpacity={0.7}
        >
          <Plus size={moderateScale(16)} color="#ffffff" />
          <Text style={styles.addButtonText}>Propose New</Text>
        </TouchableOpacity>
      </View>
      
      {/* Content Area */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={{ 
            flexGrow: 1,
            paddingBottom: bottomPadding + responsiveHeight(10) // Space for footer
          }}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {fees?.length === 0 ? (
            renderEmptyState()
          ) : (
            fees?.map((item, index) => (
              <React.Fragment key={item?.id || index}>
                <FeeCard item={item} />
              </React.Fragment>
            ))
          )}
        </ScrollView>
      )}
      
      {/* Modals */}
      {renderFeeModal()}
      {renderHistoryModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  
  // Header Styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: getResponsiveFontSize(FONT_SIZE.lg),
    fontWeight: '800',
    color: COLORS.text,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: getDeviceSpecificValue(SPACING.xs, SPACING.sm, SPACING.xs),
    borderRadius: BORDER_RADIUS.md,
    gap: moderateScale(4),
  },
  addButtonText: {
    color: COLORS.card,
    fontWeight: '700',
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
  },
  
  // Content Styles
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  
  // Loading Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    color: COLORS.subText,
    fontWeight: '600',
  },
  
  // Card Styles
  card: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: ELEVATION.xs,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cardTitle: {
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    fontWeight: '800',
    color: COLORS.text,
  },
  cardBody: {
    gap: SPACING.sm,
  },
  
  // Tag Badge
  tagBadge: {
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(4),
    borderRadius: BORDER_RADIUS.round,
  },
  tagText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs, { min: 8 }),
    fontWeight: '800',
    color: COLORS.card,
  },
  
  // Info Grid
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  infoSection: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs, { min: 10 }),
    fontWeight: '700',
    color: COLORS.subText,
    marginBottom: moderateScale(2),
  },
  infoValue: {
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    fontWeight: '800',
    color: COLORS.text,
  },
  
  // Status Badge
  statusBadge: {
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(4),
    borderRadius: BORDER_RADIUS.sm,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: COLORS.card,
    fontSize: getResponsiveFontSize(FONT_SIZE.xs, { min: 8 }),
    fontWeight: '800',
  },
  
  // Date Row
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  dateText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs, { min: 10 }),
    color: COLORS.subText,
    fontWeight: '600',
  },
  
  // Rejection Box
  rejectionBox: {
    backgroundColor: '#fef2f2',
    padding: moderateScale(10),
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  rejectionLabel: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs, { min: 10 }),
    color: COLORS.error,
    fontWeight: '700',
    marginBottom: moderateScale(2),
  },
  rejectionText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs, { min: 10 }),
    color: COLORS.error,
    fontWeight: '600',
  },
  
  // Action Row
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  actionButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: getDeviceSpecificValue(SPACING.sm, SPACING.md, SPACING.xs),
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    flex: 1,
  },
  approveButton: {
    backgroundColor: COLORS.primary,
  },
  historyButton: {
    backgroundColor: COLORS.chip,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionButtonText: {
    color: COLORS.card,
    fontWeight: '700',
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
  },
  historyButtonText: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
  },
  
  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: responsiveHeight(15),
    paddingHorizontal: SPACING.lg,
  },
  emptyStateTitle: {
    fontSize: getResponsiveFontSize(FONT_SIZE.lg),
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    color: COLORS.subText,
    textAlign: 'center',
    lineHeight: getResponsiveFontSize(FONT_SIZE.sm) * 1.5,
    marginBottom: SPACING.lg,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.modalOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xl,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: ELEVATION.lg,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: getResponsiveFontSize(FONT_SIZE.lg),
    fontWeight: '800',
    color: COLORS.text,
  },
  closeButton: {
    padding: moderateScale(4),
  },
  modalBody: {
    padding: SPACING.lg,
  },
  modalSubtitle: {
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    color: COLORS.subText,
    marginBottom: SPACING.lg,
    lineHeight: getResponsiveFontSize(FONT_SIZE.sm) * 1.5,
  },
  
  // Modal Detail Sections
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  detailSection: {
    flex: 1,
    minWidth: '45%',
  },
  detailLabel: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs, { min: 10 }),
    fontWeight: '700',
    color: COLORS.subText,
    marginBottom: moderateScale(2),
  },
  detailValue: {
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    fontWeight: '800',
    color: COLORS.text,
  },
  
  // Rejection Section
  rejectionSection: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  rejectionBy: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs, { min: 9 }),
    color: COLORS.error,
    marginTop: moderateScale(2),
    fontWeight: '600',
  },
  
  // History Section
  historySection: {
    marginBottom: SPACING.lg,
  },
  historyItem: {
    backgroundColor: COLORS.chip,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: moderateScale(2),
  },
  historyBy: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs, { min: 10 }),
    fontWeight: '800',
    color: COLORS.text,
  },
  historyTime: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs, { min: 9 }),
    color: COLORS.subText,
    fontWeight: '600',
  },
  historyAction: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs, { min: 10 }),
    color: COLORS.text,
    fontWeight: '700',
  },
  historyReason: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs, { min: 9 }),
    color: COLORS.error,
    marginTop: moderateScale(2),
    fontStyle: 'italic',
    fontWeight: '600',
  },
  noHistoryText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    color: COLORS.subText,
    textAlign: 'center',
    fontStyle: 'italic',
    padding: SPACING.lg,
  },
  
  // Input Styles
  inputContainer: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs, { min: 10 }),
    fontWeight: '700',
    color: COLORS.subText,
    marginBottom: SPACING.xs,
  },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    fontSize: getResponsiveFontSize(FONT_SIZE.md),
    color: COLORS.text,
    backgroundColor: COLORS.card,
    fontWeight: '600',
  },
  
  // Button Styles
  submitButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  submitButtonText: {
    color: COLORS.card,
    fontWeight: '800',
    fontSize: getResponsiveFontSize(FONT_SIZE.md),
  },
});

export default ConsultationFeeScreen;