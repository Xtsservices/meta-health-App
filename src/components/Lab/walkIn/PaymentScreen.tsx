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
  responsiveWidth,
  responsiveHeight,
  isTablet,
  isSmallDevice,
  FOOTER_HEIGHT,
} from "../../../utils/responsive";
import { COLORS } from "../../../utils/colour";

// Icons
import { ArrowLeftIcon, CheckIcon } from "../../../utils/SvgIcons";

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

/**
 * Stable PaymentMethodRow component moved OUTSIDE the screen so it won't be re-created on state changes.
 * Props include all necessary state slices and handlers. Use React.memo with a proper comparator.
 */
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
    ? isDarkMode ? "rgba(20,184,166,0.12)" : "rgba(0,168,107,0.08)"
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
            isSelected ? { backgroundColor: COLORS.brand, borderColor: COLORS.brand } : { borderColor: isDarkMode ? "#9ea3ad" : "#9ca3af", backgroundColor: isSelected ? COLORS.brand : "transparent" }
          ]}>
            {isSelected && (
              <CheckIcon size={ICON_SIZE.sm} color={isDarkMode ? "#fff" : "#fff"} />
            )}
          </View>

          <View style={styles.paymentMethodInfo}>
            <Text style={[styles.paymentMethodLabel, { color: labelColor }]}>{label}</Text>
            <Text style={[styles.paymentMethodDescription, { color: descColor }]}>{description}</Text>
          </View>
        </TouchableOpacity>

        <Text style={[styles.paymentIcon, { color: isDarkMode ? "#fff" : "#0f1722" }]}>{icon}</Text>
      </View>

      {isSelected && (
        <View style={styles.amountSection}>
          <View style={styles.amountInputRow}>
            <View style={styles.amountInputContainer}>
              <Text style={[styles.amountLabel, { color: labelColor }]}>Enter Amount (₹)</Text>
              <TextInput
                value={enteredAmountStr[method]}
                onChangeText={(value) => handleAmountChange(method, value)}
                onFocus={() => handleInputFocus(method)}
                onBlur={() => handleInputBlur(method)}
                keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
                placeholder="0.00"
                placeholderTextColor={isDarkMode ? "#9ea3ad" : "#9ca3af"}
                blurOnSubmit={false}
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
                style={[
                  styles.amountInput,
                  { backgroundColor: inputBg, color: inputText, borderColor: isActive ? COLORS.brand : (isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)") },
                  isActive && styles.amountInputFocused
                ]}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.setRemainingButton,
                { backgroundColor: isDarkMode ? "rgba(255,255,255,0.03)" : "#e6f4ea", borderColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }
              ]}
              onPress={() => setRemainingAmount(method)}
              activeOpacity={0.7}
            >
              <Text style={[styles.setRemainingText, { color: setRemainText }]}>Set Remaining</Text>
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
  const selectionChanged = prev.selectedMethods.has(method) !== next.selectedMethods.has(method);
  const strChanged = prev.enteredAmountStr[method] !== next.enteredAmountStr[method];
  const numChanged = prev.enteredAmountNum[method] !== next.enteredAmountNum[method];
  const activeChanged = prev.activeInputs.has(method) !== next.activeInputs.has(method);
  const themeChanged = prev.isDarkMode !== next.isDarkMode;
  return !(selectionChanged || strChanged || numChanged || activeChanged || themeChanged);
};

const MemoPaymentMethodRow = React.memo(PaymentMethodRow, propsEqual);

const PaymentMethodScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const {
    amount = 0,
    selectedTests,
    formData,
    files,
    discount,
    discountReason,
    discountReasonID,
    department,
    user,
    orderData,
    onPaymentSuccess,
  } = (route.params as any) || {};

  // Local UI theme toggle (light/dark)
  const [isDarkMode, setIsDarkMode] = useState(true);

  // raw string input (keeps intermediate typing like ".")
  const [enteredAmountStr, setEnteredAmountStr] = useState<PaymentAmountsStr>({
    cards: "",
    online: "",
    cash: "",
  });

  // derived numeric values for calculation/submission
  const [enteredAmountNum, setEnteredAmountNum] = useState<PaymentAmountsNum>({
    cards: 0,
    online: 0,
    cash: 0,
  });

  const [selectedMethods, setSelectedMethods] = useState<Set<PaymentMethod>>(new Set());
  const [activeInputs, setActiveInputs] = useState<Set<PaymentMethod>>(new Set());
  const [dueAmount, setDueAmount] = useState(amount);
  const [paidAmount, setPaidAmount] = useState(0);
  const [totalDue, setTotalDue] = useState(amount);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isBillingOrder = !!orderData;

useEffect(() => {
  setSelectedMethods(new Set(['cash'])); 
  setEnteredAmountStr({ 
    cards: "", 
    online: "", 
    cash: amount > 0 ? amount.toFixed(2) : "" 
  });
  setEnteredAmountNum({ 
    cards: 0, 
    online: 0, 
    cash: amount
  });
  setActiveInputs(new Set(['cash'])); 
  setDueAmount(amount);
  setPaidAmount(amount); 
  setTotalDue(0); 
}, [amount]);

  // derive numeric totals whenever enteredAmountNum changes
  useEffect(() => {
    const totalPaid = Object.values(enteredAmountNum).reduce((s, v) => s + v, 0);
    setPaidAmount(totalPaid);
    setTotalDue(Math.max(0, parseFloat((amount - totalPaid).toFixed(2))));
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
    const normalize = (v: any) => (v === undefined || v === null) ? "" : String(v).toLowerCase();
    const dept = normalize(department);
    const fptype = normalize(formData?.ptype || formData?.visitType || "");
    const orderptype = normalize(orderData?.ptype || orderData?.orderType || "");
    // treat 'opd' or 'outpatient' same
    if (dept === "opd" || dept === "outpatient") return true;
    if (fptype === "opd" || fptype === "outpatient") return true;
    if (orderptype === "opd" || orderptype === "outpatient") return true;
    return false;
  }, [department, formData, orderData]);

  // stabilize handlers with useCallback so TextInput doesn't lose focus due to changing refs
  const handleCheckboxChange = useCallback((method: PaymentMethod) => {
    setSelectedMethods(prev => {
      const newSet = new Set(prev);
      if (newSet.has(method)) {
        newSet.delete(method);
        setEnteredAmountStr(prevStr => ({ ...prevStr, [method]: "" }));
        setActiveInputs(prevAct => {
          const ns = new Set(prevAct);
          ns.delete(method);
          return ns;
        });
      } else {
        newSet.add(method);
        setActiveInputs(prevAct => {
          const ns = new Set(prevAct);
          ns.add(method);
          return ns;
        });
      }
      return newSet;
    });
  }, []);

  // sanitized input but allow intermediate '.' and leading zeros
  const handleAmountChange = useCallback((method: PaymentMethod, value: string) => {
    // strip non-digit/non-dot
    let cleaned = value.replace(/[^\d.]/g, "");
    const firstDot = cleaned.indexOf(".");
    if (firstDot >= 0) {
      const before = cleaned.slice(0, firstDot + 1);
      const after = cleaned.slice(firstDot + 1).replace(/\./g, "");
      cleaned = before + after;
    }
    // limit decimals to two
    if (firstDot >= 0) {
      const parts = cleaned.split(".");
      if (parts[1] && parts[1].length > 2) {
        cleaned = `${parts[0]}.${parts[1].slice(0, 2)}`;
      }
    }
    // avoid "00" (unless decimal follows)
    if (/^0{2,}/.test(cleaned) && cleaned.indexOf(".") === -1) {
      cleaned = cleaned.replace(/^0+/, "0");
    }
    setEnteredAmountStr(prev => ({ ...prev, [method]: cleaned }));
  }, []);

  const setRemainingAmount = useCallback((method: PaymentMethod) => {
    const remaining = totalDue;
    if (remaining > 0) {
      setEnteredAmountStr(prev => ({ ...prev, [method]: remaining.toFixed(2) }));
      setSelectedMethods(prev => {
        const ns = new Set(prev);
        ns.add(method);
        return ns;
      });
      setActiveInputs(prev => {
        const ns = new Set(prev);
        ns.add(method);
        return ns;
      });
    }
  }, [totalDue]);

  // isSubmitEnabled now respects OPD (requires full payment) vs IPD (allow partial)
  const isSubmitEnabled = useCallback(() => {
    const totalEntered = Object.values(enteredAmountNum).reduce((s, v) => s + v, 0);
    if (requiresFullPayment) {
      // OPD — must pay full amount
      return selectedMethods.size > 0 && totalEntered > 0 && Math.abs(totalEntered - amount) < 0.01;
    } else {
      // IPD / others — allow partial (entered must be >0 and <= amount)
      return selectedMethods.size > 0 && totalEntered > 0 && totalEntered <= amount + 0.001;
    }
  }, [enteredAmountNum, selectedMethods, amount, requiresFullPayment]);

  const handleInputFocus = useCallback((method: PaymentMethod) => {
    setActiveInputs(prev => {
      const ns = new Set(prev);
      ns.add(method);
      return ns;
    });
  }, []);

  const handleInputBlur = useCallback((method: PaymentMethod) => {
    setActiveInputs(prev => {
      const ns = new Set(prev);
      ns.delete(method);
      return ns;
    });

    setEnteredAmountStr(prev => {
      const cur = prev[method];
      if (!cur || cur.trim() === "") return { ...prev, [method]: "" };
      if (cur === ".") return { ...prev, [method]: "0.00" };
      const n = parseFloat(cur);
      if (isNaN(n)) return { ...prev, [method]: "" };
      return { ...prev, [method]: n.toFixed(2) };
    });
  }, []);

  // API handlers (unchanged in signature), with small change: sales sends actual paid amount
  const handleSalesPayment = useCallback(async (paymentDetails: any, token: string) => {
    const labsPath = `tests/walkinPatients/${department}`;
    const formDataToSend = new FormData();

    if (files?.length > 0) {
      const file = files[0];
      const uploadUri = Platform.OS === "ios" && file?.uri?.startsWith("file://")
        ? file?.uri?.replace("file://", "")
        : file?.uri;

      formDataToSend.append("files", {
        uri: uploadUri,
        type: file?.mimeType || file?.type || "application/octet-stream",
        name: file?.name || `file_${Date.now()}`,
      } as any);
    }

    formDataToSend.append("testsList", JSON.stringify(selectedTests));
    formDataToSend.append("patientData", JSON.stringify(formData));
    formDataToSend.append("userID", user?.id?.toString() ?? "");
    formDataToSend.append("department", department);
    formDataToSend.append("paymentMethod", JSON.stringify(paymentDetails));
    // IMPORTANT: send actual paid amount (supports partial for IPD)
    formDataToSend.append("paymentAmount", String(paymentDetails ? Object.values(paymentDetails).reduce((s: any, v: any) => s + (Number(v) || 0), 0) : 0));
    formDataToSend.append("discount", JSON.stringify({ discount, discountReason, discountReasonID }));

    const response = await AuthPost(
      `medicineInventoryPatients/${user?.hospitalID}/${labsPath}`,
      formDataToSend,
      token
    );

    return response;
  }, [department, files, selectedTests, formData, user, discount, discountReason, discountReasonID]);

  const handleBillingPayment = useCallback(async (paymentDetails: any, token: string) => {
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
  }, [discount, discountReason, discountReasonID, totalDue, paidAmount, amount, user, orderData]);

  const handleSubmit = useCallback(async () => {
    const totalEntered = Object.values(enteredAmountNum).reduce((s, v) => s + v, 0);

    // validate according to mode
    if (requiresFullPayment) {
      if (!(selectedMethods.size > 0 && totalEntered > 0 && Math.abs(totalEntered - amount) < 0.01)) {
        Alert.alert(
          "Amount Mismatch",
          `OPD orders require full payment. Please ensure the paid amount matches the total amount ₹${amount.toFixed(2)}.`,
          [{ text: "OK" }]
        );
        return;
      }
    } else {
      // IPD (partial allowed) - only disallow overpay
      if (totalEntered > amount + 0.001) {
        Alert.alert(
          "Amount Error",
          `Entered amount (₹${totalEntered.toFixed(2)}) cannot exceed total amount (₹${amount.toFixed(2)}).`,
          [{ text: "OK" }]
        );
        return;
      }
      if (!(selectedMethods.size > 0 && totalEntered > 0)) {
        Alert.alert(
          "Enter Amount",
          `Please enter an amount greater than 0.`,
          [{ text: "OK" }]
        );
        return;
      }
    }

    setIsSubmitting(true);

    const paymentDetails = Array.from(selectedMethods).reduce((acc, method) => {
      acc[method] = enteredAmountNum[method];
      return acc;
    }, {} as Record<PaymentMethod, number>);

    const paymentDataWithTime = {
      ...paymentDetails,
      timestamp: new Date().toISOString(),
    };

    try {
      const token = await AsyncStorage.getItem("token");
      if (!user?.hospitalID || !token) {
        Alert.alert("Error", "Authentication failed");
        setIsSubmitting(false);
        return;
      }

      let response;

      if (isBillingOrder) {
        response = await handleBillingPayment(paymentDataWithTime, token);
      } else {
        response = await handleSalesPayment(paymentDataWithTime, token);
      }

      if (response?.data?.status === 200 || response?.message === "success") {
        const successMessage = isBillingOrder
          ? "Payment completed successfully!"
          : "Patient and test order added successfully!";

        Alert.alert(
          "Success ✅",
          successMessage,
          [
            {
              text: "OK",
              onPress: () => {
                if (isBillingOrder && onPaymentSuccess) {
                  onPaymentSuccess();
                }

                if (isBillingOrder) {
                  navigation.goBack();
                } else {
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'Dashboard' as never }],
                  });
                }
              }
            }
          ]
        );
      } else {
        Alert.alert("Error", response?.message || "Failed to process payment");
      }
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Failed to process payment. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [requiresFullPayment, isSubmitEnabled, paidAmount, amount, selectedMethods, enteredAmountNum, isBillingOrder, handleBillingPayment, handleSalesPayment, user, onPaymentSuccess, navigation]);

  // UI values derived
  const totalEntered = Object.values(enteredAmountNum).reduce((s, v) => s + v, 0);
  const submitEnabled = isSubmitEnabled();

  // Dynamic minor theme overrides for top bar and CTA based on isDarkMode
  const topBarBg = isDarkMode ? "transparent" : "#ffffff";
  const topTitleColor = isDarkMode ? "#fff" : "#0f1722";
  const payGradient = isDarkMode ? [COLORS.brand, COLORS.brandDark] : ["#00A86B", "#00796B"];
  // colors used throughout
  const bgMain = isDarkMode ? "#0f1722" : "#f6f7f9";
  const cardBg = isDarkMode ? "#0b1220" : "#ffffff";
  const cardBorder = isDarkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)";
  const textPrimary = isDarkMode ? "#fff" : "#0f1722";
  const textMuted = isDarkMode ? "#9ea3ad" : "#6b7280";
  const brandIconTint = isDarkMode ? "#fff" : "#0f1722";

  // Render
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bgMain }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={topBarBg} />

      <View style={[styles.topBar, { backgroundColor: topBarBg }]}>
        <TouchableOpacity
        
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
        </TouchableOpacity>
      

        {/* Right-side toggle switch */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[styles.themeToggleWrap, { borderColor: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(15,23,34,0.06)", backgroundColor: isDarkMode ? "rgba(255,255,255,0.03)" : "#fff" }]}>
            <TouchableOpacity
              onPress={() => setIsDarkMode(true)}
              activeOpacity={0.85}
              style={[
                styles.toggleOption,
                isDarkMode ? styles.toggleOptionActive : null
              ]}
            >
              <Text style={[styles.toggleText, { color: isDarkMode ? "#fff" : "#0f1722" }]}>Dark</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsDarkMode(false)}
              activeOpacity={0.85}
              style={[
                styles.toggleOption,
                !isDarkMode ? styles.toggleOptionActiveLight : null
              ]}
            >
              <Text style={[styles.toggleText, { color: !isDarkMode ? "#0f1722" : "#9ea3ad" }]}>Light</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + SPACING.xl }
          ]}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.gatewayCardWrap}>
            <View style={[styles.gatewayCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <View style={styles.gatewayTop}>
                <View>
                  <Text style={[styles.payLabel, { color: isDarkMode ? "#9fb1c9" : "#5b6b7a" }]}>Pay</Text>
                  <Text style={[styles.payAmount, { color: textPrimary }]}>₹{amount.toFixed(2)}</Text>
                </View>
                <View style={styles.brandRow}>
                  <Image
                    source={{ uri: "https://img.icons8.com/ios-filled/50/000000/visa.png" }}
                    style={[styles.brandIcon, { tintColor: brandIconTint }]}
                  />
                  <Image
                    source={{ uri: "https://img.icons8.com/ios-filled/50/000000/mastercard.png" }}
                    style={[styles.brandIcon, { tintColor: brandIconTint }]}
                  />
                  <Image
                    source={{ uri: "https://img.icons8.com/ios-filled/50/000000/upi.png" }}
                    style={[styles.brandIcon, { tintColor: brandIconTint }]}
                  />
                </View>
              </View>

              <Text style={[styles.cardSubtitle, { color: textMuted }]}>
                {isBillingOrder ? 'Complete payment for existing order' : 'Choose a secure payment method'}
              </Text>

              <View style={[styles.orderTypeBadge, { backgroundColor: isDarkMode ? "rgba(20,184,166,0.12)" : "rgba(0,168,107,0.08)", borderColor: isDarkMode ? "rgba(20,184,166,0.25)" : "rgba(0,168,107,0.12)" }]}>
                <Text style={[styles.orderTypeText, { color: isDarkMode ? COLORS.brand : "#00796B" }]}>
                  {isBillingOrder ? '📋 Billing Order' : '🆕 New Patient'}
                </Text>
              </View>

              <View style={styles.paymentMethodsSection}>
                <Text style={[styles.sectionTitle, { color: textPrimary }]}>Select Payment Method</Text>
                <Text style={[styles.sectionSubtitle, { color: textMuted }]}>You can select multiple payment methods</Text>

                {/* Use stable MemoPaymentMethodRow component */}
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

              <View style={[styles.amountSummary, { backgroundColor: isDarkMode ? "rgba(255,255,255,0.03)" : "#f8faf8", borderColor: isDarkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)" }]}>
                <Text style={[styles.summaryTitle, { color: textPrimary }]}>Payment Summary</Text>

                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: textMuted }]}>Due Amount:</Text>
                  <Text style={[styles.summaryValue, { color: textPrimary }]}>₹{dueAmount.toFixed(2)}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: textMuted }]}>Paid Amount:</Text>
                  <Text style={[
                    styles.summaryValue,
                    paidAmount > 0 ? styles.paidAmount : styles.zeroAmount,
                    { color: paidAmount > 0 ? COLORS.success : textMuted }
                  ]}>
                    ₹{paidAmount.toFixed(2)}
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.summaryRow}>
                  <Text style={[styles.finalAmountLabel, { color: textPrimary }]}>Remaining Due:</Text>
                  <Text style={[
                    styles.finalAmountValue,
                    totalDue > 0 ? styles.amountDue : styles.amountPaid,
                    { color: totalDue > 0 ? COLORS.danger : COLORS.success }
                  ]}>
                    ₹{totalDue.toFixed(2)}
                  </Text>
                </View>

                {totalDue === 0 && (
                  <View style={[styles.successBadge, { backgroundColor: isDarkMode ? "rgba(34,197,94,0.12)" : "rgba(34,197,94,0.08)", borderColor: isDarkMode ? "rgba(34,197,94,0.25)" : "rgba(34,197,94,0.12)" }]}>
                    <Text style={[styles.successText, { color: COLORS.success }]}>✅ Full Amount Paid</Text>
                  </View>
                )}

                {/* Small helper text about OPD / IPD */}
                <View style={{ marginTop: SPACING.sm }}>
                  <Text style={{ color: textMuted, fontSize: FONT_SIZE.xs }}>
                    {requiresFullPayment ? "OPD orders require full payment." : "Partial payments allowed."}
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
                    { opacity: (!submitEnabled || isSubmitting) ? 0.6 : 1 }
                  ]}
                  activeOpacity={0.9}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.payText}>
                        {isBillingOrder ? 'Complete Payment' : 'Complete Order'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </LinearGradient>

              <Text style={[styles.secureNote, { color: textMuted }]}>
                Securely processed • PCI DSS compliant
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// styles unchanged for layout but few additions for toggle and theme
const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  topBar: {
    height: 68,
    paddingHorizontal: SPACING.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "transparent"
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  topTitle: {
    color: "#fff",
    fontSize: FONT_SIZE.lg,
    fontWeight: "700"
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg
  },
  gatewayCardWrap: {
    alignItems: "center",
    marginTop: 20
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
    alignItems: "center"
  },
  payLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600"
  },
  payAmount: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: "900"
  },
  brandRow: {
    flexDirection: "row"
  },
  brandIcon: {
    width: 28,
    height: 18,
    marginLeft: 8,
    resizeMode: "contain"
  },
  cardSubtitle: {
    marginTop: SPACING.md,
    marginBottom: SPACING.sm
  },
  orderTypeBadge: {
    alignSelf: 'flex-start',
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
  paymentMethodCardSelected: {
    borderColor: COLORS.brand,
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
  paymentMethodInfo: {
    flex: 1,
  },
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
  amountInputFocused: {
    // nothing style-specific here; dynamic borderColor is applied inline
  },
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
  paidAmount: {
    // color set inline where used
  },
  zeroAmount: {
    // color set inline where used
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
  amountDue: {
    // color applied inline
  },
  amountPaid: {
    // color applied inline
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
  payCtaWrap: {
    marginTop: SPACING.lg,
    alignItems: "center"
  },
  payButton: {
    width: Math.min(760, SCREEN_WIDTH - 64),
    borderRadius: 12,
    overflow: "hidden"
  },
  payInner: {
    paddingVertical: SPACING.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 12
  },
  payText: {
    color: "#fff",
    fontSize: FONT_SIZE.md,
    fontWeight: "800"
  },
  payAmountCta: {
    color: "#fff",
    fontSize: FONT_SIZE.lg,
    fontWeight: "900"
  },
  secureNote: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZE.xs
  },

  /* Toggle styles */
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
});

export default PaymentMethodScreen;
