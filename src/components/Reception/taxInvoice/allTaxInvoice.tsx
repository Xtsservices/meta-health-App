// src/screens/billing/AllTaxInvoiceMobile.tsx

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
import { useNavigation, useRoute } from "@react-navigation/native";
import { RootState } from "../../../store/store";
import { AuthFetch } from "../../../auth/auth";
import { COLORS } from "../../../utils/colour";
import { formatDateTime } from "../../../utils/dateTime";
import { FONT_SIZE, responsiveWidth, SPACING } from "../../../utils/responsive";
import AsyncStorage from "@react-native-async-storage/async-storage";



type AllTaxInvoiceProps = {
  startDate: Date | null;
  endDate: Date | null;
};

type MedicineItem = {
  id: number | string;
  name: string;
  category?: string;
  qty: number;
  hsn?: string;
  price: number;
  gst: number;
  amount: number;
};

type TestItem = {
  testID: number | string;
  testName: string;
  loinc_num_: string;
  category: string;
  price: number;
  gst: number;
  amount: number;
};

export type PatientData = {
  id: number;
  patientID: string;
  pName: string;
  dept: string;
  firstName?: string;
  lastName?: string;
  date?: string;
  addedOn?: string;
  admissionDate?: string;
  category?: string;
  testList: TestItem[];
  medicinesList: MedicineItem[];
  procedures: any[];
  patientTimeLineID?: string;
  pType?: string;
  type?: string; // 'medicine' | 'lab'
  paidAmount?: number;
  dueAmount?: number;
};

const AllTaxInvoiceMobile: React.FC<AllTaxInvoiceProps> = ({
  startDate,
  endDate,
}) => {
  const user = useSelector((s: RootState) => s.currentUser);
  const navigation = useNavigation<any>();
  const route = useRoute();

  // Get department from route params or user role
  const department = route.params?.department || user?.roleName?.toLowerCase();
  const isPharmacy = department === 'pharmacy';
  const isLab = department === 'pathology';
  const isRadiology = department === 'radiology';
  const isReception = !isPharmacy && !isLab && !isRadiology;

  const [departmentType, setDepartmentType] = useState<string>("all");
  const [invoiceData, setInvoiceData] = useState<PatientData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Get department options based on user department
  const getDepartmentOptions = () => {
    if (isReception) {
      return [
        { value: "all", label: "All Departments" },
        { value: "1", label: "OPD" },
        { value: "2", label: "IPD / Emergency" },
      ];
    } else if (isPharmacy) {
      return [
        { value: "2", label: "IPD" },
        { value: "1", label: "OPD" },
        { value: "3", label: "Walk-in" },
      ];
    } else {
      // Labs and Radiology
      return [
        { value: "2", label: "IPD" },
        { value: "1", label: "OPD" },
        { value: "3", label: "Walk-in" },
      ];
    }
  };

  const DEPARTMENT_OPTIONS = getDepartmentOptions();

  const getDepartmentLabel = (deptType: string): string => {
    if (deptType === "1") return "OPD";
    if (deptType === "2") return "IPD / Emergency";
    if (deptType === "3") return "Walk-in";
    return "Unknown";
  };

  // Fetch pharmacy tax invoices
  const fetchPharmacyTaxInvoices = async (token: string) => {
    if (!user?.hospitalID) return [];

    let endpoints: { url: string; deptType: string }[] = [];

    if (departmentType === "all") {
      endpoints = [
        {
          url: `medicineInventoryPatientsOrder/${user.hospitalID}/1/getMedicineInventoryPatientsOrderCompletedWithRegPatient?startDate=&endDate=`,
          deptType: "1",
        },
        {
          url: `medicineInventoryPatientsOrder/${user.hospitalID}/2/getMedicineInventoryPatientsOrderCompletedWithRegPatient?startDate=&endDate=`,
          deptType: "2",
        },
        {
          url: `medicineInventoryPatientsOrder/${user.hospitalID}/getMedicineInventoryPatientsOrderCompletedWithoutReg?startDate=&endDate=`,
          deptType: "3",
        },
      ];
    } else {
      if (departmentType === "1") {
        endpoints = [{
          url: `medicineInventoryPatientsOrder/${user.hospitalID}/1/getMedicineInventoryPatientsOrderCompletedWithRegPatient?startDate=&endDate=`,
          deptType: "1",
        }];
      } else if (departmentType === "2") {
        endpoints = [{
          url: `medicineInventoryPatientsOrder/${user.hospitalID}/2/getMedicineInventoryPatientsOrderCompletedWithRegPatient?startDate=&endDate=`,
          deptType: "2",
        }];
      } else if (departmentType === "3") {
        endpoints = [{
          url: `medicineInventoryPatientsOrder/${user.hospitalID}/getMedicineInventoryPatientsOrderCompletedWithoutReg?startDate=&endDate=`,
          deptType: "3",
        }];
      }
    }

    const allRawItems: any[] = [];

    for (const ep of endpoints) {
      try {
        const res: any = await AuthFetch(ep.url, token);
        const data = res?.data?.data || res?.data || res || [];
        const arr = Array.isArray(data) ? data : [data];
        
        arr.forEach((item: any) =>
          allRawItems.push({ ...item, deptType: ep.deptType })
        );
      } catch {
        // ignore one endpoint failure and continue
      }
    }

    return allRawItems.map((item: any, index: number) => {
      const deptType = item.deptType || "1";

      const medicinesList: MedicineItem[] = Array.isArray(item.medicinesList) 
        ? item.medicinesList.map((m: any) => {
            const price = Number(m.sellingPrice) || 0;
            const gst = Number(m.gst) || 0;
            const quantity = Number(m.updatedQuantity) || 1;
            const amount = price * quantity * (1 + gst / 100);

            return {
              id: m.id,
              name: m.medicineName || "Unknown Medicine",
              category: m.medicineType || "",
              qty: quantity,
              hsn: m.hsn || "",
              price,
              gst,
              amount,
            };
          })
        : [];

      return {
        id: index + 1,
        patientID: item.patientID || item.pID || `INV${index + 1}`,
        pName: item.pName || "Unknown Patient",
        dept: getDepartmentLabel(deptType),
        firstName: item.firstName || "",
        lastName: item.lastName || "",
        date: item.addedOn || item.datetime || "",
        addedOn: item.addedOn || item.datetime || "",
        admissionDate: item.admissionDate || "",
        category: item.category || "",
        testList: [],
        medicinesList,
        procedures: [],
        patientTimeLineID: item.patientTimeLineID || "",
        pType: deptType === "1" ? "Outpatient" : "Inpatient",
        type: "medicine",
      };
    });
  };

  // Fetch lab/radiology tax invoices
  const fetchLabRadiologyTaxInvoices = async (token: string) => {
    if (!user?.hospitalID) return [];

    const deptName = isRadiology ? 'Radiology' : 'Pathology';
    let endpoints: { url: string; deptType: string }[] = [];

    if (departmentType === "all") {
      endpoints = [
        {
          url: `test/getOpdIpdTaxInvoiceData/${user.hospitalID}/${deptName}?startDate=&endDate=`,
          deptType: "1", // Will filter by departmemtType in data
        },
        {
          url: `test/getWalkinTaxinvoiceData/${user.hospitalID}/${deptName}?startDate=&endDate=`,
          deptType: "3",
        },
      ];
    } else if (departmentType === "3") {
      // Walk-in
      endpoints = [{
        url: `test/getWalkinTaxinvoiceData/${user.hospitalID}/${deptName}?startDate=&endDate=`,
        deptType: "3",
      }];
    } else {
      // OPD or IPD
      endpoints = [{
        url: `test/getOpdIpdTaxInvoiceData/${user.hospitalID}/${deptName}?startDate=&endDate=`,
        deptType: departmentType,
      }];
    }

    const allRawItems: any[] = [];

    for (const ep of endpoints) {
      try {
        const res: any = await AuthFetch(ep.url, token);
        const data = res?.data?.data || res?.data || res || [];
        const arr = Array.isArray(data) ? data : [data];
        
        // Filter by department type for OPD/IPD data
        let filteredData = arr;
        if (ep.deptType !== "3" && departmentType !== "all") {
          filteredData = arr.filter((item: any) => 
            String(item.departmemtType) === departmentType
          );
        }
        
        filteredData.forEach((item: any) =>
          allRawItems.push({ ...item, deptType: ep.deptType })
        );
      } catch {
        // ignore one endpoint failure and continue
      }
    }

    return allRawItems.map((item: any, index: number) => {
      let deptType = item.deptType;
      
      // Determine department type from data for OPD/IPD
      if (deptType !== "3") {
        deptType = String(item.departmemtType || "1");
      }

      const testList: TestItem[] = Array.isArray(item.testsList) || Array.isArray(item.labTests)
        ? (item.testsList || item.labTests).map((t: any) => {
            const price = Number(t.testPrice) || 0;
            const gst = Number(t.gst) || 0;
            const amount = price * (1 + gst / 100);

            return {
              testID: t.testID || t.id,
              testName: t.testName || t.test || "Unknown Test",
              loinc_num_: t.loinc_num_ || "N/A",
              category: t.category || "Uncategorized",
              price,
              gst,
              amount,
            };
          })
        : [];

      return {
        id: index + 1,
        patientID: item.patientID || item.pID || `INV${index + 1}`,
        pName: item.pName || "Unknown Patient",
        dept: getDepartmentLabel(deptType),
        firstName: item.firstName || "",
        lastName: item.lastName || "",
        date: item.addedOn || item.datetime || "",
        addedOn: item.addedOn || item.datetime || "",
        admissionDate: item.admissionDate || "",
        category: item.category || "",
        testList,
        medicinesList: [],
        procedures: [],
        patientTimeLineID: item.patientTimeLineID || "",
        pType: deptType === "1" ? "Outpatient" : deptType === "3" ? "Walk-in" : "Inpatient",
        type: "lab",
      };
    });
  };

  // Original reception tax invoices (your existing code)
  const fetchReceptionTaxInvoices = async (token: string) => {
    if (!user?.hospitalID) return [];

      const endpoints: { url: string; deptType: string }[] =
        departmentType === "all"
          ? [
              {
                url: `reception/getReceptionCompletedTaxInvoiceData/${user.hospitalID}/1`,
                deptType: "1",
              },
              {
                url: `reception/getReceptionCompletedTaxInvoiceData/${user.hospitalID}/2`,
                deptType: "2",
              },
            ]
          : [
              {
                url: `reception/getReceptionCompletedTaxInvoiceData/${user.hospitalID}/${departmentType}`,
                deptType: departmentType,
              },
            ];

      const allRawItems: any[] = [];

      for (const ep of endpoints) {
        try {
          const res: any = await AuthFetch(ep.url, token);
          const arr = Array.isArray(res?.data?.data) ? res.data?.data : [];
          arr.forEach((item: any) =>
            allRawItems.push({ ...item, deptType: ep.deptType })
          );
        } catch {
          // ignore one endpoint failure and continue
        }
      }

    return allRawItems?.map((item: any, index: number) => {
          const deptType =
            item.pType?.toString() ||
            item.deptType?.toString() ||
            (item.lab ? "1" : null) ||
            (item.pharmacy ? "2" : null) ||
            "1";

          // map medicines
          const medicinesList: MedicineItem[] =
            item.pharmacy?.medicinesList?.map((m: any) => {
              const price = Number(m.sellingPrice) || 0;
              const gst = Number(m.gst) || 0;
              const amount = price + (price * gst) / 100;

              return {
                id: m.id,
                name: m.medicineName || "Unknown Medicine",
                category: m.medicineType || "",
                qty: Number(m.updatedQuantity) || 0,
                hsn: m.hsn || "",
                price,
                gst,
                amount,
              };
            }) || [];

          // map tests
          const testList: TestItem[] =
            item.lab?.labTests?.map((t: any) => {
              const price = Number(t.testPrice) || 0;
              const gst = Number(t.gst) || 0;
              const amount = price + (price * gst) / 100;

              return {
                testID: t.testID,
                testName: t.testName || "Unknown Test",
                loinc_num_: t.loinc_num_ || "N/A",
                category: t.category || "Uncategorized",
                price,
                gst,
                amount,
              };
            }) || [];

          // pick best date
          const labDate =
            item.tests?.[0]?.datetime || item.lab?.updatedOn || "";
          const medDate =
            item.medicines?.[0]?.medicinesList?.[0]?.datetime ||
            item.pharmacy?.updatedOn ||
            "";

          const finalDate =
            [labDate, medDate, item.addedOn]
              .filter(Boolean)
              .sort(
                (a: string, b: string) =>
                  new Date(b).getTime() - new Date(a).getTime()
              )[0] || "";

          return {
            id: index + 1,
            patientID: item.patientID || `INV${index + 1}`,
            pName: item.pName || "Unknown Patient",
            dept: getDepartmentLabel(deptType),
            firstName: item.firstName || "",
            lastName: item.lastName || "",
            date: finalDate,
            addedOn: finalDate,
            admissionDate: item.admissionDate || "",
            category: item.category || (deptType === "1" ? "OPD" : "IPD"),
            testList,
            medicinesList,
            procedures: item.procedures || [],
            patientTimeLineID: item.patientTimeLineID || "",
            pType: deptType === "1" ? "Outpatient" : "Inpatient",
          };
        });
      };

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!user?.hospitalID) {
        setError("User authentication details missing");
        setInvoiceData([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const storedToken = await AsyncStorage.getItem("token");
        const token = storedToken || user?.token;

        if (!token) {
          setError("User token missing");
          setInvoiceData([]);
          setLoading(false);
          return;
        }

        let normalized: PatientData[] = [];

        if (isPharmacy) {
          normalized = await fetchPharmacyTaxInvoices(token);
        } else if (isLab || isRadiology) {
          normalized = await fetchLabRadiologyTaxInvoices(token);
        } else {
          // Reception - original functionality
          normalized = await fetchReceptionTaxInvoices(token);
        }

        // Sort by date (newest first)
        const sortedData = normalized.sort((a: PatientData, b: PatientData) => {
          const dateA = a.addedOn ? new Date(a.addedOn).getTime() : 0;
          const dateB = b.addedOn ? new Date(b.addedOn).getTime() : 0;
          return dateB - dateA;
        });

        setInvoiceData(sortedData);
    } catch (err) {
      setInvoiceData([]);
      setError("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  fetchInvoices();
}, [user?.hospitalID, departmentType, department]);


  const filteredData = useMemo(() => {
    if (!startDate || !endDate) return invoiceData;

    const start = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate()
    );
    const end = new Date(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate()
    );

    return invoiceData.filter((row) => {
      if (!row.addedOn) return false;
      const rowDate = new Date(row.addedOn);
      const normalized = new Date(
        rowDate.getFullYear(),
        rowDate.getMonth(),
        rowDate.getDate()
      );
      return normalized >= start && normalized <= end;
    });
  }, [startDate, endDate, invoiceData]);

  const renderCard = ({ item, index }: { item: PatientData; index: number }) => {
    const totalTests = item.testList?.length ?? 0;
    const totalMeds = item.medicinesList?.length ?? 0;
    const isPharmacyItem = item.type === 'medicine';

    // Calculate total amount
    const calculateTotalAmount = () => {
      if (isPharmacyItem) {
        return item.medicinesList?.reduce((sum, medicine) => sum + medicine.amount, 0) || 0;
      } else {
        return item.testList?.reduce((sum, test) => sum + test.amount, 0) || 0;
      }
    };

    const totalAmount = calculateTotalAmount();

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: COLORS.card }]}
        activeOpacity={0.9}
        onPress={() =>
          navigation.navigate("InvoiceDetails", {
            invoice: item,
            source: "allTax",
            department: department,
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
            <Text style={[styles.badge, { backgroundColor: COLORS.brandSoft }]}>
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
            {isPharmacyItem 
              ? `${totalMeds} medicines` 
              : `${totalTests} tests`
            }
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Total Amount</Text>
          <Text style={styles.totalAmount}>₹{totalAmount.toFixed(2)}</Text>
        </View>

        <View style={styles.viewDetailsRow}>
          <Text style={styles.viewDetailsText}>View Invoice Details</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Filter row */}
      <View style={styles.filterRow}>
        {startDate && endDate && (
          <Text style={styles.summaryText}>
            Showing {filteredData.length} of {invoiceData.length} records
          </Text>
        )}

        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={departmentType}
            onValueChange={(v) => setDepartmentType(v)}
            style={styles.picker}
            dropdownIconColor={COLORS.text}
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

      {/* Error / Loading / List */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.brand} />
          <Text style={styles.loadingText}>Loading invoices…</Text>
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderCard}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: SPACING.xl,
          }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No Records Found</Text>
              {startDate && endDate && (
                <Text style={styles.emptySub}>
                  Try adjusting your date range or department filter
                </Text>
              )}
            </View>
          }
        />
      )}
    </View>
  );
};

export default AllTaxInvoiceMobile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
    gap: 8,
  },
  summaryText: {
    flex: 1,
    fontSize: FONT_SIZE.xs,
    color: "#6B7280",
    fontWeight: "500",
  },
  pickerWrap: {
    width: responsiveWidth(90),
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f9fafb",
  },
  picker: {
    height: 55,
    width: "100%",
    color: "black"
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
  errorBox: {
    padding: SPACING.sm,
    borderRadius: 8,
    backgroundColor: "#fee2e2",
    marginBottom: SPACING.sm,
  },
  errorText: {
    color: "#b91c1c",
    fontSize: FONT_SIZE.sm,
  },
  emptyBox: {
    alignItems: "center",
    paddingVertical: SPACING.xl,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
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
    color: "#064E3B",
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
  totalAmount: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: COLORS.success,
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
