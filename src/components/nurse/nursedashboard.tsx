import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  SafeAreaView,
  RefreshControl,
  Modal,
  Dimensions,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Utils
import { 
  formatDate, 
  formatTime,
  getCurrentDateFormatted 
} from '../../utils/dateTime';

// Responsive utilities
import {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  isTablet,
  isSmallDevice,
  isExtraSmallDevice,
  SPACING,
  FONT_SIZE,
  ICON_SIZE,
  FOOTER_HEIGHT,
  responsiveWidth,
  responsiveHeight,
  responsiveFontSize,
  moderateScale,
  verticalScale,
  horizontalScale,
} from '../../utils/responsive';

// SVG Icons
import {
  MenuIcon,
  LayoutDashboardIcon,
  UsersIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  CalendarClockIcon,
  ClockIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  UserPlusIcon,
  LogOutIcon,
  GridIcon,
  SettingsIcon,
  HelpCircleIcon,
  BellIcon,
  UserIcon,
  PlusIcon,
  UserMinusIcon,
} from '../../utils/SvgIcons';

// Custom Components
import MyTasks from '../../pages/nurseDashboard/MyTasks';
import Sidebar from './nurseSidebar';

// Types
import { RootState } from '../../store/store';
import { AuthFetch } from '../../auth/auth';
import { showError, showSuccess } from '../../store/toast.slice';
import Footer from '../dashboard/footer';

type DashboardCount = {
  activePatients?: number;
  dischargedPatients?: number;
  followUpPatients?: number;
  medicineAlerts?: number;
};

type AttendanceLogs = {
  leaveLogs?: number;
  presentLogs?: number;
};

type CurrentTime = {
  time12hr: string;
  isDaytime: boolean;
  dayName: string;
  date: string;
  month: string;
  year: string;
};

/* -------------------------- Confirm Dialog -------------------------- */
const ConfirmDialog: React.FC<{
  visible: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmText?: string;
}> = ({ visible, title, message, onCancel, onConfirm, confirmText = "Logout" }) => {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalMsg}>{message}</Text>
          <View style={styles.modalActions}>
            <TouchableOpacity onPress={onCancel} style={[styles.modalBtn, styles.modalBtnGhost]}>
              <Text style={[styles.modalBtnText, { color: "#1C7C6B" }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onConfirm} style={[styles.modalBtn, styles.modalBtnDanger]}>
              <Text style={[styles.modalBtnText, { color: "#fff" }]}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

/* -------------------------- Header -------------------------- */
const HeaderBar: React.FC<{ 
  title: string; 
  onMenu: () => void;
  onRefresh: () => void;
}> = ({ title, onMenu, onRefresh }) => {
  return (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <TouchableOpacity 
          onPress={onMenu} 
          style={styles.menuBtn}
          accessibilityLabel="Open menu"
          hitSlop={{ 
            top: SPACING.xs, 
            bottom: SPACING.xs, 
            left: SPACING.xs, 
            right: SPACING.xs 
          }}
        >
          <MenuIcon size={ICON_SIZE.lg} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit>
          {title}
        </Text>
      </View>
    </View>
  );
};

/* -------------------------- KPI Card -------------------------- */
const KpiCard: React.FC<{
  title: string;
  value: number | string | null | undefined;
  icon: React.ReactNode;
  bg: string;
  iconColor: string;
  onPress?: () => void;
}> = ({ title, value, icon, bg, iconColor, onPress }) => {
  const Container = onPress ? TouchableOpacity : View;
  
  return (
    <Container 
      style={[styles.kpiCard, { backgroundColor: bg }]} 
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.kpiCardContent}>
        <View style={styles.kpiCardInfo}>
          <Text style={styles.kpiCardValue}>{value ?? "—"}</Text>
          <Text style={styles.kpiCardLabel}>{title}</Text>
        </View>
        <View style={[styles.kpiCardIconWrap, { backgroundColor: `${iconColor}15` }]}>
          {icon}
        </View>
      </View>
    </Container>
  );
};

/* -------------------------- Main Component -------------------------- */
const NurseDashboard: React.FC = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const user = useSelector((state: RootState) => state.currentUser);
  const insets = useSafeAreaInsets();
  
  // State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLogs>({
    leaveLogs: 0,
    presentLogs: 0
  });
  const [dashboardCounts, setDashboardCounts] = useState<DashboardCount>({
    activePatients: 0,
    dischargedPatients: 0,
    followUpPatients: 0,
    medicineAlerts: 0,
  });
  const [currentTime, setCurrentTime] = useState<CurrentTime>({
    time12hr: '',
    isDaytime: true,
    dayName: '',
    date: '',
    month: '',
    year: ''
  });

  // Refs
  const fetchOnce = useRef(true);

  // Update time function using utils
  const updateAllTimeInfo = useCallback(() => {
    const now = new Date();
    const hours = now.getHours();
    const isDaytime = hours >= 6 && hours < 18;
    
    const formattedDate = formatDate(now);
    const [date, month, year] = formattedDate.split(' ');
    
    const time12hr = formatTime(now);
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];

    setCurrentTime({
      time12hr,
      isDaytime,
      dayName,
      date: date || '',
      month: month || '',
      year: year || ''
    });
  }, []);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        dispatch(showError('Not authorized. Please login again.'));
        navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] });
        return;
      }

      if (!user?.hospitalID) {
        dispatch(showError('Hospital information not found'));
        return;
      }

      setLoading(true);
      setRefreshing(true);

      let dashboardData: DashboardCount = {
        activePatients: 0,
        dischargedPatients: 0,
        followUpPatients: 0,
        medicineAlerts: 0,
      };

      let attendanceData: AttendanceLogs = {
        leaveLogs: 0,
        presentLogs: 0
      };

      // Fetch dashboard counts
      try {
        const dashboardResponse = await AuthFetch(
          `nurse/getnursedashboardcounts/${user?.hospitalID}/${user?.role}`,
          token
        ) as any;
        
        if (dashboardResponse?.data?.data) {
          dashboardData = dashboardResponse.data.data;
        } else {
          dispatch(showError("Dashboard data unavailable"));
        }
      } catch (dashboardErr: any) {
        dispatch(showError(dashboardErr?.response?.data?.message || 'Failed to fetch dashboard data'));
      }

      // Fetch attendance logs (for head nurse only)
      if (user?.role === 2002) {
        try {
          const attendanceResponse = await AuthFetch(
            `nurse/getattendancelogs/${user?.hospitalID}/${user?.departmentID}`,
            token
          ) as any;
          if (attendanceResponse?.data?.data) {
            attendanceData = attendanceResponse.data.data;
          }
        } catch (attendanceErr: any) {
          dispatch(showError(attendanceErr?.response?.data?.message || 'Failed to fetch attendance data'));
        }
      }

      setDashboardCounts(dashboardData);
      setAttendanceLogs(attendanceData);
    } catch (err: any) {
      dispatch(showError(err?.response?.data?.message || 'Failed to fetch dashboard data'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, dispatch, navigation]);

  // Handle refresh
  const onRefresh = useCallback(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Initialize
  useFocusEffect(
    useCallback(() => {
      updateAllTimeInfo();
      
      if (fetchOnce.current) {
        fetchOnce.current = false;
        fetchDashboardData();
      }

      // Update time every minute
      const timeInterval = setInterval(updateAllTimeInfo, 60000);
      return () => clearInterval(timeInterval);
    }, [updateAllTimeInfo, fetchDashboardData])
  );

  // Calculations
  const totalStaff = (attendanceLogs?.presentLogs || 0) + (attendanceLogs?.leaveLogs || 0);
  const presentPercentage = totalStaff > 0 ? Math.round(((attendanceLogs?.presentLogs || 0) / totalStaff) * 100) : 0;
  const absentPercentage = totalStaff > 0 ? Math.round(((attendanceLogs?.leaveLogs || 0) / totalStaff) * 100) : 0;

  // Navigation handlers
  const handleCardClick = (type: string) => {
    navigation.navigate('NursePatientListScreen', { type });
  };

  const handleAttendanceClick = (attendanceType: 'present' | 'leave') => {
    navigation.navigate('Attendance', { type: attendanceType });
  };

  const handleLogout = async () => {
    setConfirmVisible(false);
    setSidebarOpen(false);
    try {
      await AsyncStorage.multiRemove(['token', 'userID']);
    } catch (e) {
      // Silent error handling
    } finally {
      navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] });
    }
  };

  const confirmLogout = () => setConfirmVisible(true);

  // Sidebar items
  const sidebarItems = [
    { 
      key: 'dashboard', 
      label: 'Dashboard', 
      icon: LayoutDashboardIcon, 
      onPress: () => setSidebarOpen(false) 
    },
    { 
      key: 'patients', 
      label: 'Patients List', 
      icon: UsersIcon, 
      onPress: () => navigation.navigate('nursePatientList') 
    },
    { 
      key: 'alerts', 
      label: 'Medicine Alerts', 
      icon: BellIcon, 
      onPress: () => navigation.navigate('NurseAlerts') 
    },
    { 
      key: 'settings', 
      label: 'Settings', 
      icon: SettingsIcon, 
      onPress: () => navigation.navigate('Settings') 
    },
    { 
      key: 'help', 
      label: 'Help', 
      icon: HelpCircleIcon, 
      onPress: () => navigation.navigate('HelpScreen') 
    },
  ];

  const bottomItems = [

    { 
      key: 'logout', 
      label: 'Logout', 
      icon: LogOutIcon, 
      onPress: confirmLogout, 
      variant: 'danger' as const 
    },
  ];
const dashboardTitle =
  user?.role === 2002 ? 'Head Nurse Dashboard' : 'Nurse Dashboard';

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#14b8a6" />
<HeaderBar 
  title={dashboardTitle}
  onMenu={() => setSidebarOpen(true)} 
  onRefresh={onRefresh}
/>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#14b8a6" />
          <Text style={styles.loadingText}>Loading Dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#14b8a6" />
      
      {/* Header */}
<HeaderBar 
  title={dashboardTitle}
  onMenu={() => setSidebarOpen(true)} 
  onRefresh={onRefresh}
/>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.containerContent,
          { 
            paddingBottom: FOOTER_HEIGHT + (insets.bottom > 0 ? insets.bottom + SPACING.md : SPACING.md),
            minHeight: SCREEN_HEIGHT - (isSmallDevice ? 120 : 160)
          }
        ]}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#14b8a6']}
            tintColor="#14b8a6"
          />
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>
            Good {currentTime?.isDaytime ? 'Morning' : 'Evening'}, {user?.firstName ? user.firstName : 'User'}
          </Text>
          <Text style={styles.welcomeSubtitle}>Welcome to your nursing dashboard</Text>
        </View>

        {/* Statistics Grid */}
        <View style={styles.statsContainer}>
          {/* Top row - Two cards side by side */}
          <View style={styles.topRow}>
            <KpiCard 
              title="Active Patients" 
              value={dashboardCounts?.activePatients || 0} 
              icon={<UsersIcon size={ICON_SIZE.md} color="#14b8a6" />} 
              bg="#ffffff"
              iconColor="#14b8a6"
              onPress={() => handleCardClick('active')}
            />
            <KpiCard 
              title="Medicine Alerts" 
              value={dashboardCounts?.medicineAlerts || 0} 
              icon={<AlertTriangleIcon size={ICON_SIZE.md} color="#D97706" />} 
              bg="#ffffff"
              iconColor="#D97706"
              onPress={() => handleCardClick('medicineAlerts')}
            />
          </View>
          
          {/* Bottom row - Two cards side by side */}
          <View style={styles.bottomRow}>
            <KpiCard 
              title="Discharged Patients" 
              value={dashboardCounts?.dischargedPatients || 0} 
              icon={<CheckCircleIcon size={ICON_SIZE.md} color="#10B981" />} 
              bg="#ffffff"
              iconColor="#10B981"
              onPress={() => handleCardClick('discharged')}
            />
            <KpiCard 
              title="Follow Up List" 
              value={dashboardCounts?.followUpPatients || 0} 
              icon={<CalendarClockIcon size={ICON_SIZE.md} color="#EA580C" />} 
              bg="#ffffff"
              iconColor="#EA580C"
              onPress={() => handleCardClick('followup')}
            />
          </View>
        </View>

        {/* Attendance Section (Head Nurse Only) */}
        {user?.role === 2002 && totalStaff > 0 && (
          <View style={styles.attendanceSection}>
            <Text style={styles.sectionTitle}>Attendance Overview</Text>
            
            <View style={styles.attendanceDashboard}>
              <View style={styles.attendanceHeader}>
                <View style={styles.attendanceTitle}>
                  <UserPlusIcon size={ICON_SIZE.sm} color="#14b8a6" />
                  <Text style={styles.attendanceTitleText}>Staff Attendance</Text>
                </View>
                <View style={styles.attendanceTotal}>
                  <Text style={styles.totalLabel}>Total Staff:</Text>
                  <Text style={styles.totalValue}>{totalStaff}</Text>
                </View>
              </View>
              
              <View style={styles.attendanceGrid}>
                {/* Present Staff */}
                <TouchableOpacity 
                  style={styles.attendanceItem}
                  onPress={() => handleAttendanceClick('present')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.attendanceIconWrapper, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                    <TrendingUpIcon size={ICON_SIZE.sm} color="#10B981" />
                  </View>
                  <View style={styles.attendanceContent}>
                    <View style={styles.attendanceMain}>
                      <Text style={styles.attendanceValue}>{attendanceLogs?.presentLogs || 0}</Text>
                      <Text style={styles.attendanceLabel}>Present</Text>
                    </View>
                    <View style={styles.attendanceProgress}>
                      <View style={styles.progressBar}>
                        <View 
                          style={[styles.progressFillPresent, { width: `${presentPercentage}%` }]} 
                        />
                      </View>
                      <Text style={styles.percentage}>{presentPercentage}%</Text>
                    </View>
                  </View>
                </TouchableOpacity>
                
                {/* Leave Staff */}
                <TouchableOpacity 
                  style={styles.attendanceItem}
                  onPress={() => handleAttendanceClick('leave')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.attendanceIconWrapper, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                    <TrendingDownIcon size={ICON_SIZE.sm} color="#EF4444" />
                  </View>
                  <View style={styles.attendanceContent}>
                    <View style={styles.attendanceMain}>
                      <Text style={styles.attendanceValue}>{attendanceLogs?.leaveLogs || 0}</Text>
                      <Text style={styles.attendanceLabel}>Absent</Text>
                    </View>
                    <View style={styles.attendanceProgress}>
                      <View style={styles.progressBar}>
                        <View 
                          style={[styles.progressFillAbsent, { width: `${absentPercentage}%` }]} 
                        />
                      </View>
                      <Text style={styles.percentage}>{absentPercentage}%</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
              
              <View style={styles.attendanceFooter}>
                <View style={styles.footerStat}>
                  <Text style={styles.footerLabel}>Attendance Rate</Text>
                  <Text style={styles.footerValue}>{presentPercentage}%</Text>
                </View>
                <View style={styles.footerDivider} />
                <View style={styles.footerStat}>
                  <Text style={styles.footerLabel}>Coverage Status</Text>
                  <Text style={[
                    styles.footerValue,
                    presentPercentage >= 80 ? styles.statusGood : styles.statusWarning
                  ]}>
                    {presentPercentage >= 80 ? 'Good' : 'Needs Attention'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* My Tasks Section */}
        <MyTasks />
        
        {/* Bottom padding for safe area */}
        <View style={styles.bottomPadding} />
      </ScrollView>
      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={"dashboard"} brandColor="#14b8a6" />
      </View>
      
      {insets.bottom > 0 && (
        <View pointerEvents="none" style={[styles.navShield, { height: insets.bottom }]} />
      )}

      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userName={`${user?.firstName || ''} ${user?.lastName || ''}`}
        userImage={user?.avatarUrl || user?.profileImage || user?.imageURL}
        onProfile={() => {
          setSidebarOpen(false);
          navigation.navigate('nurseProfile');
        }}
        items={sidebarItems}
        bottomItems={bottomItems}
        onAlertPress={() => navigation.navigate('NurseAlerts')}
      />

      {/* Logout Confirm Dialog */}
      <ConfirmDialog
        visible={confirmVisible}
        title="Confirm Logout"
        message="Are you sure you want to logout? This will clear your saved session."
        onCancel={() => setConfirmVisible(false)}
        onConfirm={handleLogout}
        confirmText="Logout"
      />
    </SafeAreaView>
  );
};

export default NurseDashboard;

/* -------------------------- Styles -------------------------- */
const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: "#fff" 
  },
  header: {
    height: Platform.OS === 'ios' 
      ? (isExtraSmallDevice ? 90 : isSmallDevice ? 100 : 110)
      : (isExtraSmallDevice ? 70 : isSmallDevice ? 80 : 90),
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#14b8a6",
    paddingTop: Platform.OS === 'ios' 
      ? (isExtraSmallDevice ? 30 : 40) 
      : (isExtraSmallDevice ? 15 : 20),
    justifyContent: 'center',
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: '100%',
  },
  headerTitle: { 
    fontSize: responsiveFontSize(16),
    fontWeight: "700", 
    color: "#fff",
    flex: 1,
    textAlign: 'center',
  },
  menuBtn: {
    width: ICON_SIZE.lg + SPACING.xs,
    height: ICON_SIZE.lg + SPACING.xs,
    borderRadius: SPACING.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  refreshText: {
    fontSize: responsiveFontSize(14),
    color: "#fff",
    fontWeight: "bold",
  },
  container: { 
    flex: 1, 
    backgroundColor: "#f8fafc" 
  },
  containerContent: { 
    padding: SPACING.sm, 
    gap: SPACING.md 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingBottom: SCREEN_HEIGHT * 0.1,
  },
  loadingText: {
    marginTop: SPACING.sm,
    fontSize: responsiveFontSize(14),
    color: "#14b8a6",
    fontWeight: "600",
  },
  welcomeSection: {
    marginBottom: SPACING.sm,
  },
  welcomeTitle: {
    fontSize: responsiveFontSize(18),
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: SPACING.xs,
  },
  welcomeSubtitle: {
    fontSize: responsiveFontSize(13),
    color: "#64748b",
    opacity: 0.9,
  },
  timeCard: {
    backgroundColor: "#fff",
    borderRadius: SPACING.md,
    padding: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: SPACING.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  timeContent: {
    flex: 1,
  },
  timeMain: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  timeText: {
    fontSize: responsiveFontSize(18),
    fontWeight: "700",
    color: "#14b8a6",
    marginRight: SPACING.xs,
  },
  sunIcon: {
    fontSize: responsiveFontSize(16),
  },
  moonIcon: {
    fontSize: responsiveFontSize(16),
  },
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e2e8f0",
    zIndex: 10,
    elevation: 6,
  },
  navShield: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    zIndex: 9,
  },
  dateInfo: {
    flexDirection: SCREEN_WIDTH < 375 ? "column" : "row",
    gap: SCREEN_WIDTH < 375 ? SPACING.xs : SPACING.sm,
    flexWrap: "wrap",
  },
  dateItem: {
    fontSize: responsiveFontSize(11),
    fontWeight: "500",
    color: "#64748b",
  },
  clockIcon: {
    marginLeft: SPACING.sm,
  },
  statsContainer: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  topRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    justifyContent: "space-between",
  },
  bottomRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    justifyContent: "space-between",
  },
  kpiCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: SPACING.md,
    borderRadius: SPACING.md,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    minHeight: responsiveHeight(10),
  },
  kpiCardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flex: 1,
  },
  kpiCardInfo: {
    flex: 1,
  },
  kpiCardValue: {
    fontSize: responsiveFontSize(22),
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: SPACING.xs,
  },
  kpiCardLabel: {
    fontSize: responsiveFontSize(12),
    fontWeight: "600",
    color: "#64748b",
  },
  kpiCardIconWrap: {
    width: ICON_SIZE.lg + SPACING.sm,
    height: ICON_SIZE.lg + SPACING.sm,
    borderRadius: SPACING.sm,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: SPACING.xs,
  },
  controlPanel: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "flex-end",
    marginBottom: SPACING.md,
  },
  primaryBtn: {
    backgroundColor: "#14b8a6",
    height: isExtraSmallDevice ? 40 : 44,
    borderRadius: SPACING.sm,
    paddingHorizontal: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    minWidth: SCREEN_WIDTH * 0.4,
    maxWidth: SCREEN_WIDTH * 0.6,
    justifyContent: 'center',
    shadowColor: "#14b8a6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryBtnText: { 
    color: "#fff", 
    fontWeight: "700", 
    fontSize: responsiveFontSize(13)
  },
  attendanceSection: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: responsiveFontSize(15),
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: SPACING.md,
  },
  attendanceDashboard: {
    backgroundColor: "#fff",
    borderRadius: SPACING.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  attendanceHeader: {
    flexDirection: SCREEN_WIDTH < 375 ? "column" : "row",
    justifyContent: "space-between",
    alignItems: SCREEN_WIDTH < 375 ? "flex-start" : "center",
    marginBottom: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    gap: SCREEN_WIDTH < 375 ? SPACING.xs : 0,
  },
  attendanceTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  attendanceTitleText: {
    fontSize: responsiveFontSize(14),
    fontWeight: "600",
    color: "#1e293b",
  },
  attendanceTotal: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  totalLabel: {
    fontSize: responsiveFontSize(12),
    color: "#64748b",
    fontWeight: "500",
  },
  totalValue: {
    fontSize: responsiveFontSize(12),
    fontWeight: "700",
    color: "#1e293b",
    backgroundColor: "rgba(20, 184, 166, 0.1)",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: SPACING.xs,
  },
  attendanceGrid: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  attendanceItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: SPACING.sm,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    minHeight: responsiveHeight(8),
  },
  attendanceIconWrapper: {
    width: ICON_SIZE.lg,
    height: ICON_SIZE.lg,
    borderRadius: SPACING.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  attendanceContent: {
    flex: 1,
  },
  attendanceMain: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  attendanceValue: {
    fontSize: responsiveFontSize(18),
    fontWeight: "700",
    color: "#1e293b",
  },
  attendanceLabel: {
    fontSize: responsiveFontSize(12),
    fontWeight: "500",
    color: "#64748b",
  },
  attendanceProgress: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: "#e2e8f0",
    borderRadius: SPACING.xs,
    overflow: "hidden",
  },
  progressFillPresent: {
    height: "100%",
    backgroundColor: "#10B981",
    borderRadius: SPACING.xs,
  },
  progressFillAbsent: {
    height: "100%",
    backgroundColor: "#EF4444",
    borderRadius: SPACING.xs,
  },
  percentage: {
    fontSize: responsiveFontSize(12),
    fontWeight: "600",
    color: "#1e293b",
    minWidth: responsiveWidth(10),
    textAlign: "right",
  },
  attendanceFooter: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  footerStat: {
    alignItems: "center",
    flex: 1,
  },
  footerLabel: {
    fontSize: responsiveFontSize(11),
    fontWeight: "500",
    color: "#64748b",
    marginBottom: SPACING.xs,
  },
  footerValue: {
    fontSize: responsiveFontSize(14),
    fontWeight: "700",
    color: "#1e293b",
  },
  statusGood: {
    color: "#10B981",
  },
  statusWarning: {
    color: "#F59E0B",
  },
  footerDivider: {
    width: 1,
    height: responsiveHeight(3),
    backgroundColor: "#e2e8f0",
  },
  bottomPadding: {
    height: responsiveHeight(4),
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.lg,
  },
  modalCard: {
    width: SCREEN_WIDTH * 0.85,
    maxWidth: 380,
    backgroundColor: "#fff",
    borderRadius: SPACING.md,
    padding: SPACING.md,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  modalTitle: { 
    fontSize: responsiveFontSize(15), 
    fontWeight: "800", 
    color: "#0b1220",
    marginBottom: SPACING.xs,
  },
  modalMsg: { 
    fontSize: responsiveFontSize(13), 
    color: "#334155", 
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: SPACING.sm,
  },
  modalBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: SPACING.xs,
    minWidth: SCREEN_WIDTH * 0.2,
    alignItems: 'center',
  },
  modalBtnGhost: {
    backgroundColor: "#f1f5f9",
  },
  modalBtnDanger: {
    backgroundColor: "#ef4444",
  },
  modalBtnText: {
    fontWeight: "700",
    fontSize: responsiveFontSize(13),
  },
});