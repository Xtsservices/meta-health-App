import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Calendar as CalendarIcon, X as XIcon } from "lucide-react-native";
import { useSelector } from "react-redux";
import { useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { RootState } from "../../../store/store";
import { AuthFetch } from "../../../auth/auth";
import { COLORS } from "../../../utils/colour";
import {
  FONT_SIZE,
  FOOTER_HEIGHT,
  responsiveWidth,
  SPACING,
} from "../../../utils/responsive";
import Footer from "../../dashboard/footer";
import BillingTaxInvoiceList from "./ipdBilling";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

export type MedicineItem = {
  id: number | string;
  name: string;
  category?: string;
  qty: number;
  hsn?: string;
  price: number;
  gst: number;
  amount: number;
};

export type TestItem = {
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
};

type Mode = "billing" | "allTax";

const FOOTER_H = FOOTER_HEIGHT || 70;

type RouteParams = {
  mode?: Mode; // "billing" or "allTax"
};

const BillingTaxInvoiceMobile: React.FC = () => {
  const insets = useSafeAreaInsets();
  const user = useSelector((s: RootState) => s.currentUser);
  const route = useRoute<any>();

  // 🔹 Decide screen mode from navigation param
  const mode: Mode = route?.params?.mode === "allTax" ? "allTax" : "billing";
  const isBilling = mode === "billing";

  // 🔹 Date range state
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<"start" | "end">("start");
  const [tempDate, setTempDate] = useState<Date>(new Date());

  // 🔹 Data + filters
  const [departmentType, setDepartmentType] = useState<string | number>("2");
  const [data, setData] = useState<PatientData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /* ------------------------------------------------------------------------ */
  /*                               Helper utils                               */
  /* ------------------------------------------------------------------------ */

  const formatDate = (d: Date | null) => {
    if (!d) return "DD-MM-YYYY";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  const openDatePicker = (target: "start" | "end") => {
    setPickerTarget(target);
    const base =
      target === "start"
        ? startDate || new Date()
        : endDate || startDate || new Date();
    setTempDate(base);
    setShowDatePicker(true);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    // On Android, close picker when user confirms or cancels
    if (Platform.OS === "android") {
      if (event?.type === "dismissed") {
        setShowDatePicker(false);
        return;
      }
      setShowDatePicker(false);
    }

    if (!selectedDate) return;

    // Update local picker state
    setTempDate(selectedDate);

    if (pickerTarget === "start") {
      setStartDate(selectedDate);

      // If endDate is before new startDate, auto-adjust it
      if (endDate && selectedDate > endDate) {
        setEndDate(selectedDate);
      }
    } else {
      // For "To" date, don't allow before "From"
      if (startDate && selectedDate < startDate) {
        setEndDate(startDate);
      } else {
        setEndDate(selectedDate);
      }
    }
  };

  const clearDates = () => {
    setStartDate(null);
    setEndDate(null);
  };

  const getDepartmentLabelBilling = (ptype: number) => {
    if (ptype === 1 || ptype === 21) return "OPD";
    if (ptype === 2 || ptype === 3) return "IPD / Emergency";
    return "Unknown";
  };

  const getDepartmentLabelTax = (deptType: string): string => {
    return deptType === "1" ? "OPD" : "IPD / Emergency";
  };

  /* ------------------------------------------------------------------------ */
  /*                            Fetching & Normalizing                        */
  /* ------------------------------------------------------------------------ */

  // Reset department filter when mode changes (billing / tax)
  useEffect(() => {
    setDepartmentType( "2" );
    setData([]);
    setError(null);
  }, [isBilling]);

  const fetchBilling = async (token: string) => {
    if (!user?.hospitalID) return;

    const deptNum =
      typeof departmentType === "number" ? departmentType : Number(departmentType) || 2;

    const url = `reception/${user?.hospitalID}/approved/${deptNum}/getReceptionBillingList`;
    const response = await AuthFetch(url, token);
if (response?.status === "success" && "data" in response) {
    const rawData = Array.isArray(response?.data?.data)
      ? response.data?.data
      : [];

    const processed: PatientData[] = [];

   rawData.forEach((item: any, index: number) => {
  // 🔹 1. Start with raw lists
  let tests = Array.isArray(item.testsList) ? [...item.testsList] : [];
  const meds = Array.isArray(item.medicinesList) ? [...item.medicinesList] : [];
  // 🔹 2. Helpers to match OPD / IPD based on ptype
  const getPtype = (obj: any) =>
    Number(obj?.ptype ?? obj?.pType ?? obj?.visitType ?? item?.ptype ?? 0);

  const matchOPD = (pt: number) => pt === 1 || pt === 21;
  const matchIPD = (pt: number) => pt === 2 || pt === 3;

  // 🔹 3. 👉 Only filter TESTS by selected departmentType (deptNum)
  //     Medicines are NOT filtered – they are always shown.
  if (deptNum === 1) {
    // OPD
    tests = tests.filter((t: any) => matchOPD(getPtype(t)));
  } else if (deptNum === 2) {
    // IPD + Emergency
    tests = tests.filter((t: any) => matchIPD(getPtype(t)));
  }

  const hasTests = tests.length > 0;   // filtered tests
  const hasMeds  = meds.length > 0;    // all medicines (unfiltered)

  // ❗ If there are no tests (after filter) AND no medicines at all, skip
  if (!hasTests && !hasMeds) return;

  // 🔹 4. Decide final dept type for label (OPD vs IPD/Emergency)
  let ptypeSource =
    item?.ptype ??
    (hasTests ? getPtype(tests[0]) : undefined) ??
    (hasMeds ? getPtype(meds[0]) : undefined);
  const isOPD = matchOPD(Number(ptypeSource));
  const isIPD = matchIPD(Number(ptypeSource));
  const finalDeptType = isOPD ? 1 : 2;
  // 🔹 5. Universal timeline extractor (unchanged)
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
    timelineID = extractTimelineId(tests[0]);
  }
  if (!timelineID && hasMeds) {
    timelineID = extractTimelineId(meds[0]);
  }
  if (
    !timelineID &&
    Array.isArray(item.timelineIDs) &&
    item.timelineIDs[0]
  ) {
    timelineID = String(item.timelineIDs[0]);
  }

  const firstMed = hasMeds ? meds[0] : null;
  const firstTest = hasTests ? tests[0] : null;
  const addedOn = firstMed?.addedOn || firstTest?.addedOn || firstMed?.datetime
  const timelineIDNum = Number(timelineID);

  const patient: PatientData = {
    id: index + 1,
    patientID: String(item.patientID),
    pName: item.pName ?? "",
    dept: getDepartmentLabelBilling(item.ptype ?? ptypeSource),
    addedOn,
    firstName: item.doctorFirstName ?? "",
    lastName: item.doctorLastName ?? "",
    category: "",
    patientTimeLineID: String(timelineIDNum),
    pType: finalDeptType === 1 ? "Outpatient" : "Inpatient",
    date: addedOn,
    admissionDate: item.admittedOn ?? addedOn,

    // 🔹 6. Use ALL medicines (unfiltered)
    medicinesList: meds.map((m: any) => ({
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

    // 🔹 7. Use FILTERED tests
    testList: tests.map((t: any) => ({
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
    paidAmount : Number(item?.test_paidAmount) || 0,
    dueAmount  : Number(item?.test_dueAmount) || 0,

    procedures: [],
  };

  processed.push(patient);
});


    const sorted = processed.sort((a, b) => {
      const dateA = a.addedOn ? new Date(a.addedOn).getTime() : 0;
      const dateB = b.addedOn ? new Date(b.addedOn).getTime() : 0;
      return dateB - dateA;
    });

    setData(sorted);
}
  };
  const fetchAllTaxInvoices = async (token: string) => {
    if (!user?.hospitalID) return;

    const deptStr =
      typeof departmentType === "string" ? departmentType : String(departmentType);

    const endpoints: { url: string; deptType: string }[] =
      deptStr === "all"
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
              url: `reception/getReceptionCompletedTaxInvoiceData/${user.hospitalID}/${deptStr}`,
              deptType: deptStr,
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
        // ignore one endpoint failure
      }
    }

    const normalized: PatientData[] = allRawItems.map(
      (item: any, index: number) => {
        const deptType =
          item.pType?.toString() ||
          item.deptType?.toString() ||
          (item.lab ? "1" : null) ||
          (item.pharmacy ? "2" : null) ||
          "1";

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
          dept: getDepartmentLabelTax(deptType),
          firstName: item.firstName || "",
          lastName: item.lastName || "",
          date: finalDate,
          addedOn: finalDate,
          admissionDate: item.admissionDate || "",
          category:
            item.category || (deptType === "1" ? "OPD" : "IPD"),
          testList,
          medicinesList,
          procedures: item.procedures || [],
          patientTimeLineID: item.patientTimeLineID || "",
          pType: deptType === "1" ? "Outpatient" : "Inpatient",
        };
      }
    );

    setData(normalized);
  };

  useEffect(() => {
    const load = async () => {
      if (!user?.hospitalID) {
        setError("User authentication details missing");
        setData([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const storedToken = await AsyncStorage.getItem("token");
        const token = storedToken || user?.token;

        if (!token) {
          setError("User token missing");
          setData([]);
          setLoading(false);
          return;
        }

        if (isBilling) {
          await fetchBilling(token);
        } else {
          await fetchAllTaxInvoices(token);
        }
      } catch (err) {
        setData([]);
        setError("Failed to load data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user?.hospitalID, isBilling, departmentType]);

  /* ------------------------------------------------------------------------ */
  /*                               Date Filtered                              */
  /* ------------------------------------------------------------------------ */

  const filteredData = useMemo(() => {
    // If no dates selected, return everything
    if (!startDate && !endDate) return data;

    const start = startDate
      ? new Date(
          startDate.getFullYear(),
          startDate.getMonth(),
          startDate.getDate()
        ).getTime()
      : null;

    const end = endDate
      ? new Date(
          endDate.getFullYear(),
          endDate.getMonth(),
          endDate.getDate(),
          23,
          59,
          59
        ).getTime()
      : null;

    return data.filter((row) => {
      if (!row.addedOn) return false;
      const d = new Date(row.addedOn).getTime();
      if (start !== null && d < start) return false;
      if (end !== null && d > end) return false;
      return true;
    });
  }, [startDate, endDate, data]);

  const headerTitle = isBilling ? "Billing" : "All Tax Invoices";
  const headerSubtitle = isBilling
    ? "View IPD/OPD billing records"
    : "View all completed tax invoices";

  /* ------------------------------------------------------------------------ */
  /*                                 Render                                   */
  /* ------------------------------------------------------------------------ */
  return (
    <SafeAreaView
      style={[
        styles.safe,
        {
          backgroundColor: COLORS.bg,
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: COLORS.text }]}>
          {headerTitle}
        </Text>
        <Text style={[styles.subtitle, { color: COLORS.sub }]}>
          {headerSubtitle}
        </Text>
      </View>

      {/* From / To Date Filters */}
      <View style={styles.topRow}>
        {/* From Date */}
        <TouchableOpacity
          style={styles.dateBox}
          onPress={() => openDatePicker("start")}
          activeOpacity={0.8}
        >
          <Text style={styles.dateLabel}>From</Text>
          <View style={styles.dateValueRow}>
            <CalendarIcon size={16} color={COLORS.brandDark} />
            <Text style={styles.dateValueText}>
              {formatDate(startDate)}
            </Text>
          </View>
        </TouchableOpacity>

        {/* To Date */}
        <TouchableOpacity
          style={styles.dateBox}
          onPress={() => openDatePicker("end")}
          activeOpacity={0.8}
          disabled={!startDate}
        >
          <Text
            style={[
              styles.dateLabel,
              !startDate && { color: COLORS.placeholder },
            ]}
          >
            To
          </Text>
          <View style={styles.dateValueRow}>
            <CalendarIcon size={16} color={COLORS.brandDark} />
            <Text style={styles.dateValueText}>
              {formatDate(endDate)}
            </Text>
          </View>
        </TouchableOpacity>

        {(startDate || endDate) && (
          <TouchableOpacity
            style={styles.clearDatesBtn}
            onPress={clearDates}
            activeOpacity={0.7}
          >
            <XIcon size={16} color={COLORS.sub} />
          </TouchableOpacity>
        )}
      </View>

      {/* Date picker (start/end) */}
      {showDatePicker && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display={Platform.OS === "android" ? "spinner" : "default"} // as requested
          maximumDate={new Date()}
          minimumDate={
            pickerTarget === "end" && startDate
              ? startDate
              : new Date(1900, 0, 1)
          }
          onChange={onDateChange}
        />
      )}

      {/* Content – shared list */}
      <View style={styles.content}>
        <BillingTaxInvoiceList
          mode={mode}
          data={filteredData}
          totalCount={data.length}
          loading={loading}
          error={error}
          startDate={startDate}
          endDate={endDate}
          departmentType={departmentType}
          onDepartmentTypeChange={setDepartmentType}
        />
      </View>

      {/* Footer */}
      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={"PatientList"} brandColor={COLORS.brand} />
      </View>
    </SafeAreaView>
  );
};

export default BillingTaxInvoiceMobile;

/* -------------------------------------------------------------------------- */
/*                                   Styles                                   */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 4,
    fontSize: FONT_SIZE.sm,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xs,
    gap: 8,
  },
  // New date box styles
  dateBox: {
    flex: 1,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
    backgroundColor: "#E5F6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    marginRight: 4,
  },
  dateLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    marginBottom: 2,
    fontWeight: "500",
  },
  dateValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateValueText: {
    fontSize: FONT_SIZE.xs,
    color: "#111827",
  },
  clearDatesBtn: {
    padding: 6,
    borderRadius: 999,
    backgroundColor: COLORS.card,
    justifyContent: "center",
    alignItems: "center",
  },

  // old chip styles (unused but harmless; delete if you want clean file)
  dateChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 999,
    backgroundColor: "#E5F6FF",
    gap: 6,
    maxWidth: responsiveWidth(70),
  },
  dateChipText: {
    flex: 1,
    fontSize: FONT_SIZE.xs,
    color: "#111827",
  },

  content: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: FOOTER_H + 12,
  },
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    height: FOOTER_H,
    justifyContent: "center",
  },
});
