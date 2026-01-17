// src/components/DoctorManagmentTabs.tsx

import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { ChevronRight } from "lucide-react-native";

import MySchedule from "./MySchedule/MySchedule";
import SlotsManagement from "./SlotsManagement/SlotsManagement";
import MyTasks from "../../pages/nurseDashboard/MyTasks";

const { width } = Dimensions.get("window");
const BRAND = "#14b8a6";

// ---- Types
type TabKey =
  | "SlotsManagement"
  | "MySchedule"
  | "MyTasks"
  | "LeaveManagment";

// ---- Selector
const selectCurrentUser = (state: RootState) => state.currentUser;

const DoctorManagmentTabs: React.FC = () => {
  const user = useSelector(selectCurrentUser);

  const defaultTab: TabKey =
    user?.role === 4000 ? "LeaveManagment" : "SlotsManagement";

  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab);

  // ---- Tabs list
  const tabs = useMemo(() => {
    const baseTabs = [
       { key: "MyTasks", label: "My Notes" },
      { key: "MySchedule", label: "My Schedule" },
          { key: "SlotsManagement", label: "Slots Management" },


    ] as { key: TabKey; label: string }[];

    if (user?.role === 4000) {
      baseTabs.unshift({
        key: "LeaveManagment",
        label: "Leave Management",
      });
    }

    return baseTabs;
  }, [user?.role]);

  // ---- Content renderer
  const renderContent = () => {
    switch (activeTab) {
      case "SlotsManagement":
        return <SlotsManagement />;
      case "MySchedule":
        return <MySchedule />;
      case "MyTasks":
        return <MyTasks />;
      default:
        return <SlotsManagement />;
    }
  };

  // ---- Tab button
  const renderTabButton = (tab: TabKey, label: string) => {
    const isActive = activeTab === tab;

    return (
      <TouchableOpacity
        key={tab}
        style={styles.tabButton}
        activeOpacity={0.75}
        onPress={() => setActiveTab(tab)}
      >
        <View
          style={[
            styles.tabInner,
            isActive && styles.tabInnerActive,
          ]}
        >
          <View style={styles.tabContent}>
            <Text
              numberOfLines={1}
              style={[
                styles.tabText,
                isActive && styles.tabTextActive,
              ]}
            >
              {label}
            </Text>

            <ChevronRight
              size={16}
              strokeWidth={2.5}
              color={isActive ? "#ffffff" : "#9ca3af"}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {/* ---------- Tabs ---------- */}
            <View style={styles.tabsRow}>
              {tabs.slice(0, 2).map(t =>
                renderTabButton(t.key, t.label)
              )}
            </View>

            {tabs.length > 2 && (
              <View style={styles.tabsRow}>
                {tabs.slice(2, 4).map(t =>
                  renderTabButton(t.key, t.label)
                )}
              </View>
            )}

        {/* ---------- Content ---------- */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {renderContent()}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default DoctorManagmentTabs;

// ================= STYLES =================

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },

  /* Tabs wrapper */
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

  tabInner: {
    paddingVertical: 14,
    paddingHorizontal: 14,
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
    backgroundColor: BRAND,
    borderColor: BRAND,
    shadowColor: BRAND,
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

  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
    letterSpacing: 0.2,

  },

  tabTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },

  content: {
    padding: 8,
  },
});
