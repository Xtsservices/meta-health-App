// src/screens/ot/anesthesia/BreathingFormMobile.tsx

import React, { FC, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Pressable,
  Modal,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useAnesthesiaForm from "../../../utils/useAnesthesiaRecordForm";
import { COLORS } from "../../../utils/colour";
import { useNavigation } from "@react-navigation/native";
import Footer from "../../dashboard/footer";

// Get screen dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Dynamic scaling functions
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;
const verticalScale = (size: number) => (SCREEN_HEIGHT / 812) * size;
const moderateScale = (size: number, factor = 0.5) =>
  size + (scale(size) - size) * factor;

type Props = {
  onNext?: () => void;
  brandColor?: string;
};

/** ---------- Generic Select Field (modal dropdown) ---------- */
type SelectFieldProps = {
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
};

const SelectField: React.FC<SelectFieldProps> = ({
  label,
  value,
  options,
  onChange,
}) => {
  const [open, setOpen] = useState(false);
  const selectedDisplay = value || "Select";

  return (
    <View style={styles.block}>
      <Text style={styles.label}>{label}</Text>

      <Pressable
        onPress={() => setOpen(true)}
        style={[
          styles.selectInput,
          {
            borderColor: COLORS.border,
            backgroundColor: COLORS.field,
          },
        ]}
      >
        <Text
          style={{
            color: value ? COLORS.text : COLORS.sub,
            fontSize: moderateScale(15),
            fontWeight: value ? "600" : "400",
          }}
        >
          {selectedDisplay}
        </Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{label}</Text>

            <FlatList
              data={options}
              keyExtractor={(item) => item}
              style={styles.modalList}
              renderItem={({ item }) => {
                const selected = item === value;
                return (
                  <TouchableOpacity
                    onPress={() => {
                      onChange(item);
                      setOpen(false);
                    }}
                    style={[
                      styles.optionRow,
                      selected && {
                        backgroundColor: COLORS.brand,
                        borderColor: COLORS.brand,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: selected ? "#fff" : COLORS.text,
                        fontWeight: selected ? "800" : "500",
                        fontSize: moderateScale(15),
                      }}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setOpen(false)}
                style={[styles.modalBtn, { backgroundColor: COLORS.chip }]}
              >
                <Text
                  style={{
                    color: COLORS.text,
                    fontWeight: "700",
                    fontSize: moderateScale(14),
                  }}
                >
                  Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

/** ---------- Main Breathing / Ventilation Screen ---------- */
const BreathingFormMobile: FC<Props> = ({ onNext, brandColor }) => {
  const insets = useSafeAreaInsets();
  const { breathingForm, setBreathingForm } = useAnesthesiaForm();
  const brand = brandColor || COLORS.brand;
  const navigation = useNavigation<any>();

  // 🔹 Options (same as web AnesthesiaRecordData)
  const breathingSystemOptions = ["Circle", "Other", "T-Pipe", "Bain"];
  const filterOptions = ["Filter", "HME", "Active Humidifier", "Bain"];
  const ventilationOptions = ["Spont Vent", "IPPV", "CPAP", "PEEP"];

  const handleSelectChange = (
    field: keyof typeof breathingForm,
    value: string
  ) => {
    setBreathingForm({ [field]: value });
  };

  const handleTextChange = (
    field: keyof typeof breathingForm,
    value: string
  ) => {
    setBreathingForm({ [field]: value });
  };

  const handleNextPress = () => {
    if (onNext) {
      onNext();
    } else {
      navigation.navigate("Monitors" as never);
    }
  };

  const canNext = useMemo(
    () =>
      !!(
        breathingForm.breathingSystem ||
        breathingForm.filter ||
        breathingForm.ventilation ||
        breathingForm.vt ||
        breathingForm.rr ||
        breathingForm.vm ||
        breathingForm.pressure
      ),
    [breathingForm]
  );

  return (
    <View style={[styles.safeArea, { backgroundColor: COLORS.bg }]}>
      <View style={styles.root}>
        <KeyboardAwareScrollView
          enableOnAndroid
          enableAutomaticScroll
          keyboardOpeningTime={0}
          extraScrollHeight={Platform.select({
            ios: verticalScale(24),
            android: verticalScale(80),
          })}
          extraHeight={Platform.select({
            ios: 0,
            android: verticalScale(100),
          })}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scrollInner,
            { paddingBottom: verticalScale(120) },
          ]}
        >
          <View
            style={[
              styles.card,
              { backgroundColor: COLORS.card, borderColor: COLORS.border },
            ]}
          >
            <Text style={styles.header}>Breathing / Ventilation</Text>
            <Text style={styles.subHeader}>
              Configure breathing system, filters, ventilation mode and
              parameters. Your choices are stored in the anesthesia record
              store.
            </Text>

          {/* Breathing System */}
          <SelectField
            label="Breathing System"
            value={breathingForm.breathingSystem}
            options={breathingSystemOptions}
            onChange={(val) => handleSelectChange("breathingSystem", val)}
          />

          {/* Filter */}
          <SelectField
            label="Filter"
            value={breathingForm.filter}
            options={filterOptions}
            onChange={(val) => handleSelectChange("filter", val)}
          />

          {/* Ventilation */}
          <SelectField
            label="Ventilation"
            value={breathingForm.ventilation}
            options={ventilationOptions}
            onChange={(val) => handleSelectChange("ventilation", val)}
          />

          {/* Row: VT & RR */}
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>VT</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter VT"
                placeholderTextColor={COLORS.sub}
                keyboardType="numeric"
                value={breathingForm.vt}
                onChangeText={(txt) => handleTextChange("vt", txt)}
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>RR</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter RR"
                placeholderTextColor={COLORS.sub}
                keyboardType="numeric"
                value={breathingForm.rr}
                onChangeText={(txt) => handleTextChange("rr", txt)}
              />
            </View>
          </View>

          {/* Row: VM & Pressure */}
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>VM</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter VM"
                placeholderTextColor={COLORS.sub}
                keyboardType="numeric"
                value={breathingForm.vm}
                onChangeText={(txt) => handleTextChange("vm", txt)}
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Pressure</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter pressure"
                placeholderTextColor={COLORS.sub}
                keyboardType="numeric"
                value={breathingForm.pressure}
                onChangeText={(txt) => handleTextChange("pressure", txt)}
              />
            </View>
          </View>

      {/* Next button inside form */}
      <View style={styles.formNavRow}>
        <Pressable
          onPress={handleNextPress}
                disabled={!canNext}
          style={({ pressed }) => [
            styles.nextBtn,
            {
                    backgroundColor: canNext ? brand : "#cbd5e1",
                    opacity: pressed && canNext ? 0.8 : 1,
                  },
          ]}
        >
          <Text style={styles.nextText}>Next</Text>
        </Pressable>
            </View>
          </View>
        </KeyboardAwareScrollView>

        {/* Bottom app footer */}
        <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
          <Footer active={"dashboard"} brandColor={brand} />
        </View>
        {insets.bottom > 0 && (
          <View
            pointerEvents="none"
            style={[styles.navShield, { height: insets.bottom }]}
          />
        )}
      </View>
    </View>
  );
};

export default BreathingFormMobile;

/** ---------- Styles ---------- */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  root: {
    flex: 1,
  },
  scrollInner: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(16),
  },
  card: {
    borderRadius: moderateScale(16),
    borderWidth: 1,
    padding: moderateScale(14),
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    marginBottom:moderateScale(100),
  },
  header: {
    fontSize: moderateScale(16),
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: verticalScale(4),
  },
  subHeader: {
    fontSize: moderateScale(12),
    color: COLORS.sub,
    marginBottom: verticalScale(10),
    lineHeight: moderateScale(18),
  },

  // shared with SelectField
  block: {
    marginTop: verticalScale(10),
  },
  label: {
    fontSize: moderateScale(12),
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: verticalScale(6),
  },
  selectInput: {
    borderWidth: 1.5,
    borderRadius: moderateScale(12),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
    justifyContent: "center",
    minHeight: verticalScale(44),
  },

  row: {
    flexDirection: "row",
    gap: scale(12),
    marginTop: verticalScale(12),
  },
  col: {
    flex: 1,
  },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: moderateScale(10),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(8),
    fontSize: moderateScale(14),
    color: COLORS.text,
    backgroundColor: COLORS.field,
    minHeight: verticalScale(44),
  },

  // modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: scale(16),
  },
  modalCard: {
    width: SCREEN_WIDTH * 0.9,
    maxWidth: scale(420),
    borderRadius: moderateScale(16),
    padding: moderateScale(14),
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    fontSize: moderateScale(14),
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: verticalScale(8),
  },
  modalList: {
    maxHeight: verticalScale(260),
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: moderateScale(12),
  },
  optionRow: {
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(12),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    minHeight: verticalScale(44),
    justifyContent: "center",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: verticalScale(10),
    gap: scale(10),
  },
  modalBtn: {
    borderRadius: moderateScale(12),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
    alignItems: "center",
    justifyContent: "center",
    minHeight: verticalScale(40),
  },

  // Next inside form
  formNavRow: {
    marginTop: verticalScale(24),
  },
  nextBtn: {
    borderRadius: moderateScale(999),
    paddingVertical: verticalScale(14),
    alignItems: "center",
    justifyContent: "center",
    minHeight: verticalScale(48),
  },
  nextText: {
    color: "#fff",
    fontSize: moderateScale(15),
    fontWeight: "800",
  },

  // Bottom Footer
  footerWrap: {
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