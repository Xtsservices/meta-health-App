// src/screens/ot/PreopControllersMobile.tsx

import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  Pressable,
  SafeAreaView,
  TextInput,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import Footer from "../../dashboard/footer";
import usePreOpForm from "../../../utils/usePreOpForm"; // ⬅️ adjust path if needed
import useOTConfig from "../../../utils/otConfig"; // to get preOpReadOnly if available

const PreopControllersMobile: React.FC = () => {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const {
    notes,
    arrangeBlood,
    riskConsent,
    setNotes,
    setArrangeBlood,
    setRiskConsent,
  } = usePreOpForm();

  const { preOpReadOnly } = useOTConfig();

  const COLORS = useMemo(
    () => ({
      bg: "#f8fafc",
      card: "#ffffff",
      text: "#0f172a",
      sub: "#64748b",
      border: "#e2e8f0",
      brand: "#14b8a6",
      brandSoft: "#0ea5a733",
      checkboxBg: "#ffffff",
      checkboxBorder: "#cbd5e1",
      footerBg: "#ffffff",
      disabled: "#cbd5e1",
    }),
    [isDark]
  );

  const toggleArrangeBlood = () => {
    if (preOpReadOnly) return;
    setArrangeBlood(!arrangeBlood);
  };

  const toggleRiskConsent = () => {
    if (preOpReadOnly) return;
    setRiskConsent(!riskConsent);
  };

  const handlePrev = () => {
    navigation.goBack();
  };

  const handleNext = () => {
    // matches the key used in PatientTabsGrid → navigation.navigate(item.key, { ot: true })
    navigation.navigate("preopTests" as never, { ot: true } as never);
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: COLORS.bg },
      ]}
    >
      <View style={styles.root}>
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 110 }, // extra so buttons aren't under footer
          ]}
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
              Pre-Op Controls
            </Text>

            <View style={styles.headerRow}>
              <Text style={[styles.lastSeenLabel, { color: COLORS.sub }]}>
                Last Seen:
              </Text>
            </View>

            {/* Checkboxes */}
            <View style={styles.checkboxGroup}>
              {/* Arrange Blood */}
              <Pressable
                onPress={toggleArrangeBlood}
                disabled={preOpReadOnly}
                style={({ pressed }) => [
                  styles.checkboxRow,
                  {
                    backgroundColor:
                      pressed && !preOpReadOnly
                        ? COLORS.brandSoft
                        : "transparent",
                    opacity: preOpReadOnly ? 0.6 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: arrangeBlood
                        ? COLORS.brand
                        : COLORS.checkboxBg,
                      borderColor: arrangeBlood
                        ? COLORS.brand
                        : COLORS.checkboxBorder,
                    },
                  ]}
                >
                  {arrangeBlood && (
                    <Text style={styles.checkboxCheck}>✓</Text>
                  )}
                </View>
                <Text style={[styles.checkboxLabel, { color: COLORS.text }]}>
                  Arrange Blood
                </Text>
              </Pressable>

              {/* Written Informed Consent / High Risk Consent */}
              <Pressable
                onPress={toggleRiskConsent}
                disabled={preOpReadOnly}
                style={({ pressed }) => [
                  styles.checkboxRow,
                  {
                    backgroundColor:
                      pressed && !preOpReadOnly
                        ? COLORS.brandSoft
                        : "transparent",
                    opacity: preOpReadOnly ? 0.6 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: riskConsent
                        ? COLORS.brand
                        : COLORS.checkboxBg,
                      borderColor: riskConsent
                        ? COLORS.brand
                        : COLORS.checkboxBorder,
                    },
                  ]}
                >
                  {riskConsent && (
                    <Text style={styles.checkboxCheck}>✓</Text>
                  )}
                </View>
                <Text style={[styles.checkboxLabel, { color: COLORS.text }]}>
                  Written Informed Consent / High Risk Consent
                </Text>
              </Pressable>
            </View>

            {/* Notes input */}
            <View style={styles.notesWrap}>
              <Text style={[styles.notesLabel, { color: COLORS.text }]}>
                Notes
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    borderColor: COLORS.border,
                    backgroundColor: COLORS.card,
                    color: COLORS.text,
                  },
                ]}
                placeholder="Enter notes"
                placeholderTextColor="#94a3b8"
                multiline
                textAlignVertical="top"
                editable={!preOpReadOnly}
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            {/* Prev / Next buttons at end of form */}
            <View style={styles.formNavRow}>
              <Pressable
                onPress={handlePrev}
                style={({ pressed }) => [
                  styles.formNavButton,
                  styles.formNavButtonSecondary,
                  {
                    borderColor: COLORS.brand,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.formNavButtonTextSecondary,
                    { color: COLORS.brand },
                  ]}
                >
                  Previous
                </Text>
              </Pressable>

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

export default PreopControllersMobile;

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
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  lastSeenLabel: {
    fontSize: 13,
    fontWeight: "500",
  },

  // Checkboxes
  checkboxGroup: {
    marginTop: 4,
    marginBottom: 16,
    gap: 8,
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
  checkboxCheck: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: "500",
    flexShrink: 1,
    flexWrap: "wrap",
  },

  // Notes
  notesWrap: {
    marginTop: 4,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  textInput: {
    minHeight: 80,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },

  // Prev / Next inside form
  formNavRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 24,
  },
  formNavButton: {
    flex: 1,
    height: 46,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  formNavButtonSecondary: {
    borderWidth: 1.5,
  },
  formNavButtonTextSecondary: {
    fontSize: 15,
    fontWeight: "700",
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
