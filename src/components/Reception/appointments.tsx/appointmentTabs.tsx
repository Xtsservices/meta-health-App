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
        return <AppointmentForm />;

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
    return (
      <TouchableOpacity
        key={tab}
        style={[
          styles.tabButton,
          isActive && styles.tabButtonActive,
        ]}
        onPress={() => setActiveTab(tab)}
        activeOpacity={0.85}
      >
        <Text
          style={[
            styles.tabButtonText,
            isActive && styles.tabButtonTextActive,
          ]}
        >
          {label}
        </Text>
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
        <View style={styles.tabsContainer}>
          {renderTabButton("BookAppointment", "Appointment")}
          {renderTabButton("ScheduledAppointment", "Scheduled")}
          {renderTabButton("CompletedAppointment", "Completed")}
          {renderTabButton("CanceledAppointment", "Cancelled")}
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
       <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
  <Footer active={"appointments"} brandColor={COLORS.brand} />
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
  tabsContainer: {
    flexDirection: "row",
    flexWrap: "wrap", // 2 per row
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tabButton: {
    width: "50%", // 2 per row
    paddingVertical: 10,
    paddingHorizontal: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  tabButtonActive: {
    borderBottomWidth: 3,
    borderBottomColor: COLORS.brand ?? "#14b8a6",
    backgroundColor: "#ecfeff",
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
  },
  tabButtonTextActive: {
    color: COLORS.brand ?? "#14b8a6",
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 0,
    paddingTop: 4,
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
