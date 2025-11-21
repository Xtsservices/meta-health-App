import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
  Platform,
} from "react-native";
import { Calendar, ChevronDown, X } from "lucide-react-native";
import DateTimePicker from '@react-native-community/datetimepicker';
import TaxInvoiceInPatient from "./TaxInvoiceInPatient";
import TaxInvoiceWalkIn from "./TaxInvoiceWalkIn";

// Utils
import { 
  SPACING, 
  FONT_SIZE,
  isTablet,
  isSmallDevice,
  SCREEN_WIDTH,
} from "../../../utils/responsive";
import { COLORS } from "../../../utils/colour";
import { formatDate } from "../../../utils/dateTime";

const { width: W } = Dimensions.get("window");

interface TaxInvoiceTabsProps {
  type?: "medicine" | "test";
}

const TaxInvoiceTabs: React.FC<TaxInvoiceTabsProps> = ({ type }) => {
  const [activeTab, setActiveTab] = useState("In_Hospital_Tax_Invoice");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'start' | 'end'>('start');

  const normalizeDate = (date: Date | null) => {
    if (!date) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  };

  const handleCalendarPress = () => {
    setShowDatePicker(true);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    
    if (selectedDate) {
      const normalizedDate = normalizeDate(selectedDate);
      
      if (datePickerMode === 'start') {
        setStartDate(normalizedDate);
        // If end date is before start date, clear end date
        if (endDate && normalizedDate && normalizedDate > endDate) {
          setEndDate(null);
        }
      } else {
        setEndDate(normalizedDate);
      }
    }
  };

  const handleStartDatePress = () => {
    setDatePickerMode('start');
    setShowDatePicker(true);
  };

  const handleEndDatePress = () => {
    setDatePickerMode('end');
    setShowDatePicker(true);
  };

  const handleClearDates = () => {
    setStartDate(null);
    setEndDate(null);
  };

  const getDateRangeText = () => {
    if (!startDate) return "Select Date Range";
    
    const formatDisplayDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    };
    
    if (startDate && endDate) {
      return `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`;
    }
    return formatDisplayDate(startDate);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "In_Hospital_Tax_Invoice":
        return (
          <TaxInvoiceInPatient
            title={"IPD Hospital Tax Invoice"}
            departmentType={2}
            type={type}
            startDate={startDate}
            endDate={endDate}
          />
        );
      case "opd_Hospital_Tax_Invoice":
        return (
          <TaxInvoiceInPatient
            title={"OPD Hospital Tax Invoice"}
            departmentType={1}
            type={type}
            startDate={startDate}
            endDate={endDate}
          />
        );
      case "Walk_In_Tax_Invoice":
        return (
          <TaxInvoiceWalkIn
            title={"Walk In Tax Invoice"}
            type={type}
            startDate={startDate}
            endDate={endDate}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Tab Headers */}
      <View style={styles.tabHeaders}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "In_Hospital_Tax_Invoice" && styles.activeTabButton,
            ]}
            onPress={() => setActiveTab("In_Hospital_Tax_Invoice")}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "In_Hospital_Tax_Invoice" && styles.activeTabButtonText,
              ]}
            >
              IPD
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "opd_Hospital_Tax_Invoice" && styles.activeTabButton,
            ]}
            onPress={() => setActiveTab("opd_Hospital_Tax_Invoice")}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "opd_Hospital_Tax_Invoice" && styles.activeTabButtonText,
              ]}
            >
              OPD
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "Walk_In_Tax_Invoice" && styles.activeTabButton,
            ]}
            onPress={() => setActiveTab("Walk_In_Tax_Invoice")}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "Walk_In_Tax_Invoice" && styles.activeTabButtonText,
              ]}
            >
              Walk-In
            </Text>
          </TouchableOpacity>
        </View>

        {/* Calendar Section */}
        <View style={styles.calendarContainer}>
          <TouchableOpacity
            style={[styles.dateRangeButton, startDate && styles.activeDateButton]}
            onPress={handleCalendarPress}
          >
            <Calendar size={20} color={startDate ? COLORS.success : COLORS.sub} />
            <Text style={[styles.dateRangeText, startDate && styles.activeDateText]}>
              {getDateRangeText()}
            </Text>
            {startDate && (
              <TouchableOpacity onPress={handleClearDates} style={styles.clearButton}>
                <X size={18} color={COLORS.danger} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Date Selection Modal */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerContainer}>
            <Text style={styles.datePickerTitle}>Select Date Range</Text>
            
            <View style={styles.dateInputsContainer}>
              <TouchableOpacity style={styles.dateInput} onPress={handleStartDatePress}>
                <Text style={styles.dateInputLabel}>From Date</Text>
                <Text style={styles.dateInputValue}>
                  {startDate ? formatDate(startDate) : "Select start date"}
                </Text>
                <ChevronDown size={20} color={COLORS.sub} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.dateInput} onPress={handleEndDatePress}>
                <Text style={styles.dateInputLabel}>To Date</Text>
                <Text style={styles.dateInputValue}>
                  {endDate ? formatDate(endDate) : "Select end date"}
                </Text>
                <ChevronDown size={20} color={COLORS.sub} />
              </TouchableOpacity>
            </View>

            <View style={styles.datePickerActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.applyButton, (!startDate || !endDate) && styles.disabledButton]}
                onPress={() => setShowDatePicker(false)}
                disabled={!startDate || !endDate}
              >
                <Text style={[
                  styles.applyButtonText,
                  (!startDate || !endDate) && styles.disabledButtonText
                ]}>
                  Apply Filter
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Native Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={datePickerMode === 'start' ? (startDate || new Date()) : (endDate || new Date())}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {renderContent()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  tabHeaders: {
    flexDirection: isTablet ? "row" : "column",
    justifyContent: "space-between",
    alignItems: isTablet ? "flex-end" : "stretch",
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  buttonContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.field,
    borderRadius: 8,
    padding: 4,
    marginBottom: isTablet ? 0 : SPACING.md,
    flex: isTablet ? 1 : 0,
  },
  tabButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  activeTabButton: {
    backgroundColor: COLORS.card,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "500",
    color: COLORS.sub,
  },
  activeTabButtonText: {
    color: COLORS.brand,
    fontWeight: "600",
  },
  calendarContainer: {
    marginLeft: isTablet ? SPACING.md : 0,
  },
  dateRangeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    gap: SPACING.sm,
  },
  activeDateButton: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.success + '10',
  },
  dateRangeText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    fontWeight: "500",
  },
  activeDateText: {
    color: COLORS.success,
  },
  clearButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  datePickerContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.lg,
    width: "100%",
    maxWidth: 400,
  },
  datePickerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.lg,
    textAlign: "center",
  },
  dateInputsContainer: {
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: SPACING.md,
    backgroundColor: COLORS.field,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
  },
  dateInputLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    fontWeight: "500",
  },
  dateInputValue: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    fontWeight: "500",
  },
  datePickerActions: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  cancelButton: {
    flex: 1,
    padding: SPACING.md,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    fontWeight: "500",
  },
  applyButton: {
    flex: 1,
    padding: SPACING.md,
    backgroundColor: COLORS.success,
    borderRadius: 8,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: COLORS.field,
  },
  applyButtonText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.buttonText,
    fontWeight: "600",
  },
  disabledButtonText: {
    color: COLORS.placeholder,
  },
  tabContent: {
    flex: 1,
    padding: SPACING.md,
  },
});

export default TaxInvoiceTabs;