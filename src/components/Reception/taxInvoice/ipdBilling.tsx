// src/screens/billing/IpdBillingMobile.tsx

import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { RootState } from "../../../store/store";
import { PatientData } from "./allTaxInvoice";
import { COLORS } from "../../../utils/colour";
import { formatDateTime } from "../../../utils/dateTime";
import { FONT_SIZE, responsiveWidth, SPACING } from "../../../utils/responsive";
import { AuthFetch } from "../../../auth/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";



type IpdBillingProps = {
  startDate: Date | null;
  endDate: Date | null;
};

const DEPARTMENT_OPTIONS = [
  { value: 0, label: "All Departments" },
  { value: 1, label: "OPD" },
  { value: 2, label: "IPD / Emergency" },
];

const IpdBillingMobile: React.FC<IpdBillingProps> = ({
  startDate,
  endDate,
}) => {
  const user = useSelector((s: RootState) => s.currentUser);
  const navigation = useNavigation<any>();

  const [expandedRow, setExpandedRow] = useState<number | null>(null); // not used, but keep if needed
  const [billingData, setBillingData] = useState<PatientData[]>([]);
  const [departmentType, setDepartmentType] = useState<number>(2);
  const [loading, setLoading] = useState<boolean>(false);

  const getDepartmentLabel = (ptype: number) => {
    if (ptype === 1 || ptype === 21) return "OPD";
    if (ptype === 2 || ptype === 3) return "IPD / Emergency";
    return "Unknown";
  };

  useEffect(() => {
    const fetchBilling = async () => {
         const token = await AsyncStorage.getItem('token');
      if (!user?.hospitalID || !token) {
        setBillingData([]);
        return;
      }

      setLoading(true);
      try {

        const url = `reception/${user.hospitalID}/approved/${departmentType}/getReceptionBillingList`;
        const response = await AuthFetch(url, token);
console.log(response, "api reponse")
        const rawData = Array.isArray(response?.data?.data) ? response.data?.data : [];
        const processed: PatientData[] = [];

        rawData.forEach((item: any, index: number) => {
          const hasTests =
            Array.isArray(item.testsList) && item.testsList.length > 0;
          const hasMeds =
            Array.isArray(item.medicinesList) && item.medicinesList.length > 0;

          if (!hasTests && !hasMeds) return;

          const isOPD = item.ptype === 1 || item.ptype === 21;
          const isIPD = item.ptype === 2 || item.ptype === 3;

          if (departmentType === 1 && !isOPD) return;
          if (departmentType === 2 && !isIPD) return;

          const finalDeptType = isOPD ? 1 : 2;

          // Universal timeline extractor
          const extractTimelineId = (obj: any): string => {
            return (
              obj?.timelineID ||
              obj?.patientTimeLineID ||
              obj?.timeline_id ||
              obj?.patienttimelineID ||
              obj?.patient_timeLine_id ||
              obj?.visitID ||
              obj?.timeLineID ||
              obj?.orderID ||
              ""
            )
              ?.toString()
              ?.trim();
          };

          let timelineID = extractTimelineId(item);
          if (!timelineID && hasTests) {
            timelineID = extractTimelineId(item.testsList[0]);
          }
          if (!timelineID && hasMeds) {
            timelineID = extractTimelineId(item.medicinesList[0]);
          }
          if (!timelineID && Array.isArray(item.timelineIDs) && item.timelineIDs[0]) {
            timelineID = String(item.timelineIDs[0]);
          }

          const firstMed = hasMeds ? item.medicinesList[0] : null;
          const firstTest = hasTests ? item.testsList[0] : null;
          const addedOn = firstMed?.addedOn || firstTest?.addedOn || "";
          const timelineIDNum = Number(timelineID);

          const patient: PatientData = {
            id: index + 1,
            patientID: String(item.patientID),
            pName: item.pName ?? "",
            dept: getDepartmentLabel(item.ptype),
            addedOn,
            firstName: item.doctorFirstName ?? "",
            lastName: item.doctorLastName ?? "",
            category: "",
            // NB: in web you used patientTimelineID
            patientTimeLineID: String(timelineIDNum),
            pType: finalDeptType === 1 ? "Outpatient" : "Inpatient",
            date: addedOn,
            admissionDate: item.admittedOn ?? addedOn,

            medicinesList: (item.medicinesList ?? []).map((m: any) => ({
              id: m.id,
              name: m.medicineName ?? "Unknown",
              qty: Number(m.updatedQuantity) || 1,
              hsn: m.hsn ?? "",
              price: Number(m.sellingPrice) || 0,
              gst: Number(m.gst) || 0,
              amount:
                (Number(m.sellingPrice) || 0) *
                (1 + (Number(m.gst) || 0) / 100),
            })),

            testList: (item.testsList ?? []).map((t: any) => ({
              testID: t.id || t.testID,
              testName: t.test || t.testName,
              loinc_num_: t.loinc_num_ ?? "",
              category: t.category ?? "pathology",
              price: Number(t.testPrice) || 0,
              gst: Number(t.gst) || 0,
              amount:
                (Number(t.testPrice) || 0) *
                (1 + (Number(t.gst) || 0) / 100),
            })),

            procedures: [],
          };

          processed.push(patient);
        });

        const sorted = processed.sort((a, b) => {
          const dateA = a.addedOn ? new Date(a.addedOn).getTime() : 0;
          const dateB = b.addedOn ? new Date(b.addedOn).getTime() : 0;
          return dateB - dateA;
        });

        setBillingData(sorted);
      } catch (err: any) {
        setBillingData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBilling();
  }, [user?.hospitalID, user?.token, departmentType, startDate, endDate]);

  const filteredData = useMemo(() => {
    if (!startDate || !endDate) return billingData;

    const start = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate()
    );
    const end = new Date(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate(),
      23,
      59,
      59
    );

    return billingData.filter((row) => {
      if (!row.addedOn) return false;
      const d = new Date(row.addedOn);
      const norm = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      return norm >= start && norm <= end;
    });
  }, [startDate, endDate, billingData]);

  const renderCard = ({ item, index }: { item: PatientData; index: number }) => {
    const totalTests = item.testList?.length ?? 0;
    const totalMeds = item.medicinesList?.length ?? 0;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: COLORS.card }]}
        activeOpacity={0.9}
        onPress={() =>
          navigation.navigate("InvoiceDetails", {
            invoice: item,
            source: "billing",
          })
        }
      >
        <View style={styles.cardHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.patientName, { color: COLORS.text }]}>
              {item.pName}
            </Text>
            <Text style={[styles.patientId, { color: COLORS.sub }]}>
              ID: {item.patientID}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[styles.badge, { backgroundColor: "#BFDBFE" }]}>
              {item.dept}
            </Text>
           
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Added On</Text>
          <Text style={styles.metaValue}>
            {item.addedOn ? formatDateTime(item.addedOn) : "—"}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Items</Text>
          <Text style={styles.metaValue}>
            {totalTests} tests • {totalMeds} medicines
          </Text>
        </View>

        <View style={styles.viewDetailsRow}>
          <Text style={styles.viewDetailsText}>View Billing Details</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Department Filter */}
      <View style={styles.filterRow}>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={departmentType}
            onValueChange={(v) => setDepartmentType(Number(v))}
            style={styles.picker}
          >
            {DEPARTMENT_OPTIONS.map((opt) => (
              <Picker.Item
                key={opt.value}
                label={opt.label}
                value={opt.value}
              />
            ))}
          </Picker>
        </View>
      </View>

      {startDate && endDate && (
        <Text style={styles.summaryText}>
          Showing {filteredData.length} of {billingData.length} records
        </Text>
      )}

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.brand} />
          <Text style={styles.loadingText}>Loading billing data…</Text>
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderCard}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: SPACING.xl }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No Records Found</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default IpdBillingMobile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterRow: {
    marginBottom: SPACING.sm,
    maxWidth: responsiveWidth(60),
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  picker: {
    height: 36,
  },
  summaryText: {
    marginBottom: SPACING.xs,
    fontSize: FONT_SIZE.xs,
    color: "#6B7280",
    fontWeight: "500",
  },
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 8,
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
  },
  emptyBox: {
    alignItems: "center",
    paddingVertical: SPACING.xl,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
    color: COLORS.text,
  },
  card: {
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  patientName: {
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
  },
  patientId: {
    fontSize: FONT_SIZE.xs,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
    color: "#111827",
  },
  indexText: {
    fontSize: FONT_SIZE.xs,
    color: "#6B7280",
    marginTop: 4,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  metaLabel: {
    fontSize: FONT_SIZE.xs,
    color: "#6B7280",
  },
  metaValue: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.text,
    textAlign: "right",
  },
  viewDetailsRow: {
    marginTop: 10,
    alignItems: "flex-end",
  },
  viewDetailsText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: COLORS.brandDark,
  },
});
