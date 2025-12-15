// src/screens/triage/TriageDialogMobile.tsx

import React, { useEffect, useState, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RootState } from "../../store/store";
import { AuthFetch, AuthPost } from "../../auth/auth";
import {
  useTriageForm,
  GetTriageFormDataObject,
} from "./context/triageFormContext";
import { zoneType } from "../../utils/role";
import { showError, showSuccess } from "../../store/toast.slice";
import { useNavigation } from "@react-navigation/native";

const { width: W } = Dimensions.get("window");

type Ward = {
  id: number | string;
  name: string;
};

type Props = {
  visible: boolean;
  conditionLabel: string | null;
  onClose: () => void;
  onSubmit: (wardId: string) => void;
};

const TriageDialogMobile: React.FC<Props> = ({
  visible,
  conditionLabel,
  onClose,
  onSubmit,
}) => {
  const user = useSelector((s: RootState) => s.currentUser);
  const currentPatient = useSelector((s: RootState) => s.currentPatient);
  const { formData } = useTriageForm();
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedWard, setSelectedWard] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [wardSearch, setWardSearch] = useState("");

  // Filter wards
  const filteredWards = useMemo(() => {
    const s = wardSearch.trim().toLowerCase();
    if (!s) return wards;
    return wards.filter((w) => w.name.toLowerCase().includes(s));
  }, [wards, wardSearch]);

  // Fetch wards when modal opens
  useEffect(() => {
    const fetchWards = async () => {
      try {
        setLoading(true);
        const token = user?.token ?? (await AsyncStorage.getItem("token"));
        if (!user?.hospitalID || !token) {
          setWards([]);
          return;
        }

        const res = await AuthFetch(`ward/${user.hospitalID}`, token);

        if (
          res?.status === "success" &&
          "data" in res &&
          Array.isArray(res?.data?.wards)
        ) {
          setWards(res.data.wards);
        } else {
          setWards([]);
        }
      } finally {
        setLoading(false);
      }
    };

    if (visible) {
      setSelectedWard("");
      setWardSearch("");
      fetchWards();
    }
  }, [visible, user?.hospitalID, user?.token]);

  const handleSubmit = async () => {
    if (!selectedWard || submitting) return;
    if (!user?.hospitalID || !user?.id || !currentPatient?.id) {
      return;
    }

    try {
      setSubmitting(true);
      const token = user.token ?? (await AsyncStorage.getItem("token"));
      if (!token) {
        dispatch(showError("Missing authorization, please login "));
        navigation.navigate("Login" as never);
        return;
      }

      const data: any = GetTriageFormDataObject(formData);

      // force RED zone for this dialog
      data.zone = String(zoneType.red);
      data.hospitalID = user.hospitalID;
      data.userID = user.id;
      data.ward = String(selectedWard);

      const res = await AuthPost(
        `triage/${user.hospitalID}/${currentPatient.id}`,
        data,
        token
      );

      if (res?.status === "success") {
        dispatch(
          showSuccess("Patient transfered to Red zone successfully")
        );
        onClose();
        navigation.navigate("PatientList" as never);
      } else {
        dispatch(
          showError(
            ("message" in res && (res as any)?.message) ||
              (res as any) ||
              "Triage transfer failed"
          )
        );
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : "Triage transfer failed";

      dispatch(showError(message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title} numberOfLines={1}>
            Transferring Patient to RED Zone
          </Text>
          <Text style={styles.condition}>
            {conditionLabel?.toUpperCase() || "CRITICAL CONDITION"}
          </Text>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color="#14b8a6" />
              <Text style={styles.loadingText}>Loading wards...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.wardHeading}>Select Ward</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search wards..."
                placeholderTextColor="#94a3b8"
                value={wardSearch}
                onChangeText={setWardSearch}
              />

              <ScrollView
                style={styles.wardsScroll}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 4 }}
              >
                {filteredWards.map((w, idx) => {
                  const active = String(w.id) === selectedWard;
                  return (
                    <TouchableOpacity
                      key={w.id}
                      style={[
                        styles.wardRow,
                        active && styles.wardRowActive,
                        idx === filteredWards.length - 1 && {
                          borderBottomWidth: 0,
                        },
                      ]}
                      onPress={() => setSelectedWard(String(w.id))}
                    >
                      <Text
                        style={[
                          styles.wardLabel,
                          active && styles.wardLabelActive,
                        ]}
                        numberOfLines={1}
                      >
                        {w.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                {filteredWards.length === 0 && !loading && (
                  <Text style={styles.emptyText}>
                    No wards found. Try a different search.
                  </Text>
                )}
              </ScrollView>
            </>
          )}

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.btnGhost} onPress={onClose}>
              <Text style={styles.btnGhostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.btnPrimary,
                (!selectedWard || submitting) && { opacity: 0.5 },
              ]}
              onPress={handleSubmit}
              disabled={!selectedWard || submitting}
            >
              <Text style={styles.btnPrimaryText}>
                {submitting ? "Submitting..." : "Submit"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default TriageDialogMobile;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: W * 0.05,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    elevation: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  condition: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
    color: "#f97316",
    fontStyle: "italic",
    textAlign: "center",
  },
  wardHeading: {
    marginTop: 10,
    marginBottom: 2,
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
  loadingWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#64748b",
    marginLeft: 8,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    color: "#0f172a",
    backgroundColor: "#f8fafc",
  },
  wardsScroll: {
    marginTop: 6,
    maxHeight: 320,
  },
  wardRow: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
  },
  wardRowActive: {
    backgroundColor: "#e0f7f5",
  },
  wardLabel: {
    fontSize: 14,
    color: "#0f172a",
  },
  wardLabelActive: {
    color: "#0f172a",
    fontWeight: "600",
  },
  emptyText: {
    marginTop: 10,
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "center",
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  btnGhost: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    marginRight: 6,
  },
  btnGhostText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0f172a",
  },
  btnPrimary: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#14b8a6",
  },
  btnPrimaryText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffffff",
  },
});
