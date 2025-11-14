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
import {
  X as CloseIcon,
  User as UserIcon,
  LogOut,
  Grid,
  HelpCircle,
} from "lucide-react-native";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";

const { width: W, height: H } = Dimensions.get("window");
const isSmallScreen = W < 375;

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
        <Icon size={isSmallScreen ? 18 : 20} color={color} />
        <Text style={[styles.buttonText, { color }]}>{item.label}</Text>
        {item.isAlert && item.alertCount !== undefined && item.alertCount > 0 && (
          <View style={styles.alertBadge}>
            <Text style={styles.alertText}>{item.alertCount}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const Avatar: React.FC<{ name?: string; uri?: string; size?: number }> = ({
  name = "",
  uri,
  size = isSmallScreen ? 40 : 46,
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

const Sidebar: React.FC<Props> = ({
  open,
  onClose,
  userName,
  userImage,
  onProfile,
  items,
  bottomItems,
  width = Math.min(isSmallScreen ? 280 : 320, W * 0.82),
}) => {
  const user = useSelector((state: RootState) => state.currentUser);
  const slide = useRef(new Animated.Value(-width)).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: open ? 0 : -width,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [open, slide, width]);

  const userInitials = `${user?.firstName?.charAt(0) || ""}${user?.lastName?.charAt(0) || ""}`.toUpperCase();

  return (
    <Modal transparent visible={open} animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <Animated.View style={[styles.sidebarContainer, { width, transform: [{ translateX: slide }] }]}>
        
        <View style={styles.sidebarHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <CloseIcon size={isSmallScreen ? 20 : 24} color="#0b1220" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.userProfileSection} onPress={onProfile}>
            <Avatar name={userName} uri={userImage} size={isSmallScreen ? 44 : 50} />
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>
                {userName || "User"}
              </Text>
              <Text style={styles.userMetaId}>
                Meta Health ID: {user?.id || "N/A"}
              </Text>
              <Text style={styles.userDepartment}>Reception</Text>
            </View>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.sidebarContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Navigation</Text>
            {items?.map((item) => (
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

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Support</Text>
            {bottomItems?.filter(item => item.key !== "logout" && item.key !== "modules")?.map((item) => (
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
        </ScrollView>

        <View style={styles.bottomActions}>
          {bottomItems?.filter(item => item.key === "modules")?.map((item) => (
            <TouchableOpacity 
              key={item.key}
              style={styles.modulesButton}
              onPress={() => {
                onClose();
                item.onPress();
              }}
            >
              <item.icon size={isSmallScreen ? 18 : 20} color="#14b8a6" />
              <Text style={styles.modulesButtonText}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
          
          {bottomItems?.filter(item => item.key === "logout")?.map((item) => (
            <TouchableOpacity 
              key={item.key}
              style={styles.logoutButton}
              onPress={() => {
                onClose();
                item.onPress();
              }}
            >
              <item.icon size={isSmallScreen ? 18 : 20} color="#b91c1c" />
              <Text style={styles.logoutButtonText}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </Modal>
  );
};

export default Sidebar;

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
    paddingTop: Platform.OS === 'ios' ? (isSmallScreen ? 50 : 60) : (isSmallScreen ? 30 : 40),
    paddingHorizontal: isSmallScreen ? 12 : 16,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 2, height: 0 },
  },
  sidebarHeader: {
    paddingBottom: isSmallScreen ? 16 : 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    marginBottom: isSmallScreen ? 12 : 16,
  },
  closeButton: {
    position: "absolute",
    right: 0,
    top: isSmallScreen ? -8 : -10,
    width: isSmallScreen ? 36 : 40,
    height: isSmallScreen ? 36 : 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
  },
  userProfileSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: isSmallScreen ? 45 : 50,
  },
  userInfo: {
    marginLeft: isSmallScreen ? 10 : 12,
    flex: 1,
  },
  userName: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: "700",
    color: "#0b1220",
    marginBottom: 2,
  },
  userMetaId: {
    fontSize: isSmallScreen ? 10 : 12,
    color: "#64748b",
    marginBottom: 2,
  },
  userDepartment: {
    fontSize: isSmallScreen ? 10 : 12,
    color: "#14b8a6",
    fontWeight: "600",
  },
  sidebarContent: {
    flex: 1,
  },
  section: {
    marginBottom: isSmallScreen ? 20 : 24,
  },
  sectionTitle: {
    fontSize: isSmallScreen ? 10 : 12,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: isSmallScreen ? 10 : 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sidebarButton: {
    paddingVertical: isSmallScreen ? 10 : 12,
    paddingHorizontal: isSmallScreen ? 6 : 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  sidebarButtonActive: {
    backgroundColor: "#f0fdfa",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: isSmallScreen ? 10 : 12,
  },
  buttonText: {
    fontSize: isSmallScreen ? 13 : 15,
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
    paddingTop: isSmallScreen ? 16 : 20,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    gap: isSmallScreen ? 6 : 8,
  },
  modulesButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: isSmallScreen ? 10 : 12,
    paddingVertical: isSmallScreen ? 10 : 12,
    paddingHorizontal: isSmallScreen ? 6 : 8,
    borderRadius: 8,
    backgroundColor: "#f0fdfa",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: isSmallScreen ? 10 : 12,
    paddingVertical: isSmallScreen ? 10 : 12,
    paddingHorizontal: isSmallScreen ? 6 : 8,
    borderRadius: 8,
    backgroundColor: "#fef2f2",
  },
  modulesButtonText: {
    fontSize: isSmallScreen ? 12 : 14,
    fontWeight: "600",
    color: "#14b8a6",
  },
  logoutButtonText: {
    fontSize: isSmallScreen ? 12 : 14,
    fontWeight: "600",
    color: "#b91c1c",
  },
  avatar: {
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontWeight: "800",
    color: "#0b1220",
    fontSize: isSmallScreen ? 14 : 16,
  },
});