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


interface HepatoState {
  vomiting: boolean;
  gerd: boolean;
  diarrhoea: boolean;
  galbladderDS: boolean;
  jaundice: boolean;
  cirrhosis: boolean;
  
}

const CHECKBOX_ITEMS: { key: keyof HepatoState; label: string }[] = [
  { key: "vomiting",            label: "Vomiting" },
  { key: "gerd",         label: "GERD" },
  { key: "diarrhoea",       label: "Diarrhoea" },
  { key: "galbladderDS",        label: "Galbladder DS" },
  { key: "jaundice",         label: "Jaundice" },
  { key: "cirrhosis",          label: "Cirrhosis" },

];

const Hepato: React.FC = () => {
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const isDark = scheme === "dark";

  const { hepato, setHepato } =
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

  const toggleField = (key: keyof HepatoState) => {
    const current = Boolean(hepato?.[key]);
    setHepato({ [key]: !current });
  };

  const handlePrev = () => {
    navigation.goBack();
  };

  const handleNext = () => {
    navigation.navigate("CardioVascular" as never);
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
                const checked = Boolean(hepato?.[item.key]);
                return (
                  <Pressable
                    key={item.key}
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
