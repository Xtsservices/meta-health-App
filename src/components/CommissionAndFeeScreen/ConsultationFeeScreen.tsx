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
import { X, Plus, History, CheckCircle } from 'lucide-react-native';
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
  status?: 'pending' | 'approved' | 'rejected' | 'active';
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

interface ActiveFee {
  id?: number;
  fee?: number;
  startDate?: string;
  endDate?: string | null;
  status?: string;
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
  activeGreen: '#10b981',
};

const ConsultationFeeScreen = () => {
  const [fees, setFees] = useState<ConsultationFee[]>([]);
  const [activeFee, setActiveFee] = useState<ActiveFee | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFee, setSelectedFee] = useState<ConsultationFee | null>(null);
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [newFee, setNewFee] = useState('');
  const [feeHistory, setFeeHistory] = useState<FeeHistory | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [commissionStatus, setCommissionStatus] = useState<{
    isApproved: boolean;
    message?: string;
  }>({ isApproved: true });
  
  const user = useSelector((state: RootState) => state.currentUser);
  const dispatch = useDispatch();

  // Add commission status check function
  const checkCommissionStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token || !user?.id || !user?.hospitalID) {
        return { isApproved: false, message: "Missing user information" };
      }

      // Try different possible endpoints
      const endpoints = [
        `commission/doctor/${user.id}/hospital/${user.hospitalID}/status`,
        `user/commission/check/${user.id}/${user.hospitalID}`,
        `commission/details/doctor/${user.id}/hospital/${user.hospitalID}`,
        `user/commission/doctor/${user.id}/hospital/${user.hospitalID}/status`
      ];

      let commissionResponse = null;
      for (const endpoint of endpoints) {
        try {
          const response = await AuthFetch(endpoint, token) as any;
          if (response?.status === 'success' || response?.data) {
            commissionResponse = response;
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (commissionResponse?.status === 'success') {
        const data = commissionResponse.data || commissionResponse;
        const isApproved = data?.doctorApproved === 1 && data?.adminApproved === 1;
        
        return {
          isApproved,
          message: !isApproved 
            ? "Commission terms pending approval. Please wait for admin approval."
            : undefined
        };
      }
      
      return { isApproved: true, message: undefined }; // Default to true if endpoint not found
    } catch (error) {
      console.log("Commission check error:", error);
      return { isApproved: true, message: undefined }; // Default to true to not block users
    }
  };

  const loadData = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      // Check commission status first
      const commissionCheck = await checkCommissionStatus();
      setCommissionStatus(commissionCheck);

      // Load active fee
      await loadActiveFee();

      // Only load pending fees if commission is approved
      if (commissionCheck.isApproved) {
        await loadFees();
      } else {
        setFees([]);
      }
    } catch (error) {
      dispatch(showError('Failed to load fee data'));
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }, [dispatch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadActiveFee = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token || !user?.id || !user?.hospitalID) {
        setActiveFee(null);
        return;
      }
      const response = await AuthFetch(
        `user/consultationFee/active/${user.id}/${user.hospitalID}`,
        token
      ) as any;
      
      console.log("Active fee response:", response);
      
      if (response?.status === 'success' && response?.data?.data) {
        setActiveFee(response?.data?.data);
      } else {
        setActiveFee(null);
      }
    } catch (error) {
      console.log("Error loading active fee:", error);
      setActiveFee(null);
    }
  };

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
    // Check commission status first
    if (!commissionStatus.isApproved) {
      dispatch(showError(commissionStatus.message || "Commission approval required"));
      return;
    }

    if (!newFee || isNaN(Number(newFee))) {
      dispatch(showError('Please enter a valid fee amount'));
      return;
    }

    if (parseFloat(newFee) <= 0) {
      dispatch(showError('Fee amount must be greater than zero'));
      return;
    }

    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem('token');
      if (!token || !user?.id || !user?.hospitalID) {
        dispatch(showError('Missing required information'));
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
      
      console.log("Fee propose response:", response);
      
      // Check different possible success structures
      if (response?.status === 'success' || response?.success === true) {
        dispatch(showSuccess('Fee proposed successfully'));
        loadData(false);
        setNewFee('');
        setShowFeeModal(false);
      } else if (response?.data?.status === 'success') {
        dispatch(showSuccess('Fee proposed successfully'));
        loadData(false);
        setNewFee('');
        setShowFeeModal(false);
      } else {
        // Handle error - check multiple possible locations
        const errorMessage = 
          response?.message || 
          response?.data?.message ||
          response?.error ||
          response?.data?.error ||
          'Failed to propose fee';
        
        dispatch(showError(errorMessage));
      }
    } catch (error: any) {
      console.error('Fee proposal error:', error);
      
      // Handle network or unexpected errors
      const errorMessage = 
        error?.message ||
        error?.response?.data?.message ||
        'Network error occurred';
      
      dispatch(showError(errorMessage));
    } finally {
      setSubmitting(false);
    }
  };

  const handleFeeApprove = async (feeId: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        dispatch(showError('Please login to continue'));
        return;
      }

      const response = await AuthPatch(
        `user/consultationFee/doctorApprove/${feeId}`,
        {},
        token
      ) as any;
      
      console.log("Fee approve response:", response);
      
      if (response?.status === 'success' || response?.success === true) {
        dispatch(showSuccess('Fee approved successfully'));
        loadData(false);
      } else {
        const errorMessage = 
          response?.message || 
          response?.data?.message ||
          'Failed to approve fee';
        dispatch(showError(errorMessage));
      }
    } catch (error: any) {
      dispatch(showError('Failed to approve fee'));
    }
  };

  const loadFeeHistory = async (feeId: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        dispatch(showError('Please login to continue'));
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
        dispatch(showError(response?.message || 'Failed to load history'));
      }
    } catch (error) {
      dispatch(showError('Failed to load history'));
    }
  };

  const getStatusColor = (doctorApproval?: number, adminApproval?: number, status?: string, rejectedBy?: string, rejectionReason?: string) => {
    // If there's a rejection reason and it was rejected by admin, show error color
    if (rejectionReason && rejectedBy === 'ADMIN') {
      return COLORS.error;
    }
    
    if (status === 'active') return COLORS.activeGreen;
    if (doctorApproval === 1 && adminApproval === 1) return COLORS.success;
    if (doctorApproval === 0 && adminApproval === 0) return COLORS.warning;
    if (doctorApproval === 1 && adminApproval === 0) return COLORS.info;
    return COLORS.subText;
  };

  const getStatusText = (doctorApproval?: number, adminApproval?: number, status?: string, rejectedBy?: string, rejectionReason?: string) => {
    // If there's a rejection reason and it was rejected by admin, show REJECTED
    if (rejectionReason && rejectedBy === 'ADMIN') {
      return 'REJECTED';
    }
    
    if (status === 'active') return 'ACTIVE';
    if (doctorApproval === 1 && adminApproval === 1) return 'APPROVED';
    if (doctorApproval === 0 && adminApproval === 0) return 'PENDING';
    if (doctorApproval === 1 && adminApproval === 0) return 'DOCTOR APPROVED';
    return 'UNKNOWN';
  };


  // Active Fee Card Component
  const ActiveFeeCard = () => {
    if (!activeFee) return null;

    return (
      <View style={[styles.activeFeeCard, { borderColor: COLORS.activeGreen }]}>
        <View style={styles.activeFeeHeader}>
          <View style={styles.activeFeeTitleRow}>
            <CheckCircle size={moderateScale(20)} color={COLORS.activeGreen} />
            <Text style={styles.activeFeeTitle}>Current Consultation Fee</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: COLORS.activeGreen }]}>
            <Text style={styles.statusText}>{activeFee?.status?.toUpperCase() || 'ACTIVE'}</Text>
          </View>
        </View>
        
        <View style={styles.activeFeeBody}>
          <Text style={styles.activeFeeAmount}>₹{activeFee?.fee}</Text>
          <Text style={styles.activeFeeSubtitle}>per consultation</Text>
          
          <View style={styles.activeFeeDate}>
            <Text style={styles.activeFeeDateText}>
              Effective from: {formatDate(activeFee?.startDate)}
            </Text>
            {activeFee?.endDate && (
              <Text style={styles.activeFeeDateText}>
                Valid until: {formatDate(activeFee?.endDate)}
              </Text>
            )}
          </View>
          
          <TouchableOpacity
            style={styles.historyButtonTop}
            onPress={() => {
              if (activeFee?.id) {
                loadFeeHistory(activeFee.id);
              }
            }}
          >
            <History size={moderateScale(16)} color={COLORS.primary} />
            <Text style={styles.historyButtonText}>View History</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const FeeCard = ({ item }: { item: ConsultationFee }) => {
    console.log("666777",item)
    const statusColor = getStatusColor(item?.doctorApproval, item?.adminApproval, item?.status, item?.rejectedBy, item?.rejectionReason);
    const statusText = getStatusText(item?.doctorApproval, item?.adminApproval, item?.status, item?.rejectedBy, item?.rejectionReason);
    
    // Determine admin status text based on rejection
    const getAdminStatusText = () => {
      if (item?.rejectionReason && item?.rejectedBy === 'ADMIN') {
        return 'Rejected';
      }
      return item?.adminApproval === 1 ? 'Approved' : 'Pending';
    };
    
    // Determine admin status color based on rejection
    const getAdminStatusColor = () => {
      if (item?.rejectionReason && item?.rejectedBy === 'ADMIN') {
        return COLORS.error;
      }
      return item?.adminApproval === 1 ? COLORS.success : COLORS.warning;
    };
    
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
          <View style={[styles.tagBadge]}>
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
          
          <View style={styles.approvalStatusRow}>
            <View style={styles.approvalStatusItem}>
              <Text style={styles.approvalStatusLabel}>Doctor:</Text>
              <View style={[
                styles.approvalBadge, 
                { backgroundColor: item?.doctorApproval === 1 ? COLORS.success : COLORS.warning }
              ]}>
                <Text style={styles.approvalBadgeText}>
                  {item?.doctorApproval === 1 ? 'Approved' : 'Pending'}
                </Text>
              </View>
            </View>
            
            <View style={styles.approvalStatusItem}>
              <Text style={styles.approvalStatusLabel}>Admin:</Text>
              <View style={[
                styles.approvalBadge, 
                { backgroundColor: getAdminStatusColor() }
              ]}>
                <Text style={styles.approvalBadgeText}>
                  {getAdminStatusText()}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.dateRow}>
            <Text style={styles.dateText}>Proposed On: {formatDate(item?.createdAt)}</Text>
            <Text style={styles.dateText}>Start Date: {formatDate(item?.startDate)}</Text>
          </View>
          
          {item?.rejectionReason && (
            <View style={styles.rejectionBox}>
              <Text style={styles.rejectionLabel}>Rejection Reason - </Text>
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
            
            {!commissionStatus.isApproved && (
              <View style={styles.commissionWarningBox}>
                <Text style={styles.commissionWarningText}>
                  ⚠️ {commissionStatus.message || "Commission approval required"}
                </Text>
              </View>
            )}
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Fee Amount (₹)</Text>
              <TextInput
                style={[styles.input, !commissionStatus.isApproved && styles.inputDisabled]}
                placeholder="e.g., 500"
                placeholderTextColor={COLORS.placeholder}
                value={newFee}
                onChangeText={setNewFee}
                keyboardType="numeric"
                editable={!submitting && commissionStatus.isApproved}
              />
            </View>
            
            <TouchableOpacity
              style={[
                styles.submitButton, 
                submitting && styles.submitButtonDisabled,
                !commissionStatus.isApproved && styles.submitButtonDisabled
              ]}
              onPress={handleFeePropose}
              disabled={submitting || !commissionStatus.isApproved}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={COLORS.card} />
              ) : (
                <Text style={styles.submitButtonText}>
                  {!commissionStatus.isApproved ? "Commission Pending" : "Propose Fee"}
                </Text>
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
            <Text style={styles.modalTitle}>
              Fee History - #{feeHistory?.id || activeFee?.id}
            </Text>
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
                    <Text style={styles.detailLabel}>Fee Amount</Text>
                    <Text style={styles.detailValue}>₹{feeHistory?.fee}</Text>
                  </View>
                  
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <View style={[styles.statusBadge, { 
                      backgroundColor: getStatusColor(feeHistory?.doctorApproval, feeHistory?.adminApproval, feeHistory?.status) 
                    }]}>
                      <Text style={styles.statusText}>
                        {getStatusText(feeHistory?.doctorApproval, feeHistory?.adminApproval, feeHistory?.status)}
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
      <Text style={styles.emptyStateTitle}>
        {commissionStatus.isApproved 
          ? "No Pending Fee Proposals" 
          : "Commission Approval Required"
        }
      </Text>
      <Text style={styles.emptyStateText}>
        {commissionStatus.isApproved 
          ? "You don't have any pending fee proposals at the moment."
          : commissionStatus.message || "Commission terms need approval before proposing fees."
        }
      </Text>
      
      {commissionStatus.isApproved ? (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowFeeModal(true)}
        >
          <Plus size={moderateScale(16)} color="#ffffff" />
          <Text style={styles.addButtonText}>Propose New Fee</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.infoBox}>
          <Text style={styles.infoBoxText}>
            Please contact your hospital administrator to approve the commission terms.
          </Text>
        </View>
      )}
    </View>
  );

  const safeAreaInsets = getSafeAreaInsets();
  const bottomPadding = hasNotch() ? safeAreaInsets.bottom : moderateScale(20);

  return (
    <View style={styles.container}>
      {/* Header with Actions */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Fee Proposals</Text>
        
        {commissionStatus.isApproved ? (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowFeeModal(true)}
            activeOpacity={0.7}
          >
            <Plus size={moderateScale(16)} color="#ffffff" />
            <Text style={styles.addButtonText}>Propose New</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.commissionWarningBadge}>
            <Text style={styles.commissionWarningBadgeText}>Commission Pending</Text>
          </View>
        )}
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
            paddingBottom: bottomPadding + responsiveHeight(10)
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
          {/* Active Fee Section */}
          {activeFee && <ActiveFeeCard />}
          
          {/* Pending Proposals Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Pending Fee Proposals {fees.length > 0 && `(${fees.length})`}
            </Text>
          </View>
          
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
  commissionWarningBadge: {
    backgroundColor: COLORS.warning,
    paddingHorizontal: SPACING.sm,
    paddingVertical: getDeviceSpecificValue(SPACING.xs, SPACING.sm, SPACING.xs),
    borderRadius: BORDER_RADIUS.md,
  },
  commissionWarningBadgeText: {
    color: COLORS.card,
    fontWeight: '700',
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
  },
  
  // Section Header
  sectionHeader: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  sectionTitle: {
    fontSize: getResponsiveFontSize(FONT_SIZE.md),
    fontWeight: '700',
    color: COLORS.text,
  },
  
  // Active Fee Card Styles
  activeFeeCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    margin: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: ELEVATION.md,
      },
    }),
  },
  activeFeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  activeFeeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(8),
  },
  activeFeeTitle: {
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    fontWeight: '700',
    color: COLORS.text,
  },
  activeFeeBody: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  activeFeeAmount: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xxl),
    fontWeight: '800',
    color: COLORS.text,
  },
  activeFeeSubtitle: {
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    color: COLORS.subText,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  activeFeeDate: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  activeFeeDateText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
    color: COLORS.subText,
    fontWeight: '600',
  },
  historyButtonTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(6),
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.chip,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyButtonText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
    color: COLORS.primary,
    fontWeight: '700',
  },
  
  // Content Styles
  content: {
    flex: 1,
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
    marginHorizontal: SPACING.lg,
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
    color: "#000000",
    fontStyle:'italic'
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
  
  // Approval Status Row
  approvalStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  approvalStatusItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(6),
  },
  approvalStatusLabel: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs, { min: 10 }),
    fontWeight: '700',
    color: COLORS.subText,
  },
  approvalBadge: {
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(3),
    borderRadius: BORDER_RADIUS.sm,
  },
  approvalBadgeText: {
    color: COLORS.card,
    fontSize: getResponsiveFontSize(FONT_SIZE.xs, { min: 8 }),
    fontWeight: '800',
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
    marginTop: SPACING.xs,
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
    marginTop: SPACING.xs,
  },
  rejectionLabel: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs, { min: 10 }),
    color: COLORS.error,
    fontWeight: '700',
    marginBottom: moderateScale(2),
    fontStyle:'italic'
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: responsiveHeight(10),
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
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
  
  // Info Box
  infoBox: {
    backgroundColor: '#fef3c7',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: '#fbbf24',
    marginTop: SPACING.sm,
  },
  infoBoxText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
    color: '#92400e',
    textAlign: 'center',
    fontWeight: '600',
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
  
  // Commission Warning in Modal
  commissionWarningBox: {
    backgroundColor: '#fef3c7',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: '#fbbf24',
    marginBottom: SPACING.lg,
  },
  commissionWarningText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    color: '#92400e',
    textAlign: 'center',
    fontWeight: '600',
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
  inputDisabled: {
    backgroundColor: '#f1f5f9',
    color: COLORS.subText,
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