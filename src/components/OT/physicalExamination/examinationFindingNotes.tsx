// src/screens/ot/ExaminationFindingNotesMobile.tsx

import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  SafeAreaView,
  TextInput,
  Pressable,
  NativeSyntheticEvent,
  TextInputContentSizeChangeEventData,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import usePhysicalExaminationForm from "../../../utils/usePhysicalExaminationForm";
import Footer from "../../dashboard/footer";

interface ExaminationFindingNotesShape {
  examinationFindingNotes: string;
  smokingTobacco: string;
  cardioVascularExamination: string;
  abdominalExamination: string;
  alcohol: string;
  neuroMuscularExamination: string;
  spineExamination: string;
}

type FieldKey = keyof ExaminationFindingNotesShape;

const FIELDS: { key: FieldKey; label: string }[] = [
  { key: "examinationFindingNotes", label: "Examination Finding Notes" },
  { key: "smokingTobacco", label: "Smoking Tobacco" },
  {
    key: "cardioVascularExamination",
    label: "Cardio Vascular Examination",
  },
  { key: "abdominalExamination", label: "Abdominal Examination" },
  { key: "alcohol", label: "Alcohol" },
  {
    key: "neuroMuscularExamination",
    label: "Neuro Muscular Examination",
  },
  { key: "spineExamination", label: "Spine Examination" },
];

const ExaminationFindingNotesMobile: React.FC = () => {
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const isDark = scheme === "dark";

  const { examinationFindingNotes, setExaminationFindingNotes } =
    usePhysicalExaminationForm() as {
      examinationFindingNotes: ExaminationFindingNotesShape;
      setExaminationFindingNotes: (
        updates: Partial<ExaminationFindingNotesShape>
      ) => void;
    };

  const COLORS = useMemo(
    () => ({
      bg: "#f8fafc",
      card: "#ffffff",
      text: "#0f172a",
      sub: "#64748b",
      border: "#e2e8f0",
      brand: "#14b8a6",
      brandSoft: "#0ea5a733",
      footerBg: "#ffffff",
    }),
    [isDark]
  );

  // dynamic height for each textarea
  const [inputHeights, setInputHeights] = useState<
    Partial<Record<FieldKey, number>>
  >({});

  const handleChange = (key: FieldKey, value: string) => {
    setExaminationFindingNotes({ [key]: value });
  };

  const handleContentSizeChange = (
    key: FieldKey,
    e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>
  ) => {
    const h = e.nativeEvent.contentSize.height;
    setInputHeights((prev) => ({
      ...prev,
      [key]: h,
    }));
  };

  const handlePrev = () => {
    navigation.goBack();
  };

  const handleNext = () => {
    navigation.navigate("GeneralPhysicalExamination" as never);
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
              Add detailed notes for each section
            </Text>

            {FIELDS.map((field) => {
              const value = examinationFindingNotes?.[field.key] ?? "";
              const dynamicHeight = Math.max(
                80,
                inputHeights[field.key] ?? 80
              ); // default 80, grow as user types

              return (
                <View key={field.key} style={styles.fieldBlock}>
                  <Text style={[styles.label, { color: COLORS.text }]}>
                    {field.label}
                  </Text>
                  <TextInput
                    multiline
                    value={value}
                    onChangeText={(text) => handleChange(field.key, text)}
                    onContentSizeChange={(e) =>
                      handleContentSizeChange(field.key, e)
                    }
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                    style={[
                      styles.textArea,
                      {
                        height: dynamicHeight,
                        borderColor: COLORS.border,
                        color: COLORS.text,
                      },
                    ]}
                    textAlignVertical="top"
                  />
                </View>
              );
            })}

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

export default ExaminationFindingNotesMobile;

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
  subtitle: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 12,
  },
  fieldBlock: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  textArea: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    lineHeight: 18,
    backgroundColor: "#ffffff",
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
