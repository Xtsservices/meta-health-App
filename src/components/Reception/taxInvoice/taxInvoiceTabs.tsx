// src/screens/billing/TaxInvoiceTabsMobile.tsx

import React, { useState } from "react";
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


import { COLORS } from "../../../utils/colour";
import { FONT_SIZE, FOOTER_HEIGHT, responsiveWidth, SPACING } from "../../../utils/responsive";
import Footer from "../../dashboard/footer";
import IpdBillingMobile from "./ipdBilling";
import AllTaxInvoiceMobile from "./allTaxInvoice";

const FOOTER_H = FOOTER_HEIGHT || 70;

type TabType = "billing" | "allTax";

const TaxInvoiceTabsMobile: React.FC = () => {
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<TabType>("billing");

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<"start" | "end">("start");
  const [tempDate, setTempDate] = useState<Date>(new Date());

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
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (!selectedDate) return;

    if (pickerTarget === "start") {
      setStartDate(selectedDate);
      // If start > end, adjust end
      if (endDate && selectedDate > endDate) {
        setEndDate(selectedDate);
      }
    } else {
      // End date
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

  const formatDate = (d: Date | null) => {
    if (!d) return "--/--/----";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  const dateRangeText = () => {
    if (startDate && endDate) {
      return `${formatDate(startDate)} → ${formatDate(endDate)}`;
    }
    if (startDate) return `From ${formatDate(startDate)}`;
    return "Select Date Range";
  };

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
          Billing & Tax Invoices
        </Text>
        <Text style={[styles.subtitle, { color: COLORS.sub }]}>
          View IPD Billing and Tax Invoices
        </Text>
      </View>

      {/* Tabs Row + Date Filter */}
      <View style={styles.topRow}>
        {/* Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "billing" && [
                styles.tabButtonActive,
                { backgroundColor: COLORS.brandSoft },
              ],
            ]}
            onPress={() => setActiveTab("billing")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "billing" && { color: COLORS.brandDark },
              ]}
            >
              Billing
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "allTax" && [
                styles.tabButtonActive,
                { backgroundColor: COLORS.brandSoft },
              ],
            ]}
            onPress={() => setActiveTab("allTax")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "allTax" && { color: COLORS.brandDark },
              ]}
            >
              All Tax Invoices
            </Text>
          </TouchableOpacity>
        </View>

        {/* Date Range Chip */}
        <TouchableOpacity
          style={styles.dateChip}
          onPress={() => openDatePicker("start")}
          activeOpacity={0.8}
        >
          <CalendarIcon size={18} color={COLORS.brandDark} />
          <Text style={styles.dateChipText} numberOfLines={1}>
            {dateRangeText()}
          </Text>

          {(startDate || endDate) && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                clearDates();
              }}
            >
              <XIcon size={16} color={COLORS.sub} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </View>

      {/* Date picker (start/end) */}
      {showDatePicker && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          maximumDate={new Date()}
          onChange={onDateChange}
        />
      )}

      {/* Content – lists */}
      <View style={styles.content}>
        {activeTab === "billing" ? (
          <IpdBillingMobile startDate={startDate} endDate={endDate} />
        ) : (
          <AllTaxInvoiceMobile startDate={startDate} endDate={endDate} />
        )}
      </View>

      {/* Footer */}
      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={""} brandColor={COLORS.brand} />
      </View>
    </SafeAreaView>
  );
};

export default TaxInvoiceTabsMobile;

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
  tabRow: {
    flexDirection: "row",
    flex: 1,
    backgroundColor: "#e5e7eb",
    borderRadius: 999,
    padding: 3,
  },
  tabButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: SPACING.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  tabButtonActive: {
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: "#374151",
  },
  dateChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 999,
    backgroundColor: "#E5F6FF",
    gap: 6,
    maxWidth: responsiveWidth(46),
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
