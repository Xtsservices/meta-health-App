// src/screens/triage/TriageZoneFinalMobile.tsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RootState } from "../../store/store";
import { zoneType } from "../../utils/role";
import {
  useTriageForm,
  GetTriageFormDataObject,
} from "./context/triageFormContext";
import { AuthFetch, AuthPost } from "../../auth/auth";
import { showError } from "../../store/toast.slice";
import Footer from "../dashboard/footer";

const { width: W } = Dimensions.get("window");

type Ward = {
  id: number | string;
  name: string;
};

const spinnerColor: Record<number, string> = {
  [zoneType.red]: "#ff6f61",
  [zoneType.yellow]: "#ffdf61",
  [zoneType.green]: "#61ff76",
};

const finalBoxColors: Record<number, string> = {
  [zoneType.red]: "#c43232",
  [zoneType.yellow]: "#fdcb19",
  [zoneType.green]: "#209116",
};

const TriageZoneFinalMobile: React.FC = () => {
  const { formData } = useTriageForm();
  const user = useSelector((s: RootState) => s.currentUser);
  const currentPatient = useSelector((s: RootState) => s.currentPatient);
  const dispatch = useDispatch();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [wards, setWards] = useState<Ward[]>([]);
  const [wardsLoading, setWardsLoading] = useState(false);
  const [wardModalVisible, setWardModalVisible] = useState(false);
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const triagePostRef = useRef(false);

  // 🔴 Zone selection state  (initially RED, or existing zone if available)
  const [selectedZone, setSelectedZone] = useState<number>(
    formData?.zone ?? zoneType.red
  );

  const zoneName = useMemo(
    () =>
      selectedZone === zoneType.red
        ? "Red"
        : selectedZone === zoneType.yellow
        ? "Yellow"
        : "Green",
    [selectedZone]
  );

  const spinnerCol = spinnerColor[selectedZone] ?? "#c6c4ee";
  const boxColor = finalBoxColors[selectedZone] ?? "#209116";

  // Fetch wards on mount
  useEffect(() => {
    const fetchWards = async () => {
      try {
        setWardsLoading(true);
        const token = user?.token ?? (await AsyncStorage.getItem("token"));
        if (!user?.hospitalID || !token) {
          setWards([]);
          return;
        }

        const res = await AuthFetch(`ward/${user.hospitalID}`, token);
        if (res?.status === "success" && "data" in res && Array.isArray(res?.data?.wards)) {
          setWards(res.data.wards);
        } else {
          setWards([]);
        }
      } catch (err) {
        setWards([]);
      } finally {
        setWardsLoading(false);
      }
    };

    fetchWards();
  }, [user?.hospitalID, user?.token]);

  const handleOpenWardPicker = () => {
    setWardModalVisible(true);
  };

  const handleSelectWard = (ward: Ward) => {
    setSelectedWard(ward);
    setWardModalVisible(false);
  };

  const handleConfirm = async () => {
    if (!selectedWard) {
      dispatch(showError("Please select a ward"));
      return;
    }
    if (!user?.hospitalID || !user?.id) {
      dispatch(showError("User or hospital information missing"));
      return;
    }
    if (!currentPatient?.id) {
      dispatch(showError("Patient information missing"));
      return;
    }
    if (triagePostRef.current) return;
    triagePostRef.current = true;

    try {
      setIsSaving(true);
      const token = user.token ?? (await AsyncStorage.getItem("token"));
      if (!token) {
        dispatch(showError("Authentication token missing"));
        triagePostRef.current = false;
        return;
      }

      const data: any = GetTriageFormDataObject(formData);

      const zoneToSend = selectedZone || zoneType.green;

      data.zone = String(zoneToSend);
      data.hospitalID = user?.hospitalID;
      data.userID = user?.id;
      data.ward = String(selectedWard.id);


      const res = await AuthPost(
        `triage/${user?.hospitalID}/${currentPatient?.id}`,
        data,
        token
      );

      if (res?.status === "success" && "data" in res) {
        navigation.navigate("PatientList"); // your list screen
      } else {
        dispatch(showError("message" in res && res?.message?.message || "Failed to save triage"));
        triagePostRef.current = false;
      }
    } catch (err) {
      dispatch(showError("Something went wrong while saving triage"));
      triagePostRef.current = false;
    } finally {
      setIsSaving(false);
    }
  };

  const renderZoneChip = (label: string, value: number, color: string) => {
    const active = selectedZone === value;
    return (
      <TouchableOpacity
        key={label}
        style={[
          styles.zoneChip,
          { borderColor: color },
          active && { backgroundColor: color },
        ]}
        onPress={() => setSelectedZone(value)}
        activeOpacity={0.8}
      >
        <Text
          style={[
            styles.zoneChipText,
            active && { color: "#fff", fontWeight: "700" },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 140 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Triage Zone</Text>

        <View style={styles.centerArea}>
          <Text style={styles.processingText}>
            Patient is being processed under{" "}
            <Text style={styles.zoneName}>{zoneName}</Text> zone
          </Text>

          {/* 🔴 Zone selection row */}
          <View style={styles.zoneSelectorRow}>
            {renderZoneChip("Red", zoneType.red, "#ef4444")}
            {renderZoneChip("Yellow", zoneType.yellow, "#facc15")}
            {renderZoneChip("Green", zoneType.green, "#22c55e")}
          </View>

          {/* Zone card */}
          <View
            style={[
              styles.zoneCard,
              { backgroundColor: boxColor },
              selectedZone === zoneType.red && styles.zoneCardRedShadow,
            ]}
          >
            <Text style={styles.zoneIcon}>
              {selectedZone === zoneType.red ? "⚠️" : "👤"}
            </Text>
            <Text style={styles.zoneCardText}>
              Patient is under {zoneName} Zone
            </Text>
          </View>

          {/* Spinner while saving */}
          <View style={styles.spinnerWrap}>
            <ActivityIndicator
              size="large"
              color={spinnerCol}
              animating={isSaving}
            />
          </View>

          {/* Ward selection */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Assign Ward</Text>
            <TouchableOpacity
              style={styles.wardSelector}
              onPress={handleOpenWardPicker}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.wardSelectorText,
                  !selectedWard && styles.wardPlaceholder,
                ]}
              >
                {selectedWard ? selectedWard.name : "Tap to select ward"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Buttons */}
        <View style={[styles.bottomActions, { marginBottom: 16 }]}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.secondaryBtn]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.secondaryText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionBtn,
              styles.primaryBtn,
              (!selectedWard || isSaving) && { opacity: 0.5 },
            ]}
            disabled={!selectedWard || isSaving}
            onPress={handleConfirm}
          >
            <Text style={styles.primaryText}>
              {isSaving ? "Saving..." : "Confirm & Save"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Footer fixed at bottom */}
      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={"dashboard"} brandColor="#14b8a6" />
      </View>

      {insets.bottom > 0 && (
        <View
          pointerEvents="none"
          style={[styles.navShield, { height: insets.bottom }]}
        />
      )}

      {/* Ward picker modal */}
      <Modal
        visible={wardModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setWardModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Ward</Text>

            {wardsLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="small" color="#14b8a6" />
                <Text style={styles.modalLoadingText}>Loading wards...</Text>
              </View>
            ) : (
              <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={{ paddingVertical: 4 }}
              >
                {wards.map((w) => {
                  const active = selectedWard?.id === w.id;
                  return (
                    <TouchableOpacity
                      key={w.id}
                      style={[
                        styles.modalWardItem,
                        active && { backgroundColor: "#14b8a6" },
                      ]}
                      onPress={() => handleSelectWard(w)}
                    >
                      <Text
                        style={[
                          styles.modalWardText,
                          active && { color: "#fff" },
                        ]}
                      >
                        {w.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                {!wardsLoading && wards.length === 0 && (
                  <Text style={styles.modalEmpty}>No wards found.</Text>
                )}
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnGhost}
                onPress={() => setWardModalVisible(false)}
              >
                <Text style={styles.modalBtnGhostText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default TriageZoneFinalMobile;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 16,
  },
  centerArea: {
    alignItems: "center",
  },
  processingText: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 12,
    textAlign: "center",
  },
  zoneName: {
    fontWeight: "700",
    color: "#0f172a",
  },

  // zone chips
  zoneSelectorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 16,
  },
  zoneChip: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 8,
    marginHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  zoneChipText: {
    fontSize: 13,
    color: "#0f172a",
  },

  zoneCard: {
    width: "100%",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  zoneCardRedShadow: {
    shadowColor: "#c43232",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 6,
  },
  zoneIcon: {
    fontSize: 32,
    marginBottom: 6,
  },
  zoneCardText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
  spinnerWrap: {
    marginVertical: 12,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    width: "100%",
    marginTop: 12,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 8,
  },
  wardSelector: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: "100%",
    backgroundColor: "#f8fafc",
  },
  wardSelectorText: {
    fontSize: 14,
    color: "#0f172a",
  },
  wardPlaceholder: {
    color: "#9ca3af",
  },
  bottomActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 32,
  },
  actionBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    marginRight: 8,
    backgroundColor: "#ffffff",
  },
  primaryBtn: {
    backgroundColor: "#14b8a6",
    marginLeft: 8,
  },
  primaryText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  secondaryText: {
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
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#ffffff",
  },

  // modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: W * 0.06,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    elevation: 6,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 8,
  },
  modalLoading: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 8,
  },
  modalLoadingText: {
    fontSize: 14,
    color: "#64748b",
  },
  modalScroll: {
    maxHeight: 260,
    marginTop: 8,
  },
  modalWardItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 8,
  },
  modalWardText: {
    fontSize: 15,
    color: "#0f172a",
  },
  modalEmpty: {
    marginTop: 12,
    fontSize: 14,
    color: "#94a3b8",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
  },
  modalBtnGhost: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
  },
  modalBtnGhostText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
});
