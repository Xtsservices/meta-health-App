import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  Image,
  ScrollView,
} from "react-native";
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  ShoppingBag,
  FileText,
  Receipt,
  Settings,
  HelpCircle,
  DollarSign,
  LogOut,
  Grid,
  Building2,
  X,
} from "lucide-react-native";

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

const { width: W } = Dimensions.get("window");

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
    .map(n => n.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Modal
      visible={open}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.sidebar}>
          {/* Header */}
          <View style={styles.sidebarHeader}>
            <View style={styles.profileSection}>
              {userImage ? (
                <Image source={{ uri: userImage }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{userInitials}</Text>
                </View>
              )}
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>Dr. {userName}</Text>
                <Text style={styles.profileRole}>Pathology</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.sidebarContent}>
            {/* Overview Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Overview</Text>
              {items?.filter(item => 
                ["dash", "alerts"].includes(item.key)
              ).map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={styles.menuItem}
                  onPress={item.onPress}
                >
                  <item.icon size={20} color="#64748b" />
                  <Text style={styles.menuText}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Patient Management Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Patient Management</Text>
              {items?.filter(item => 
                ["patients", "walkin", "billing", "tax"].includes(item.key)
              ).map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={styles.menuItem}
                  onPress={item.onPress}
                >
                  <item.icon size={20} color="#64748b" />
                  <Text style={styles.menuText}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Operations Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Operations</Text>
              {items.filter(item => 
                ["management", "pricing"].includes(item.key)
              ).map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={styles.menuItem}
                  onPress={item.onPress}
                >
                  <item.icon size={20} color="#64748b" />
                  <Text style={styles.menuText}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Support Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Support</Text>
              {items?.filter(item => item.key === "help").map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={styles.menuItem}
                  onPress={item.onPress}
                >
                  <item.icon size={20} color="#64748b" />
                  <Text style={styles.menuText}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Bottom Actions */}
          <View style={styles.bottomSection}>
            {bottomItems.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.bottomItem,
                  item.variant === "danger" && styles.dangerItem,
                ]}
                onPress={item.onPress}
              >
                <item.icon
                  size={20}
                  color={item.variant === "danger" ? "#ef4444" : "#64748b"}
                />
                <Text
                  style={[
                    styles.bottomText,
                    item.variant === "danger" && styles.dangerText,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  sidebar: {
    width: W * 0.8,
    maxWidth: 320,
    height: "100%",
    backgroundColor: "#fff",
    paddingVertical: 20,
  },
  sidebarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#1977f3",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  profileInfo: {
    marginLeft: 12,
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
  },
  profileRole: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  sidebarContent: {
    flex: 1,
    paddingVertical: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  menuText: {
    fontSize: 16,
    color: "#374151",
    marginLeft: 12,
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  bottomItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  bottomText: {
    fontSize: 16,
    color: "#374151",
    marginLeft: 12,
  },
  dangerItem: {
    // Additional styles for danger items if needed
  },
  dangerText: {
    color: "#ef4444",
  },
});

export default Sidebar;