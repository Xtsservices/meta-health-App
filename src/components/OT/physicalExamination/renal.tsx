// src/screens/ot/GeneralPhysicalExaminationMobile.tsx
import React from "react";
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
import { useSelector } from "react-redux";
import { RootState } from "../../../store/store";
import { COLORS } from "../../../utils/colour";


interface RenalState {
  uti: boolean;
  haemateria: boolean;
  renalInsufficiency: boolean;
  aorenocorticalInsuff: boolean;
  thyroidDisorder: boolean;
  pituitaryDisorder: boolean;
  diabeticsMalitus: boolean;
 
}

const CHECKBOX_ITEMS: { key: keyof RenalState; label: string }[] = [
  { key: "uti",            label: "UTI" },
  { key: "haemateria",         label: "Haemateria" },
  { key: "renalInsufficiency",       label: "Renal Insufficiency" },
  { key: "aorenocorticalInsuff",        label: "Aorenocortical Insuff" },
  { key: "thyroidDisorder",         label: "Thyroid Disorder" },
  { key: "pituitaryDisorder",          label: "Pituitary Disorder" },
  { key: "diabeticsMalitus",          label: "Diabetics Malitus" },
  


];

const RenalMobile: React.FC = () => {
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();


  const user = useSelector((s: RootState) => s.currentUser);
  const currentPatient = useSelector((s: RootState) => s.currentPatient);
  const isReadOnly = user?.roleName === "surgeon" || currentPatient?.status === "approved";

  const { renal, setRenal } = usePhysicalExaminationForm();

  const toggleField = (key: keyof RenalState) => {
    if (isReadOnly) return; // Add check
    const current = Boolean(renal?.[key]);
    setRenal({ [key]: !current });
  };

  const handlePrev = () => {
    navigation.goBack();
  };

  const handleNext = () => {
    navigation.navigate("Others" as never);
  };

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
              Renal & Endocrine
            </Text>
            <Text style={[styles.subtitle, { color: COLORS.sub }]}>
              Select all applicable findings
            </Text>

            <View style={styles.checkboxGroup}>
              {CHECKBOX_ITEMS.map((item) => {
                const checked = Boolean(renal?.[item.key]);
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

export default RenalMobile;

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