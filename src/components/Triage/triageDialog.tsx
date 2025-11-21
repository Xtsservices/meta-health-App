// src/screens/triage/TriageDialogMobile.tsx

import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RootState } from "../../store/store";
import { AuthFetch, AuthPost } from "../../auth/auth";
import { useTriageForm, GetTriageFormDataObject } from "./context/triageFormContext";
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
const dispatch = useDispatch()
const navigation = useNavigation()
  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedWard, setSelectedWard] = useState<string>("");
  const [loading, setLoading] = useState(false);      // ward loading
  const [submitting, setSubmitting] = useState(false); // API submit loading

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

        if (res?.status === "success" && Array.isArray(res?.data?.wards)) {
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
        dispatch(showError("Missing authorization, please login "))
         navigation.navigate("Login" as never);
        return;
      }

      // build payload from triage form data, same as web
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

      if (res?.status === "success" ) {
          dispatch(showSuccess("Patient transfered to Red zone successfully"))
        onClose();
       navigation.navigate("PatientList" as never);
      } else {
        dispatch(showError(res?.message || res || "Triage transfer failed"))
       
      }
    } catch (err) {
        dispatch(showError(err?.message || err || "Triage transfer failed"))
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
          <Text style={styles.title}>Transferring Patient to RED Zone</Text>
          <Text style={styles.condition}>
            {conditionLabel?.toUpperCase() || "CRITICAL CONDITION"}
          </Text>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color="#14b8a6" />
              <Text style={styles.loadingText}>Loading wards...</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.wardsScroll}
              contentContainerStyle={{ paddingVertical: 4 }}
            >
              {wards.map((w) => {
                const active = String(w.id) === selectedWard;
                return (
                  <TouchableOpacity
                    key={w.id}
                    style={[
                      styles.wardItem,
                      active && { backgroundColor: "#14b8a6" },
                    ]}
                    onPress={() => setSelectedWard(String(w.id))}
                  >
                    <Text
                      style={[
                        styles.wardLabel,
                        active && { color: "#fff" },
                      ]}
                    >
                      {w.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {wards.length === 0 && !loading && (
                <Text style={styles.emptyText}>No wards found.</Text>
              )}
            </ScrollView>
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
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    elevation: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  condition: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "600",
    color: "#f97316",
  },
  loadingWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: "#64748b",
  },
  wardsScroll: {
    maxHeight: 220,
    marginTop: 12,
  },
  wardItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 8,
  },
  wardLabel: {
    fontSize: 15,
    color: "#0f172a",
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: "#94a3b8",
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
    gap: 10,
  },
  btnGhost: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
  },
  btnGhostText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
  btnPrimary: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#14b8a6",
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
});
