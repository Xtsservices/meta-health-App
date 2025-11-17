// src/screens/ot/GeneralPhysicalExaminationMobile.tsx

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

import usePhysicalExaminationForm from "../../../utils/usePhysicalExaminationForm";
import Footer from "../../dashboard/footer";
import { useSelector } from "react-redux";
import { RootState } from "../../../store/store";


interface CardioVascularState {
  hypertension: boolean;
  cafDOE: boolean;
  ischemicHeartDisease: boolean;
  rheumaticFever: boolean;
  orthpneaPND: boolean;
  murmurs: boolean;
  cad: boolean;
  exerciseTolerance: boolean;
  cardicEnlargement: boolean;
  angina: boolean;
  mi: boolean;
  mtdLessThan4: boolean;
  mtdGreaterThan4: boolean;
}

const CHECKBOX_ITEMS: { key: keyof CardioVascularState; label: string }[] = [
  { key: "hypertension",            label: "Hypertension" },
  { key: "cafDOE",         label: "CAF DOE" },
  { key: "ischemicHeartDisease",       label: "Ischemic Heart Disease" },
  { key: "rheumaticFever",        label: "Rheumatic Fever" },
  { key: "orthpneaPND",         label: "Orthpnea/PND" },
  { key: "murmurs",          label: "Murmurs" },
  { key: "cad",          label: "CAD" },
  { key: "exerciseTolerance",          label: "Exercise Tolerance" },
  { key: "cardicEnlargement",          label: "Cardic Enlargement" },
  { key: "angina",          label: "Angina" },
  { key: "mi",          label: "Mi" },
  { key: "mtdLessThan4",          label: "MTD<4" },
  { key: "mtdGreaterThan4",          label: "MTD>4" },


];

const Hepato: React.FC = () => {
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const isDark = scheme === "dark";
  const user = useSelector((s: RootState) => s.currentUser);
const isReadOnly = user?.roleName === "surgeon";
  const { cardioVascular, setCardioVascular } =
    usePhysicalExaminationForm() 

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

  const toggleField = (key: keyof CardioVascularState) => {
    const current = Boolean(cardioVascular?.[key]);
    setCardioVascular({ [key]: !current });
  };

  const handlePrev = () => {
    navigation.goBack();
  };

  const handleNext = () => {
    navigation.navigate("Neuro" as never);
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: COLORS.bg},
      ]}
    >
      <View style={styles.root}>
        {/* Scrollable form, keyboard-safe */}
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
            <Text style={[styles.subtitle, { color: COLORS.sub }]}>
              Select all applicable findings
            </Text>

            <View style={styles.checkboxGroup}>
              {CHECKBOX_ITEMS.map((item) => {
                const checked = Boolean(cardioVascular?.[item.key]);
                return (
                  <Pressable
                    key={item.key}
                    disabled={isReadOnly}
                    onPress={() => toggleField(item.key)}
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

export default Hepato;

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
    paddingBottom: 110, // extra so buttons are not hidden behind footer
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
