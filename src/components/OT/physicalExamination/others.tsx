import React, { useCallback } from "react";
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

import usePhysicalExaminationForm from "../../../utils/usePhysicalExaminationForm";
import Footer from "../../dashboard/footer";
import { debounce, DEBOUNCE_DELAY } from "../../../utils/debounce";
import { useSelector } from "react-redux";
import { RootState } from "../../../store/store";
import { COLORS } from "../../../utils/colour";

interface OthersState {
  hematDisorder: boolean;
  pregnant: boolean;
  radiotherapy: boolean;
  chemotherapy: boolean;
  immuneSuppressed: boolean;
  steroidUse: boolean;
  cervicalSpineMovement: boolean;
  intraopUrineOutput: boolean;
  bloodLossToBeRecorded: boolean;
}

const CHECKBOX_ITEMS: { key: keyof Others; label: string }[] = [
  { key: "hematDisorder",            label: "Hemat Disorder" },
  { key: "pregnant",         label: "Pregnant" },
  { key: "radiotherapy",       label: "Radiotherapy" },
  { key: "chemotherapy",        label: "Chemotherapy" },
  { key: "immuneSuppressed",         label: "Immune Suppressed" },
  { key: "steroidUse",          label: "Steroid Use" },
  { key: "cervicalSpineMovement",          label: "Cervical Spine Movement" },
  { key: "intraopUrineOutput",          label: "Intraop Urine Output" },
  { key: "bloodLossToBeRecorded",          label: "Blood Loss To Be Recorded" },
  


];

const OthersMobile: React.FC = () => {
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  
  // Get user and patient from Redux
  const user = useSelector((s: RootState) => s.currentUser);
  const currentPatient = useSelector((s: RootState) => s.currentPatient);
  
  // Updated isReadOnly logic
  const isReadOnly = user?.roleName === "surgeon" || currentPatient?.status === "approved";

  const { others, setOthers } = usePhysicalExaminationForm();

  const toggleField = (key: keyof OthersState) => {
    if (isReadOnly) return; // Add check
    const current = Boolean(others?.[key]);
    setOthers({ [key]: !current });
  };

  const handlePrev = () => {
    navigation.goBack();
  };

  const handleSave = () => {
    if (isReadOnly) return; // Add check for save as well
    navigation.navigate("OtInnerTabs", { tabName: "PhysicalExamination" });
  };

  const debouncedSubmit = useCallback(
    debounce(handleSave, DEBOUNCE_DELAY),
    [handleSave]
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: COLORS.bg }]}>
      <View style={styles.root}>
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
              Other Findings
            </Text>
            <Text style={[styles.subtitle, { color: COLORS.sub }]}>
              Select all applicable findings
            </Text>

            <View style={styles.checkboxGroup}>
              {CHECKBOX_ITEMS.map((item) => {
                const checked = Boolean(others?.[item.key]);
                return (
                  <Pressable
                    key={item.key}
                    disabled={isReadOnly}
                    onPress={() => toggleField(item.key)}
                    style={({ pressed }) => [
                      styles.checkboxRow,
                      { 
                        backgroundColor: pressed && !isReadOnly ? COLORS.brandSoft : "transparent",
                        opacity: isReadOnly ? 0.6 : 1,
                      },
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
                onPress={isReadOnly ? undefined : debouncedSubmit}
                disabled={isReadOnly}
                style={({ pressed }) => [
                  styles.formNavButton,
                  {
                    backgroundColor: isReadOnly ? COLORS.sub : COLORS.brand,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={styles.formNavButtonTextPrimary}>
                  {isReadOnly ? "View Only" : "Close"}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAwareScrollView>

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

export default OthersMobile;

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  root: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 110,
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
  checkboxGroup: { gap: 6 },
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
  formNavButtonSecondary: { borderWidth: 1.5 },
  formNavButtonTextSecondary: {
    fontSize: 15,
    fontWeight: "700",
  },
  formNavButtonTextPrimary: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
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