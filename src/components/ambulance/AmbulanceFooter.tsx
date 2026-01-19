// AmbulanceFooter.tsx
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  LayoutDashboardIcon,
  SettingsIcon,
  UserIcon,
  MapPinIcon,
} from "../../utils/SvgIcons";

const { width: W } = Dimensions.get("window");

export type AmbulanceTabKey =
  | "dashboard"
  | "location"
  | "drivers"
  | "settings";

type Props = {
  active?: AmbulanceTabKey; // default 'dashboard'
  brandColor?: string; // default '#14b8a6'
  onTabPress?: (tab: AmbulanceTabKey) => void; // optional custom handler
};

type ItemProps = {
  k: AmbulanceTabKey;
  active: AmbulanceTabKey;
  onPress: (k: AmbulanceTabKey) => void;
};

const getTabLabel = (k: AmbulanceTabKey): string => {
  const labels = {
    dashboard: "Dashboard",
  location: "Location",
    drivers: "Staff",
    settings: "Settings",
  };
  return labels[k];
};

const getTabIcon = (k: AmbulanceTabKey): React.ElementType => {
  const icons = {
    dashboard: LayoutDashboardIcon,
  location: MapPinIcon,
    drivers: UserIcon,
    settings: SettingsIcon,
  };
  return icons[k];
};

const Item: React.FC<ItemProps> = ({ k, active, onPress }) => {
  const isActive = active === k;
  const label = getTabLabel(k);
  const IconComponent = getTabIcon(k);

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => onPress(k)}
      activeOpacity={0.9}
      style={styles.tab}
    >
      <IconComponent size={22} color="#ffffff" />
      <Text
        style={[
          styles.tabText,
          isActive ? styles.tabTextActive : styles.tabTextInactive,
        ]}
      >
        {label}
      </Text>
      {/* Top indicator for active tab */}
      <View
        style={[
          styles.activeBar,
          isActive ? styles.activeBarVisible : styles.activeBarHidden,
        ]}
      />
    </TouchableOpacity>
  );
};

const AmbulanceFooter: React.FC<Props> = ({
  active = "dashboard",
  brandColor = "#14b8a6",
  onTabPress,
}) => {
  const navigation = useNavigation<any>();

  const handleTabPress = (k: AmbulanceTabKey) => {
    // Call custom handler if provided
    if (onTabPress) {
      onTabPress(k);
      return;
    }

    // Default navigation behavior
    switch (k) {
      case "dashboard":
        navigation.navigate("AmbulanceAdminDashboard");
        break;
      case "location":
        navigation.navigate("AmbulanceLocation");
        break;
      case "drivers":
        // Navigate to drivers screen
        navigation.navigate("Drivers");
        break;
      case "settings":
        // Navigate to ambulance settings screen
        navigation.navigate("AmbulanceSettings");
        break;
      default:
        break;
    }
  };

  return (
    <View style={[styles.footer, { backgroundColor: brandColor }]}>
  <Item k="dashboard" active={active} onPress={handleTabPress} />
  <Item k="location" active={active} onPress={handleTabPress} />
  <Item k="drivers" active={active} onPress={handleTabPress} />
      <Item k="settings" active={active} onPress={handleTabPress} />
    </View>
  );
};

export default AmbulanceFooter;

const styles = StyleSheet.create({
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingBottom: Platform.OS === "ios" ? 10 : 8,
    paddingTop: 8,
    borderTopWidth: 0,
    width: W,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 6,
    paddingTop: 2,
    height: "100%",
  },
  tabText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },
  tabTextActive: {
    opacity: 1,
  },
  tabTextInactive: {
    opacity: 0.85,
  },
  activeBar: {
    position: "absolute",
    top: 0,
    height: 3,
    width: "30%",
    borderRadius: 2,
  },
  activeBarVisible: {
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  activeBarHidden: {
    backgroundColor: "transparent",
  },
});
