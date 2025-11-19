// src/screens/TriageTraumaTypeScreen.tsx

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Footer from "../dashboard/footer";


type Nav = ReturnType<typeof useNavigation>;

const TriageTraumaTypeScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // 🔹 Adjust route names as per your navigator
  const handleTrauma = () => navigation.navigate("TriageTrauma" as never);
  const handleNonTrauma = () =>
    navigation.navigate("TriageNonTrauma" as never);
  const handleNext = () => navigation.navigate("TriageZoneForm" as never);
  const handleBack = () => navigation.goBack();

  return (
    <View style={styles.screenWrap}>
      <KeyboardAwareScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 120 },
        ]}
        enableOnAndroid
        extraScrollHeight={Platform.OS === "ios" ? 60 : 100}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Select Type</Text>
          <Text style={styles.subtitle}>
            Choose whether the case is trauma or non-trauma.
          </Text>
        </View>

        {/* Selector cards */}
        <View style={styles.selectorWrap}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.choice, styles.choiceTrauma]}
            onPress={handleTrauma}
          >
            <View style={styles.choiceIconWrap}>
              {/* Replace source with your actual asset path */}
              {/* <Image
                source={require("../../assets/triage/ShieldBolt.png")}
                style={styles.choiceIcon}
                resizeMode="contain"
              /> */}
            </View>
            <View style={styles.choiceTextWrap}>
              <Text style={styles.choiceLabel}>Trauma</Text>
              <Text style={styles.choiceHint}>
                Accidents, falls, injuries
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.choice, styles.choiceNonTrauma]}
            onPress={handleNonTrauma}
          >
            <View style={styles.choiceIconWrap}>
              {/* Replace source with your actual asset path */}
              {/* <Image
                source={require("../../assets/triage/Shield.png")}
                style={styles.choiceIcon}
                resizeMode="contain"
              /> */}
            </View>
            <View style={styles.choiceTextWrap}>
              <Text style={styles.choiceLabel}>Non-Trauma</Text>
              <Text style={styles.choiceHint}>
                Medical, surgical (non-injury)
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Bottom buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.navBtn, styles.navBtnSecondary]}
            onPress={handleBack}
          >
            <Text style={styles.navSecondaryText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navBtn, styles.navBtnPrimary]}
            onPress={handleNext}
          >
            <Text style={styles.navPrimaryText}>Next</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>

      {/* Fixed footer (like your other screens) */}
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
  );
};

export default TriageTraumaTypeScreen;

/* -------------------------------------------------------------------------- */
/*                                   Styles                                   */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  screenWrap: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#64748b",
  },
  selectorWrap: {
    gap: 14,
    marginBottom: 24,
  },
  choice: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  choiceTrauma: {
    borderColor: "#f97373",
    backgroundColor: "#fef2f2",
  },
  choiceNonTrauma: {
    borderColor: "#22c55e",
    backgroundColor: "#ecfdf3",
  },
  choiceIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  choiceIcon: {
    width: 26,
    height: 26,
  },
  choiceTextWrap: {
    flex: 1,
  },
  choiceLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 2,
  },
  choiceHint: {
    fontSize: 12,
    color: "#64748b",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 8,
  },
  navBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  navBtnSecondary: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    marginRight: 8,
    backgroundColor: "#ffffff",
  },
  navBtnPrimary: {
    marginLeft: 8,
    backgroundColor: "#14b8a6",
  },
  navPrimaryText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  navSecondaryText: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "600",
  },
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  navShield: {
    backgroundColor: "#ffffff",
    width: "100%",
  },
});
