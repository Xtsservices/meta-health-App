// src/screens/ot/anesthesia/BreathingFormMobile.tsx

import React, { FC, useState } from "react";
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
} from "react-native";
import useAnesthesiaForm from "../../../utils/useAnesthesiaRecordForm";

type Props = {
  onNext?: () => void;
};

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

/** ---------- Main Breathing / Ventilation Screen ---------- */
const BreathingFormMobile: FC<Props> = ({ onNext }) => {
  const { breathingForm, setBreathingForm } = useAnesthesiaForm();

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

  const handleTextChange = (field: keyof typeof breathingForm, value: string) => {
    setBreathingForm({ [field]: value });
  };

  const handleNextPress = () => {
    if (onNext) {
      onNext();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>Breathing / Ventilation</Text>

        {/* Card */}
        <View style={styles.card}>
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
                placeholderTextColor="#9ca3af"
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
                placeholderTextColor="#9ca3af"
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
                placeholderTextColor="#9ca3af"
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
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                value={breathingForm.pressure}
                onChangeText={(txt) => handleTextChange("pressure", txt)}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Next button */}
      <View style={styles.footer}>
        <Pressable
          onPress={handleNextPress}
          style={({ pressed }) => [
            styles.nextButton,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.nextButtonText}>Next</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
};

export default BreathingFormMobile;

/** ---------- Styles ---------- */
const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  heading: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 12,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },

  // shared with SelectField
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

  row: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  col: {
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#f9fafb",
  },

  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: "#ffffff",
  },
  nextButton: {
    height: 46,
    borderRadius: 999,
    backgroundColor: COLORS.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },

  // modal styles (same vibe as AnesthesiaRecordFormScreen)
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
});
