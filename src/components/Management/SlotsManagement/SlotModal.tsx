import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Modal,
  Dimensions,
} from "react-native";
import { 
  formatDate,
  formatDateForInput, 
  convertTo12Hour, 
  isValidDate,
  getCurrentDateFormatted 
} from "../../../utils/dateTime";
import { XIcon, ClockIcon, SaveIcon, UserIcon, CalendarIcon,ChevronDownIcon,ChevronUpIcon,} from "../../../utils/SvgIcons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Platform } from "react-native";
import { useDispatch } from "react-redux";
import { showSuccess, showError } from "../../../store/toast.slice";

const { height: screenHeight } = Dimensions.get('window');

/* ------------------ CONSTANT HOURS (24 HOURS) ------------------ */
const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0 → 23

interface SlotModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (slotData: any) => void;
  creating: boolean;
}

const SlotModal: React.FC<SlotModalProps> = ({ 
  visible, 
  onClose, 
  onSave, 
  creating 
}) => {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    date: getCurrentDateFormatted(),
    shiftFromTime: "09:00",
    shiftToTime: "17:00",
    availableSlots: "6"
  });

  const [showFromHourDropdown, setShowFromHourDropdown] = useState(false);
  const [showToHourDropdown, setShowToHourDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleSave = () => {
    // Validate all fields
    if (!formData.date || !formData.shiftFromTime || !formData.shiftToTime || !formData.availableSlots) {
      dispatch(showError("Please fill all fields"));
      return;
    }

    // Validate date format
    if (!isValidDate(formData.date)) {
      dispatch(showError("Invalid date"));
      return;
    }

    const startHour = Number(formData.shiftFromTime.split(":")[0]);
    const endHour = Number(formData.shiftToTime.split(":")[0]);

    if (startHour >= endHour) {
      dispatch(showError("End time must be after start time"));
      return;
    }

    const slots = Number(formData.availableSlots);
    if (isNaN(slots) || slots <= 0) {
      dispatch(showError("Slots must be greater than 0"));
      return;
    }

    onSave(formData);
  };

  /* ------------------ DATE PICKER (SIMPLE) ------------------ */
  const handleDateSelect = (date: Date) => {
    setShowDatePicker(false);
    setFormData((p) => ({ ...p, date: formatDateForInput(date) }));
  };

  /* ------------------ SELECT HOUR ------------------ */
  const selectHour = (hour: number, type: "from" | "to") => {
    const hourString = `${String(hour).padStart(2, "0")}:00`;
    setFormData((prev) => ({
      ...prev,
      [type === "from" ? "shiftFromTime" : "shiftToTime"]: hourString,
    }));
    
    if (type === "from") {
      setShowFromHourDropdown(false);
    } else {
      setShowToHourDropdown(false);
    }
  };

  /* ------------------ HOUR DROPDOWN COMPONENT ------------------ */
  const HourDropdown = ({ 
    visible, 
    onClose, 
    selectedHour, 
    onSelect,
    type 
  }: { 
    visible: boolean; 
    onClose: () => void; 
    selectedHour: string; 
    onSelect: (hour: number) => void;
    type: "from" | "to";
  }) => {
    if (!visible) return null;

    const currentHour = parseInt(selectedHour.split(":")[0]);
    const fromHour = parseInt(formData.shiftFromTime.split(":")[0]);
    const toHour = parseInt(formData.shiftToTime.split(":")[0]);
    
    // Filter available hours
    const availableHours = type === "to" 
      ? HOURS.filter(h => h > fromHour)
      : HOURS.filter(h => h < toHour);

    return (
      <View style={styles.hourDropdownContainer}>
        <View style={styles.hourDropdown}>
          <ScrollView 
            style={styles.hourScrollView}
            showsVerticalScrollIndicator={false}
          >
            {availableHours.map((hour) => (
              <TouchableOpacity
                key={hour}
                style={[
                  styles.hourOption,
                  currentHour === hour && styles.hourOptionSelected
                ]}
                onPress={() => onSelect(hour)}
              >
                <ClockIcon 
                  size={16} 
                  color={currentHour === hour ? "#14b8a6" : "#64748b"} 
                />
                <Text style={[
                  styles.hourOptionText,
                  currentHour === hour && styles.hourOptionTextSelected
                ]}>
                  {convertTo12Hour(`${String(hour).padStart(2, "0")}:00`)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* HEADER */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Slots</Text>
            <TouchableOpacity onPress={onClose}>
              <XIcon size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* CONTENT */}
          <ScrollView>
              <View style={styles.formSection}>
                  {/* DATE */}
                  <Text style={styles.label}>Date</Text>
                  <TouchableOpacity
                    style={styles.inputWithIcon}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <CalendarIcon size={16} color="#64748b" />
                    <Text style={styles.inputDisplayText}>
                      {formatDate(formData.date)}
                    </Text>
                  </TouchableOpacity>

                {/* TIME SELECTION */}
                <View style={styles.timeRow}>
                {/* START TIME */}
                  <View style={styles.timeFormGroup}>
                    <Text style={styles.label}>Start Time</Text>
                  <View style={styles.timeInputContainer}>
                    <TouchableOpacity
                      style={styles.timeInput}
                      onPress={() => {
                        setShowFromHourDropdown(!showFromHourDropdown);
                        setShowToHourDropdown(false);
                      }}
                    >
                      <ClockIcon size={16} color="#14b8a6" />
                      <Text style={styles.timeDisplayText}>
                        {convertTo12Hour(formData.shiftFromTime)}
                      </Text>
                      {showFromHourDropdown ? (
                        <ChevronUpIcon size={16} color="#64748b" />
                      ) : (
                        <ChevronDownIcon size={16} color="#64748b" />
                      )}
                    </TouchableOpacity>
                    
                    <HourDropdown
                      visible={showFromHourDropdown}
                      onClose={() => setShowFromHourDropdown(false)}
                      selectedHour={formData.shiftFromTime}
                      onSelect={(hour) => selectHour(hour, "from")}
                      type="from"
                    />
                  </View>
                  </View>

                {/* END TIME */}
                  <View style={styles.timeFormGroup}>
                    <Text style={styles.label}>End Time</Text>
                  <View style={styles.timeInputContainer}>
                    <TouchableOpacity
                      style={styles.timeInput}
                      onPress={() => {
                        setShowToHourDropdown(!showToHourDropdown);
                        setShowFromHourDropdown(false);
                      }}
                    >
                      <ClockIcon size={16} color="#14b8a6" />
                      <Text style={styles.timeDisplayText}>
                        {convertTo12Hour(formData.shiftToTime)}
                      </Text>
                      {showToHourDropdown ? (
                        <ChevronUpIcon size={16} color="#64748b" />
                      ) : (
                        <ChevronDownIcon size={16} color="#64748b" />
                      )}
                    </TouchableOpacity>
                    
                    <HourDropdown
                      visible={showToHourDropdown}
                      onClose={() => setShowToHourDropdown(false)}
                      selectedHour={formData.shiftToTime}
                      onSelect={(hour) => selectHour(hour, "to")}
                      type="to"
                    />
                  </View>
                </View>
              </View>

              {/* SLOTS */}
              <Text style={styles.label}>Available Slots / Hour</Text>
              <View style={styles.inputWithIcon}>
                <UserIcon size={16} color="#64748b" />
                <TextInput
                  style={styles.inputField}
                  keyboardType="numeric"
                  value={formData.availableSlots}
                  onChangeText={(t) =>
                    setFormData((p) => ({ ...p, availableSlots: t }))
                  }
                />
              </View>
            </View>
          </ScrollView>

          {/* ACTIONS */}
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={creating}
            >
              <SaveIcon size={16} color="#fff" />
              <Text style={styles.saveButtonText}>Create Slots</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={new Date(formData.date)}
          mode="date"
          display={Platform.OS === "android" ? "spinner" : "inline"}
    onChange={(event, selectedDate) => {
      if (event.type === "dismissed") {
        setShowDatePicker(false);
        return;
      }

      setShowDatePicker(false);
      if (selectedDate) {
        handleDateSelect(selectedDate);
      }
    }}
  />
)}

    </Modal>
  );
};

export default SlotModal;

/* ------------------ STYLES ------------------ */
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
     height: "90%", 
    backgroundColor: "#fff",
    width: "92%",
    borderRadius: 14,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  formSection: { padding: 16 },
  label: { 
    fontWeight: "600", 
    marginBottom: 6,
    color: "#374151",
    fontSize: 14,
  },
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    backgroundColor: "#f9fafb",
  },
  inputDisplayText: { 
    marginLeft: 10, 
    fontSize: 14,
    color: "#374151",
    flex: 1,
  },
  inputField: { 
    flex: 1, 
    marginLeft: 10,
    fontSize: 14,
    color: "#374151",
  },
  timeRow: { 
    flexDirection: "row", 
    gap: 12,
    marginBottom: 16,
  },
  timeFormGroup: { flex: 1 },
  timeInputContainer: {
    position: "relative",
  },
  timeInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#f9fafb",
  },
  timeDisplayText: {
    marginLeft: 10,
    marginRight: 8,
    fontSize: 14,
    color: "#374151",
    flex: 1,
  },
  modalActions: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
  },
  cancelButtonText: { 
    fontWeight: "600",
    color: "#374151",
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#14b8a6",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    gap: 8,
  },
  saveButtonText: { 
    color: "#fff", 
    fontWeight: "600",
    fontSize: 14,
  },

  /* Hour Dropdown Styles */
  hourDropdownContainer: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    zIndex: 10,
    marginTop: 4,
  },
  hourDropdown: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    maxHeight: 200,
  },
  hourScrollView: {
    maxHeight: 180,
  },
  hourOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  hourOptionSelected: {
    backgroundColor: "#f0fdfa",
  },
  hourOptionText: {
    marginLeft: 10,
    fontSize: 14,
    color: "#374151",
  },
  hourOptionTextSelected: {
    color: "#14b8a6",
    fontWeight: "600",
  },
});