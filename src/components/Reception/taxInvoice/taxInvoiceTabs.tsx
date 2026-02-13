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
  location?: string;
  doctorName?: string;
  doctorID?: number;
  departmentType?: number;
  orderID?: number | string;
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
    console.log("Reception Billing Response12345:", response);
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

  // Pharmacy billing function - UPDATED for new API structure
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
      const processed: PatientData[] = [];
      
      // Check if response has the new structure (with orders array)
      if (rawData.length > 0 && rawData[0].orders) {
        // New API structure
        rawData.forEach((item: any, index: number) => {
          const patientInfo = item.patientInfo || {};
          const patientTotals = item.patientTotals || {};
          
          // Process each order
          if (Array.isArray(item.orders)) {
            item.orders.forEach((order: any, orderIndex: number) => {
              if (!Array.isArray(order.medicines) || order.medicines.length === 0) return;
              
              const isIPD = patientInfo.ptype === 2;
              const isOPD = patientInfo.ptype === 21 || patientInfo.ptype === 1;
              
              // Filter based on department type
              if (deptNum === 1 && !isOPD) return; // OPD only
              if (deptNum === 2 && !isIPD) return; // IPD only
              
              const medicinesArray = order.medicines || [];
              
              // Get completedOn from first medicine
              const completedOn = medicinesArray[0]?.completedOn || "";
              
              // Calculate medicine totals
              let totalAmount = 0;
              let paidAmount = 0;
              let dueAmount = 0;
              
              // For IPD with order totals
              if (isIPD && order.totalAmount !== null) {
                totalAmount = Number(order.totalAmount) || 0;
                paidAmount = Number(order.paidAmount) || 0;
                dueAmount = Number(order.dueAmount) || 0;
              } else {
                // Calculate from medicines
                const medicinesForCalc = medicinesArray.map((m: any) => {
                  const base = Number(m.sellingPrice || 0) * Number(m.updatedQuantity || m.quantity || 1);
                  return { amount: base + (base * Number(m.gst || 0)) / 100 };
                });

                const { grandTotal, payable } = calculateTotalsFromLists(
                  medicinesForCalc,
                  [],
                  Number(order.paidAmount) || 0
                );

                totalAmount = grandTotal;
                dueAmount = payable;
                paidAmount = Number(order.paidAmount) || 0;
              }

              // Get payment timestamp if available
              let paymentTimestamp = "";
              if (Array.isArray(order.paymentDetails) && order.paymentDetails.length > 0) {
                paymentTimestamp = order.paymentDetails[0]?.timestamp || "";
              }

              const patient: PatientData = {
                id: processed.length + 1,
                patientID: String(patientInfo.patientID || ""),
                pIdNew: String(patientInfo.patientID || `PHAR${processed.length + 1}`),
                pName: patientInfo.pName || "Unknown Patient",
                dept: getDepartmentLabelBilling(patientInfo.ptype || deptNum),
                addedOn: paymentTimestamp || completedOn || "",
                firstName: "",
                lastName: "",
                category: order.location || "",
                patientTimeLineID: String(item.timelineID || ""),
                pType: isIPD ? "Inpatient" : "Outpatient",
                type: "medicine",
                location: order.location || "",
                doctorName: order.doctorName || "",
                doctorID: order.doctorID || null,
                departmentType: order.departmemtType || null,
                orderID: order.orderID || "",
                
                // Payment amounts
                totalAmount,
                paidAmount,
                dueAmount,
                
                medicinesList: medicinesArray.map((m: any) => {
                  const sellingPrice = Number(m.sellingPrice) || 0;
                  const quantity = Number(m.updatedQuantity || m.quantity || 1);
                  const gst = Number(m.gst) || 0;
                  
                  const baseAmount = sellingPrice * quantity;
                  const gstAmount = (baseAmount * gst) / 100;
                  const totalAmount = baseAmount + gstAmount;

                  return {
                    id: m.medicineID || m.itemID || m.id,
                    name: m.medicineName || m.name || "Unknown",
                    qty: quantity,
                    hsn: m.hsn || "",
                    price: sellingPrice,
                    gst,
                    amount: totalAmount,
                    nurseID: m.nurseID || m.medGivenBy,
                    completedOn: m.completedOn || "",
                    status: m.status || "completed",
                    rejectReason: m.rejectReason || null,
                    rejectedOn: m.rejectedOn || null,
                    rejectedBy: m.rejectedBy || null,
                  };
                }),
                testList: [],
                procedures: [],
              };

              processed.push(patient);
            });
          }
        });
      } else {
        // Old API structure (fallback)
        rawData.forEach((item: any, index: number) => {
          let medicinesArray: any[] = [];
          if (deptNum === 1 || deptNum === 2) {
            // IPD/OPD uses 'medicines'
            medicinesArray = Array.isArray(item.medicines) ? item.medicines : [];
          } else {
            // Walk-in and Rejected use 'medicinesList'
            medicinesArray = Array.isArray(item.medicinesList) ? item.medicinesList : [];
          }
          
          if (medicinesArray.length === 0) return;
          
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
              const base = Number(m.sellingPrice || 0) * Number(m.updatedQuantity || m.quantity || 1);
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
              const base = Number(m.sellingPrice || 0) * Number(m.updatedQuantity || m.quantity || 1);
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

          const patient: PatientData = {
            id: processed.length + 1,
            patientID: String(item.patientID || item.pID || ""),
            pIdNew: String(item.pIdNew || item.patientID || `PHAR${processed.length + 1}`),
            pName: item.pName || "Unknown Patient",
            dept: getDepartmentLabelBilling(item.ptype || deptNum),
            addedOn,
            firstName,
            lastName,
            category: location,
            patientTimeLineID: String(timelineID),
            pType: deptNum === 1 ? "Outpatient" : 
                   deptNum === 2 ? "Inpatient" : 
                   deptNum === 3 ? "Walk-in" : "Rejected",
            type: "medicine",
            prescriptionURL,
            location,
            doctorName,
            orderID: item.orderID || "",
            
            // Payment amounts
            totalAmount,
            paidAmount,
            dueAmount,
            
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
                gst,
                amount: totalAmount,
                nurseID: m.nurseID || m.medGivenBy,
                status: m.status || "completed",
                rejectReason: m.rejectReason || null,
                rejectedOn: m.rejectedOn || null,
                rejectedBy: m.rejectedBy || null,
                completedOn: m.completedOn || "",
              };
            }),
            testList: [],
            procedures: [],
          };

          processed.push(patient);
        });
      }

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

  // Lab/Radiology billing function
const fetchLabRadiologyBilling = async (token: string) => {
  if (!user?.hospitalID) return;

  const deptName = isRadiology ? 'radiology' : 'pathology';
  const url = `test/${deptName}/${user.hospitalID}/approved/getBillingData`;
  
  const response = await AuthFetch(url, token) as any;
  console.log("1234",response)
  
  if ((response?.status === "success") && Array.isArray(response?.data?.billingData)) {
    const billingData = response?.data?.billingData || response?.billingData || response?.data?.data || response?.data;
    
    // Filter by department type
    const filteredData = billingData.filter((each: any) => {
      const ptype = each?.ptype;
      if (departmentType === "1") return ptype === 21; // OPD (21)
      if (departmentType === "2") return ptype === 2 || ptype === 3; // IPD (2 or 3)
      return true;
    });

    const processed: PatientData[] = filteredData.map((item: any, index: number) => {
      // Use API values directly instead of calculating
      const totalAmount = Number(item.totalAmount) || 0;
      const totalBaseAmount = Number(item.totalBaseAmount) || 0;
      const totalGstAmount = Number(item.totalGstAmount) || 0;
      const paidAmount = Number(item.paidAmount) || 0;
      const dueAmount = Number(item.dueAmount) || 0;
      
      const tests: TestItem[] = Array.isArray(item.testsList)
        ? item.testsList.map((t: any) => ({
            testID: t.id || t.testID,
            testName: t.test || t.testName,
            loinc_num_: t.loinc_num_ || "",
            category: t.category || "pathology",
            price: Number(t.testPrice) || 0,
            gst: Number(t.gstPercentage) || Number(t.gst) || 0,
            amount: Number(t.totalAmount) || (Number(t.testPrice) || 0),
            baseAmount: Number(t.baseAmount) || 0,
            gstAmount: Number(t.gstAmount) || 0,
            gstPercentage: Number(t.gstPercentage) || Number(t.gst) || 0,
          }))
        : [];

      return {
        id: index + 1,
        patientID: String(item.patientID || item.pID || ""),
        pIdNew: String(item.pIdNew || item.patientID || `LAB${index + 1}`),
        pName: item.pName || "Unknown Patient",
        dept: getDepartmentLabelBilling(item.ptype || 1),
        addedOn: item.addedOn || item.datetime || "",
        firstName: item.doctorFirstName || "",
        lastName: item.doctorLastName || "",
        category: "",
        patientTimeLineID: String(item.timeLineID || item.id || ""),
        pType: (item.ptype === 21) ? "Outpatient" : "Inpatient",
        type: "lab",
        testList: tests,
        medicinesList: [],
        procedures: [],
        totalAmount: totalAmount,
        paidAmount: paidAmount,
        dueAmount: dueAmount,
        totalBaseAmount: totalBaseAmount,
        totalGstAmount: totalGstAmount,
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

const fetchReceptionTaxInvoices = async (token: string) => {
  if (!user?.hospitalID) return;

  const deptStr = typeof departmentType === "string" ? departmentType : String(departmentType);

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
      console.log("tax222222", ep.url, res);
      const arr = Array.isArray(res?.data?.data) ? res.data.data : [];
      arr.forEach((item: any) =>
        allRawItems.push({ ...item, deptType: ep.deptType })
      );
    } catch {}
  }

  /* ✅ FILTER AFTER DATA IS READY */
  const filteredItems = allRawItems.filter((item) => {
    // Determine department type from the data
    const hasLab = item.lab && Object.keys(item.lab).length > 0;
    const hasPharmacy = item.pharmacy && Object.keys(item.pharmacy).length > 0;
    
    // Check if it's OPD or IPD based on the endpoint or data
    const isOPD = item.deptType === "1";
    const isIPD = item.deptType === "2";

    // Filter based on selected departmentType
    if (departmentType === "1") {
      return isOPD;
    }
    if (departmentType === "2") {
      return isIPD;
    }
    return true;
  });

  const normalized: PatientData[] = filteredItems.map(
    (item: any, index: number) => {
      const deptType = item.deptType || "1";
      
      // Process pharmacy medicines if they exist
      const medicinesList: MedicineItem[] = [];
      if (item.pharmacy?.medicinesList && Array.isArray(item.pharmacy.medicinesList)) {
        item.pharmacy.medicinesList.forEach((m: any) => {
          const sellingPrice = Number(m.sellingPrice) || 0;
          const quantity = Number(m.updatedQuantity || m.quantity || 1);
          const gst = Number(m.gst) || 0;
          
          const baseAmount = sellingPrice * quantity;
          const gstAmount = (baseAmount * gst) / 100;
          const totalAmount = baseAmount + gstAmount;

          medicinesList.push({
            id: m.id || m.medicineID,
            name: m.medicineName || m.name || "Unknown Medicine",
            category: m.medicineType || "",
            qty: quantity,
            hsn: m.hsn || "",
            price: sellingPrice,
            gst,
            amount: totalAmount,
            nurseID: m.nurseID,
            date: m.completedOn || m.datetime || item.paidAt || "",
            status: m.status || "completed",
            completedOn: m.completedOn || "",
          });
        });
      }

      // Process lab tests if they exist
      const testList: TestItem[] = [];
      if (item.lab?.labTests && Array.isArray(item.lab.labTests)) {
        item.lab.labTests.forEach((t: any) => {
          testList.push({
            testID: t.testID,
            testName: t.testName || "Unknown Test",
            loinc_num_: t.loincCode || "",
            category: t.category || "pathology",
            price: Number(t.baseAmount) || 0,
            gst: Number(t.gstPercentage) || 0,
            amount: Number(t.totalAmount) || 0,
            baseAmount: Number(t.baseAmount) || 0,
            gstAmount: Number(t.gstAmount) || 0,
            gstPercentage: Number(t.gstPercentage) || 0,
            date: t.lastUpdatedOn || t.addedOn || item.paidAt || "",
          });
        });
      }

      // Get payment date - use the latest date from various sources
      const paymentDate = item.paidAt || 
                         item.lab?.latestLabPaymentAt || 
                         item.pharmacy?.paymentDetails?.[0]?.timestamp || 
                         item.lab?.labTests?.[0]?.lastUpdatedOn ||
                         item.pharmacy?.medicinesList?.[0]?.completedOn ||
                         "";

      // Get doctor name
      const doctorName = item.doctorName || "";
      const [firstName = "", lastName = ""] = doctorName.split(" ");

      // Calculate totals from grand_* fields or from individual departments
      const grandTotalAmount = Number(item.grand_totalAmount) || 0;
      const grandPaidAmount = Number(item.grand_paidAmount) || 0;
      const grandDueAmount = Number(item.grand_dueAmount) || 0;
      const grandBaseAmount = Number(item.grand_baseAmount) || 0;
      const grandGstAmount = Number(item.grand_gstAmount) || 0;

      // Individual department totals
      const pharmacyTotal = Number(item.pharmacy?.totalAmount) || 0;
      const pharmacyPaid = Number(item.pharmacy?.paidAmount) || 0;
      const pharmacyDue = Number(item.pharmacy?.dueAmount) || 0;
      
      const labTotal = Number(item.lab?.labTotals?.totalAmount) || 0;
      const labPaid = Number(item.lab?.labTotals?.paidAmount) || 0;
      const labDue = Number(item.lab?.labTotals?.dueAmount) || 0;

      // Medicine and test due amounts from individual departments
      const medicineDueAmount = medicinesList.reduce((sum, m) => sum + (m.amount || 0), 0);
      const testDueAmount = testList.reduce((sum, t) => sum + (t.amount || 0), 0);

      return {
        id: index + 1,
        patientID: String(item.patientID || ""),
        pIdNew: String(item.pIdNew || item.patientID || `INV${index + 1}`),
        pName: item.pName || "Unknown Patient",
        dept: getDepartmentLabelTax(deptType, 'reception'),
        firstName,
        lastName,
        doctorName,
        date: paymentDate,
        addedOn: paymentDate,
        admissionDate: item.admissionDate || paymentDate,
        location: item.location || "",
        category: item.location || (deptType === "1" ? "OPD" : "IPD"),
        
        // Test and medicine lists
        testList,
        medicinesList,
        procedures: item.procedures || [],
        
        // Timeline/Order info
        patientTimeLineID: String(item.patientTimeLineID || item.timelineID || ""),
        orderID: item.orderID || "",
        
        // Patient type
        pType: deptType === "1" ? "Outpatient" : "Inpatient",
        type: testList.length > 0 ? "lab" : medicinesList.length > 0 ? "medicine" : "mixed",
        
        // ✅ USE GRAND TOTALS FROM API RESPONSE
        totalAmount: grandTotalAmount || pharmacyTotal + labTotal,
        paidAmount: grandPaidAmount || pharmacyPaid + labPaid,
        dueAmount: grandDueAmount || pharmacyDue + labDue,
        
        // Individual due amounts for backward compatibility
        medicineDueAmount: medicineDueAmount,
        testDueAmount: testDueAmount,
        
        // Base and GST amounts
        totalBaseAmount: grandBaseAmount || pharmacyTotal + labTotal,
        totalGstAmount: grandGstAmount || pharmacyDue + labDue,
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
          completedOn: m.completedOn || ""
        })) : [],
        testList: [],
        procedures: [],
      }));

      setData(processed);
    }
  };

const fetchLabRadiologyTaxInvoices = async (token: string) => {
  if (!user?.hospitalID) return;

  const deptName = isRadiology ? 'Radiology' : 'Pathology';
  const url = `test/getOpdIpdTaxInvoiceData/${user.hospitalID}/${deptName}?startDate=&endDate=`;
  
  const response = await AuthFetch(url, token);
  console.log("Lab/Radiology Tax Invoice response:", response);
  
  if (response?.status === "success" && "data" in response) {
    const rawData = Array.isArray(response?.data?.data) ? response.data?.data : [];
    const processed: PatientData[] = [];
    
    // Filter by department type first
    const filteredData = rawData.filter((patient: any) => {
      const deptType = patient?.departmentType;
      if (departmentType === "1") return deptType === 1; // OPD
      if (departmentType === "2") return deptType === 2; // IPD
      return true;
    });

    // Process each patient's invoices
    filteredData.forEach((patient: any) => {
      if (!Array.isArray(patient.invoices) || patient.invoices.length === 0) return;

      // Process each invoice separately
      patient.invoices.forEach((invoice: any) => {
        if (!Array.isArray(invoice.testsList) || invoice.testsList.length === 0) return;

        const tests: TestItem[] = invoice.testsList.map((t: any) => ({
          testID: t.testID,
          testName: t.testName,
          loinc_num_: t.loincCode || "",
          category: deptName,
          price: Number(t.baseAmount) || 0,
          gst: Number(t.gstPercentage) || 0,
          amount: Number(t.totalAmount) || 0,
          baseAmount: Number(t.baseAmount) || 0,
          gstAmount: Number(t.gstAmount) || 0,
          gstPercentage: Number(t.gstPercentage) || 0,
        }));

        processed.push({
          id: processed.length + 1,
          patientID: String(patient.patientID || ""),
          pIdNew: String(patient.patientID || `TAX${processed.length + 1}`),
          pName: patient.pName || "Unknown Patient",
          dept: getDepartmentLabelTax(String(patient.departmentType || 1)),
          addedOn: invoice.addedOn || "",
          firstName: patient.doctorName?.split(' ')[0] || "",
          lastName: patient.doctorName?.split(' ').slice(1).join(' ') || "",
          category: "",
          patientTimeLineID: String(patient.timelineID || ""),
          pType: (patient.departmentType === 1) ? "Outpatient" : "Inpatient",
          type: "lab",
          testList: tests,
          medicinesList: [],
          procedures: [],
          
          // Use invoice-level amounts
          totalAmount: Number(invoice.totalAmount) || 0,
          paidAmount: Number(invoice.paidAmount) || 0,
          dueAmount: Number(invoice.dueAmount) || 0,
          totalBaseAmount: Number(invoice.totalBaseAmount) || 0,
          totalGstAmount: Number(invoice.totalGstAmount) || 0,
        });
      });
    });

    const sorted = processed.sort((a, b) => {
      const dateA = a.addedOn ? new Date(a.addedOn).getTime() : 0;
      const dateB = b.addedOn ? new Date(b.addedOn).getTime() : 0;
      return dateB - dateA;
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
          pIdNew: item.pIdNew ? String(item.pIdNew) : undefined,
          prescriptionURL: item.prescriptionURL || undefined,
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