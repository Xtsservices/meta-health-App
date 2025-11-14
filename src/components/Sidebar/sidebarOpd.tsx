// Sidebar.tsx
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
} from "react-native";
import {
  X as CloseIcon,
  User as UserIcon,
} from "lucide-react-native";

const { width: W } = Dimensions.get("window");

export type SidebarItem = {
  key: string;
  label: string;
  icon: React.ElementType;
  onPress: () => void;
  variant?: "default" | "danger" | "muted";
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

const Sidebar: React.FC<Props> = ({
  open,
  onClose,
  userName,
  userImage,
  onProfile,
  items,
  bottomItems,
  width = Math.min(320, W * 0.82),
}) => {
  const slide = useRef(new Animated.Value(-width)).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: open ? 0 : -width,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [open, slide, width]);

  return (
    <Modal transparent visible={open} animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.drawerBackdrop} onPress={onClose} />
      <Animated.View style={[styles.drawer, { width, transform: [{ translateX: slide }] }]}>
        {/* Header */}
        <View style={styles.drawerHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close menu">
            <CloseIcon size={20} color="#0b1220" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.userRow} onPress={onProfile} activeOpacity={0.8}>
            <Avatar name={userName} uri={userImage} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={styles.userName} numberOfLines={1}>{userName || "User"}</Text>
              <Text style={styles.userSubtitle}>View Profile</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Items */}
        <View style={styles.drawerBody}>
          {items?.map((it) => {
            const Icon = it.icon;
            const color =
              it.variant === "danger" ? "#b91c1c" : it.variant === "muted" ? "#475569" : "#0b1220";
            return (
              <TouchableOpacity
                key={it.key}
                style={styles.drawerItem}
                onPress={it.onPress}
                activeOpacity={0.85}
              >
                <Icon size={20} color={color} />
                <Text style={[styles.drawerItemText, { color }]}>{it.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Bottom */}
        <View style={styles.drawerFooter}>
          {bottomItems?.map((it) => {
            const Icon = it.icon;
            const color =
              it.variant === "danger" ? "#b91c1c" : it.variant === "muted" ? "#475569" : "#0b1220";
            return (
              <TouchableOpacity
                key={it.key}
                style={[styles.drawerItem, { paddingVertical: 12 }]}
                onPress={it.onPress}
                activeOpacity={0.85}
              >
                <Icon size={20} color={color} />
                <Text style={[styles.drawerItemText, { color }]}>{it.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>
    </Modal>
  );
};

export default Sidebar;

const styles = StyleSheet.create({
  drawerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  drawer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#fff",
    paddingTop: 8,
    paddingHorizontal: 12,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  drawerHeader: {
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
  },
  closeBtn: {
    position: "absolute",
    right: 0,
    top: 8,
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 40,
    marginTop: 8,
  },
  userName: { fontSize: 16, fontWeight: "700", color: "#0b1220" },
  userSubtitle: { fontSize: 12, color: "#64748b", marginTop: 2 },

  drawerBody: { paddingVertical: 8 },
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 10,
    gap: 12,
  },
  drawerItemText: { fontSize: 15, color: "#0b1220", fontWeight: "600" },

  drawerFooter: {
    marginTop: "auto",
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e2e8f0",
  },

  avatar: {
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontWeight: "800", color: "#0b1220", fontSize: 16 },
});
