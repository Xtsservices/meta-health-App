// components/CriticalCare/sidebar.tsx
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  ScrollView,
  Platform,
} from "react-native";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthFetch } from "../../auth/auth";

// Import custom SVG icons
import {
  XIcon,
  BellIcon,
} from "../../utils/SvgIcons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export type SidebarItem = {
  key: string;
  label: string;
  icon: React.ElementType;
  onPress: () => void;
  variant?: "default" | "danger" | "muted";
  isAlert?: boolean;
  alertCount?: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  userName?: string;
  userImage?: string;
  onProfile: () => void;
  items: SidebarItem[];
  bottomItems: SidebarItem[];
  width?: number;
};

/* -------------------------- Sidebar Button Component -------------------------- */
const SidebarButton: React.FC<{
  item: SidebarItem;
  isActive?: boolean;
  onPress: () => void;
}> = ({ item, isActive = false, onPress }) => {
  const Icon = item.icon;
  const color = item.variant === "danger" ? "#b91c1c" : 
                item.variant === "muted" ? "#475569" : 
                isActive ? "#14b8a6" : "#0b1220";

  return (
    <TouchableOpacity
      style={[
        styles.sidebarButton,
        isActive && styles.sidebarButtonActive,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.buttonContent}>
        <Icon size={20} color={color} />
        <Text style={[styles.buttonText, { color }]}>{item.label}</Text>
        {item.isAlert && (item.alertCount ?? 0) > 0 && (
          <View style={styles.alertBadge}>
            <Text style={styles.alertText}>{item.alertCount}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

/* -------------------------- Avatar Component -------------------------- */
const Avatar: React.FC<{ name?: string; uri?: string; size?: number }> = ({
  name = "",
  uri,
  size = 46,
}) => {
  const initial = (name || "").trim().charAt(0).toUpperCase() || "U";
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        resizeMode="cover"
      />
    );
  }
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={styles.avatarText}>{initial}</Text>
    </View>
  );
};

/* -------------------------- Main Sidebar Component -------------------------- */
const CriticalCareSidebar: React.FC<Props> = ({
  open,
  onClose,
  userName,
  userImage,
  onProfile,
  items,
  bottomItems,
  width = Math.min(320, SCREEN_WIDTH * 0.82),
}) => {
  const user = useSelector((state: RootState) => state.currentUser);
  const slide = useRef(new Animated.Value(-width)).current;
  const [alertCount, setAlertCount] = React.useState(0);

  // Fetch alert count
  const getAlertCount = async () => {
    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      if (!user?.hospitalID || !token) return;

      const response = await AuthFetch(
        `alerts/hospital/${user.hospitalID}/unseenCount`,
        token
      );

      if (response?.status === "success" &&"data" in response && response?.data?.message === "success") {
        setAlertCount(response.data.count || 0);
      } else if (response?.message === "success") {
        setAlertCount(response?.count || 0);
      }
    } catch (error) {
      // console.error("Error fetching alert count");
    }
  };

  useEffect(() => {
    if (user?.hospitalID && user?.token) {
      getAlertCount();
    }
  }, [user?.hospitalID, user?.token]);

  useEffect(() => {
    Animated.timing(slide, {
      toValue: open ? 0 : -width,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [open, slide, width]);

  // Group items by section for better organization
  const overviewItems = items?.filter(item => 
    item.key === "dash"
  ) ?? [];
  
  const patientManagementItems = items?.filter(item => 
    ["plist", "addp", "discharge"].includes(item.key)
  ) ?? [];
  
  const operationsItems = items?.filter(item => 
    item.key === "revenue" ||item.key === "mgmt" || item.key === "commission"
  ) ?? [];
  
  const supportItems = items?.filter(item => 
    item.key === "help"
  ) ?? [];

  // Add alert item to patient management
  const alertItem: SidebarItem = {
    key: "alerts",
    label: "Alerts",
    icon: BellIcon,
    onPress: () => {
      onClose();
      // Navigate to alerts - implement as needed
    },
    isAlert: true,
    alertCount: alertCount,
  };

  return (
    <Modal transparent visible={open} animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <Animated.View style={[styles.sidebarContainer, { width, transform: [{ translateX: slide }] }]}>
       
        {/* Header */}
        <View style={styles.sidebarHeader}>
           <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <XIcon size={24} color="#0b1220" />
          </TouchableOpacity>

          {/* User Profile Section */}
          <TouchableOpacity style={styles.userProfileSection} onPress={onProfile}>
            <Avatar name={userName} uri={userImage} size={50} />
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>
                Dr. {userName || "User"}
              </Text>
              <Text style={styles.userMetaId}>
                Meta Health ID: {user?.id || "N/A"}
              </Text>
              <Text style={[styles.userDepartment, { color: "#14b8a6" }]}>
                Emergency - Critical
              </Text>
    
            {/* Add View Profile link here */}
            <Text style={styles.viewProfileText}>
              View Profile
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Navigation Sections */}
        <ScrollView style={styles.sidebarContent} showsVerticalScrollIndicator={false}>
          
          {/* Overview Section */}
          {overviewItems?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Overview</Text>
              {overviewItems?.map((item) => (
                <SidebarButton
                  key={item.key}
                  item={item}
                  onPress={() => {
                    onClose();
                    item.onPress();
                  }}
                />
              ))}
            </View>
          )}

          {/* Patient Management Section */}
          {(patientManagementItems?.length > 0 || alertCount > 0) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Patient Management</Text>
              {patientManagementItems?.map((item) => (
                <SidebarButton
                  key={item.key}
                  item={item}
                  onPress={() => {
                    onClose();
                    item.onPress();
                  }}
                />
              ))}
              {/* <SidebarButton
                key={alertItem.key}
                item={alertItem}
                onPress={alertItem.onPress}
              /> */}
            </View>
          )}

          {/* Operations Section */}
          {operationsItems?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Operations</Text>
              {operationsItems?.map((item) => (
                <SidebarButton
                  key={item.key}
                  item={item}
                  onPress={() => {
                    onClose();
                    item.onPress();
                  }}
                />
              ))}
            </View>
          )}

          {/* Support Section */}
          {supportItems?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Support</Text>
              {supportItems?.map((item) => (
                <SidebarButton
                  key={item.key}
                  item={item}
                  onPress={() => {
                    onClose();
                    item.onPress();
                  }}
                />
              ))}
            </View>
          )}
        </ScrollView>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          {bottomItems?.map((item) => (
            <TouchableOpacity 
              key={item.key}
              style={[
                styles.bottomButton,
                item.variant === "danger" ? styles.logoutButton : styles.modulesButton
              ]}
              onPress={() => {
                onClose();
                item.onPress();
              }}
            >
              <item.icon size={20} color={item.variant === "danger" ? "#b91c1c" : "#14b8a6"} />
              <Text style={[
                styles.bottomButtonText,
                { color: item.variant === "danger" ? "#b91c1c" : "#14b8a6" }
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </Modal>
  );
};

export default CriticalCareSidebar;

/* -------------------------- Styles -------------------------- */
const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  sidebarContainer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#fff",
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 16,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 2, height: 0 },
  },
  sidebarHeader: {
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    marginBottom: 16,
    flexDirection: "row",       // 👈 add
  alignItems: "center",       // 👈 add
  position: "relative",
  },
  closeButton: {
    position: "absolute",
    right: 0,
    top: -10,
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
    zIndex: 10,   
  },
  userProfileSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 50,
    flex: 1, 
  },
  userInfo: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0b1220",
    marginBottom: 2,
  },
  userMetaId: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 2,
  },
  userDepartment: {
    fontSize: 12,
    fontWeight: "600",
  },
  sidebarContent: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    
  },
    viewProfileText: {
    fontSize: 12,
    color: "#007AFF", // iOS blue link color
    fontStyle: "italic",
    textDecorationLine: "underline",
    marginTop: 4,
  },
  sidebarButton: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  sidebarButtonActive: {
    backgroundColor: "#fef2f2",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  alertBadge: {
    backgroundColor: "#ef4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  alertText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  bottomActions: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    gap: 8,
  },
  bottomButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  modulesButton: {
    backgroundColor: "#f0fdfa",
  },
  logoutButton: {
    backgroundColor: "#fef2f2",
  },
  bottomButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  avatar: {
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontWeight: "800",
    color: "#0b1220",
    fontSize: 16,
  },
});