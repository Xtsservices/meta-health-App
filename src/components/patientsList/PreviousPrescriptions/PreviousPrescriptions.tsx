import React, { useRef, useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useSelector } from "react-redux";
import { RootState } from "../../../store/store";
import { AuthFetch } from "../../../auth/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { 
  FileTextIcon, 
  ClockIcon, 
  PillIcon, 
  TestTubeIcon, 
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XIcon,
  EyeIcon
} from "../../../utils/SvgIcons";
import { formatDate } from "../../../utils/dateTime";
import Footer from "../../dashboard/footer";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../../utils/colour";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface PrescriptionDataType {
  id: string;
  medicine: string;
  meddosage?: number;
  dosageUnit?: string;
  test?: string;
  medicineTime?: string;
  medicineFrequency?: any;
  medicineDuration?: string;
  advice?: string;
  addedOn?: string;
  status?: any;
  medicineNotes?: string;
}



export default function PreviousPrescriptions() {
  const getAllMedicineApi = useRef(true);
  const insets = useSafeAreaInsets();
  
  const user = useSelector((s: RootState) => s.currentUser);
  const cp = useSelector((s: RootState) => s.currentPatient);
  const timeline = cp?.patientTimeLineID || {};
  const timeLineID = typeof timeline === "object" ? timeline?.id : timeline;
  const patientID = cp?.currentPatient?.id ?? cp?.id;

  const [render, setRender] = useState(false);
  const [prescriptionList, setPrescriptionList] = useState<PrescriptionDataType[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const isDialogOpen = selectedIndex !== null;

  const selected = useMemo(
    () => (selectedIndex !== null ? prescriptionList?.[selectedIndex] ?? null : null),
    [selectedIndex, prescriptionList]
  );

  useEffect(() => {
    const getAllMedicine = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        
        if (!token || !user?.hospitalID || !timeLineID || !patientID) {
          setLoading(false);
          return;
        }

        setLoading(true);

        const response = await AuthFetch(
          `prescription/${user.hospitalID}/${timeLineID}/${patientID}`,
          token
        );
        
        if (response?.data?.message === "success") {
          setPrescriptionList(response?.data?.prescriptions || []);
        } else {
          setPrescriptionList([]);
        }
      } catch (error) {
        setPrescriptionList([]);
      } finally {
        setLoading(false);
      }
    };

    if (user?.hospitalID && timeLineID && patientID && getAllMedicineApi.current) {
      getAllMedicineApi.current = false;
      getAllMedicine();
    }
  }, [user, timeLineID, patientID, render]);

  const formatDosage = (p: PrescriptionDataType) => {
    const amount = p.meddosage ?? p.meddosage === 0 ? String(p.meddosage) : "";
    const unit = p.dosageUnit || "";
    return [amount, unit].filter(Boolean).join("");
  };

  const formatFrequency = (f: any) => {
    if (typeof f === "string" && isNaN(Number(f))) return f;
    const n = Number(f || 0);
    if (n <= 0) return "-";
    if (n === 1) return "once-daily";
    if (n === 2) return "twice-daily";
    if (n === 3) return "thrice-daily";
    return `${n}/day`;
  };

  const parseTests = (t?: string) =>
    (t || "")
      .split(/[#,\n;]/g)
      .map((s) => s.trim())
      .filter(Boolean);

  const parseTestPairs = (t?: string) =>
    (t || "")
      .split("#")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((item) => {
        const [name, ...rest] = item.split("|");
        return { name: (name || "").trim(), note: (rest || []).join("|").trim() };
      });

  const parseTimes = (t?: string) =>
    (t || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  const statusLabel = (s: any) => {
    if (s === 1 || s === "1" || String(s).toLowerCase() === "active") return "Active";
    if (s === 0 || s === "0" || String(s).toLowerCase() === "inactive") return "Inactive";
    return String(s ?? "-");
  };

  const statusColor = (label: string) => {
    const key = label.toLowerCase();
    if (key.includes("active")) return COLORS.success;
    if (key.includes("inactive")) return COLORS.danger;
    if (key.includes("stop")) return COLORS.warning;
    return COLORS.gray;
  };

  const openDialogFor = (rowIndex: number) => setSelectedIndex(rowIndex);
  const closeDialog = () => setSelectedIndex(null);

  const goPrev = () => {
    if (selectedIndex === null) return;
    setSelectedIndex((idx) => (idx! > 0 ? (idx as number) - 1 : 0));
  };

  const goNext = () => {
    if (selectedIndex === null) return;
    setSelectedIndex((idx) =>
      idx! < prescriptionList.length - 1 ? (idx as number) + 1 : idx
    );
  };

  const renderStatusPill = (label: string) => (
    <View style={[styles.statusPill, { backgroundColor: `${statusColor(label)}15` }]}>
      <Text style={[styles.statusText, { color: statusColor(label) }]}>
        {label}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.brand} />
        <Text style={styles.loadingText}>Loading prescriptions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Content */}
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {prescriptionList?.length > 0 ? (
          <View style={styles.listContainer}>
            {prescriptionList?.map((prescription, index) => {
              const testPairs = parseTestPairs(prescription?.test);
              const tests = testPairs?.map((tp) => tp?.name)?.filter(Boolean) || [];
              const perTestNotes = testPairs?.map((tp) => tp?.note)?.filter(Boolean) || [];
              const dosage = formatDosage(prescription);
              const sLabel = statusLabel(prescription?.status);

              return (
                <View key={prescription?.id} style={styles.listItem}>
                  {/* Header Row */}
                  <View style={styles.itemHeader}>
                    <View style={styles.medicineInfo}>
                      <Text style={styles.medicineName}>
                        {prescription?.medicine || "Unknown Medicine"}
                      </Text>
                      <Text style={styles.prescriptionId}>ID: #{prescription?.id}</Text>
                    </View>
                    <View style={styles.headerActions}>
                      {renderStatusPill(sLabel)}
                      <TouchableOpacity
                        style={styles.viewButton}
                        onPress={() => openDialogFor(index)}
                      >
                        <EyeIcon size={18} color={COLORS.buttonText} />
                        <Text style={styles.viewButtonText}>View</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Details Row */}
                  <View style={styles.itemDetails}>
                    <View style={styles.detailRow}>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Dosage</Text>
                        <Text style={styles.detailValue}>{dosage || "-"}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Duration</Text>
                        <Text style={styles.detailValue}>{prescription?.medicineDuration || "-"} days</Text>
                      </View>
                    </View>

                    {/* Tests */}
                    {tests?.length > 0 && (
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Tests</Text>
                        <View style={styles.tagsContainer}>
                          {tests?.map((test, i) => (
                            <View key={i} style={styles.tag}>
                              <Text style={styles.tagText}>{test}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* Notes */}
                    {prescription?.medicineNotes && (
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Notes</Text>
                        <Text style={styles.detailValue} numberOfLines={2}>
                          {prescription?.medicineNotes}
                        </Text>
                      </View>
                    )}

                    {/* Date */}
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Prescribed Date</Text>
                      <View style={styles.dateRow}>
                        <CalendarIcon size={16} color={COLORS.sub} />
                        <Text style={styles.detailValue}>
                          {formatDate(prescription?.addedOn) || "-"}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <PillIcon size={screenWidth * 0.15} color={COLORS.placeholder} />
            <Text style={styles.emptyStateTitle}>No Prescriptions Yet</Text>
            <Text style={styles.emptyStateText}>
              No previous prescriptions found for this patient.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={"patients"} brandColor={COLORS.brand} />
      </View>

      {/* Details Modal */}
      <Modal
        visible={isDialogOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeDialog}
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <FileTextIcon size={24} color={COLORS.brand} />
              <Text style={styles.modalTitle}>Prescription Details</Text>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.navButton}
                onPress={goPrev}
                disabled={(selectedIndex ?? 0) <= 0}
              >
                <ChevronLeftIcon 
                  size={24} 
                  color={(selectedIndex ?? 0) <= 0 ? COLORS.placeholder : COLORS.brand} 
                />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.navButton}
                onPress={goNext}
                disabled={(selectedIndex ?? 0) >= prescriptionList?.length - 1}
              >
                <ChevronRightIcon 
                  size={24} 
                  color={(selectedIndex ?? 0) >= prescriptionList?.length - 1 ? COLORS.placeholder : COLORS.brand} 
                />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.closeButton} onPress={closeDialog}>
                <XIcon size={24} color={COLORS.sub} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Modal Content */}
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {selected && (
              <View style={styles.detailGrid}>
                {/* Row 1: ID and Medicine */}
                <View style={styles.detailRow}>
                  <View style={styles.detailField}>
                    <Text style={styles.fieldLabel}>ID</Text>
                    <Text style={styles.fieldValue}>#{selected?.id}</Text>
                  </View>
                  
                  <View style={styles.detailField}>
                    <Text style={styles.fieldLabel}>Medicine</Text>
                    <Text style={styles.fieldValue}>{selected?.medicine || "-"}</Text>
                  </View>
                </View>

                {/* Row 2: Dosage and Duration */}
                <View style={styles.detailRow}>
                  <View style={styles.detailField}>
                    <Text style={styles.fieldLabel}>Dosage</Text>
                    <Text style={styles.fieldValue}>{formatDosage(selected) || "-"}</Text>
                  </View>
                  
                  <View style={styles.detailField}>
                    <Text style={styles.fieldLabel}>Duration (days)</Text>
                    <Text style={styles.fieldValue}>{selected?.medicineDuration || "-"}</Text>
                  </View>
                </View>

                {/* Row 3: Status and Date */}
                <View style={styles.detailRow}>
                  <View style={styles.detailField}>
                    <Text style={styles.fieldLabel}>Status</Text>
                    {renderStatusPill(statusLabel(selected?.status))}
                  </View>
                  
                  <View style={styles.detailField}>
                    <Text style={styles.fieldLabel}>Prescribed Date</Text>
                    <View style={styles.dateRow}>
                      <CalendarIcon size={18} color={COLORS.sub} />
                      <Text style={styles.fieldValue}>
                        {formatDate(selected?.addedOn) || "-"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Tests Section */}
                <View style={styles.detailSection}>
                  <View style={styles.sectionHeader}>
                    <TestTubeIcon size={20} color={COLORS.brand} />
                    <Text style={styles.sectionLabel}>Test(s)</Text>
                  </View>
                  <View style={styles.detailTestList}>
                    {parseTests(selected?.test)?.length > 0 ? (
                      parseTests(selected?.test)?.map((test, index) => (
                        <View key={index} style={styles.detailTestTag}>
                          <Text style={styles.detailTestTagText}>{test}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.fieldValue}>-</Text>
                    )}
                  </View>
                </View>

                {/* Frequency/Time Section */}
                <View style={styles.detailSection}>
                  <View style={styles.sectionHeader}>
                    <ClockIcon size={20} color={COLORS.brand} />
                    <Text style={styles.sectionLabel}>Frequency / Time</Text>
                  </View>
                  <View style={styles.detailTestList}>
                    {parseTimes(selected?.medicineTime)?.length > 0 ? (
                      parseTimes(selected?.medicineTime)?.map((time, index) => (
                        <View key={index} style={styles.detailTestTag}>
                          <Text style={styles.detailTestTagText}>{time}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.fieldValue}>
                        {formatFrequency(selected?.medicineFrequency)}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Instructions Section */}
                <View style={styles.detailSection}>
                  <Text style={styles.fieldLabel}>Instructions</Text>
                  <Text style={styles.fieldValue}>{selected?.advice || "-"}</Text>
                </View>

                {/* Notes Section */}
                <View style={styles.detailSection}>
                  <Text style={styles.fieldLabel}>Notes</Text>
                  <Text style={styles.fieldValue}>{selected?.medicineNotes || "-"}</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Modal Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.closeModalButton} onPress={closeDialog}>
              <Text style={styles.closeModalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.sub,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  listItem: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  medicineInfo: {
    flex: 1,
  },
  medicineName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  prescriptionId: {
    fontSize: 12,
    color: COLORS.sub,
    fontWeight: "500",
  },
  headerActions: {
    alignItems: "flex-end",
    gap: 8,
  },
  itemDetails: {
    gap: 10,
  },
  detailRow: {
    flexDirection: "row",
    gap: 16,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.sub,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "500",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tag: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagText: {
    fontSize: 12,
    color: COLORS.sub,
    fontWeight: "500",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  viewButton: {
    backgroundColor: COLORS.brand,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewButtonText: {
    color: COLORS.buttonText,
    fontSize: 12,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 48,
    paddingVertical: 120,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: "center",
    lineHeight: 24,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.card,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  modalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
  },
  modalActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  navButton: {
    padding: 8,
    borderRadius: 8,
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  closeModalButton: {
    backgroundColor: COLORS.brand,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
  },
  closeModalButtonText: {
    color: COLORS.buttonText,
    fontSize: 16,
    fontWeight: "600",
  },
  // Detail Grid Styles
  detailGrid: {
    gap: 20,
  },
  detailSection: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  detailTestList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  detailTestTag: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailTestTagText: {
    fontSize: 14,
    color: COLORS.sub,
    fontWeight: "500",
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.sub,
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: "500",
  },
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 70,
    justifyContent: "center",
  },
});