// src/screens/appointments/AppointmentTabsMobile.tsx

import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronRight } from "lucide-react-native";

import AppointmentForm from "./appointmentForm";
import Footer from "../../dashboard/footer";
import { COLORS } from "../../../utils/colour";
import AppointmentList from "./appointmentList";



type TabKey =
  | "BookAppointment"
  | "ScheduledAppointment"
  | "CompletedAppointment"
  | "CanceledAppointment";

const AppointmentTabsMobile: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>("BookAppointment");
  const insets = useSafeAreaInsets();
  const FOOTER_HEIGHT = 70;

  const bottomPad = useMemo(
    () => FOOTER_HEIGHT + insets.bottom + 12,
    [FOOTER_HEIGHT, insets.bottom]
  );

  const renderContent = () => {
    switch (activeTab) {
      case "BookAppointment":
        return (
          <AppointmentForm
            onAppointmentCreated={() =>
              setActiveTab("ScheduledAppointment")
            }
          />
        );

      case "ScheduledAppointment":
        return (
          <AppointmentList
            status="scheduled"
            title="Scheduled Appointments"
          />
        );

      case "CompletedAppointment":
        return (
          <AppointmentList
            status="completed"
            title="Completed Appointments"
          />
        );

      case "CanceledAppointment":
        return (
          <AppointmentList
            status="canceled"
            title="Cancelled Appointments"
          />
        );

      default:
        return null;
    }
  };

  const renderTabButton = (tab: TabKey, label: string) => {
    const isActive = activeTab === tab;
    const iconColor = isActive
      ? "#ffffff"
      : "#9ca3af";

    return (
      <TouchableOpacity
        key={tab}
        style={[
          styles.tabButton,
          isActive && styles.tabButtonActive,
        ]}
        onPress={() => setActiveTab(tab)}
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

            <ChevronRight
              size={16}
              color={iconColor}
              strokeWidth={2.5}
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
        {/* Tabs row */}
        <View style={styles.tabsWrapper}>
        <View style={styles.tabsContainer}>
            <View style={styles.tabsRow}>
          {renderTabButton("BookAppointment", "Appointment")}
          {renderTabButton("ScheduledAppointment", "Scheduled")}
            </View>
            <View style={styles.tabsRow}>
          {renderTabButton("CompletedAppointment", "Completed")}
          {renderTabButton("CanceledAppointment", "Cancelled")}
            </View>
          </View>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: bottomPad },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {renderContent()}
        </ScrollView>

        {/* Footer */}
       <View style={[styles.footerWrap, { bottom: insets.bottom },
          ]}
        >
          <Footer
            active="appointments"
            brandColor={COLORS.brand}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default AppointmentTabsMobile;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg ?? "#f3f4f6",
  },

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
    backgroundColor: COLORS.brand ?? "#14b8a6",
    borderColor: COLORS.brand ?? "#14b8a6",
    shadowColor: COLORS.brand ?? "#14b8a6",
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
  },

  tabButtonTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },

  scroll: { flex: 1 },

  scrollContent: {
    paddingTop: 8,
  },

 footerWrap: {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,              // actual bottom, shifted up with insets.bottom in JSX
  borderTopWidth: 1,
  borderTopColor: "#e2e8f0",
  backgroundColor: "#ffffff",
  zIndex: 10,
  elevation: 6,
},
});
