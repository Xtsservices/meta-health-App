// src/screens/ot/AnesthesiaRecordFormScreen.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  FlatList,
  TouchableOpacity,
  Platform,
  Dimensions,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import useAnesthesiaRecordForm from "../../../utils/useAnesthesiaRecordForm";
import Footer from "../../dashboard/footer";
import { COLORS } from "../../../utils/colour";

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

const airwayManagementOptions = ["Oral", "Nasal", "ETT", "SGD", "Tracheostomy"];
const airwaySizeOptions = ["Size 1", "Size 2", "Size 3"];
const laryngoscopyOptions = ["Grade 1", "Grade 2", "Grade 3", "Grade 4"];
const vascularAccessOptions = ["IV", "Central"];

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

/** ---------- Main Anesthesia Record Form (RN) ---------- */
const AnesthesiaRecordFormScreen: React.FC<Props> = ({
  onNext,
  brandColor,
}) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const brand = brandColor || COLORS.brand;

  const { anesthesiaRecordForm, setAnesthesiaRecordForm } =
    useAnesthesiaRecordForm();

  const canNext = true

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
            <Text style={styles.header}>Anesthesia Record</Text>
            <Text style={styles.subHeader}>
              Select airway and vascular access details. Your choices are stored
              in the anesthesia record store, same as web.
            </Text>

            {/* Airway Management */}
            <SelectField
              label="Airway Management"
              value={anesthesiaRecordForm.airwayManagement}
              options={airwayManagementOptions}
              onChange={(val) =>
                setAnesthesiaRecordForm({ airwayManagement: val })
              }
            />

            {/* Vascular Access */}
            <SelectField
              label="Vascular Access"
              value={anesthesiaRecordForm.vascularAccess}
              options={vascularAccessOptions}
              onChange={(val) =>
                setAnesthesiaRecordForm({ vascularAccess: val })
              }
            />

            {/* Airway Size */}
            <SelectField
              label="Airway Size"
              value={anesthesiaRecordForm.airwaySize}
              options={airwaySizeOptions}
              onChange={(val) => setAnesthesiaRecordForm({ airwaySize: val })}
            />

            {/* Laryngoscopy */}
            <SelectField
              label="Laryngoscopy"
              value={anesthesiaRecordForm.laryngoscopy}
              options={laryngoscopyOptions}
              onChange={(val) =>
                setAnesthesiaRecordForm({ laryngoscopy: val })
              }
            />

            {/* Next button inside form */}
            <View style={styles.formNavRow}>
              <Pressable
                onPress={() => {
                  if (onNext) {
                    onNext();
                  } else {
                    navigation.navigate("Breathing" as never);
                  }
                }}
                style={({ pressed }) => [
                  styles.nextBtn,
                  {
                    backgroundColor: brand,
                    opacity: pressed ? 0.8 : 1,
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
          <Footer active={"dashboard"} brandColor="#14b8a6" />
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

export default AnesthesiaRecordFormScreen;

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

  // Modal
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