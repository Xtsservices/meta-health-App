// src/screens/ot/anesthesia/MonitorsMobile.tsx

import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  Pressable,
  SafeAreaView,
} from "react-native";
import { Check } from "lucide-react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import Footer from "../../dashboard/footer";
import useAnesthesiaForm from "../../../utils/useAnesthesiaRecordForm";
import { COLORS } from "../../../utils/colour";

interface MonitorsState {
  spo2: boolean;
  nbp: boolean;
  temp: boolean;
  etco2: boolean;
  ventAlarm: boolean;
  ibp: boolean;
  fio2: boolean;
  anesAgent: boolean;
  nerveStim: boolean;
  paw: boolean;
  paCathCVP: boolean;
  oesophPrecordSteth: boolean;
  ecg: boolean;
  hourlyUrine: boolean;
}

const MONITOR_ITEMS: { key: keyof MonitorsState; label: string }[] = [
  { key: "spo2",               label: "SPO2" },
  { key: "nbp",                label: "NBP" },
  { key: "temp",               label: "Temp" },
  { key: "etco2",              label: "ETCO2" },
  { key: "ventAlarm",          label: "Vent Alarm" },
  { key: "ibp",                label: "IBP" },
  { key: "fio2",               label: "FIO2" },
  { key: "anesAgent",          label: "Anes Agent" },
  { key: "nerveStim",          label: "Nerve Stim" },
  { key: "paw",                label: "PAW" },
  { key: "paCathCVP",          label: "PA Cath / CVP" },
  { key: "oesophPrecordSteth", label: "Oesoph / Precord Steth" },
  { key: "ecg",                label: "ECG" },
  { key: "hourlyUrine",        label: "Hourly Urine" },
];

const MonitorsMobile: React.FC = () => {
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const isDark = scheme === "dark";

  const { monitors, setMonitors } = useAnesthesiaForm() as {
    monitors: MonitorsState;
    setMonitors: (patch: Partial<MonitorsState>) => void;
  };

  

  const toggleMonitor = (key: keyof MonitorsState) => {
    const current = Boolean(monitors?.[key]);
    setMonitors({ [key]: !current });
  };

  const handleNext = () => {
    // go back to OT inner tabs grid
    navigation.navigate("OtInnerTabs" as never, { tabName: "AnesthesiaRecord" });
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: COLORS.bg },
      ]}
    >
      <View style={styles.root}>
        {/* Scrollable content */}
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          extraScrollHeight={80}
          enableOnAndroid
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              styles.card,
              { backgroundColor: COLORS.card, borderColor: COLORS.border },
            ]}
          >
            <Text style={[styles.title, { color: COLORS.text }]}>
              Monitors
            </Text>
            <Text style={[styles.subtitle, { color: COLORS.sub }]}>
              Select all monitoring devices used during anesthesia
            </Text>

            <View style={styles.checkboxGroup}>
              {MONITOR_ITEMS.map((item) => {
                const checked = Boolean(monitors?.[item.key]);
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => toggleMonitor(item.key)}
                    style={({ pressed }) => [
                      styles.checkboxRow,
                      { backgroundColor: pressed ? COLORS.brandSoft : "transparent" },
                    ]}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        {
                          backgroundColor: checked ? COLORS.brand : COLORS.checkboxBg,
                          borderColor: checked ? COLORS.brand : COLORS.checkboxBorder,
                        },
                      ]}
                    >
                      {checked && <Check size={16} color="#ffffff" />}
                    </View>
                    <Text style={[styles.checkboxLabel, { color: COLORS.text }]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Next button at bottom of form */}
            <View style={styles.formNavRow}>
              <Pressable
                onPress={handleNext}
                style={({ pressed }) => [
                  styles.formNavButton,
                  {
                    backgroundColor: COLORS.brand,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={styles.formNavButtonTextPrimary}>Next</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAwareScrollView>

        {/* Bottom app footer */}
        <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
          <Footer active={"dashboard"} brandColor="#14b8a6" />
        </View>
        {insets.bottom > 0 && (
          <View
            pointerEvents="none"
            style={[styles.navShield, { height: insets.bottom }]}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default MonitorsMobile;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  root: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 110, // extra so content + Next button are not hidden
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 12,
  },
  checkboxGroup: {
    gap: 6,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: "500",
  },

  // Next button inside form
  formNavRow: {
    marginTop: 24,
  },
  formNavButton: {
    height: 46,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  formNavButtonTextPrimary: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },

  // Bottom Footer
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
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
    backgroundColor: "#ffffff",
    zIndex: 9,
  },
});
