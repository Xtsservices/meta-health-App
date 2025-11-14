// components/Pharmacy/sidebar.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Image,
  ScrollView,
} from "react-native";
import { XIcon } from "../../utils/SvgIcons";

// Import SVG Icons

const { width: W, height: H } = Dimensions.get("window");
const isTablet = W >= 768;
const isSmallPhone = W < 375;

export interface SidebarItem {
  key: string;
  label: string;
  icon: React.ElementType;
  onPress: () => void;
  variant?: "default" | "danger";
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  userName: string;
  userImage?: string;
  onProfile: () => void;
  items: SidebarItem[];
  bottomItems: SidebarItem[];
}

const Sidebar: React.FC<SidebarProps> = ({
  open,
  onClose,
  userName,
  userImage,
  onProfile,
  items,
  bottomItems,
}) => {
  const userInitials = userName
    .split(" ")
    .map((n) => n?.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const renderSidebarItem = (item: SidebarItem, index: number) => {
    const Icon = item.icon;
    const isDanger = item.variant === "danger";
    
    return (
      <TouchableOpacity
        key={item.key}
        style={[
          styles.sidebarItem,
          isDanger && styles.sidebarItemDanger,
        ]}
        onPress={item.onPress}
      >
        <Icon
          size={isSmallPhone ? 20 : 24}
          color={isDanger ? "#ef4444" : "#6b7280"}
        />
        <Text
          style={[
            styles.sidebarItemText,
            isDanger && styles.sidebarItemTextDanger,
          ]}
        >
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={open}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.sidebarContainer}>
          {/* Header */}
          <View style={styles.sidebarHeader}>
            <View style={styles.userInfo}>
              {userImage ? (
                <Image source={{ uri: userImage }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{userInitials}</Text>
                </View>
              )}
              <View style={styles.userDetails}>
                <Text style={styles.userName} numberOfLines={1}>
                  {userName}
                </Text>
                <Text style={styles.userRole}>Pharmacy Manager</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <XIcon size={isSmallPhone ? 20 : 24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.sidebarContent} showsVerticalScrollIndicator={false}>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pharmacy Management</Text>
              {items?.map((item, index) => renderSidebarItem(item, index))}
            </View>

            <View style={styles.divider} />

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Support</Text>
              {bottomItems?.map((item, index) => renderSidebarItem(item, index))}
            </View>
          </ScrollView>
        </View>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    flexDirection: "row",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  sidebarContainer: {
    width: isSmallPhone ? W * 0.8 : isTablet ? 400 : W * 0.85,
    backgroundColor: "#ffffff",
    borderRightWidth: 1,
    borderRightColor: "#e5e7eb",
  },
  sidebarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: isSmallPhone ? 16 : 20,
    paddingVertical: isSmallPhone ? 16 : 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    backgroundColor: "#fafafa",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: isSmallPhone ? 40 : 48,
    height: isSmallPhone ? 40 : 48,
    borderRadius: isSmallPhone ? 20 : 24,
  },
  avatarPlaceholder: {
    width: isSmallPhone ? 40 : 48,
    height: isSmallPhone ? 40 : 48,
    borderRadius: isSmallPhone ? 20 : 24,
    backgroundColor: "#14b8a6",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#ffffff",
    fontSize: isSmallPhone ? 14 : 16,
    fontWeight: "600",
  },
  userDetails: {
    marginLeft: isSmallPhone ? 12 : 16,
    flex: 1,
  },
  userName: {
    fontSize: isSmallPhone ? 16 : 18,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 2,
  },
  userRole: {
    fontSize: isSmallPhone ? 12 : 14,
    color: "#6b7280",
  },
  closeButton: {
    padding: 4,
  },
  sidebarContent: {
    flex: 1,
    paddingVertical: isSmallPhone ? 12 : 16,
  },
  profileButton: {
    paddingHorizontal: isSmallPhone ? 16 : 20,
    paddingVertical: isSmallPhone ? 12 : 16,
    marginHorizontal: isSmallPhone ? 12 : 16,
    marginBottom: isSmallPhone ? 12 : 16,
    backgroundColor: "#f0fdfa",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ccfbf1",
  },
  profileButtonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileButtonText: {
    fontSize: isSmallPhone ? 14 : 16,
    fontWeight: "500",
    color: "#0f766e",
    textAlign: "center",
    flex: 1,
  },
  section: {
    marginBottom: isSmallPhone ? 16 : 20,
  },
  sectionTitle: {
    fontSize: isSmallPhone ? 12 : 14,
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: isSmallPhone ? 12 : 16,
    paddingHorizontal: isSmallPhone ? 16 : 20,
  },
  sidebarItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: isSmallPhone ? 16 : 20,
    paddingVertical: isSmallPhone ? 12 : 14,
  },
  sidebarItemDanger: {
    // Additional styles for danger items if needed
  },
  sidebarItemText: {
    marginLeft: isSmallPhone ? 12 : 16,
    fontSize: isSmallPhone ? 14 : 16,
    color: "#374151",
    fontWeight: "500",
  },
  sidebarItemTextDanger: {
    color: "#ef4444",
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginHorizontal: isSmallPhone ? 16 : 20,
    marginVertical: isSmallPhone ? 16 : 20,
  },
});

export default Sidebar;