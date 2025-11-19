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

const { width: W, height: H } = Dimensions.get("window");
const isTablet = W >= 768;
const isSmallScreen = W < 375;

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
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    };
    
    if (startDate && endDate) {
      return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    }
    return formatDate(startDate);
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
              IPD Tax Invoice
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
              OPD Tax Invoice
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
              Walk-In Tax Invoice
            </Text>
          </TouchableOpacity>
        </View>

        {/* Calendar Section */}
        <View style={styles.calendarContainer}>
          <TouchableOpacity
            style={[styles.dateRangeButton, startDate && styles.activeDateButton]}
            onPress={handleCalendarPress}
          >
            <Calendar size={20} color={startDate ? "#10B981" : "#6B7280"} />
            <Text style={[styles.dateRangeText, startDate && styles.activeDateText]}>
              {getDateRangeText()}
            </Text>
            {startDate && (
              <TouchableOpacity onPress={handleClearDates} style={styles.clearButton}>
                <X size={18} color="#EF4444" />
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
                  {startDate ? startDate.toLocaleDateString() : "Select start date"}
                </Text>
                <ChevronDown size={20} color="#6B7280" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.dateInput} onPress={handleEndDatePress}>
                <Text style={styles.dateInputLabel}>To Date</Text>
                <Text style={styles.dateInputValue}>
                  {endDate ? endDate.toLocaleDateString() : "Select end date"}
                </Text>
                <ChevronDown size={20} color="#6B7280" />
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
    backgroundColor: "#fff",
  },
  tabHeaders: {
    flexDirection: isTablet ? "row" : "column",
    justifyContent: "space-between",
    alignItems: isTablet ? "flex-end" : "stretch",
    paddingHorizontal: isSmallScreen ? 12 : 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  buttonContainer: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    padding: 4,
    marginBottom: isTablet ? 0 : 12,
    flex: isTablet ? 1 : 0,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  activeTabButton: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
  },
  activeTabButtonText: {
    color: "#14b8a6",
    fontWeight: "600",
  },
  calendarContainer: {
    marginLeft: isTablet ? 16 : 0,
  },
  dateRangeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    gap: 8,
  },
  activeDateButton: {
    borderColor: "#10B981",
    backgroundColor: "#f0fdf4",
  },
  dateRangeText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  activeDateText: {
    color: "#10B981",
  },
  clearButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  datePickerContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    width: "100%",
    maxWidth: 400,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
    textAlign: "center",
  },
  dateInputsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
  },
  dateInputLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  dateInputValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },
  datePickerActions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  applyButton: {
    flex: 1,
    padding: 12,
    backgroundColor: "#10B981",
    borderRadius: 8,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#e5e7eb",
  },
  applyButtonText: {
    fontSize: 14,
    color: "#ffffff",
    fontWeight: "600",
  },
  disabledButtonText: {
    color: "#9ca3af",
  },
  tabContent: {
    flex: 1,
    padding: isSmallScreen ? 12 : 16,
  },
});

export default TaxInvoiceTabs;