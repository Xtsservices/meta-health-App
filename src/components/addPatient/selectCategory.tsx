// src/screens/AddPatientMobile.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Baby, User } from "lucide-react-native";
import Svg, { Path } from "react-native-svg";
import { useSelector } from "react-redux";

import Footer from "../dashboard/footer"; // ⬅️ same Footer you use in Dashboard
import { RootState } from "../../store/store";
import { FONT_SIZE, isExtraSmallDevice, isSmallDevice, responsiveWidth, SPACING } from "../../utils/responsive";

type Props = {
  status: string | number;
};

type TabKey = "dashboard" | "addPatient" | "patients" | "management";

const { width: W } = Dimensions.get("window");
const isTablet = W >= 768;
const FOOTER_HEIGHT = 70;

/** Inline Child icon (same shape/colors as your web SVG) */
const ChildIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 28,
  color = "#2563eb",
}) => (
  <Svg viewBox="0 0 24 24" width={size} height={size} fill={color}>
    <Path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2a2 2 0 1 1 0-4Zm9 7V7l-6 .5V9c0 2.8-2.2 5-5 5S5 11.8 5 9V7.5L3 7v2c0 3.2 2.3 5.8 5.5 6.7V22h2v-6.3c1-.2 1.9-.7 2.7-1.4l3.3 3.3 1.4-1.4-3.3-3.3c.2-.6.4-1.2.4-1.9V9h6Z" />
  </Svg>
);

const AddPatientMobile: React.FC<Props> = ({ status }) => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const user = useSelector((s: RootState) => s.currentUser);

  // support both roleName / rolename just in case
  const roleName = (user?.roleName ?? (user as any)?.rolename ?? "").toLowerCase();
  const isReception = roleName === "reception";

  // ptype: 1 = OPD, 2 = IPD, 3 = Emergency
  const [ptype, setPtype] = useState<"1" | "2" | "3">("1");

  const bottomPad = useMemo(
    () => FOOTER_HEIGHT + insets.bottom + 16,
    [insets.bottom]
  );

  const goNeonate = () =>
    navigation.navigate("AddPatientForm", { category: "1", ptype });
  const goChild = () =>
    navigation.navigate("AddPatientForm", { category: "2", ptype });
  const goAdult = () =>
    navigation.navigate("AddPatientForm", { category: "3", ptype });
  const goHelp = () => navigation.navigate("Help");

  const renderReceptionPtypeSelector = () => {
    if (!isReception) return null;

    const options: { label: string; value: "1" | "2" | "3" }[] = [
      { label: "OPD", value: "1" },
      { label: "IPD", value: "2" },
      { label: "Emergency", value: "3" },
    ];

    return (
      <View style={styles.ptypeBlock}>
        <Text style={styles.ptypeLabel}>Visit Type</Text>
        <View style={styles.ptypeRow}>
          {options.map((opt) => {
            const selected = ptype === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                activeOpacity={0.8}
                style={[
                  styles.ptypePill,
                  selected && styles.ptypePillActive,
                ]}
                onPress={() => setPtype(opt.value)}
              >
                <View style={styles.ptypeRadioOuter}>
                  {selected && <View style={styles.ptypeRadioInner} />}
                </View>
                <Text
                  style={[
                    styles.ptypeText,
                    selected && styles.ptypeTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle={
          Platform.OS === "android" ? "dark-content" : "dark-content"
        }
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: bottomPad },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          {/* Head */}
          <View style={styles.head}>
            <Text style={styles.title}>Choose Patient Category</Text>
            <Text style={styles.sub}>
              Select the appropriate age category to proceed with patient
              registration
            </Text>
          </View>

          {/* Reception ptype selector (OPD/IPD/Emergency) */}
          {renderReceptionPtypeSelector()}

          {/* Cards grid (stacked for mobile, clean spacing) */}
          <View style={styles.grid}>
            {/* Neonate */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.card, styles.cardNeonate]}
              onPress={goNeonate}
            >
              <View style={[styles.iconBadge, styles.badgePink]}>
                <Baby size={28} color="#db2777" />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>Neonate</Text>
                <Text style={styles.cardDesc}>
                  Newborn babies (0-28 days)
                </Text>
                <Text style={styles.cardFooter}>CLICK TO CONTINUE</Text>
              </View>
            </TouchableOpacity>

            {/* Child */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.card, styles.cardChild]}
              onPress={goChild}
            >
              <View style={[styles.iconBadge, styles.badgeBlue]}>
                <ChildIcon color="#2563eb" />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>Child</Text>
                <Text style={styles.cardDesc}>
                  Pediatric patients (29 days - 17 years)
                </Text>
                <Text style={styles.cardFooter}>CLICK TO CONTINUE</Text>
              </View>
            </TouchableOpacity>

            {/* Adult */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.card, styles.cardAdult]}
              onPress={goAdult}
            >
              <View style={[styles.iconBadge, styles.badgeTeal]}>
                <User size={28} color="#14b8a6" />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>Adult</Text>
                <Text style={styles.cardDesc}>Adult patients (18+ years)</Text>
                <Text style={styles.cardFooter}>CLICK TO CONTINUE</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Help card */}
          <View style={styles.help}>
            <View style={styles.helpCard}>
              <View
                style={[styles.iconBadge, styles.badgeTeal, styles.helpBadge]}
              >
                <User size={28} color="#14b8a6" />
              </View>
              <Text style={styles.helpTitle}>Need Help?</Text>
              <Text style={styles.helpText}>
                If you're unsure about the patient category, our staff can
                assist you with the registration process.
              </Text>
              <TouchableOpacity
                style={styles.helpBtn}
                onPress={goHelp}
                activeOpacity={0.85}
              >
                <Text style={styles.helpBtnText}>Contact Support</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Persistent footer (safe-area aware) */}
      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={"addPatient"} brandColor="#14b8a6" />
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

export default AddPatientMobile;

/* -------------------------- Styles -------------------------- */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#ffffff" },
  scroll: { flex: 1 },
  content: { padding: 16 },
  head: { alignItems: "center", marginTop: 2, marginBottom: 8 },
  title: { margin: 0, fontSize: 22, fontWeight: "700", color: "#111827" },
  sub: { marginTop: 6, color: "#6b7280", fontSize: 14, textAlign: "center" },

  /* Reception ptype selector */
  /* Reception ptype selector */
  ptypeBlock: {
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  ptypeLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: "#111827",
    marginBottom: SPACING.xs,
  },
  ptypeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ptypePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: isExtraSmallDevice ? SPACING.xs : SPACING.sm,
    paddingVertical: isSmallDevice ? SPACING.xs : 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    flex: 1,
    marginRight: 8,
    minWidth: responsiveWidth(28), // 3 pills fit even on small screens
  },
  ptypePillActive: {
    borderColor: "#14b8a6",
    backgroundColor: "#ecfeff",
  },
  ptypeRadioOuter: {
    width: isSmallDevice ? 14 : 18,
    height: isSmallDevice ? 14 : 18,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#9ca3af",
    alignItems: "center",
    justifyContent: "center",
    marginRight: isExtraSmallDevice ? SPACING.xs : 8,
  },
  ptypeRadioInner: {
    width: isSmallDevice ? 8 : 10,
    height: isSmallDevice ? 8 : 10,
    borderRadius: 999,
    backgroundColor: "#14b8a6",
  },
  ptypeText: {
    fontSize: isExtraSmallDevice ? FONT_SIZE.xs : FONT_SIZE.sm,
    color: "#374151",
    fontWeight: "500",
  },
  ptypeTextActive: {
    color: "#0f172a",
    fontWeight: "700",
  },


  grid: {
    width: "100%",
    gap: 18,
    marginTop: 10,
    marginBottom: 28,
  },

  card: {
    borderWidth: 2,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 26,
    paddingHorizontal: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardNeonate: {},
  cardChild: {},
  cardAdult: {},

  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "rgba(15,23,42,0.06)",
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 1,
  },
  badgePink: { backgroundColor: "#fde8f3" },
  badgeBlue: { backgroundColor: "#eff6ff" },
  badgeTeal: { backgroundColor: "rgba(20, 184, 166, 0.10)" },

  cardBody: { width: "100%", maxWidth: 320, alignItems: "center" },
  cardTitle: {
    marginTop: 12,
    marginBottom: 8,
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  cardDesc: {
    marginBottom: 14,
    color: "#374151",
    fontSize: 14,
    textAlign: "center",
  },
  cardFooter: {
    marginTop: 6,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#f3f4f6",
    fontSize: 11,
    color: "#6b7280",
    letterSpacing: 0.6,
  },

  /* Help card */
  help: { alignItems: "center", marginTop: 4 },
  helpCard: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    paddingVertical: 22,
    paddingHorizontal: 20,
    maxWidth: 560,
    width: "100%",
    alignItems: "center",
  },
  helpBadge: { marginBottom: 10 },
  helpTitle: {
    marginVertical: 6,
    fontWeight: "700",
    color: "#111827",
    fontSize: 16,
  },
  helpText: {
    marginBottom: 10,
    color: "#374151",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  helpBtn: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    height: 36,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  helpBtnText: { color: "#111827", fontWeight: "700" },

  /* Footer (same approach as Dashboard) */
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
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
    backgroundColor: "#fff", // same as footer/bg
    zIndex: 9, // just under the footer
  },
});
