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
import { Italic, X } from 'lucide-react-native';
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
import { useFocusEffect } from '@react-navigation/native';

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

interface CommissionHistoryItem {
  role: number;
  action: string;
  userID: number;
  timestamp: string;
  commissionPercentage?: string;
  newValue?: number;
  oldValue?: string;
  reason?: string;
  doctorName?: string;
  by?: string;
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
  const [showAllHospitals, setShowAllHospitals] = useState(false); // NEW: Toggle state

  const user = useSelector((state: RootState) => state.currentUser);
  console.log("555", user)
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
      dispatch(showError('Failed to load commission data'));
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }, [activeCommissionTab, showError]);

  useFocusEffect(
    useCallback(() => {
      loadData();

      return () => {
        // optional cleanup (not required now)
      };
  }, [loadData])
  );

const loadPendingCommissions = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      setPendingCommissions([]);
      return;
    }

    let endpoint = 'user/doctorAssociation/doctorPending';

    // ✅ hospitalID ONLY when viewing current hospital
    if (showAllHospitals === false && user?.hospitalID) {
      endpoint += `?hospitalID=${user.hospitalID}`;
    }

    console.log('showAllHospitals:', showAllHospitals);
    console.log('FINAL URL:', endpoint);

    const response = await AuthFetch(endpoint, token) as any;

    if (response?.status === 'success') {
      setPendingCommissions(response?.data?.data || []);
    } else {
      setPendingCommissions([]);
    }
  } catch (err) {
    console.error(err);
    setPendingCommissions([]);
  }
};



  const loadActiveCommission = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      console.log("token111", token)
      if (!token || !user?.id) {
        setActiveCommission(null);
        return;
      }

      // If showing all hospitals, we might need to handle multiple active commissions
      if (showAllHospitals) {
        // For now, we'll show the active commission for the current hospital
        // or you could modify this to show all active commissions
        if (user.hospitalID) {
          const response = await AuthFetch(
            `user/doctorAssociation/active/${user.id}/${user.hospitalID}`,
            token
          ) as any;
          console.log("666", response)

          if (response?.data?.success) {
            setActiveCommission(response?.data?.data || null);
          } else {
            setActiveCommission(null);
          }
        } else {
          setActiveCommission(null);
        }
      } else {
        // Original logic - show active commission for current hospital
        if (user?.hospitalID) {
          const response = await AuthFetch(
            `user/doctorAssociation/active/${user.id}/${user.hospitalID}`,
            token
          ) as any;
          console.log("666", response)

          if (response?.data?.success) {
            setActiveCommission(response?.data?.data || null);
          } else {
            setActiveCommission(null);
          }
        } else {
          setActiveCommission(null);
        }
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
      if (!token || !user?.id) {
        setCommissionHistory([]);
        return;
      }

      let endpoint = `user/doctorAssociation/history/${user.id}`;
      
      // Add hospitalID if we're NOT showing all hospitals
      if (user?.hospitalID && !showAllHospitals) {
        endpoint += `/${user.hospitalID}`;
      }
      
      endpoint += `?page=${page}&limit=10&includeInactive=true`;

      const response = await AuthFetch(endpoint, token) as any;
      console.log("yyyyyyyyyyy", response)
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
        dispatch(showError('Please login to continue'));
        return;
      }

      const response = await AuthPatch(
        `user/doctorAssociation/${commissionId}/doctorApprove`,
        {},
        token
      ) as any;

      if (response?.status === 'success') {
        dispatch(showSuccess('Commission approved successfully'));
        loadData(false);
        setShowCommissionModal(false);
      } else {
       dispatch(showError(response?.message || 'Failed to approve commission'));
      }
    } catch (error) {
      dispatch(showError('Failed to approve commission'));
    }
  };

  const handleCommissionEdit = async (commissionId: number) => {
    if (!editCommission || isNaN(Number(editCommission))) {
      dispatch(showError('Please enter a valid commission rate'));
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        dispatch(showError('Please login to continue'));
        return;
      }

      const response = await AuthPatch(
        `user/doctorAssociation/${commissionId}/commission`,
        { commissionPercentage: parseFloat(editCommission) },
        token
      ) as any;
  console.log("676546dddd",response)
      if (response?.status === 'success') {
      setShowCommissionModal(false);

      setTimeout(() => {
        dispatch(showSuccess('Commission updated successfully'));
        loadData(false);
        setEditCommission('');
      }, 200);

    } else {
      setShowCommissionModal(false);

      setTimeout(() => {
        dispatch(showError(response?.message || 'Failed to update commission'));
      }, 200);
    }

  } catch (error: any) {
    const apiMessage =
      error?.response?.data?.message ||
      error?.message ||
      'Failed to update commission';

    setShowCommissionModal(false);

    setTimeout(() => {
      dispatch(showError(apiMessage));
    }, 200);
  }
};

  // NEW: Toggle function
  const toggleShowAllHospitals = async () => {
    setShowAllHospitals(!showAllHospitals);
    // We'll reload data in useEffect dependency
  };

  // Reload data when showAllHospitals changes
  useEffect(() => {
    if (!loading) {
      loadData(true);
    }
  }, [showAllHospitals]);
useEffect(() => {
  loadPendingCommissions();
}, [showAllHospitals]);

  const getDoctorStatusColor = (doctorApproval?: number) => {
    return doctorApproval === 1 ? COLORS.success : COLORS.warning;
  };

  const getAdminStatusColor = (adminApproval?: number) => {
    return adminApproval === 1 ? COLORS.success : COLORS.warning;
  };

  const getDoctorStatusText = (doctorApproval?: number) => {
    return doctorApproval === 1 ? 'APPROVED' : 'PENDING';
  };

  const getAdminStatusText = (adminApproval?: number) => {
    return adminApproval === 1 ? 'APPROVED' : 'PENDING';
  };

  const parseHistory = (history: any): CommissionHistoryItem[] => {
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

  // Helper function to get editor name based on role
  const getEditorName = (role: number): string => {
    switch (role) {
      case 4001: return 'Doctor';
      case 4002: return 'Nurse';
      case 4003: return 'Pharmacist';
      case 4004: return 'Lab Technician';
      case 5001: return 'Hospital Admin';
      case 5002: return 'Hospital Staff';
      case 5003: return 'Super Admin';
      case 9999: return 'Admin';
      default: return 'System';
    }
  };

  // Helper function to get commission value from history item
  const getCommissionValue = (history: CommissionHistoryItem): string => {
    // Check for newValue first (from edit actions)
    if (history.newValue !== undefined) {
      return `${history.newValue}%`;
    }
    // Check for commissionPercentage (from create actions)
    if (history.commissionPercentage !== undefined) {
      return `${history.commissionPercentage}%`;
    }
    // For other actions or if no value found
    return '';
  };

  // Helper function to get action description
  const getActionDescription = (history: CommissionHistoryItem): string => {
    const editor = getEditorName(history.role);
    
    switch (history.action) {
      case 'create':
        return `Created commission at ${getCommissionValue(history)}`;
      case 'edit':
        const oldValue = history.oldValue ? `${history.oldValue}%` : '';
        const newValue = history.newValue ? `${history.newValue}%` : '';
        return `Changed commission from ${oldValue} to ${newValue}`;
      case 'approve':
        return 'Approved the commission';
      case 'reject':
        return 'Rejected the commission';
      default:
        return `${history.action.charAt(0).toUpperCase() + history.action.slice(1)} commission`;
    }
  };

  // Helper function to get action color
  const getActionColor = (action: string): string => {
    switch (action) {
      case 'create': return COLORS.primary;
      case 'edit': return COLORS.info;
      case 'approve': return COLORS.success;
      case 'reject': return COLORS.error;
      default: return COLORS.subText;
    }
  };

  const renderPendingCommissionCard = ({ item }: { item: CommissionItem }) => {
    console.log("999", item)
    const commissionRate = parseFloat(item?.commissionPercentage || '0');
    const consultationFee = parseFloat(item?.consultationFee || '0');
    const doctorStatusColor = getDoctorStatusColor(item?.doctorApproval);
    const doctorStatusText = getDoctorStatusText(item?.doctorApproval);
    const adminStatusColor = getAdminStatusColor(item?.adminApproval);
    const adminStatusText = getAdminStatusText(item?.adminApproval);

    return (
      <View style={[styles.card, { borderColor: COLORS.border }]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Commission Proposal</Text>
          <View style={[styles.tagBadge, { backgroundColor: COLORS.tagCommission }]}>
            <Text style={styles.tagText}>PENDING</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          {/* Show hospital name if showing all hospitals */}
          {showAllHospitals && item?.hospitalName && (
            <View style={styles.hospitalRow}>
              <Text style={styles.hospitalLabel}>Hospital:</Text>
              <Text style={styles.hospitalName}>{item.hospitalName}</Text>
            </View>
          )}

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

          {/* Doctor Approval Status */}
          <View style={styles.statusRow}>
            <View style={styles.infoSection}>
              <Text style={styles.fieldLabel}>Doctor Approval</Text>
              <View style={[styles.statusBadge, { backgroundColor: doctorStatusColor }]}>
                <Text style={styles.statusText}>{doctorStatusText}</Text>
              </View>
            </View>

            {/* Admin Approval Status */}
            <View style={styles.infoSection}>
              <Text style={styles.fieldLabel}>Admin Approval</Text>
              <View style={[styles.statusBadge, { backgroundColor: adminStatusColor }]}>
                <Text style={styles.statusText}>{adminStatusText}</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoRow}>
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
          {/* Show hospital name if showing all hospitals */}
          {showAllHospitals && activeCommission?.hospitalName && (
            <View style={styles.hospitalRow}>
              <Text style={styles.hospitalLabel}>Hospital:</Text>
              <Text style={styles.hospitalName}>{activeCommission.hospitalName}</Text>
            </View>
          )}

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
    console.log("5656", item)
    const commissionRate = parseFloat(item?.commissionPercentage || '0');
    const consultationFee = parseFloat(item?.consultationFee || '0');
    const isActive = item?.active === 1;
    const tagColor = isActive ? COLORS.tagActive : COLORS.tagInactive;
    const tagText = isActive ? 'ACTIVE' : 'INACTIVE';

    // Get the latest edit action from commissionHistory
    const commissionHistory = parseHistory(item?.commissionHistory);
    console.log("8888", commissionHistory)
    const latestEdit = commissionHistory.length > 0
      ? commissionHistory.find(h => h.action === 'edit') || commissionHistory[0]
      : null;

    // Get the editor name based on role
    const getEditorName = (role: number) => {
      switch (role) {
        case 4001: return 'Doctor';
        case 4002: return 'Nurse';
        case 4003: return 'Pharmacist';
        case 4004: return 'Lab Technician';
        case 5001: return 'Hospital Admin';
        case 5002: return 'Hospital Staff';
        case 5003: return 'Super Admin';
        case 9999: return 'Admin'
        default: return 'System';
      }
    };

    // Format timestamp
    const formatEditTime = (timestamp: string) => {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }) + ' at ' + date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    };

    // Get action icon/color
    const getActionColor = (action: string) => {
      switch (action) {
        case 'edit': return COLORS.info;
        case 'approve': return COLORS.success;
        case 'reject': return COLORS.error;
        case 'create': return COLORS.primary;
        default: return COLORS.subText;
      }
    };
    const getActionLabel = (action: string) => {
      switch (action) {
        case 'create': return 'CREATE';
        case 'edit': return 'EDITED';
        case 'approve': return 'APPROVED';
        case 'reject': return 'REJECTED';
        default: return 'UPDATED';
      }
    };
    const getActionSubtitle = (action: string) => {
      switch (action) {
        case 'create':
          return 'Created commission';
        case 'edit':
          return 'Modified commission rate';
        case 'approve':
          return 'Approved commission';
        case 'reject':
          return 'Rejected commission';
        default:
          return 'Processed request';
      }
    };
    const getChangeLabel = (action: string) => {
      switch (action) {
        case 'create':
          return 'Added as :';
        case 'edit':
          return 'Changed to:';
        case 'approve':
          return 'Approved at:';
        default:
          return 'Changed to:';
      }
    };

    return (
      <View style={[styles.card, { borderColor: COLORS.border }]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Commission Agreement</Text>
          <View style={[styles.tagBadge, { backgroundColor: tagColor }]}>
            <Text style={styles.tagText}>{tagText}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          {/* Show hospital name if showing all hospitals */}
          {showAllHospitals && item?.hospitalName && (
            <View style={styles.hospitalRow}>
              <Text style={styles.hospitalLabel}>Hospital:</Text>
              <Text style={styles.hospitalName}>{item.hospitalName}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <View style={styles.infoSection}>
              <Text style={styles.fieldLabel}>Commission Rate</Text>
              <View style={styles.valueWithIcon}>
                <Text style={styles.infoValue}>{commissionRate}%</Text>
                {latestEdit && latestEdit.action === 'edit' && (
                  <View style={[styles.changeIndicator, { backgroundColor: getActionColor('edit') }]}>
                    <Text style={styles.changeIndicatorText}>
                      {latestEdit.commissionPercentage}%
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.fieldLabel}>Consultation Fee</Text>
              <Text style={styles.infoValue}>₹{consultationFee || '0'}</Text>
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
                backgroundColor: item?.approvalStatus === 'approved' ? COLORS.success :
                  item?.approvalStatus === 'pending' ? COLORS.warning :
                    COLORS.error
              }]}>
                <Text style={styles.statusText}>
                  {item?.approvalStatus?.toUpperCase() || 'UNKNOWN'}
                </Text>
              </View>
            </View>
          </View>

          {/* Show edit details if available */}
          {latestEdit && (
            <View style={styles.editDetailsSection}>
              <View style={styles.editHeader}>
                <View style={[styles.actionBadge, { backgroundColor: getActionColor(latestEdit.action) }]}>
                  <Text style={styles.actionBadgeText}>
                    {getActionLabel(latestEdit.action)}
                  </Text>

                </View>
                <Text style={styles.editTimestamp}>
                  {formatDateTime(latestEdit.timestamp)}
                </Text>
              </View>

              <View style={styles.editorInfo}>
                <View style={styles.editorAvatar}>
                  <Text style={styles.editorAvatarText}>
                    {getEditorName(latestEdit.role)?.charAt(0)}
                  </Text>
                </View>
                <View style={styles.editorDetails}>
                  <Text style={styles.editorName}>
                    {getEditorName(latestEdit.role)}
                  </Text>
                  <Text style={styles.editorRole}>
                    {getActionSubtitle(latestEdit.action)}
                  </Text>
                </View>
              </View>

              {latestEdit.commissionPercentage && (
                <View style={styles.changeDetails}>
                  <Text style={styles.changeLabel}>
                    {getChangeLabel(latestEdit.action)}
                  </Text>
                  <View style={styles.changeValueContainer}>
                    <Text style={styles.changeValue}>
                      {latestEdit.commissionPercentage}%
                    </Text>
                    {item?.commissionPercentage && latestEdit.commissionPercentage !== parseFloat(item.commissionPercentage) && (
                      <View style={styles.differenceIndicator}>
                        <Text style={styles.differenceText}>
                          {latestEdit.commissionPercentage > parseFloat(item.commissionPercentage) ? '↑' : '↓'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {latestEdit.reason && (
                <View style={styles.reasonSection}>
                  <Text style={styles.reasonLabel}>Reason:</Text>
                  <Text style={styles.reasonText}>{latestEdit.reason}</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.dateRow}>
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>Effective Date</Text>
              <Text style={styles.dateValue}>{formatDate(item?.startDate)}</Text>
            </View>
            {item?.endDate && (
              <View style={styles.dateItem}>
                <Text style={styles.dateLabel}>End Date</Text>
                <Text style={styles.dateValue}>{formatDate(item?.endDate)}</Text>
              </View>
            )}
          </View>

          {/* Show all actions if more than one */}
          {commissionHistory.length > 1 && (
            <TouchableOpacity
              style={styles.viewAllActionsButton}
              onPress={() => {
                setSelectedCommission(item);
                setShowCommissionModal(true);
              }}
            >
              <Text style={styles.viewAllActionsText}>
                View all {commissionHistory.length} actions
              </Text>
            </TouchableOpacity>
          )}

          <Text style={styles.updatedText}>
            Last updated: {formatDateTime(item?.updatedOn)}
          </Text>
        </View>
      </View>
    );
  };

  const renderCommissionModal = () => {
    const commissionHistoryList = selectedCommission ? parseHistory(selectedCommission.commissionHistory) : [];
    
    return (
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
                contentContainerStyle={{
                  paddingBottom: getSafeAreaInsets().bottom + responsiveHeight(6),
                }}
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
                  <Text style={styles.sectionTitle}>Commission History ({commissionHistoryList.length})</Text>
                  {commissionHistoryList.length > 0 ? (
                    commissionHistoryList.map((history: CommissionHistoryItem, index: number) => (
                      <View key={index} style={[
                        styles.historyItem,
                        { borderLeftColor: getActionColor(history.action), borderLeftWidth: 3 }
                      ]}>
                        <View style={styles.historyHeader}>
                          <View style={styles.historyByContainer}>
                            <Text style={styles.historyBy}>
                              {getEditorName(history.role)}
                            </Text>
                            <View style={[
                              styles.historyActionBadge,
                              { backgroundColor: getActionColor(history.action) }
                            ]}>
                              <Text style={styles.historyActionBadgeText}>
                                {history.action.toUpperCase()}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.historyTime}>
                            {formatDateTime(history.timestamp)}
                          </Text>
                        </View>
                        
                        <Text style={styles.historyAction}>
                          {getActionDescription(history)}
                        </Text>
                        
                        {/* Show old and new values for edit actions */}
                        {history.action === 'edit' && history.oldValue && history.newValue && (
                          <View style={styles.historyValueChange}>
                            <Text style={styles.historyValueChangeText}>
                              From: <Text style={styles.historyValueOld}>{history.oldValue}%</Text>
                            </Text>
                            <Text style={styles.historyValueChangeText}>
                              To: <Text style={styles.historyValueNew}>{history.newValue}%</Text>
                            </Text>
                          </View>
                        )}
                        
                        {/* Show commission value for create actions */}
                        {history.action === 'create' && history.commissionPercentage && (
                          <Text style={styles.historyValue}>
                            Commission: {history.commissionPercentage}%
                          </Text>
                        )}
                        
                        {history.reason && (
                          <Text style={styles.historyReason}>Reason: {history.reason}</Text>
                        )}
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noHistoryText}>No history available</Text>
                  )}
                </View>

                {selectedCommission?.doctorApproval === 0 && (
                  <>
                    <Text style={styles.editTitle}>Edit Commission Rate (%)</Text>
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
                        <Text style={styles.modalActionButtonText}>Update</Text>
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
  };

  const renderEmptyState = (message: string, subMessage: string) => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>{message}</Text>
      <Text style={styles.emptyStateText}>{subMessage}</Text>
    </View>
  );

  const safeAreaInsets = getSafeAreaInsets();
  const bottomPadding = hasNotch() ? safeAreaInsets.bottom : moderateScale(20);
  console.log("conmsole", selectedCommission)
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

      {/* NEW: Hospital Filter Toggle */}
      {activeCommissionTab === 'pending' && (
        <View style={styles.hospitalFilterContainer}>
          <Text style={styles.hospitalFilterText}>
            {showAllHospitals ? 'Showing commissions for all hospitals' : 'Showing commissions for current hospital only'}
          </Text>
          <TouchableOpacity
            style={styles.hospitalFilterButton}
            onPress={toggleShowAllHospitals}
            activeOpacity={0.7}
          >
            <Text style={styles.hospitalFilterButtonText}>
              {showAllHospitals ? 'Show Current Only' : 'View All'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

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
                showAllHospitals ? 'No Pending Commissions' : 'No Pending Commissions for Current Hospital',
                showAllHospitals ? 
                  'You don\'t have any pending commission proposals at any hospitals.' : 
                  'You don\'t have any pending commission proposals at the current hospital.'
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
                  showAllHospitals ? 'No Commission History' : 'No Commission History for Current Hospital',
                  showAllHospitals ? 
                    'You don\'t have any commission history yet.' : 
                    'You don\'t have any commission history for the current hospital.'
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

  // NEW: Hospital Filter Styles
  hospitalFilterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.card,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  hospitalFilterText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
    fontWeight: '600',
    color: COLORS.subText,
    flex: 1,
  },
  hospitalFilterButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: moderateScale(4),
    borderRadius: BORDER_RADIUS.sm,
    marginLeft: SPACING.sm,
  },
  hospitalFilterButtonText: {
    color: COLORS.card,
    fontSize: getResponsiveFontSize(FONT_SIZE.xs, { min: 9 }),
    fontWeight: '700',
  },
  hospitalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    paddingBottom: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  hospitalLabel: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs, { min: 9 }),
    fontWeight: '700',
    color: COLORS.subText,
    marginRight: moderateScale(4),
  },
  hospitalName: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
    fontWeight: '800',
    color: COLORS.text,
    flex: 1,
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
  // Add these to your styles object
  editActionSection: {
    marginVertical: SPACING.xs,
  },
  editActionBadge: {
    backgroundColor: COLORS.tagCommission,
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(4),
    borderRadius: BORDER_RADIUS.sm,
    alignSelf: 'flex-start',
    marginTop: moderateScale(2),
  },
  editActionText: {
    color: COLORS.card,
    fontSize: getResponsiveFontSize(FONT_SIZE.xs, { min: 8 }),
    fontWeight: '800',
  },
  editedByText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs, { min: 9 }),
    color: COLORS.subText,
    fontStyle: 'italic',
    marginBottom: moderateScale(4),
  },
  // Add these styles to your existing StyleSheet object

  // Value with icon
  valueWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(6),
  },
  changeIndicator: {
    paddingHorizontal: moderateScale(6),
    paddingVertical: moderateScale(2),
    borderRadius: BORDER_RADIUS.sm,
  },
  changeIndicatorText: {
    color: COLORS.card,
    fontSize: getResponsiveFontSize(FONT_SIZE.xs, { min: 8 }),
    fontWeight: '800',
  },

  // Edit Details Section
  editDetailsSection: {
    backgroundColor: COLORS.chip,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginVertical: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  actionBadge: {
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(4),
    borderRadius: BORDER_RADIUS.round,
  },
  actionBadgeText: {
    color: COLORS.card,
    fontSize: getResponsiveFontSize(FONT_SIZE.xs, { min: 8 }),
    fontWeight: '800',
  },
  editTimestamp: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs, { min: 9 }),
    color: COLORS.subText,
    fontWeight: '600',
  },

  // Editor Info
  editorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  editorAvatar: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editorAvatarText: {
    color: COLORS.card,
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    fontWeight: '800',
  },
  editorDetails: {
    flex: 1,
  },
  editorName: {
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: moderateScale(2),
  },
  editorRole: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs, { min: 9 }),
    color: COLORS.subText,
    fontWeight: '600',
  },

  // Change Details
  changeDetails: {
    marginBottom: SPACING.sm,
  },
  changeLabel: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs, { min: 9 }),
    color: COLORS.subText,
    fontWeight: '600',
    marginBottom: moderateScale(2),
  },
  changeValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  changeValue: {
    fontSize: getResponsiveFontSize(FONT_SIZE.lg),
    fontWeight: '800',
    color: COLORS.text,
  },
  differenceIndicator: {
    backgroundColor: COLORS.success,
    width: moderateScale(20),
    height: moderateScale(20),
    borderRadius: moderateScale(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  differenceText: {
    color: COLORS.card,
    fontSize: getResponsiveFontSize(FONT_SIZE.xs, { min: 8 }),
    fontWeight: '800',
  },

  // Reason Section
  reasonSection: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  reasonLabel: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs, { min: 9 }),
    color: COLORS.subText,
    fontWeight: '700',
    marginBottom: moderateScale(2),
  },
  reasonText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs, { min: 9 }),
    color: COLORS.text,
    fontWeight: '600',
    lineHeight: getResponsiveFontSize(FONT_SIZE.xs) * 1.4,
  },

  // Date Item
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs, { min: 9 }),
    color: COLORS.subText,
    fontWeight: '600',
    marginBottom: moderateScale(2),
  },
  dateValue: {
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    fontWeight: '700',
    color: COLORS.text,
  },

  // View All Actions Button
  viewAllActionsButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: moderateScale(8),
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  viewAllActionsText: {
    color: COLORS.primary,
    fontSize: getResponsiveFontSize(FONT_SIZE.xs),
    fontWeight: '700',
  },

  // Updated text with icon
  updatedText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs, { min: 9 }),
    color: COLORS.subText,
    fontStyle: 'italic',
    textAlign: 'right',
    marginTop: SPACING.xs,
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
    justifyContent: 'flex-end',
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

  // History Section in Modal - Updated Styles
  historySection: {
    marginBottom: SPACING.lg,
  },
  historyItem: {
    backgroundColor: COLORS.chip,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: moderateScale(4),
  },
  historyByContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flex: 1,
  },
  historyBy: {
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    fontWeight: '800',
    color: COLORS.text,
  },
  historyActionBadge: {
    paddingHorizontal: moderateScale(6),
    paddingVertical: moderateScale(2),
    borderRadius: BORDER_RADIUS.sm,
  },
  historyActionBadgeText: {
    color: COLORS.card,
    fontSize: getResponsiveFontSize(FONT_SIZE.xs, { min: 8 }),
    fontWeight: '800',
  },
  historyTime: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs, { min: 9 }),
    color: COLORS.subText,
    fontWeight: '600',
    textAlign: 'right',
  },
  historyAction: {
    fontSize: getResponsiveFontSize(FONT_SIZE.sm),
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  historyValueChange: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xs,
  },
  historyValueChangeText: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs, { min: 10 }),
    color: COLORS.subText,
    fontWeight: '600',
  },
  historyValueOld: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs, { min: 10 }),
    color: COLORS.error,
    fontWeight: '700',
    textDecorationLine: 'line-through',
  },
  historyValueNew: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs, { min: 10 }),
    color: COLORS.success,
    fontWeight: '700',
  },
  historyValue: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs, { min: 10 }),
    color: COLORS.primary,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  historyReason: {
    fontSize: getResponsiveFontSize(FONT_SIZE.xs, { min: 9 }),
    color: COLORS.subText,
    marginTop: moderateScale(2),
    fontStyle: 'italic',
    fontWeight: '600',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.xs,
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
    marginTop: SPACING.xs,
  },
  modalActionButton: {
    flex: 1,
    padding: SPACING.xs + 2,
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