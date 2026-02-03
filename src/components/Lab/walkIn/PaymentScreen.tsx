import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  StatusBar,
  SafeAreaView,
  Dimensions,
  Keyboard,
  Image,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthPost } from "../../../auth/auth";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LinearGradient from "react-native-linear-gradient";

// Utils
import {
  SPACING,
  FONT_SIZE,
  ICON_SIZE,
  isSmallDevice,
} from "../../../utils/responsive";
import { COLORS } from "../../../utils/colour";

// Icons
import { CheckIcon } from "../../../utils/SvgIcons";
import { showError, showSuccess } from "../../../store/toast.slice";
import { useDispatch } from "react-redux";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type PaymentMethod = "cards" | "online" | "cash";

interface PaymentAmountsNum {
  cards: number;
  online: number;
  cash: number;
}

interface PaymentAmountsStr {
  cards: string;
  online: string;
  cash: string;
}

interface MedicineType {
  id: number | null;
  name: string;
  category: string;
  hsn: string;
  quantity: number | null;
  costPrice: number | null;
  sellingPrice: number | null;
  manufacturer: string;
  location: string;
  expiryDate: string;
  addedOn?: string;
  gst?: number | string;
  isActive?: number;
  selectedQuantity?: number;
}

type PMProps = {
  method: PaymentMethod;
  label: string;
  icon: string;
  description: string;
  selectedMethods: Set<PaymentMethod>;
  enteredAmountStr: PaymentAmountsStr;
  enteredAmountNum: PaymentAmountsNum;
  activeInputs: Set<PaymentMethod>;
  handleCheckboxChange: (m: PaymentMethod) => void;
  handleAmountChange: (m: PaymentMethod, v: string) => void;
  handleInputFocus: (m: PaymentMethod) => void;
  handleInputBlur: (m: PaymentMethod) => void;
  setRemainingAmount: (m: PaymentMethod) => void;
  isDarkMode: boolean;
};

const PaymentMethodRow: React.FC<PMProps> = ({
  method,
  label,
  icon,
  description,
  selectedMethods,
  enteredAmountStr,
  enteredAmountNum,
  activeInputs,
  handleCheckboxChange,
  handleAmountChange,
  handleInputFocus,
  handleInputBlur,
  setRemainingAmount,
  isDarkMode,
}) => {
  const isSelected = selectedMethods.has(method);
  const isActive = activeInputs.has(method);

  const bg = isSelected
    ? isDarkMode
      ? "rgba(20,184,166,0.12)"
      : "rgba(0,168,107,0.08)"
    : isDarkMode
    ? "rgba(255,255,255,0.03)"
    : "#ffffff";

  const border = isSelected
    ? COLORS.brand
    : isDarkMode
    ? "rgba(255,255,255,0.03)"
    : "rgba(0,0,0,0.06)";

  const labelColor = isDarkMode ? "#fff" : "#0f1722";
  const descColor = isDarkMode ? "#9ea3ad" : "#6b7280";
  const inputBg = isDarkMode ? "rgba(255,255,255,0.03)" : "#f3f4f6";
  const inputText = isDarkMode ? "#fff" : "#0f1722";
  const setRemainText = isDarkMode ? "#fff" : "#075e54";

  return (
    <View style={[
      styles.paymentMethodCard,
      { backgroundColor: bg, borderColor: border }
    ]}>
      <View style={styles.paymentMethodHeader}>
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => handleCheckboxChange(method)}
          activeOpacity={0.7}
          delayPressIn={0}
        >
          <View style={[
            styles.checkbox,
            isSelected ? { backgroundColor: COLORS.brand,
                    borderColor: COLORS.brand,
                  }
                : {
                    borderColor: isDarkMode ? "#9ea3ad" : "#9ca3af",
                    backgroundColor: isSelected ? COLORS.brand : "transparent",
                  },
            ]}
          >
            {isSelected && (
              <CheckIcon size={ICON_SIZE.sm} color="#fff" />
            )}
          </View>

          <View style={styles.paymentMethodInfo}>
            <Text
              style={[styles.paymentMethodLabel, { color: labelColor }]}
            >
              {label}
            </Text>
            <Text
              style={[
                styles.paymentMethodDescription,
                { color: descColor },
              ]}
            >
              {description}
            </Text>
          </View>
        </TouchableOpacity>

        <Text
          style={[
            styles.paymentIcon,
            { color: isDarkMode ? "#fff" : "#0f1722" },
          ]}
        >
          {icon}
        </Text>
      </View>

      {isSelected && (
        <View style={styles.amountSection}>
          <View style={styles.amountInputRow}>
            <View style={styles.amountInputContainer}>
              <Text
                style={[styles.amountLabel, { color: labelColor }]}
              >
                Enter Amount (₹)
              </Text>
              <TextInput
                value={enteredAmountStr[method]}
                onChangeText={(value) =>
                  handleAmountChange(method, value)
                }
                onFocus={() => handleInputFocus(method)}
                onBlur={() => handleInputBlur(method)}
                keyboardType={
                  Platform.OS === "ios" ? "decimal-pad" : "numeric"
                }
                placeholder="0.00"
                placeholderTextColor={
                  isDarkMode ? "#9ea3ad" : "#9ca3af"
                }
                blurOnSubmit={false}
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
                style={[
                  styles.amountInput,
                  {
                    backgroundColor: inputBg,
                    color: inputText,
                    borderColor: isActive
                      ? COLORS.brand
                      : isDarkMode
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.06)",
                  },
                  isActive && styles.amountInputFocused,
                ]}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.setRemainingButton,
                {
                  backgroundColor: isDarkMode
                    ? "rgba(255,255,255,0.03)"
                    : "#e6f4ea",
                  borderColor: isDarkMode
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.06)",
                },
              ]}
              onPress={() => setRemainingAmount(method)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.setRemainingText,
                  { color: setRemainText },
                ]}
              >
                Set Remaining
              </Text>
            </TouchableOpacity>
          </View>

          {enteredAmountNum[method] > 0 && (
            <Text style={styles.enteredAmount}>
              Amount: ₹{enteredAmountNum[method].toFixed(2)}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

// Only re-render the row when props that affect rendering change:
const propsEqual = (prev: PMProps, next: PMProps) => {
  const method = prev.method;
  const selectionChanged =
    prev.selectedMethods.has(method) !==
    next.selectedMethods.has(method);
  const strChanged =
    prev.enteredAmountStr[method] !==
    next.enteredAmountStr[method];
  const numChanged =
    prev.enteredAmountNum[method] !==
    next.enteredAmountNum[method];
  const activeChanged =
    prev.activeInputs.has(method) !==
    next.activeInputs.has(method);
  const themeChanged = prev.isDarkMode !== next.isDarkMode;
  return !(
    selectionChanged ||
    strChanged ||
    numChanged ||
    activeChanged ||
    themeChanged
  );
};

const MemoPaymentMethodRow = React.memo(
  PaymentMethodRow,
  propsEqual
);

const PaymentMethodScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
const dispatch = useDispatch();
  const {
    amount = 0,
    selectedTests,
    selectedMedicines, 
    formData,
    files,
    discount,
    discountReason,
    discountReasonID,
    department,
    user,
    orderData,
    onPaymentSuccess,
    type,
    receptionData,
    pharmacyData,
    labData,
  } = (route.params as any) || {};

  // Local UI theme toggle (light/dark)
  const [isDarkMode, setIsDarkMode] = useState(true);
  // raw string input (keeps intermediate typing like ".")
  const [enteredAmountStr, setEnteredAmountStr] =
    useState<PaymentAmountsStr>({
      cards: "",
      online: "",
      cash: "",
    });

  // derived numeric values for calculation/submission
  const [enteredAmountNum, setEnteredAmountNum] =
    useState<PaymentAmountsNum>({
      cards: 0,
      online: 0,
      cash: 0,
    });

  const [selectedMethods, setSelectedMethods] =
    useState<Set<PaymentMethod>>(new Set());
  const [activeInputs, setActiveInputs] =
    useState<Set<PaymentMethod>>(new Set());
  const [dueAmount, setDueAmount] = useState(amount);
  const [paidAmount, setPaidAmount] = useState(0);
  const [totalDue, setTotalDue] = useState(amount);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isBillingOrder = !!orderData;
  const isReceptionPayment = !!receptionData;
  const ptype =isReceptionPayment ? receptionData?.pType === "Outpatient" ? 1 : 2 : undefined;
  useEffect(() => {
    // default: full amount via cash
    setSelectedMethods(new Set(["cash"]));
    setEnteredAmountStr({
      cards: "",
      online: "",
      cash: amount > 0 ? amount.toFixed(2) : "",
    });
    setEnteredAmountNum({
      cards: 0,
      online: 0,
      cash: amount,
    });
    setActiveInputs(new Set(["cash"]));
    setDueAmount(amount);
    setPaidAmount(amount);
    setTotalDue(0);
  }, [amount]);

  // derive numeric totals whenever enteredAmountNum changes
  useEffect(() => {
    const totalPaid = Object.values(enteredAmountNum).reduce(
      (s, v) => s + v,
      0
    );
    setPaidAmount(totalPaid);
    setTotalDue(
      Math.max(
        0,
        parseFloat((amount - totalPaid).toFixed(2))
      )
    );
  }, [enteredAmountNum, amount]);

  // keep numeric derived state in sync with string inputs
  useEffect(() => {
    const parseSafe = (s: string) => {
      if (!s || s.trim() === "") return 0;
      const n = parseFloat(s);
      return isNaN(n) ? 0 : n;
    };
    setEnteredAmountNum({
      cards: parseSafe(enteredAmountStr.cards),
      online: parseSafe(enteredAmountStr.online),
      cash: parseSafe(enteredAmountStr.cash),
    });
  }, [enteredAmountStr]);

  // Helper: determine whether this transaction requires full payment (OPD)
  const requiresFullPayment = useMemo(() => {
    const normalize = (v: any) =>
      v === undefined || v === null
        ? ""
        : String(v).toLowerCase();
    const dept = normalize(department);
    const fptype = normalize(
      formData?.ptype || formData?.visitType || ""
    );
    const orderptype = normalize(
      orderData?.ptype || orderData?.orderType || ""
    );
    const explicitPtype = route.params?.ptype;
    const isExplicitOPD = explicitPtype === 21;
   const isNewSaleFlow =
      (type === "medicine" || type === "test") &&
      !receptionData &&
      !pharmacyData &&
      !labData &&
      !isBillingOrder;

    if (isNewSaleFlow) return true;
    // 🔹 Existing reception / OPD logic (kept same)
    if (isExplicitOPD) return true;
    if (
      dept === "opd" ||
      dept === "outpatient" ||
      receptionData?.pType === "Outpatient"
    )
      return true;
    if (fptype === "opd" || fptype === "outpatient") return true;
    if (orderptype === "opd" || orderptype === "outpatient")
      return true;
    return false;
  }, [type, department, formData, orderData, receptionData, route.params?.ptype]);
  
  const isSubmitEnabled = useCallback(() => {
    const totalEntered = Object.values(
      enteredAmountNum
    ).reduce((s, v) => s + v, 0);
    
    if (requiresFullPayment ) {
      return (
        selectedMethods.size > 0 &&
        totalEntered > 0 &&
        Math.abs(totalEntered - amount) < 0.01
      );
    } else {
      return (
        selectedMethods.size > 0 &&
        totalEntered > 0 &&
        totalEntered <= amount + 0.001
      );
    }
  }, [
    enteredAmountNum,
    selectedMethods,
    amount,
    requiresFullPayment,
    type,
    totalDue, // Add totalDue to dependencies
  ]);

  // stabilize handlers
  const handleCheckboxChange = useCallback(
    (method: PaymentMethod) => {
      setSelectedMethods((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(method)) {
          newSet.delete(method);
          setEnteredAmountStr((prevStr) => ({
            ...prevStr,
            [method]: "",
          }));
          setActiveInputs((prevAct) => {
            const ns = new Set(prevAct);
            ns.delete(method);
            return ns;
          });
        } else {
          newSet.add(method);
          setActiveInputs((prevAct) => {
            const ns = new Set(prevAct);
            ns.add(method);
            return ns;
          });
        }
        return newSet;
      });
    },
    []
  );

  // sanitized input but allow intermediate '.' and leading zeros
  const handleAmountChange = useCallback(
    (method: PaymentMethod, value: string) => {
      let cleaned = value.replace(/[^\d.]/g, "");
      const firstDot = cleaned.indexOf(".");
      if (firstDot >= 0) {
        const before = cleaned.slice(0, firstDot + 1);
        const after = cleaned
          .slice(firstDot + 1)
          .replace(/\./g, "");
        cleaned = before + after;
      }
      if (firstDot >= 0) {
        const parts = cleaned.split(".");
        if (parts[1] && parts[1].length > 2) {
          cleaned = `${parts[0]}.${parts[1].slice(0, 2)}`;
        }
      }
      if (/^0{2,}/.test(cleaned) && cleaned.indexOf(".") === -1) {
        cleaned = cleaned.replace(/^0+/, "0");
      }
      setEnteredAmountStr((prev) => ({
        ...prev,
        [method]: cleaned,
      }));
    },
    []
  );

  const setRemainingAmount = useCallback(
    (method: PaymentMethod) => {
      const remaining = totalDue;
    
    // Add validation for minimum amount
    if (remaining > 0 && remaining < 1) {
      dispatch(showError("Remaining amount should be at least ₹1.00"));
      return;
    }
    
      if (remaining > 0) {
        setEnteredAmountStr((prev) => ({
          ...prev,
          [method]: remaining.toFixed(2),
        }));
        setSelectedMethods((prev) => {
          const ns = new Set(prev);
          ns.add(method);
          return ns;
        });
        setActiveInputs((prev) => {
          const ns = new Set(prev);
          ns.add(method);
          return ns;
        });
    } else {
      dispatch(showError("No remaining amount to set"));
      }
    },
    [totalDue, dispatch]
  );

  const handleInputFocus = useCallback((method: PaymentMethod) => {
    setActiveInputs((prev) => {
      const ns = new Set(prev);
      ns.add(method);
      return ns;
    });
  }, []);

  const handleInputBlur = useCallback((method: PaymentMethod) => {
    setActiveInputs((prev) => {
      const ns = new Set(prev);
      ns.delete(method);
      return ns;
    });

    setEnteredAmountStr((prev) => {
      const cur = prev[method];
      if (!cur || cur.trim() === "")
        return { ...prev, [method]: "" };
      if (cur === ".")
        return { ...prev, [method]: "0.00" };
      const n = parseFloat(cur);
      if (isNaN(n)) return { ...prev, [method]: "" };
      return { ...prev, [method]: n.toFixed(2) };
    });
  }, []);

  // ------------------- SALES PAYMENT (EXISTING) -------------------
const handleSalesPayment = useCallback(
  async (paymentDetails: any, token: string) => {
    // 1️⃣ If we have pharmacyData → existing pharmacy order payment
    if (pharmacyData) {
      if (!user?.hospitalID) {
        throw new Error("Missing pharmacy data or hospital details");
      }

      const getTimelineId = (d: any): string =>
        (
          d.patientTimeLineID ??
          d.timelineID ??
          d.timeLineID ??
          d.patienttimelineID ??
          d.patient_timeLine_id ??
          d.visitID ??
          d.orderID ??
          ""
        )
          .toString()
          .trim();

      const patientTimeLineID = getTimelineId(pharmacyData);

      if (!patientTimeLineID) {
        throw new Error("Invalid patient timeline / order ID");
      }

      const payload = {
        paymentMethod: paymentDetails,
        discount: {
          discount: discount || 0,
          discountReason: discountReason || "",
          discountReasonID: discountReasonID || "",
        },
        dueAmount: totalDue,
        paidAmount: paidAmount,
        totalAmount: amount.toFixed(2),
      };

      const url = `medicineInventoryPatientsOrder/${user.hospitalID}/payment/${patientTimeLineID}/updatePatientOrderStatus`;

      const response = await AuthPost(url, payload, token);
      console.log("111",payload)
      return response;
    }

    // 2️⃣ Else → Walk-in flow from SaleComp (test / medicine)
    if (!user?.hospitalID) {
      throw new Error("Missing hospital details");
    }

    const isMedicineSale = type === "medicine";
    const deptToUse = department || user?.roleName || "Pathology";
      const normalizedDept = deptToUse.toLowerCase().trim();
      let endpointPath;
      if (isMedicineSale) {
        endpointPath = `medicineInventoryPatients/${user.hospitalID}/addPatientWithOrder`;
      } else {
        if (normalizedDept === "radiology") {
          endpointPath = `medicineInventoryPatients/${user.hospitalID}/tests/walkinPatients/radiology`;
        } else {
          endpointPath = `medicineInventoryPatients/${user.hospitalID}/tests/walkinPatients/pathology`;
        }
      }

    const formDataToSend = new FormData();

    // 🔹 File (first file only – matches your payload)
    if (Array.isArray(files) && files.length > 0) {
      const file = files[0];
      if (file?.uri) {
        const uploadUri =
          Platform.OS === "ios" && file.uri.startsWith("file://")
            ? file.uri.replace("file://", "")
            : file.uri;

        formDataToSend.append("files", {
          uri: uploadUri,
          type: file.type || "image/jpeg",
          name: file.name || `file_${Date.now()}.jpg`,
        } as any);
      }
    }

    // 🔹 MEDICINE LIST (for medicine sales)
      if (isMedicineSale) {
        // Format medicine list exactly like web
        const medicineListWithQuantity = (selectedMedicines || []).map(medicine => ({
          id: medicine.id,
          name: medicine.name,
          category: medicine.category || "",
          hsn: medicine.hsn || "",
          expiryDate: medicine.expiryDate,
          costPrice: Number(medicine.costPrice) || 0,
          sellingPrice: Number(medicine.sellingPrice) || 0,
          gst: medicine.gst?.toString() || "0.00", 
          totalQuantity: medicine.quantity?.toString() || "1",
          quantity: medicine.selectedQuantity || 1, // Use selectedQuantity for actual purchase
          manufacturer: medicine.manufacturer || "Unknown",
          location: medicine.location || "Unknown",
          isActive: medicine.isActive !== undefined ? medicine.isActive : 1
        }));

        formDataToSend.append(
          "medicineList",
          JSON.stringify(medicineListWithQuantity)
        );
      } 
      // 🔹 TEST LIST (for test sales)
      else {
        // Format tests list exactly like web
        const testsWithStatus = (selectedTests || []).map(test => ({
          loinc_num_: test.loinc_num_ || `TEST_${Date.now()}_${Math.random()}`,
          name: test.name || "Unnamed Test",
          department: deptToUse,
          testPrice: Number(test.testPrice) || 0,
          gst: Number(test.gst) || 0,
          testNotes: test.testNotes || "",
          status: "pending"
        }));


        formDataToSend.append(
          "testsList",
          JSON.stringify(
            testsWithStatus.map(test => ({
              ...test,
              department: "" // exactly like web
            }))
          )
        );
      }

      // 3. Patient data
      const safePatientData =
        formData && typeof formData === "object"
          ? formData
          : {};

      formDataToSend.append(
        "patientData",
        JSON.stringify(safePatientData)
      );

      // 4. Other fields...
      formDataToSend.append("userID", user?.id?.toString() || "");
      formDataToSend.append("department", department || "");
    formDataToSend.append("paymentMethod", JSON.stringify(paymentDetails || {}));

    const totalPaymentAmount = paymentDetails
      ? Object.values(paymentDetails).reduce(
          (s: number, v: any) => s + (Number(v) || 0),
          0
        )
      : 0;

    formDataToSend.append("paymentAmount", String(totalPaymentAmount));

    const discountData = {
      discount: discount || 0,
      discountReason: discountReason || "",
      discountReasonID: discountReasonID || "",
    };

    formDataToSend.append("discount", JSON.stringify(discountData));
  
      // Log FormData contents (for debugging)
      const formDataEntries: any = {};
      for (let [key, value] of (formDataToSend as any)._parts) {
        if (key === 'files') {
          formDataEntries[key] = 'FILE_DATA';
        } else {
          formDataEntries[key] = value;
        }
      }

      try {
        const response = await AuthPost(endpointPath, formDataToSend, token);
         console.log("2222",formDataToSend)
        return response;
      } catch (error: any) {
        throw error;
      }
  },
  [
    pharmacyData,
    type,
    department,
    files,
    selectedTests,
    selectedMedicines,
    formData,
    user,
    discount,
    discountReason,
    discountReasonID,
    totalDue,
    paidAmount,
    amount,
  ]
);
  // ------------------- LAB BILLING PAYMENT (EXISTING) -------------------
  const handleBillingPayment = useCallback(
    async (paymentDetails: any, token: string) => {
      const payload = {
        paymentMethod: paymentDetails,
        discount: {
          discount: discount || 0,
          discountReason: discountReason || "",
          discountReasonID: discountReasonID || "",
        },
        dueAmount: totalDue,
        paidAmount: paidAmount,
        totalAmount: amount.toFixed(2),
      };

      const response = await AuthPost(
        `test/${user?.roleName}/${user?.hospitalID}/${orderData?.patientID}/updateTestPaymentDetails`,
        payload,
        token
      );
      return response;
    },
    [
      discount,
      discountReason,
      discountReasonID,
      totalDue,
      paidAmount,
      amount,
      user,
      orderData,
    ]
  );

  // ------------------- NEW: RECEPTION PAYMENT (payFromReception) -------------------
  const handleReceptionPayment = useCallback(
    async (paymentDetails: any, token: string) => {
      if (!receptionData || !user?.hospitalID) {
        throw new Error("Missing reception data or hospital details");
      }

      const meds = Array.isArray(receptionData.medicinesList)
        ? receptionData.medicinesList
        : [];
      const tests = Array.isArray(receptionData.testList)
        ? receptionData.testList
        : [];

      let medicinesTotal = 0;
      let pathologyTotal = 0;
      let radiologyTotal = 0;

      // Medicines: qty * price * (1 + gst%)
      meds.forEach((m: any) => {
        const qty = Number(m.qty ?? 1);
        const price = Number(m.price ?? 0);
        const gst = Number(m.gst ?? 0);
        const line = price * qty;
        medicinesTotal += line * (1 + gst / 100);
      });

      // Tests: split into pathology / radiology
      tests.forEach((t: any) => {
        const baseAmount =
          Number(t.amount ?? 0) ||
          Number(t.price ?? 0) *
            (1 + (Number(t.gst ?? 0) / 100));
        const categoryString = (
          t.category || t.testName || ""
        )
          .toString()
          .toLowerCase();
        if (categoryString.includes("radio")) {
          radiologyTotal += baseAmount;
        } else {
          pathologyTotal += baseAmount;
        }
      });

      const splitBaseTotal =
        medicinesTotal + pathologyTotal + radiologyTotal;
      const totalAmountForSplit =
        splitBaseTotal > 0 ? splitBaseTotal : amount;

      // Total actually entered by user
      const payableAmount = Object.values(paymentDetails).reduce(
        (s: number, v: any) =>
          typeof v === "number" ? s + v : s,
        0
      );

      const paidProportion =
        totalAmountForSplit > 0
          ? payableAmount / totalAmountForSplit
          : 0;

      const payload = {
        paymentMethod: {
          cash: paymentDetails.cash || 0,
          cards: paymentDetails.cards || 0,
          online: paymentDetails.online || 0,
          timestamp:
            paymentDetails.timestamp ||
            new Date().toISOString(),
        },
        discount: {
          discount: discount || 0,
          discountReason: discountReason || "",
          discountReasonID: discountReasonID || "",
        },
        split: {
          medicines: {
            paidAmount: Number(
              (medicinesTotal * paidProportion).toFixed(2)
            ),
            totalAmount: Number(
              medicinesTotal.toFixed(2)
            ),
            dueAmount: Number(
              (
                medicinesTotal -
                medicinesTotal * paidProportion
              ).toFixed(2)
            ),
          },
          pathology: {
            paidAmount: Number(
              (pathologyTotal * paidProportion).toFixed(2)
            ),
            totalAmount: Number(
              pathologyTotal.toFixed(2)
            ),
            dueAmount: Number(
              (
                pathologyTotal -
                pathologyTotal * paidProportion
              ).toFixed(2)
            ),
          },
          radiology: {
            paidAmount: Number(
              (radiologyTotal * paidProportion).toFixed(2)
            ),
            totalAmount: Number(
              radiologyTotal.toFixed(2)
            ),
            dueAmount: Number(
              (
                radiologyTotal -
                radiologyTotal * paidProportion
              ).toFixed(2)
            ),
          },
        },
      };

      // Smart ID extractors (similar to web)
      const getPatientId = (d: any): string =>
        (
          d.patientID ??
          d.pID ??
          d.patientId ??
          ""
        )
          .toString()
          .trim();

    // Get patient ID from receptionData
      const patientId = getPatientId(receptionData);
      const timelineId = orderData?.patientTimeLineID?.toString() || "";

      if (!patientId || patientId === "0") {
        throw new Error("Invalid patient ID");
      }
      if (!timelineId || timelineId === "0") {
        throw new Error(
          "Visit information missing. Please try again."
        );
      }

      // Endpoint: /reception/{hospitalID}/{patientId}/{timelineId}/payFromReception
      const url = `reception/${user.hospitalID}/${patientId}/${timelineId}/payFromReception`;
      const response = await AuthPost(url, payload, token);
      console.log("33333",payload)
      return response;
    },
    [
      receptionData,
      user,
      discount,
      discountReason,
      discountReasonID,
      amount,
      orderData, // ADD orderData to dependencies
    ]
  );

  // ------------------- SUBMIT HANDLER -------------------
  const handleSubmit = useCallback(async () => {
    const totalEntered = Object.values(
      enteredAmountNum
    ).reduce((s, v) => s + v, 0);

      if (totalDue > 0 && totalDue < 1) {
        dispatch(showError("Remaining due amount should be at least ₹1.00 or be fully paid."));
        return;
      }

    // validate according to mode
    if (requiresFullPayment ) {
      if (
        !(
          selectedMethods.size > 0 &&
          totalEntered > 0 &&
          Math.abs(totalEntered - amount) < 0.01
        )
      ) {
        Alert.alert(
          "Amount Mismatch",
          `Full payment required. Please ensure the paid amount matches the total amount ₹${amount.toFixed(2)}.`,
          [{ text: "OK" }]
        );
        return;
      }
    } else {
      // IPD (partial allowed) - only disallow overpay
      if (totalEntered > amount + 0.001) {
        dispatch(showError(`Entered amount (₹${totalEntered.toFixed(2)}) cannot exceed total amount (₹${amount.toFixed(2)}).`));
        return;
      }
      if (
        !(
          selectedMethods.size > 0 &&
          totalEntered > 0
        )
      ) {
        dispatch(showError("Please enter an amount greater than 0."));
        return;
      }
    }

    setIsSubmitting(true);

    const paymentDetails = Array.from(selectedMethods).reduce(
      (acc, method) => {
        acc[method] = enteredAmountNum[method];
        return acc;
      },
      {} as Record<PaymentMethod, number>
    );

    const paymentDataWithTime = {
      ...paymentDetails,
      timestamp: new Date().toISOString(),
    };

    try {
      const token = await AsyncStorage.getItem("token");
      if (!user?.hospitalID || !token) {
        dispatch(showError("Authentication failed"));
        navigation.navigate("Login");
        setIsSubmitting(false);
        return;
      }

      let response;

      if (receptionData) {
        response = await handleReceptionPayment(
          paymentDataWithTime,
          token
        ) as any;
      } else if (isBillingOrder && !pharmacyData) {
        response = await handleBillingPayment(
          paymentDataWithTime,
          token
        )as any;
      } else {
        response = await handleSalesPayment(
          paymentDataWithTime,
          token
        )as any;
      }

      if (
        response?.data?.status === 200 ||
        response?.status === "success"
      ) {
        const successMessage = isReceptionPayment
          ? "Payment completed successfully!"
          : isBillingOrder
          ? "Payment completed successfully!"
          : type === "medicine"
          ? "Patient and medicine order added successfully!"
          : "Patient and test order added successfully!";
        
        dispatch(showSuccess(successMessage));
      
        // Check if this is a new sale flow from SaleComp (test/medicine walk-in)
        const isNewSaleFlow = 
          (type === "test") &&
          !receptionData &&
          !pharmacyData &&
          !labData &&
          !isBillingOrder;
        
        if (isNewSaleFlow) {
          // Navigate to patientListLab for new sales from SaleComp
          navigation.navigate("PatientListLab");
        } else {
          // Keep existing navigation for other flows
          navigation.navigate("TaxInvoiceTabs", { mode: "billing", userRole: user?.roleName });
        }
      } else {
        dispatch(showError(response?.message || "Failed to process payment"));
      }
    } catch (error: any) {
      dispatch(showError(error?.response?.data?.message ||
        "Failed to process payment. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    requiresFullPayment,
    amount,
    enteredAmountNum,
    selectedMethods,
    totalDue,
    isBillingOrder,
    isReceptionPayment,
    handleBillingPayment,
    handleSalesPayment,
    handleReceptionPayment,
    user,
    navigation,
    type,
    dispatch,
  ]);

  // UI values derived
  const submitEnabled = isSubmitEnabled();

  // Dynamic minor theme overrides for top bar and CTA based on isDarkMode
  const topBarBg = isDarkMode ? "transparent" : "#ffffff";
  const payGradient = isDarkMode
    ? [COLORS.brand, COLORS.brandDark]
    : ["#00A86B", "#00796B"];
  const bgMain = isDarkMode ? "#0f1722" : "#f6f7f9";
  const cardBg = isDarkMode ? "#0b1220" : "#ffffff";
  const cardBorder = isDarkMode
    ? "rgba(255,255,255,0.04)"
    : "rgba(0,0,0,0.06)";
  const textPrimary = isDarkMode ? "#fff" : "#0f1722";
  const textMuted = isDarkMode ? "#9ea3ad" : "#6b7280";
  const brandIconTint = isDarkMode ? "#fff" : "#0f1722";

  const totalEntered = Object.values(
    enteredAmountNum
  ).reduce((s, v) => s + v, 0);

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: bgMain }]}
    >
      <StatusBar
        barStyle={
          isDarkMode ? "light-content" : "dark-content"
        }
        backgroundColor={topBarBg}
      />

      <View
        style={[styles.topBar, { backgroundColor: topBarBg }]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        />

        {/* Right-side toggle switch */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
   }}
   >
            <TouchableOpacity
              onPress={() => setIsDarkMode(!isDarkMode)}
              activeOpacity={0.7}
              style={[
      styles.toggleSwitchWithText,
      {
        backgroundColor: isDarkMode ? COLORS.brand : "#e5e7eb",
        justifyContent: isDarkMode ? "flex-end" : "flex-start",
                  },
                ]}
              >
                <View style={styles.toggleKnobWithText}>
                  <Text style={styles.toggleTextInside}>
                    {isDarkMode ? "ON" : "OFF"}
              </Text>
                </View>
            </TouchableOpacity>
              
          <View style={styles.headerSpacer} />
</View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={
          Platform.OS === "ios" ? "padding" : "height"
        }
        keyboardVerticalOffset={
          Platform.OS === "ios" ? 0 : 20
        }
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom:
                insets.bottom + SPACING.xl,
            },
          ]}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.gatewayCardWrap}>
            <View
              style={[
                styles.gatewayCard,
                {
                  backgroundColor: cardBg,
                  borderColor: cardBorder,
                },
              ]}
            >
              <View style={styles.gatewayTop}>
                <View>
                  <Text
                    style={[
                      styles.payLabel,
                      {
                        color: isDarkMode
                          ? "#9fb1c9"
                          : "#5b6b7a",
                      },
                    ]}
                  >
                    Pay
                  </Text>
                  <Text
                    style={[
                      styles.payAmount,
                      { color: textPrimary },
                    ]}
                  >
                    ₹{amount.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.brandRow}>
                  <Image
                    source={{
                      uri: "https://img.icons8.com/ios-filled/50/000000/visa.png",
                    }}
                    style={[
                      styles.brandIcon,
                      { tintColor: brandIconTint },
                    ]}
                  />
                  <Image
                    source={{
                      uri: "https://img.icons8.com/ios-filled/50/000000/mastercard.png",
                    }}
                    style={[
                      styles.brandIcon,
                      { tintColor: brandIconTint },
                    ]}
                  />
                  <Image
                    source={{
                      uri: "https://img.icons8.com/ios-filled/50/000000/upi.png",
                    }}
                    style={[
                      styles.brandIcon,
                      { tintColor: brandIconTint },
                    ]}
                  />
                </View>
              </View>

              <Text
                style={[
                  styles.cardSubtitle,
                  { color: textMuted },
                ]}
              >
                {isReceptionPayment
                  ? "Complete payment from Reception"
                  : isBillingOrder
                  ? "Complete payment for existing order"
                  : "Choose a secure payment method"}
              </Text>

              <View
                style={[
                  styles.orderTypeBadge,
                  {
                    backgroundColor: isDarkMode
                      ? "rgba(20,184,166,0.12)"
                      : "rgba(0,168,107,0.08)",
                    borderColor: isDarkMode
                      ? "rgba(20,184,166,0.25)"
                      : "rgba(0,168,107,0.12)",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.orderTypeText,
                    {
                      color: isDarkMode
                        ? COLORS.brand
                        : "#00796B",
                    },
                  ]}
                >
                  {isReceptionPayment
                    ? "🏥 Reception Billing"
                    : isBillingOrder
                    ? "📋 Billing Order"
                    : type === "medicine"
                    ? "💊 Pharmacy Sale"
                    : "🩺 Test Sale"}
                </Text>
              </View>

              <View style={styles.paymentMethodsSection}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: textPrimary },
                  ]}
                >
                  Select Payment Method
                </Text>
                <Text
                  style={[
                    styles.sectionSubtitle,
                    { color: textMuted },
                  ]}
                >
                  You can select multiple payment methods
                </Text>

                <MemoPaymentMethodRow
                  method="cards"
                  label="Credit/Debit Cards"
                  icon="💳"
                  description="Visa, MasterCard, RuPay, etc."
                  selectedMethods={selectedMethods}
                  enteredAmountStr={enteredAmountStr}
                  enteredAmountNum={enteredAmountNum}
                  activeInputs={activeInputs}
                  handleCheckboxChange={handleCheckboxChange}
                  handleAmountChange={handleAmountChange}
                  handleInputFocus={handleInputFocus}
                  handleInputBlur={handleInputBlur}
                  setRemainingAmount={setRemainingAmount}
                  isDarkMode={isDarkMode}
                />

                <MemoPaymentMethodRow
                  method="online"
                  label="Online Payment"
                  icon="🌐"
                  description="UPI, Net Banking, Wallet"
                  selectedMethods={selectedMethods}
                  enteredAmountStr={enteredAmountStr}
                  enteredAmountNum={enteredAmountNum}
                  activeInputs={activeInputs}
                  handleCheckboxChange={handleCheckboxChange}
                  handleAmountChange={handleAmountChange}
                  handleInputFocus={handleInputFocus}
                  handleInputBlur={handleInputBlur}
                  setRemainingAmount={setRemainingAmount}
                  isDarkMode={isDarkMode}
                />

                <MemoPaymentMethodRow
                  method="cash"
                  label="Cash"
                  icon="💵"
                  description="Physical cash payment"
                  selectedMethods={selectedMethods}
                  enteredAmountStr={enteredAmountStr}
                  enteredAmountNum={enteredAmountNum}
                  activeInputs={activeInputs}
                  handleCheckboxChange={handleCheckboxChange}
                  handleAmountChange={handleAmountChange}
                  handleInputFocus={handleInputFocus}
                  handleInputBlur={handleInputBlur}
                  setRemainingAmount={setRemainingAmount}
                  isDarkMode={isDarkMode}
                />
              </View>

              <View
                style={[
                  styles.amountSummary,
                  {
                    backgroundColor: isDarkMode
                      ? "rgba(255,255,255,0.03)"
                      : "#f8faf8",
                    borderColor: isDarkMode
                      ? "rgba(255,255,255,0.04)"
                      : "rgba(0,0,0,0.06)",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.summaryTitle,
                    { color: textPrimary },
                  ]}
                >
                  Payment Summary
                </Text>

                <View style={styles.summaryRow}>
                  <Text
                    style={[
                      styles.summaryLabel,
                      { color: textMuted },
                    ]}
                  >
                    Due Amount:
                  </Text>
                  <Text
                    style={[
                      styles.summaryValue,
                      { color: textPrimary },
                    ]}
                  >
                    ₹{dueAmount.toFixed(2)}
                  </Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text
                    style={[
                      styles.summaryLabel,
                      { color: textMuted },
                    ]}
                  >
                    Paid Amount:
                  </Text>
                  <Text
                    style={[
                      styles.summaryValue,
                      totalEntered > 0
                        ? styles.paidAmount
                        : styles.zeroAmount,
                      {
                        color:
                          totalEntered > 0
                            ? COLORS.success
                            : textMuted,
                      },
                    ]}
                  >
                    ₹{totalEntered.toFixed(2)}
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.summaryRow}>
                  <Text
                    style={[
                      styles.finalAmountLabel,
                      { color: textPrimary },
                    ]}
                  >
                    Remaining Due:
                  </Text>
                  <Text
                    style={[
                      styles.finalAmountValue,
                      totalDue > 0
                        ? styles.amountDue
                        : styles.amountPaid,
                      {
                        color:
                          totalDue > 0
                            ? COLORS.danger
                            : COLORS.success,
                      },
                    ]}
                  >
                    ₹{totalDue.toFixed(2)}
                  </Text>
                </View>

                {totalDue === 0 && (
                  <View
                    style={[
                      styles.successBadge,
                      {
                        backgroundColor: isDarkMode
                          ? "rgba(34,197,94,0.12)"
                          : "rgba(34,197,94,0.08)",
                        borderColor: isDarkMode
                          ? "rgba(34,197,94,0.25)"
                          : "rgba(34,197,94,0.12)",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.successText,
                        { color: COLORS.success },
                      ]}
                    >
                      ✅ Full Amount Paid
                    </Text>
                  </View>
                )}

                <View
                  style={{ marginTop: SPACING.sm }}
                >
                  <Text
                    style={{
                      color: textMuted,
                      fontSize: FONT_SIZE.xs,
                    }}
                  >
                    {(requiresFullPayment )
                      ? "Full payment required for this order."
                      : "Partial payments allowed."}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.payCtaWrap}>
              <LinearGradient
                colors={payGradient}
                style={styles.payButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={!submitEnabled || isSubmitting}
                  style={[
                    styles.payInner,
                    {
                      opacity:
                        !submitEnabled || isSubmitting
                          ? 0.6
                          : 1,
                    },
                  ]}
                  activeOpacity={0.9}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.payText}>
                      {isReceptionPayment || isBillingOrder
                        ? "Complete Payment"
                        : "Complete Order"}
                    </Text>
                  )}
                </TouchableOpacity>
              </LinearGradient>

              <Text
                style={[
                  styles.secureNote,
                  { color: textMuted },
                ]}
              >
                Securely processed • PCI DSS compliant
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  keyboardAvoid: { flex: 1 },
  topBar: {
    height: 68,
    paddingHorizontal: SPACING.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "transparent",
  },
  headerSpacer: { width: 40 },
  scrollView: { flex: 1 },
  scrollContent: { padding: SPACING.lg },
  gatewayCardWrap: {
    alignItems: "center",
    marginTop: 20,
  },
  gatewayCard: {
    width: Math.min(820, SCREEN_WIDTH - 32),
    borderRadius: 16,
    padding: SPACING.lg,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
  },
  gatewayTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  payLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
  },
  payAmount: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: "900",
  },
  brandRow: { flexDirection: "row" },
  brandIcon: {
    width: 28,
    height: 18,
    marginLeft: 8,
    resizeMode: "contain",
  },
  cardSubtitle: {
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  orderTypeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 16,
    marginBottom: SPACING.md,
    borderWidth: 1,
  },
  orderTypeText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
  },
  toggleSwitchWithText: {
  width: 70,
  height: 32,
  borderRadius: 16,
  padding: 2,
  flexDirection: "row",
  alignItems: "center",
},
toggleKnobWithText: {
  width: 34,
  height: 28,
  borderRadius: 14,
  backgroundColor: "#fff",
  justifyContent: "center",
  alignItems: "center",
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.2,
  shadowRadius: 1,
  elevation: 2,
},
toggleTextInside: {
  fontSize: 10,
  fontWeight: "700",
  color: COLORS.brand,
},
  paymentMethodsSection: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    marginBottom: SPACING.xs,
  },
  sectionSubtitle: {
    fontSize: FONT_SIZE.sm,
    marginBottom: SPACING.md,
  },
  paymentMethodCard: {
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 2,
  },
  paymentMethodHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 6,
    marginRight: SPACING.sm,
    marginTop: 2,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  paymentMethodInfo: { flex: 1 },
  paymentMethodLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    marginBottom: SPACING.xs,
  },
  paymentMethodDescription: {
    fontSize: FONT_SIZE.xs,
  },
  paymentIcon: {
    fontSize: 24,
    marginLeft: SPACING.sm,
  },
  amountSection: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  amountInputRow: {
    flexDirection: isSmallDevice ? "column" : "row",
    alignItems: isSmallDevice ? "stretch" : "flex-end",
    gap: SPACING.sm,
  },
  amountInputContainer: {
    flex: isSmallDevice ? 0 : 1,
  },
  amountLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
    marginBottom: SPACING.xs,
  },
  amountInput: {
    borderWidth: 2,
    borderRadius: 8,
    padding: SPACING.md,
    fontSize: FONT_SIZE.md,
    fontWeight: "500",
  },
  amountInputFocused: {},
  setRemainingButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    alignSelf: isSmallDevice ? "stretch" : "flex-start",
    alignItems: "center",
    borderWidth: 1,
  },
  setRemainingText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
  },
  enteredAmount: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "500",
    color: COLORS.success,
    marginTop: SPACING.sm,
  },
  amountSummary: {
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
  },
  summaryTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
    marginBottom: SPACING.md,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  summaryLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
    marginVertical: SPACING.sm,
  },
  finalAmountLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
  },
  finalAmountValue: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
  },
  successBadge: {
    padding: SPACING.sm,
    borderRadius: 8,
    alignItems: "center",
    marginTop: SPACING.sm,
    borderWidth: 1,
  },
  successText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
  },
  amountDue: {},
  amountPaid: {},
  payCtaWrap: {
    marginTop: SPACING.lg,
    alignItems: "center",
  },
  payButton: {
    width: Math.min(760, SCREEN_WIDTH - 64),
    borderRadius: 12,
    overflow: "hidden",
  },
  payInner: {
    paddingVertical: SPACING.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 12,
  },
  payText: {
    color: "#fff",
    fontSize: FONT_SIZE.md,
    fontWeight: "800",
  },
  secureNote: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZE.xs,
  },
  themeToggleWrap: {
    flexDirection: "row",
    borderRadius: 999,
    padding: 4,
    alignItems: "center",
  },
  toggleOption: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  toggleText: {
    fontWeight: "700",
    fontSize: FONT_SIZE.sm,
  },
  toggleOptionActive: {
    backgroundColor: COLORS.brand,
  },
  toggleOptionActiveLight: {
    backgroundColor: "#e6f4ea",
  },
  paidAmount: {},
  zeroAmount: {},
});

export default PaymentMethodScreen;