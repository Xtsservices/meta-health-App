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
import { useDispatch, useSelector } from "react-redux";
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
import { showError } from "../../../store/toast.slice";

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
  nurseID?: number;
  status?: string;
  rejectReason?: string | null;
  rejectedOn?: string | null;
  rejectedBy?: number | null;
  date?: string;
  completedOn?: string;
};

export type TestItem = {
  testID: number | string;
  testName: string;
  loinc_num_: string;
  category: string;
  price: number;
  gst: number;
  amount: number;
  date?: string;
};

export type PatientData = {
  pIdNew: string;
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
  type?: string;
  
  paidAmount?: number;
  dueAmount?: number;
  totalAmount?: number;
  prescriptionURL?: string; 
medicineDueAmount?: number;
testDueAmount?: number;

};

type Mode = "billing" | "allTax";

const FOOTER_H = FOOTER_HEIGHT || 70;

type RouteParams = {
  mode?: Mode;
  department?: string;
};

const BillingTaxInvoiceMobile: React.FC = () => {
  const insets = useSafeAreaInsets();
  const user = useSelector((s: RootState) => s.currentUser);
  const route = useRoute<any>();

  // 🔹 Decide screen mode from navigation param
  const mode: Mode = route?.params?.mode === "allTax" ? "allTax" : "billing";
  const department = route?.params?.department || user?.roleName?.toLowerCase();
  const isBilling = mode === "billing";
  const isPharmacy = department === 'pharmacy';
  const isLab = department === 'pathology';
  const isRadiology = department === 'radiology';
  const isReception = !isPharmacy && !isLab && !isRadiology;

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
  const [nurses, setNurses] = useState<any[]>([]);
  const dispatch = useDispatch();
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
  const calculateTotalsFromLists = (
  medicines: MedicineItem[] = [],
  tests: TestItem[] = [],
  paidAmount = 0
) => {
  const medicineTotal = medicines.reduce(
    (sum, m) => sum + (Number(m.amount) || 0),
    0
  );

  const testTotal = tests.reduce(
    (sum, t) => sum + (Number(t.amount) || 0),
    0
  );

  const grandTotal = medicineTotal + testTotal;
  const payable = Math.max(0, grandTotal - paidAmount);

  return {
    medicineTotal,
    testTotal,
    grandTotal,
    payable,
  };
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

  const getDepartmentLabelBilling = (ptype: number, department?: string) => {
    // For reception department
    if (department === 'reception') {
    if (ptype === 1 || ptype === 21) return "OPD";
    if (ptype === 2 || ptype === 3) return "IPD / Emergency";
    return "Unknown";
  };
    if (isPharmacy) {
      if (ptype === 21 || ptype === 1) return "OPD";
      if (ptype === 2 || ptype === 3) return "IPD";
      return "Walk-in";
    }
    // For all other departments (pharmacy, lab, radiology, etc.)
    if (ptype === 21 || ptype === 1) return "OPD";
    if (ptype === 2 || ptype === 3) return "IPD ";
    return "Rejected";
  };

  const getDepartmentLabelTax = (deptType: string, department?: string): string => {
  // For reception department
  if (department === 'reception') {
    if (deptType === "1") return "OPD";
    return "IPD / Emergency";
  }
  
  // For all other departments (pharmacy, lab, radiology, etc.)
  if (deptType === "1") return "OPD";
  if (deptType === "2") return "IPD";
  if (deptType === "3") return "Walk-in";
  return "Unknown";
};

  /* ------------------------------------------------------------------------ */
  /*                            Fetching & Normalizing                        */
  /* ------------------------------------------------------------------------ */

  // Reset department filter when mode changes (billing / tax)
  useEffect(() => {
    setDepartmentType("2");
    setData([]);
    setError(null);
  }, [isBilling, department]);

  // Original reception billing function (unchanged)
 const fetchReceptionBilling = async (token: string) => {
  if (!user?.hospitalID) return;

  const deptNum =
    typeof departmentType === "number"
      ? departmentType
      : Number(departmentType) || 2;

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
      const addedOn = firstMed?.completedOn || firstMed?.addedOn || firstMed?.datetime || firstTest?.addedOn || firstTest?.datetime || "";
      const timelineIDNum = Number(timelineID);

      // 🔹 6. DUE AMOUNT LOGIC (same concept as web)


const paidAmount =
  Number(item?.medicine_paidAmount || 0) +
  Number(item?.test_paidAmount || 0);

  const {
  medicineTotal,
  testTotal,
  grandTotal,
  payable,
} = calculateTotalsFromLists(
  meds.map((m: any) => ({
    amount:
      (Number(m.sellingPrice ?? m.price) *
        Number(m.updatedQuantity ?? m.quantity ?? 1)) *
      (1 + Number(m.gst ?? 0) / 100),
  })),
  tests.map((t: any) => ({
    amount:
      Number(t.testPrice ?? t.price ?? 0) *
      (1 + Number(t.gst ?? 0) / 100),
  })),
  paidAmount
);

const patient: PatientData = {
  id: index + 1,
  patientID: String(item.patientID),

  // 🔹 ADD THIS FIELD
  pIdNew: String(item.pIdNew ?? item.patientID ?? `INV${index + 1}`),

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

  // ✅ DUE FIELDS (aligned with web)
totalAmount: grandTotal,
paidAmount,
medicineDueAmount: medicineTotal,
testDueAmount: testTotal,
dueAmount: payable,


  // 🔹 7. Use ALL medicines (unfiltered)
  medicinesList: meds.map((m: any) => {
    const sellingPrice = Number(m.sellingPrice) || 0;
    const quantity = Number(m.updatedQuantity ?? m.quantity ?? 1);
    const gst = Number(m.gst) || 0;

    const baseAmount = sellingPrice * quantity;
    const gstAmount = (baseAmount * gst) / 100;
    const totalAmount = baseAmount + gstAmount;

    return {
      id: m.id,
      name: m.name || m.medicineName || "Unknown",
      qty: quantity,
      hsn: m.hsn || "",
      price: sellingPrice,
      gst,
      amount: totalAmount,
      nurseID: m.nurseID,
    };
  }),

  // 🔹 8. Use FILTERED tests
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


  // Pharmacy billing function
// Pharmacy billing function
// Pharmacy billing function - UPDATED to include prescriptionURL
const fetchPharmacyBilling = async (token: string) => {
  if (!user?.hospitalID) return;

  const deptNum = typeof departmentType === "number" ? departmentType : Number(departmentType) || 2;
  
  let url = "";
  if (deptNum === 1) {
    // OPD
    url = `medicineInventoryPatientsOrder/${user.hospitalID}/completed/1/getMedicineInventoryPatientsOrderWithType`;
  } else if (deptNum === 2) {
    // IPD
    url = `medicineInventoryPatientsOrder/${user.hospitalID}/completed/2/getMedicineInventoryPatientsOrderWithType`;
  } else if (deptNum === 3) {
    // Walk-in
    url = `medicineInventoryPatientsOrder/${user.hospitalID}/getMedicineInventoryPatientsOrderCompletedWithoutReg`;
  } else if (deptNum === 4) {
    // Rejected
    url = `medicineInventoryPatientsOrder/${user.hospitalID}/rejected/getMedicineInventoryPatientsOrder`;
  }

  const response = await AuthFetch(url, token);
  
  if (response?.status === "success" && "data" in response) {
    const rawData = Array.isArray(response?.data?.data) ? response.data?.data : [];
    const processed: PatientData[] = rawData.map((item: any, index: number) => {
      let medicinesArray: any[] = [];
      if (deptNum === 1 || deptNum === 2) {
        // IPD/OPD uses 'medicines'
        medicinesArray = Array.isArray(item.medicines) ? item.medicines : [];
      } else {
        // Walk-in and Rejected use 'medicinesList'
        medicinesArray = Array.isArray(item.medicinesList) ? item.medicinesList : [];
      }
      
      // Check if any medicine has rejection data
      const hasRejectedMedicine = medicinesArray.some((med: any) => med.status === "rejected");
      
      // Get first rejected medicine if exists
      const rejectedMedicine = hasRejectedMedicine ? 
        medicinesArray.find((med: any) => med.status === "rejected") : null;
      let totalAmount = 0;
      let paidAmount = 0;
      let dueAmount = 0;
      
      if (deptNum === 1 || deptNum === 2) {
        totalAmount = Number(item.totalAmount) || 0;
        paidAmount = Number(item.paidAmount) || 0;
const medicinesForCalc = medicinesArray.map((m: any) => {
  const base =
    Number(m.sellingPrice || 0) *
    Number(m.updatedQuantity || m.quantity || 1);

  return { amount: base + (base * Number(m.gst || 0)) / 100 };
});

const { grandTotal, payable } = calculateTotalsFromLists(
  medicinesForCalc,
  [],
  paidAmount
);

totalAmount = grandTotal;
dueAmount = payable;


      } else {
        totalAmount = medicinesArray.reduce((sum: number, medicine: any) => {
            const sellingPrice = Number(medicine.sellingPrice) || 0;
            const quantity = Number(medicine.updatedQuantity || medicine.quantity || 1);
            const gst = Number(medicine.gst) || 0;
            
            const baseAmount = sellingPrice * quantity;
            const gstAmount = (baseAmount * gst) / 100;
            return sum + (baseAmount + gstAmount);
        }, 0);
        
        paidAmount = Number(item.paidAmount) || 0;
const medicinesForCalc = medicinesArray.map((m: any) => {
  const base =
    Number(m.sellingPrice || 0) *
    Number(m.updatedQuantity || m.quantity || 1);

  return { amount: base + (base * Number(m.gst || 0)) / 100 };
});

const { grandTotal, payable } = calculateTotalsFromLists(
  medicinesForCalc,
  [],
  paidAmount
);

totalAmount = grandTotal;
dueAmount = payable;


      }

      // Get doctor names from item or from first medicine
      const doctorName = item.doctorName || "";
      const [firstName = "", lastName = ""] = doctorName.split(" ");

      // Get timeline ID from item or from first medicine
      const timelineID = item.timelineID || 
                         item.patientTimeLineID || 
                         (medicinesArray[0]?.timelineID || 
                          medicinesArray[0]?.patientTimeLineID || "");

      // Get location - different field names
      const location = item.location || "";

      // Get addedOn date - different sources
      let addedOn = "";
      if (deptNum === 3) {
        // Walk-in has paymentDetails[0].timestamp
        addedOn = item?.paymentDetails?.[0]?.timestamp || item?.addedOn || "";
      } else if (deptNum === 4) {
        // Rejected has rejectedOn in medicine
        addedOn = rejectedMedicine?.rejectedOn || item?.addedOn || "";
      } else {
        // IPD/OPD has completedOn in medicine
        addedOn = medicinesArray[0]?.completedOn || item?.addedOn || "";
      }

      // Get prescriptionURL for walk-in
      const prescriptionURL = item.prescriptionURL || undefined;

      return {
        id: index + 1,
        patientID: String(item.patientID || item.pID || ""),
        // 🔹 ADD THIS: Include pIdNew
        pIdNew: String(item.pIdNew || item.patientID || `PHAR${index + 1}`),
        pName: item.pName || "Unknown Patient",
        dept: getDepartmentLabelBilling(item.ptype || deptNum),
        addedOn: addedOn,
        firstName: firstName,
        lastName: lastName,
        category: location,
        patientTimeLineID: String(timelineID),
        pType: deptNum === 1 ? "Outpatient" : 
               deptNum === 2 ? "Inpatient" : 
               deptNum === 3 ? "Walk-in" : "Rejected",
        type: "medicine",
        // 🔹 ADD THIS: Include prescriptionURL if available
        prescriptionURL: prescriptionURL,
        // Payment amounts
        totalAmount: totalAmount,
        paidAmount: paidAmount,
        dueAmount: dueAmount,
        medicinesList: medicinesArray.map((m: any) => {
          const sellingPrice = Number(m.sellingPrice) || 0;
          const quantity = Number(m.updatedQuantity || m.quantity || 1);
          const gst = Number(m.gst) || 0;
          
          const baseAmount = sellingPrice * quantity;
          const gstAmount = (baseAmount * gst) / 100;
          const totalAmount = baseAmount + gstAmount;

          return {
            id: m.medicineID || m.id,
            name: m.medicineName || m.name || "Unknown",
            qty: quantity,
            hsn: m.hsn || "",
            price: sellingPrice,
            gst: gst,
            amount: totalAmount,
            nurseID: m.nurseID || m.medGivenBy,
            // 🔹 ADD: Include rejection data if medicine is rejected
            status: m.status || "completed",
            rejectReason: m.rejectReason || null,
            rejectedOn: m.rejectedOn || null,
            rejectedBy: m.rejectedBy || null,
          };
        }),
        testList: [],
        procedures: [],
      };
    });

    const sorted = processed.sort((a, b) => {
      const dateA = a.addedOn ? new Date(a.addedOn).getTime() : 0;
      const dateB = b.addedOn ? new Date(b.addedOn).getTime() : 0;
      return dateB - dateA;
    });

    setData(sorted);
  } else {
    setData([]);
  }
};

  // Lab/Radiology billing function - MODIFIED to include dueAmount
  const fetchLabRadiologyBilling = async (token: string) => {
    if (!user?.hospitalID) return;

    const deptName = isRadiology ? 'radiology' : 'pathology';
    const url = `test/${deptName}/${user.hospitalID}/approved/getBillingData`;
    
    const response = await AuthFetch(url, token)as any;
    // FIXED: Use the correct response structure from working code
    
    if ((response?.status === "success") && Array.isArray(response?.data?.billingData)) {
    const billingData = response?.data?.billingData || response?.billingData || response?.data?.data || response?.data;
      
      // FIXED: Use the same filtering logic as working code
      const filteredData = billingData.filter((each: any) => {
        const ptype = each?.ptype;
        if (departmentType === "1") return ptype === 21; // OPD (21)
        if (departmentType === "2") return ptype === 2 || ptype === 3; // IPD (2 or 3)
        return true;
      });

      const processed: PatientData[] = filteredData.map((item: any, index: number) => {
        // Calculate total amount from tests
        const totalAmount = Array.isArray(item.testsList) 
          ? item.testsList.reduce((sum: number, test: any) => {
              const price = Number(test.testPrice) || 0;
              const gst = Number(test.gst) || 0;
              return sum + (price * (1 + gst / 100));
            }, 0)
          : 0;
const tests: TestItem[] = Array.isArray(item.testsList)
  ? item.testsList.map((t: any) => ({
      testID: t.id || t.testID,
      testName: t.test || t.testName,
      loinc_num_: t.loinc_num_ || "",
      category: t.category || "pathology",
      price: Number(t.testPrice) || 0,
      gst: Number(t.gst) || 0,
      amount:
        (Number(t.testPrice) || 0) *
        (1 + (Number(t.gst) || 0) / 100),
    }))
  : [];

const paidAmount = Number(item.paidAmount) || 0;
const { grandTotal, payable } = calculateTotalsFromLists(
  [],
  tests,
  paidAmount
);




        return {
          id: index + 1,
          patientID: String(item.patientID || item.pID || ""),
          pName: item.pName || "Unknown Patient",
          dept: getDepartmentLabelBilling(item.ptype || 1),
          addedOn: item.addedOn || item.datetime || "",
          firstName: item.doctorFirstName || "",
          lastName: item.doctorLastName || "",
          category: "",
          patientTimeLineID: String(item.timeLineID || item.id || ""),
          pType: (item.ptype === 21) ? "Outpatient" : "Inpatient",
          type: "lab",
          testList: Array.isArray(item.testsList) ? item.testsList.map((t: any) => ({
            testID: t.id || t.testID,
            testName: t.test || t.testName,
            loinc_num_: t.loinc_num_ || "",
            category: t.category || "pathology",
            price: Number(t.testPrice) || 0,
            gst: Number(t.gst) || 0,
            amount: (Number(t.testPrice) || 0) * (1 + (Number(t.gst) || 0) / 100),
          })) : [],
          medicinesList: [],
          procedures: [],
          // ADDED: Include payment amounts from API response
totalAmount: grandTotal,
paidAmount,
dueAmount: payable,
        };
      });

      const sorted = processed.sort((a, b) => {
        const dateA = a.addedOn ? new Date(a.addedOn).getTime() : 0;
        const dateB = b.addedOn ? new Date(b.addedOn).getTime() : 0;
        return dateB - dateA;
      });

      setData(sorted);
    } else {
      setData([]); // Set empty array if no data
    }
  };
  const fetchReceptionTaxInvoices = async (token: string) => {
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
    const arr = Array.isArray(res?.data?.data) ? res.data.data : [];
    arr.forEach((item: any) =>
      allRawItems.push({ ...item, deptType: ep.deptType })
    );
  } catch {}
}

/* ✅ FILTER AFTER DATA IS READY */
const filteredItems = allRawItems.filter((item) => {
  const dept =
    item?.lab?.departmentType ??
    item?.pharmacy?.departmentType ??
    null;

  // OPD
  if (departmentType === "1") {
    return dept === 1;
  }

  // IPD / Emergency
  if (departmentType === "2") {
    return dept !== 1;
  }

  return true;
});


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

   const normalized: PatientData[] = filteredItems.map(
  (item: any, index: number) => {
    
    const deptType =
      item.pType?.toString() ||
      item.deptType?.toString() ||
      (item.lab ? "1" : null) ||
      (item.pharmacy ? "2" : null) ||
      "1";
    const medicinesList: MedicineItem[] =
      item.pharmacy?.medicinesList?.map((m: any) => {
        const price = Number(m.sellingPrice) * Number(m.updatedQuantity) || 0;
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
          nurseID: m.nurseID,
            date: m.completedOn || m.datetime || "",
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
            date: t.lastUpdatedOn || t.addedOn || "",
        };
      }) || [];

    // 🔹 NEW: calculate due amounts from lists
    const medicineDueAmount = medicinesList.reduce(
      (sum, m) => sum + (m.amount || 0),
      0
    );
    const testDueAmount = testList.reduce(
      (sum, t) => sum + (t.amount || 0),
      0
    );

      // 🔹 UPDATED: Get dates from all possible sources and find the latest
      const allDates: string[] = [];

      // From medicines
      medicinesList.forEach((med) => {
        if (med.date) allDates.push(med.date);
      });

      // From tests
      testList.forEach((test) => {
        if (test.date) allDates.push(test.date);
      });

      // From pharmacy payment details
      if (item.pharmacy?.paymentDetails?.[0]?.timestamp) {
        allDates.push(item.pharmacy.paymentDetails[0].timestamp);
      }

      // From pharmacy completedOn
      if (item.pharmacy?.medicinesList?.[0]?.completedOn) {
        allDates.push(item.pharmacy.medicinesList[0].completedOn);
      }

      // From lab lastUpdatedOn
      if (item.lab?.labTests?.[0]?.lastUpdatedOn) {
        allDates.push(item.lab.labTests[0].lastUpdatedOn);
      }

      // From item addedOn
      if (item.addedOn) {
        allDates.push(item.addedOn);
      }

      // 🔹 Find the latest date
      const latestDate = allDates.length > 0
        ? allDates.sort((a: string, b: string) => 
            new Date(b).getTime() - new Date(a).getTime()
        )[0]
        : "";

    return {
      id: index + 1,
      patientID: item.patientID || `INV${index + 1}`,
      // 🔹 NEW: satisfy PatientData.pIdNew
      pIdNew: item.pIdNew || item.patientID || `INV${index + 1}`,

      pName: item.pName || "Unknown Patient",
      dept: getDepartmentLabelTax(deptType),
      firstName: item.firstName || "",
      lastName: item.lastName || "",
      date: latestDate, 
      addedOn: latestDate, 
      admissionDate: item.admissionDate || "",
      category: item.category || (deptType === "1" ? "OPD" : "IPD"),
      testList,
      medicinesList,
      procedures: item.procedures || [],
      patientTimeLineID: item.patientTimeLineID || "",
      pType: deptType === "1" ? "Outpatient" : "Inpatient",

      // 🔹 NEW: satisfy PatientData.medicineDueAmount / testDueAmount
      medicineDueAmount,
      testDueAmount,
    };
  }
);


    setData(normalized);
  };

  // Pharmacy tax invoices function
  const fetchPharmacyTaxInvoices = async (token: string) => {
    if (!user?.hospitalID) return;

    const deptNum = typeof departmentType === "number" ? departmentType : Number(departmentType) || 2;
    
    let url = "";
    if (deptNum === 1) {
      // OPD
      url = `medicineInventoryPatientsOrder/${user.hospitalID}/1/getMedicineInventoryPatientsOrderCompletedWithRegPatient?startDate=&endDate=`;
    } else if (deptNum === 2) {
      // IPD
      url = `medicineInventoryPatientsOrder/${user.hospitalID}/2/getMedicineInventoryPatientsOrderCompletedWithRegPatient?startDate=&endDate=`;
    } else if (deptNum === 3) {
      // Walk-in
      url = `medicineInventoryPatientsOrder/${user.hospitalID}/getMedicineInventoryPatientsOrderCompletedWithoutReg?startDate=&endDate=`;
    }

    const response = await AuthFetch(url, token);
    
    if (response?.status === "success" && "data" in response) {
      const rawData = Array.isArray(response?.data?.data) ? response.data?.data : [];
      
      const processed: PatientData[] = rawData.map((item: any, index: number) => ({
        
        id: index + 1,
        patientID: String(item.patientID || item.pID || ""),
        pName: item.pName || "Unknown Patient",
        dept: getDepartmentLabelTax(String(deptNum)),
        addedOn: item.addedOn || item.datetime || item.patientAddedOn || "",
        firstName: item.firstName || "",
        lastName: item.lastName || "",
        category: "",
        patientTimeLineID: String(item.patientTimeLineID || item.id || ""),
        pType: deptNum === 1 ? "Outpatient" : "Inpatient",
        type: "medicine",
        medicinesList: Array.isArray(item.medicinesList) ? item.medicinesList.map((m: any) => ({
          id: m.id,
          name: m.name || m.medicineName || "Unknown",
          category: m.medicineType || "",
          qty: Number(m.updatedQuantity) || 1,
          hsn: m.hsn || "",
          price: Number(m.sellingPrice) || 0,
          gst: Number(m.gst) || 0,
          amount: (Number(m.sellingPrice) || 0) * (Number(m.updatedQuantity) || 1) * (1 + (Number(m.gst) || 0) / 100),
          nurseID: m.nurseID,
          completedOn:m.completedOn || ""
        })) : [],
        testList: [],
        procedures: [],
      }));

      setData(processed);
    }
  };
  

  // Lab/Radiology tax invoices function
  const fetchLabRadiologyTaxInvoices = async (token: string) => {
    if (!user?.hospitalID) return;

    const deptName = isRadiology ? 'Radiology' : 'Pathology';
    const url = `test/getOpdIpdTaxInvoiceData/${user.hospitalID}/${deptName}?startDate=&endDate=`;
    
    const response = await AuthFetch(url, token);
    if (response?.status === "success" && "data" in response) {
      const rawData = Array.isArray(response?.data?.data) ? response.data?.data : [];
      
      // Filter by department type
      const filteredData = rawData.filter((item: any) => {
        if (departmentType === "1") return item.departmemtType === 1; // OPD
        if (departmentType === "2") return item.departmemtType === 2; // IPD
        return true;
      });

      const processed: PatientData[] = filteredData.map((item: any, index: number) => ({
        id: index + 1,
        patientID: String(item.patientID || ""),
        pName: item.pName || "Unknown Patient",
        dept: getDepartmentLabelTax(String(item.departmemtType || 1)),
        addedOn: item.addedOn || "",
        firstName: item.firstName || "",
        lastName: item.lastName || "",
        category: item.category || "",
        patientTimeLineID: String(item.patientTimeLineID || ""),
        pType: item.departmemtType === 1 ? "Outpatient" : "Inpatient",
        type: "lab",
        testList: Array.isArray(item.testsList) ? item.testsList.map((t: any) => ({
          testID: t.testID,
          testName: t.testName,
          loinc_num_: t.loinc_num_ || "",
          category: t.category || "",
          price: Number(t.testPrice) || 0,
          gst: Number(t.gst) || 0,
          amount: (Number(t.testPrice) || 0) * (1 + (Number(t.gst) || 0) / 100),
        })) : [],
        medicinesList: [],
        procedures: [],
      }));
      const sorted = processed.sort((a, b) => {
      const dateA = a.addedOn ? new Date(a.addedOn).getTime() : 0;
      const dateB = b.addedOn ? new Date(b.addedOn).getTime() : 0;
      return dateB - dateA; // Descending order (newest first)
    });


      setData(sorted);
    }
  };

  // Walk-in tax invoices function
  const fetchWalkinTaxInvoices = async (token: string) => {
    if (!user?.hospitalID) return;

    if (isPharmacy) {
      const url = `medicineInventoryPatientsOrder/${user.hospitalID}/getMedicineInventoryPatientsOrderCompletedWithoutReg?startDate=&endDate=`;
      const response = await AuthFetch(url, token);
      
      if (response?.status === "success" && "data" in response) {
        const rawData = Array.isArray(response?.data?.data) ? response.data?.data : [];
        
        const processed: PatientData[] = rawData.map((item: any, index: number) => ({
          id: index + 1,
          patientID: String(item.pID || item.patientID || ""),
          pName: item.pName || "Unknown Patient",
          dept: "Walk-in",
          addedOn: item?.paymentDetails?.[0]?.timestamp || item?.addedOn || "",
          firstName: "",
          lastName: "",
          category: "",
          patientTimeLineID: String(item.id || ""),
          pType: "Walk-in",
          type: "medicine",
          pIdNew: item.pIdNew ? String(item.pIdNew) : undefined, // Add this
          prescriptionURL: item.prescriptionURL || undefined, // Add this
          medicinesList: Array.isArray(item.medicinesList) ? item.medicinesList.map((m: any) => ({
            id: m.id,
            name: m.name || m.medicineName || "Unknown", 
            category: m.medicineType || "",
            qty: Number(m.updatedQuantity) || 1,
            hsn: m.hsn || "",
            price: Number(m.sellingPrice) || 0,
            gst: Number(m.gst) || 0,
            amount: (Number(m.sellingPrice) || 0) * (Number(m.updatedQuantity) || 1) * (1 + (Number(m.gst) || 0) / 100),
            nurseID: m.nurseID,
          })) : [],
          testList: [],
          procedures: [],
        }));

        setData(processed);
      }
    } else {
      const deptName = isRadiology ? 'Radiology' : 'Pathology';
      const url = `test/getWalkinTaxinvoiceData/${user.hospitalID}/${deptName}?startDate=&endDate=`;
      
      const response = await AuthFetch(url, token);
      
      if (response?.status === "success" && "data" in response) {
        const rawData = Array.isArray(response?.data?.data) ? response.data?.data : [];
        
        const processed: PatientData[] = rawData.map((item: any, index: number) => ({
          id: index + 1,
          patientID: String(item.pID || item.patientID || ""),
          pName: item.pName || "Unknown Patient",
          dept: "Walk-in",
          addedOn: item.addedOn || "",
          firstName: "",
          lastName: "",
          category: "",
          patientTimeLineID: String(item.id || ""),
          pType: "Walk-in",
          type: "lab",
          testList: Array.isArray(item.testsList) ? item.testsList.map((t: any) => ({
            testID: t.testID,
            testName: t.testName,
            loinc_num_: t.loinc_num_ || "",
            category: t.category || "",
            price: Number(t.testPrice) || 0,
            gst: Number(t.gst) || 0,
            amount: (Number(t.testPrice) || 0) * (1 + (Number(t.gst) || 0) / 100),
          })) : [],
          medicinesList: [],
          procedures: [],
        }));

        setData(processed);
      }
    }
  };

  const fetchBilling = async (token: string) => {
    if (isPharmacy) {
      await fetchPharmacyBilling(token);
    } else if (isLab || isRadiology) {
      await fetchLabRadiologyBilling(token);
    } else {
      await fetchReceptionBilling(token);
    }
  };

  const fetchAllTaxInvoices = async (token: string) => {
    if (departmentType === "3") {
      // Walk-in
      await fetchWalkinTaxInvoices(token);
    } else if (isPharmacy) {
      await fetchPharmacyTaxInvoices(token);
    } else if (isLab || isRadiology) {
      await fetchLabRadiologyTaxInvoices(token);
    } else {
      await fetchReceptionTaxInvoices(token);
    }
  };

  const fetchNurses = async (token: string) => {
    if (!user?.hospitalID) return;
    
    try {
      const response = await AuthFetch(`doctor/${user.hospitalID}/getAllNurse`, token);
      if (response?.status === "success" && "data" in response && Array.isArray(response?.data?.data)) {
        setNurses(response?.data?.data);
      }
    } catch (error) {
      dispatch(showError("Error fetching nurses"));
    }
  };

  // Update the load function to fetch nurses
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

        // Fetch nurses first
        await fetchNurses(token);

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
  }, [user?.hospitalID, isBilling, departmentType, department]);

  /* ------------------------------------------------------------------------ */
  /*                               Date Filtered                              */
  /* ------------------------------------------------------------------------ */

  const filteredData = useMemo(() => {
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
    ? `View ${department} billing records`
    : `View all completed ${department} tax invoices`;

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
          display={Platform.OS === "android" ? "spinner" : "default"}
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
          userDepartment={department}
          nurses={nurses} 
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
