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
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import useAnesthesiaRecordForm from "../../../utils/useAnesthesiaRecordForm";
import Footer from "../../dashboard/footer";

const COLORS = {
  bg: "#f8fafc",
  card: "#ffffff",
  text: "#0f172a",
  sub: "#64748b",
  border: "#e2e8f0",
  field: "#f8fafc",
  brand: "#14b8a6",
  brandDark: "#0f766e",
  chip: "#e5e7eb",
  shadow: "#000000",
};

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
            fontSize: 15,
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
                <Text style={{ color: COLORS.text, fontWeight: "700" }}>
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

  const canNext = useMemo(
    () =>
      !!(
        anesthesiaRecordForm.airwayManagement ||
        anesthesiaRecordForm.airwaySize ||
        anesthesiaRecordForm.vascularAccess ||
        anesthesiaRecordForm.laryngoscopy
      ),
    [anesthesiaRecordForm]
  );

  return (
    <View style={[styles.safeArea, { backgroundColor: COLORS.bg }]}>
      <View style={styles.root}>
        <KeyboardAwareScrollView
          enableOnAndroid
          enableAutomaticScroll
          keyboardOpeningTime={0}
          extraScrollHeight={Platform.select({ ios: 24, android: 80 })}
          extraHeight={Platform.select({ ios: 0, android: 100 })}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scrollInner,
            { paddingBottom: 120 }, // extra so Next button is not hidden behind footer
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
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 4,
  },
  subHeader: {
    fontSize: 12,
    color: COLORS.sub,
    marginBottom: 10,
  },
  block: {
    marginTop: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 6,
  },
  selectInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: "center",
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 16,
    padding: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 8,
  },
  modalList: {
    maxHeight: 260,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
  },
  optionRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
    gap: 10,
  },
  modalBtn: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  // Next inside form
  formNavRow: {
    marginTop: 24,
  },
  nextBtn: {
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  nextText: {
    color: "#fff",
    fontSize: 15,
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
