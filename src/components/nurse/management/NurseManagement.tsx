import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Modal,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootState } from '../../../store/store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// SVG Icons
import {
  MenuIcon,
  UsersIcon,
  CalendarIcon,
  ClockIcon,
  ChevronRight,
  BuildingIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
  SearchIcon,
  FilterIcon,
  EditIcon,
  TrashIcon,
  MoreVerticalIcon,
  DownloadIcon,
  BellIcon,
  HomeIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  HelpCircleIcon,
  LogOutIcon,
  GridIcon,
} from '../../../utils/SvgIcons';
import ShiftManagementScreen from './ShiftManagement';
import LeaveManagementScreen from './LeaveManagement';
import MyScheduleScreen from './MySchedule';

// Import responsive utilities
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
  responsiveHeight,
  responsiveWidth,
} from '../../../utils/responsive';
import Footer from '../../dashboard/footer';

// Import Footer component

const { width, height } = Dimensions.get("window");

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: "#fff" 
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
    backgroundColor: "#f8fafc",
    paddingBottom: SCREEN_HEIGHT * 0.1,
  },
  loadingText: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZE.md,
    color: "#14b8a6",
    fontWeight: "600",
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
    fontSize: FONT_SIZE.xxl,
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
  
  // Tabs styling
  tabsWrapper: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  tabsContainer: {
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 12,
  },
  tabsRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  tabButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  tabButtonActive: {
    zIndex: 10,
  },
  tabInner: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabInnerActive: {
    backgroundColor: "#14b8a6",
    borderColor: "#14b8a6",
    shadowColor: "#14b8a6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    transform: [{ scale: 1.02 }],
  },
  tabContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
    letterSpacing: 0.2,
    fontFamily: "Inter-SemiBold",
  },
  tabButtonTextActive: {
    color: "#ffffff",
    fontWeight: "700",
    fontFamily: "Inter-Bold",
  },
  
  scroll: { 
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
  },
  
  // Footer styles
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
  
  // Modal styles
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
    fontSize: FONT_SIZE.lg, 
    fontWeight: "800", 
    color: "#0b1220",
    marginBottom: SPACING.xs,
  },
  modalMsg: { 
    fontSize: FONT_SIZE.sm, 
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
    fontSize: FONT_SIZE.sm,
  },
});

type TabKey = "NurseManagement" | "LeaveManagement" | "MySchedule";

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
}> = ({ title, onMenu }) => {
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
        <View style={styles.menuBtn} />
      </View>
    </View>
  );
};

const TabButton: React.FC<{
  tab: TabKey;
  label: string;
  isActive: boolean;
  onPress: () => void;
}> = ({ tab, label, isActive, onPress }) => {
  const iconColor = isActive ? "#ffffff" : "#9ca3af";

  return (
    <TouchableOpacity
      key={tab}
      style={[
        styles.tabButton,
        isActive && styles.tabButtonActive,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.tabInner,
          isActive && styles.tabInnerActive,
        ]}
      >
        <View style={styles.tabContent}>
          <Text
            style={[
              styles.tabButtonText,
              isActive && styles.tabButtonTextActive,
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const NurseManagement: React.FC = () => {
  const navigation = useNavigation();
  const user = useSelector((state: RootState) => state.currentUser);
  const insets = useSafeAreaInsets();
  
  const [activeTab, setActiveTab] = useState<TabKey>(
    user?.role === 2002 ? "NurseManagement" : "MySchedule"
  );
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const getHeaderTitle = () => {
    switch (activeTab) {
      case "NurseManagement":
        return "Nurse Management";
      case "LeaveManagement":
        return "Leave Management";
      case "MySchedule":
        return "My Schedule";
      default:
        return "Nurse Management";
    }
  };

  const getActiveTabForFooter = (): "dashboard" | "addPatient" | "patients" | "management" => {
    // Since this is NurseManagement screen, the active tab in footer should be "management"
    return "management";
  };

  useFocusEffect(
    useCallback(() => {
      // Reset tab based on role when screen comes into focus
      if (user?.role === 2002) {
        setActiveTab("NurseManagement");
      } else {
        setActiveTab("MySchedule");
      }
    }, [user?.role])
  );

  const handleLogout = async () => {
    setConfirmVisible(false);
    try {
      await AsyncStorage.multiRemove(['token', 'userID']);
    } catch (e) {
      // Silent error handling
    } finally {
      navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] });
    }
  };

  const confirmLogout = () => setConfirmVisible(true);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#14b8a6" />
          <Text style={styles.loadingText}>Loading Management...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#14b8a6" />
      
      {/* Tabs */}
      <View style={styles.tabsWrapper}>
        <View style={styles.tabsContainer}>
          <View style={styles.tabsRow}>
            {user?.role === 2002 && (
              <>
                <TabButton
                  tab="NurseManagement"
                  label="Nurse Management"
                  isActive={activeTab === "NurseManagement"}
                  onPress={() => setActiveTab("NurseManagement")}
                />
                <TabButton
                  tab="LeaveManagement"
                  label="Leave Management"
                  isActive={activeTab === "LeaveManagement"}
                  onPress={() => setActiveTab("LeaveManagement")}
                />
              </>
            )}
          </View>
          <View style={styles.tabsRow}>
            <TabButton
              tab="MySchedule"
              label="My Schedule"
              isActive={activeTab === "MySchedule"}
              onPress={() => setActiveTab("MySchedule")}
            />

            {user?.role === 2002 && (
              <View style={styles.tabButton} />
            )}
          </View>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
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
        {activeTab === "NurseManagement" && <ShiftManagementScreen />}
        {activeTab === "LeaveManagement" && <LeaveManagementScreen />}
        {activeTab === "MySchedule" && <MyScheduleScreen />}
        
        {/* Bottom padding for safe area */}
        <View style={{ height: responsiveHeight(4) }} />
      </ScrollView>
      
      {/* Footer */}
      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={getActiveTabForFooter()} brandColor="#14b8a6" />
      </View>
      
      {insets.bottom > 0 && (
        <View pointerEvents="none" style={[styles.navShield, { height: insets.bottom }]} />
      )}

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

export default NurseManagement;