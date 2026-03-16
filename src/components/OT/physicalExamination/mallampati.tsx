// src/screens/ot/MallampatiGradeMobile.tsx

import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  SafeAreaView,
  Image,
  Pressable,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import usePhysicalExaminationForm from "../../../utils/usePhysicalExaminationForm";
import Footer from "../../dashboard/footer";
import { COLORS } from "../../../utils/colour";
import { RootState } from "../../../store/store";
import { useSelector } from "react-redux";

const MallampatiGradeMobile: React.FC = () => {
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const isDark = scheme === "dark";
  const user = useSelector((s: RootState) => s.currentUser);
  const currentPatient = useSelector((s: RootState) => s.currentPatient);
  const isReadOnly = user?.roleName === "surgeon" || currentPatient?.status === "approved";

  const { mallampatiGrade, setMallampatiGrade } =
    usePhysicalExaminationForm() as {
      mallampatiGrade: { class: number };
      setMallampatiGrade: (updates: Partial<{ class: number }>) => void;
    };



  const handleSelect = (grade: number) => {
    if (isReadOnly) return; // Add check
    setMallampatiGrade({ class: grade });
  };

  const handlePrev = () => {
    navigation.goBack();
  };

  const handleNext = () => {
    // 🔹 adjust next route name as per your flow
    navigation.navigate("Respiratory" as never);
  };

  const gradeActive = (grade: number) => mallampatiGrade?.class === grade;

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
          contentContainerStyle={styles.scrollContent}
          extraScrollHeight={60}
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
              Mallampati Grade
            </Text>
            <Text style={[styles.subtitle, { color: COLORS.sub }]}>
              Select the appropriate Mallampati class based on the airway view.
            </Text>

            {/* Image section - responsive to screen width */}
            <View style={styles.imageWrapper}>
              <Image
                source={require('../../../assets/mallampati.jpg')}
                style={styles.image}
                resizeMode="contain"
              />
            </View>

            {/* Grade buttons */}
            <View style={styles.buttonRow}>
              {[1, 2, 3, 4].map((g) => {
                const active = gradeActive(g);
                return (
                  <Pressable
                    key={g}
                    disabled={isReadOnly}
                    onPress={() => handleSelect(g)}
                    style={({ pressed }) => [
                      styles.gradeButton,
                      {
                        backgroundColor: active
                          ? COLORS.brand
                          : "#ffffff",
                        borderColor: COLORS.brand,
                        opacity: isReadOnly ? 0.6 : (pressed ? 0.85 : 1),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.gradeButtonText,
                        {
                          color: active ? "#ffffff" : COLORS.brand,
                        },
                      ]}
                    >
                      {`Class-${g}`}
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

export default MallampatiGradeMobile;

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
  imageWrapper: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    padding: 8,
  },
  image: {
    width: "100%",
    height: 220,
    borderRadius: 8,
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
    marginBottom: 20,
  },
  gradeButton: {
    flexBasis: "48%",
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  gradeButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },

  // Prev / Next inside form
  formNavRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8,
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
