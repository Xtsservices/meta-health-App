// components/CommissionScreen.tsx
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
import { X } from 'lucide-react-native';
import { AuthFetch, AuthPatch } from '../../auth/auth';
import { RootState } from '../../store/store';
import { 
  formatDate, 
  formatDateTime,
  convertTo12Hour 
} from '../../utils/dateTime';
import { 
  moderateScale, 
  responsiveWidth,
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
interface CommissionItem {
  id?: number;
  commissionPercentage?: string;
  consultationFee?: string;
  doctorApproval?: 0 | 1;
  adminApproval?: 0 | 1;
  userID?: number;
  hospitalID?: number;
  startDate?: string;
  endDate?: string | null;
  addedOn?: string;
  updatedOn?: string;
  active?: 1 | 0;
  employmentType?: string;
  salary?: string | null;
  commissionHistory?: any;
  workingTimings?: any;
  departmentName?: string;
  hospitalName?: string;
  firstName?: string;
  lastName?: string;
  status?: string;
  approvalStatus?: string;
}

interface ActiveCommission {
  id?: number;
  userID?: number;
  hospitalID?: number;
  employmentType?: string;
  salary?: string | null;
  commissionPercentage?: string;
  consultationFee?: string;
  startDate?: string;
  endDate?: string | null;
  workingTimings?: any;
  doctorApproval?: 1;
  adminApproval?: 1;
  active?: 1;
  addedOn?: string;
  updatedOn?: string;
  commissionHistory?: any[];
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNo?: string;
  departmentID?: number;
  departmentName?: string;
  hospitalName?: string;
}

interface Pagination {
  currentPage?: number;
  totalPages?: number;
  totalRecords?: number;
  limit?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
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
  tagCommission: '#8b5cf6',
  tagActive: '#10b981',
  tagInactive: '#6b7280',
  placeholder: '#94a3b8',
};

const CommissionScreen = () => {
  const [activeCommissionTab, setActiveCommissionTab] = useState<'pending' | 'active' | 'history'>('pending');
  const [pendingCommissions, setPendingCommissions] = useState<CommissionItem[]>([]);
  const [activeCommission, setActiveCommission] = useState<ActiveCommission | null>(null);
  const [commissionHistory, setCommissionHistory] = useState<CommissionItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState<CommissionItem | null>(null);
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [editCommission, setEditCommission] = useState('');
  const [pageLoading, setPageLoading] = useState(false);
  
  const user = useSelector((state: RootState) => state.currentUser);
  const dispatch = useDispatch();


  const loadData = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }


      switch (activeCommissionTab) {
        case 'pending':
          await loadPendingCommissions();
          break;
        case 'active':
          await loadActiveCommission();
          break;
        case 'history':
          await loadCommissionHistory();
          break;
      }
    } catch (error) {
      showError('Failed to load commission data');
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }, [activeCommissionTab, showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadPendingCommissions = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setPendingCommissions([]);
        return;
      }

      const response = await AuthFetch(
        `user/doctorAssociation/doctorPending`,
        token
      ) as any;
      
      if (response?.status === 'success') {
        const commissionsData = response?.data?.data || [];
        setPendingCommissions(Array.isArray(commissionsData) ? commissionsData : []);
      } else {
        setPendingCommissions([]);
      }
    } catch (error) {
      setPendingCommissions([]);
    }
  };

  const loadActiveCommission = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token || !user?.id || !user?.hospitalID) {
        setActiveCommission(null);
        return;
      }

      const response = await AuthFetch(
        `user/doctorAssociation/active/${user.id}/${user.hospitalID}`,
        token
      ) as any;
      
      if (response?.data?.success) {
        setActiveCommission(response?.data?.data || null);
      } else {
        setActiveCommission(null);
      }
    } catch (error) {
      setActiveCommission(null);
    }
  };

  const loadCommissionHistory = async (page: number = 1) => {
    try {
      if (page === 1) {
        setPageLoading(true);
      }

      const token = await AsyncStorage.getItem('token');
      if (!token || !user?.id || !user?.hospitalID) {
        setCommissionHistory([]);
        return;
      }

      const response = await AuthFetch(
        `user/doctorAssociation/history/${user.id}/${user.hospitalID}?page=${page}&limit=10&includeInactive=true`,
        token
      ) as any;
      
      if (response?.data?.success) {
        const historyData = response?.data?.data?.associations || [];
        if (page === 1) {
          setCommissionHistory(Array.isArray(historyData) ? historyData : []);
        } else {
          setCommissionHistory(prev => [...prev, ...(Array.isArray(historyData) ? historyData : [])]);
        }
        setPagination(response?.data?.data?.pagination || null);
      } else {
        if (page === 1) {
          setCommissionHistory([]);
        }
      }
    } catch (error) {
      if (page === 1) {
        setCommissionHistory([]);
      }
    } finally {
      if (page === 1) {
        setPageLoading(false);
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(false);
    setRefreshing(false);
  };

  const handleCommissionApprove = async (commissionId: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        showError('Please login to continue');
        return;
      }

      const response = await AuthPatch(
        `user/doctorAssociation/${commissionId}/doctorApprove`,
        {},
        token
      ) as any;
      
      if (response?.status === 'success') {
        showSuccess('Commission approved successfully');
        loadData(false);
        setShowCommissionModal(false);
      } else {
        showError(response?.message || 'Failed to approve commission');
      }
    } catch (error) {
      showError('Failed to approve commission');
    }
  };

  const handleCommissionEdit = async (commissionId: number) => {
    if (!editCommission || isNaN(Number(editCommission))) {
      showError('Please enter a valid commission rate');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        showError('Please login to continue');
        return;
      }

      const response = await AuthPatch(
        `user/doctorAssociation/${commissionId}/commission`,
        { commissionPercentage: parseFloat(editCommission) },
        token
      ) as any;
      
      if (response?.status === 'success') {
        showSuccess('Commission updated successfully');
        loadData(false);
        setShowCommissionModal(false);
        setEditCommission('');
      } else {
        showError(response?.message || 'Failed to update commission');
      }
    } catch (error) {
      showError('Failed to update commission');
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

  const parseHistory = (history: any): any[] => {
    if (!history) return [];
    
    if (Array.isArray(history)) {
      return history;
    }
    
    if (typeof history === 'string') {
      try {
        const parsed = JSON.parse(history);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return [];
      }
    }
    
    return [];
  };

  const renderPendingCommissionCard = ({ item }: { item: CommissionItem }) => {
    const commissionRate = parseFloat(item?.commissionPercentage || '0');
    const consultationFee = parseFloat(item?.consultationFee || '0');
    const statusColor = getStatusColor(item?.doctorApproval, item?.adminApproval);
    const statusText = getStatusText(item?.doctorApproval, item?.adminApproval);
    
    return (
      <View style={[styles.card, { borderColor: COLORS.border }]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Commission Proposal #{item?.id}</Text>
          <View style={[styles.tagBadge, { backgroundColor: COLORS.tagCommission }]}>
            <Text style={styles.tagText}>PENDING</Text>
          </View>
        </View>
        
        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <View style={styles.infoSection}>
              <Text style={styles.fieldLabel}>Commission Rate</Text>
              <Text style={styles.infoValue}>{commissionRate}%</Text>
            </View>
            
            <View style={styles.infoSection}>
              <Text style={styles.fieldLabel}>Consultation Fee</Text>
              <Text style={styles.infoValue}>₹{consultationFee}</Text>
            </View>
          </View>
          
          <View style={styles.statusRow}>
            <View style={styles.infoSection}>
              <Text style={styles.fieldLabel}>Status</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                <Text style={styles.statusText}>{statusText}</Text>
              </View>
            </View>
            
            <View style={styles.infoSection}>
              <Text style={styles.fieldLabel}>Employment Type</Text>
              <Text style={styles.infoValue}>{item?.employmentType || 'Not specified'}</Text>
            </View>
          </View>
          
          <View style={styles.dateRow}>
            <Text style={styles.dateText}>Start Date: {formatDate(item?.startDate)}</Text>
            {item?.endDate && (
              <Text style={styles.dateText}>End Date: {formatDate(item?.endDate)}</Text>
            )}
          </View>
          
          {item?.doctorApproval === 0 && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={() => {
                  setSelectedCommission(item);
                  setEditCommission(commissionRate.toString());
                  setShowCommissionModal(true);
                }}
              >
                <Text style={styles.actionButtonText}>Edit</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton]}
                onPress={() => handleCommissionApprove(item?.id || 0)}
              >
                <Text style={styles.actionButtonText}>Approve</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderActiveCommissionCard = () => {
    if (!activeCommission) return null;
    
    const commissionRate = parseFloat(activeCommission?.commissionPercentage || '0');
    const consultationFee = parseFloat(activeCommission?.consultationFee || '0');
    
    return (
      <View style={[styles.card, { borderColor: COLORS.tagActive }]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Active Commission</Text>
          <View style={[styles.tagBadge, { backgroundColor: COLORS.tagActive }]}>
            <Text style={styles.tagText}>ACTIVE</Text>
          </View>
        </View>
        
        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <View style={styles.infoSection}>
              <Text style={styles.fieldLabel}>Commission Rate</Text>
              <Text style={styles.infoValue}>{commissionRate}%</Text>
            </View>
            
            <View style={styles.infoSection}>
              <Text style={styles.fieldLabel}>Consultation Fee</Text>
              <Text style={styles.infoValue}>₹{consultationFee}</Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoSection}>
              <Text style={styles.fieldLabel}>Employment Type</Text>
              <Text style={styles.infoValue}>{activeCommission?.employmentType}</Text>
            </View>
            
            <View style={styles.infoSection}>
              <Text style={styles.fieldLabel}>Department</Text>
              <Text style={styles.infoValue}>{activeCommission?.departmentName}</Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoSection}>
              <Text style={styles.fieldLabel}>Hospital</Text>
              <Text style={styles.infoValue}>{activeCommission?.hospitalName}</Text>
            </View>
            
            <View style={styles.infoSection}>
              <Text style={styles.fieldLabel}>Doctor</Text>
              <Text style={styles.infoValue}>{activeCommission?.firstName} {activeCommission?.lastName}</Text>
            </View>
          </View>
          
          <View style={styles.dateRow}>
            <Text style={styles.dateText}>Start Date: {formatDate(activeCommission?.startDate)}</Text>
            <Text style={styles.dateText}>End Date: {activeCommission?.endDate ? formatDate(activeCommission?.endDate) : ' -- '}</Text>
          </View>
          
          {activeCommission?.workingTimings && Object.keys(activeCommission.workingTimings).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Working Timings</Text>
              {Object.entries(activeCommission.workingTimings).map(([day, timings]) => (
                <View key={day} style={styles.timingRow}>
                  <Text style={styles.dayText}>{day.charAt(0).toUpperCase() + day.slice(1)}:</Text>
                  <Text style={styles.timingText}>
                    {Array.isArray(timings) 
                      ? timings.map(time => convertTo12Hour(time)).join(', ')
                      : 'Not specified'
                    }
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderHistoryCommissionCard = ({ item }: { item: CommissionItem }) => {
    const commissionRate = parseFloat(item?.commissionPercentage || '0');
    const consultationFee = parseFloat(item?.consultationFee || '0');
    const isActive = item?.active === 1;
    const tagColor = isActive ? COLORS.tagActive : COLORS.tagInactive;
    const tagText = isActive ? 'ACTIVE' : 'INACTIVE';
    
    return (
      <View style={[styles.card, { borderColor: COLORS.border }]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Commission</Text>
          <View style={[styles.tagBadge, { backgroundColor: tagColor }]}>
            <Text style={styles.tagText}>{tagText}</Text>
          </View>
        </View>
        
        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <View style={styles.infoSection}>
              <Text style={styles.fieldLabel}>Commission Rate</Text>
              <Text style={styles.infoValue}>{commissionRate}%</Text>
            </View>
            
            <View style={styles.infoSection}>
              <Text style={styles.fieldLabel}>Consultation Fee</Text>
              <Text style={styles.infoValue}>₹{consultationFee}</Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoSection}>
              <Text style={styles.fieldLabel}>Employment Type</Text>
              <Text style={styles.infoValue}>{item?.employmentType}</Text>
            </View>
            
            <View style={styles.infoSection}>
              <Text style={styles.fieldLabel}>Status</Text>
              <View style={[styles.statusBadge, { 
                backgroundColor: item?.approvalStatus === 'approved' ? COLORS.success : COLORS.warning 
              }]}>
                <Text style={styles.statusText}>{item?.approvalStatus?.toUpperCase() || 'UNKNOWN'}</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.dateRow}>
            <Text style={styles.dateText}>From: {formatDate(item?.startDate)}</Text>
            <Text style={styles.dateText}>End Date: {item?.endDate ? formatDate(item?.endDate) : ' -- '}</Text>
          </View>
          
          <Text style={styles.updatedText}>
            Updated: {formatDateTime(item?.updatedOn)}
          </Text>
        </View>
      </View>
    );
  };

  const renderCommissionModal = () => (
    <Modal
      visible={showCommissionModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowCommissionModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[
          styles.modalContent,
          { maxHeight: SCREEN_HEIGHT * 0.85 }
        ]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Commission Details</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowCommissionModal(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={moderateScale(20)} color={COLORS.subText} />
            </TouchableOpacity>
          </View>
          
          {selectedCommission && (
            <ScrollView 
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.detailGrid}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Commission ID</Text>
                  <Text style={styles.detailValue}>#{selectedCommission?.id}</Text>
                </View>
                
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Commission Rate</Text>
                  <Text style={styles.detailValue}>{parseFloat(selectedCommission?.commissionPercentage || '0')}%</Text>
                </View>
                
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Consultation Fee</Text>
                  <Text style={styles.detailValue}>₹{parseFloat(selectedCommission?.consultationFee || '0')}</Text>
                </View>
                
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Employment Type</Text>
                  <Text style={styles.detailValue}>{selectedCommission?.employmentType || 'Not specified'}</Text>
                </View>
              </View>
              
              <View style={styles.statusSection}>
                <Text style={styles.sectionTitle}>Approval Status</Text>
                <View style={styles.statusGrid}>
                  <View style={styles.statusItem}>
                    <Text style={styles.statusLabel}>Doctor Approval</Text>
                    <View style={[
                      styles.statusIndicator,
                      { backgroundColor: selectedCommission?.doctorApproval === 1 ? COLORS.success : COLORS.warning }
                    ]}>
                      <Text style={styles.statusIndicatorText}>
                        {selectedCommission?.doctorApproval === 1 ? 'Approved' : 'Pending'}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.statusItem}>
                    <Text style={styles.statusLabel}>Admin Approval</Text>
                    <View style={[
                      styles.statusIndicator,
                      { backgroundColor: selectedCommission?.adminApproval === 1 ? COLORS.success : COLORS.warning }
                    ]}>
                      <Text style={styles.statusIndicatorText}>
                        {selectedCommission?.adminApproval === 1 ? 'Approved' : 'Pending'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
              
              <View style={styles.dateSection}>
                <Text style={styles.sectionTitle}>Dates</Text>
                <View style={styles.dateGrid}>
                  <View style={styles.dateItem}>
                    <Text style={styles.dateLabel}>Start Date</Text>
                    <Text style={styles.dateValue}>{formatDate(selectedCommission?.startDate)}</Text>
                  </View>
                  
                  {selectedCommission?.endDate && (
                    <View style={styles.dateItem}>
                      <Text style={styles.dateLabel}>End Date</Text>
                      <Text style={styles.dateValue}>{formatDate(selectedCommission?.endDate)}</Text>
                    </View>
                  )}
                </View>
              </View>
              
              <View style={styles.historySection}>
                <Text style={styles.sectionTitle}>Commission History</Text>
                {parseHistory(selectedCommission?.commissionHistory)?.length > 0 ? (
                  parseHistory(selectedCommission?.commissionHistory)?.map((history, index) => (
                    <View key={index} style={styles.historyItem}>
                      <View style={styles.historyHeader}>
                        <Text style={styles.historyBy}>{history?.doctorName || history?.by || 'System'}</Text>
                        <Text style={styles.historyTime}>
                          {formatDateTime(history?.deactivatedAt || history?.timestamp || selectedCommission?.updatedOn)}
                        </Text>
                      </View>
                      <Text style={styles.historyAction}>
                        {history?.action || 'Commission Updated'} {history?.commissionPercentage ? `${history?.commissionPercentage}%` : ''}
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
              
              {selectedCommission?.doctorApproval === 0 && (
                <>
                  <Text style={styles.editTitle}>Edit Commission Rate</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter new commission rate (%)"
                    placeholderTextColor={COLORS.placeholder}
                    value={editCommission}
                    onChangeText={setEditCommission}
                    keyboardType="numeric"
                  />
                  
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.modalActionButton, styles.editActionButton]}
                      onPress={() => handleCommissionEdit(selectedCommission?.id || 0)}
                    >
                      <Text style={styles.modalActionButtonText}>Update Commission</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.modalActionButton, styles.approveActionButton]}
                      onPress={() => handleCommissionApprove(selectedCommission?.id || 0)}
                    >
                      <Text style={styles.modalActionButtonText}>Approve As Is</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  const renderEmptyState = (message: string, subMessage: string) => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>{message}</Text>
      <Text style={styles.emptyStateText}>{subMessage}</Text>
    </View>
  );

  const safeAreaInsets = getSafeAreaInsets();
  const bottomPadding = hasNotch() ? safeAreaInsets.bottom : moderateScale(20);

  return (
    <View style={styles.container}>
      {/* Commission Tab Navigation */}
      <View style={styles.commissionTabContainer}>
        {['pending', 'active', 'history'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.commissionTab, activeCommissionTab === tab && styles.activeCommissionTab]}
            onPress={() => setActiveCommissionTab(tab as any)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.commissionTabText, 
              activeCommissionTab === tab && styles.activeCommissionTabText
            ]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Content Area with Footer Space */}
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
          {activeCommissionTab === 'pending' ? (
            pendingCommissions?.length === 0 ? (
              renderEmptyState(
                'No Pending Commissions',
                'You don\'t have any pending commission proposals at the moment.'
              )
            ) : (
              pendingCommissions?.map((item, index) => (
                <React.Fragment key={item?.id || index}>
                  {renderPendingCommissionCard({ item })}
                </React.Fragment>
              ))
            )
          ) : activeCommissionTab === 'active' ? (
            activeCommission ? (
              renderActiveCommissionCard()
            ) : (
              renderEmptyState(
                'No Active Commission',
                'You don\'t have an active commission agreement at the moment.'
              )
            )
          ) : (
            <>
              {pageLoading ? (
                <View style={styles.pageLoadingContainer}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                </View>
              ) : commissionHistory?.length === 0 ? (
                renderEmptyState(
                  'No Commission History',
                  'You don\'t have any commission history yet.'
                )
              ) : (
                <>
                  {commissionHistory?.map((item, index) => (
                    <React.Fragment key={item?.id || index}>
                      {renderHistoryCommissionCard({ item })}
                    </React.Fragment>
                  ))}
                  {pagination?.hasNextPage && (
                    <TouchableOpacity
                      style={styles.loadMoreButton}
                      onPress={() => loadCommissionHistory((pagination?.currentPage || 0) + 1)}
                    >
                      <Text style={styles.loadMoreText}>Load More</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </>
          )}
        </ScrollView>
      )}
      
      {/* Modals */}
      {renderCommissionModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  
  // Commission Tab Styles
  commissionTabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    padding: moderateScale(4),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  commissionTab: {
    flex: 1,
    paddingVertical: getDeviceSpecificValue(SPACING.sm, SPACING.md, SPACING.xs),
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
  },
  activeCommissionTab: {
    backgroundColor: COLORS.primary,
  },
  commissionTabText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
    fontWeight: '700',
    color: COLORS.subText,
  },
  activeCommissionTabText: {
    color: COLORS.card,
  },
  
  // Content Styles
  content: {
    flex: 1,
    padding: SPACING.md,
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
  
  pageLoadingContainer: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  
  // Card Styles
  card: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
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
  
  // Status
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
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
  
  // Updated Text
  updatedText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs, { min: 9 }),
    color: COLORS.subText,
    fontStyle: 'italic',
    textAlign: 'right',
  },
  
  // Section
  section: {
    marginTop: SPACING.xs,
  },
  sectionTitle: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  timingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: moderateScale(2),
  },
  dayText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs, { min: 10 }),
    fontWeight: '700',
    color: COLORS.text,
  },
  timingText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs, { min: 10 }),
    color: COLORS.subText,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
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
  editButton: {
    backgroundColor: COLORS.warning,
  },
  approveButton: {
    backgroundColor: COLORS.success,
  },
  actionButtonText: {
    color: COLORS.card,
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
  
  // Load More Button
  loadMoreButton: {
    backgroundColor: COLORS.chip,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  loadMoreText: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
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
  
  // Status Section in Modal
  statusSection: {
    marginBottom: SPACING.lg,
  },
  statusGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  statusItem: {
    flex: 1,
  },
  statusLabel: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs, { min: 10 }),
    fontWeight: '700',
    color: COLORS.subText,
    marginBottom: moderateScale(2),
  },
  statusIndicator: {
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(6),
    borderRadius: BORDER_RADIUS.md,
    alignSelf: 'flex-start',
  },
  statusIndicatorText: {
    color: COLORS.card,
    fontSize: getResponsiveFontSize(FONT_SIZE.xs, { min: 10 }),
    fontWeight: '800',
  },
  
  // Date Section
  dateSection: {
    marginBottom: SPACING.lg,
  },
  dateGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs, { min: 10 }),
    fontWeight: '700',
    color: COLORS.subText,
    marginBottom: moderateScale(2),
  },
  dateValue: {
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    fontWeight: '700',
    color: COLORS.text,
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
  
  // Edit Section
  editTitle: {
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  
  // Input Styles
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    fontSize: getResponsiveFontSize(FONT_SIZE.md),
    color: COLORS.text,
    backgroundColor: COLORS.card,
    fontWeight: '600',
    marginBottom: SPACING.lg,
  },
  
  // Modal Actions
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  modalActionButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  editActionButton: {
    backgroundColor: COLORS.warning,
  },
  approveActionButton: {
    backgroundColor: COLORS.success,
  },
  modalActionButtonText: {
    color: COLORS.card,
    fontWeight: '800',
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
  },
});

export default CommissionScreen;