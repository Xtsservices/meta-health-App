import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Modal,
  Alert,
  Dimensions,
  Platform
} from "react-native";
import DateTimePicker from '@react-native-community/datetimepicker';
import { 
  formatDate,
  formatDateForInput, 
  convertTo12Hour, 
  isValidTime,
  isValidDate,
  getCurrentDateFormatted 
} from "../../../utils/dateTime";
import { XIcon, ClockIcon, SaveIcon, UserIcon, CalendarIcon } from "../../../utils/SvgIcons";

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
  const [formData, setFormData] = useState({
    date: getCurrentDateFormatted(),
    shiftFromTime: "09:00",
    shiftToTime: "17:00",
    availableSlots: "6"
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showFromTimePicker, setShowFromTimePicker] = useState(false);
  const [showToTimePicker, setShowToTimePicker] = useState(false);

  const handleSave = () => {
    // Validate all fields
    if (!formData.date || !formData.shiftFromTime || !formData.shiftToTime || !formData.availableSlots) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    // Validate date format
    if (!isValidDate(formData.date)) {
      Alert.alert("Error", "Please enter a valid date in YYYY-MM-DD format");
      return;
    }

    // Validate time formats
    if (!isValidTime(formData.shiftFromTime) || !isValidTime(formData.shiftToTime)) {
      Alert.alert("Error", "Please enter valid time in HH:MM format");
      return;
    }

    const availableSlotsNum = parseInt(formData.availableSlots ?? '0');
    if (isNaN(availableSlotsNum) || availableSlotsNum <= 0) {
      Alert.alert("Error", "Available slots must be greater than 0");
      return;
    }

    const startHour = parseInt(formData.shiftFromTime?.split(':')?.[0] ?? '0');
    const endHour = parseInt(formData.shiftToTime?.split(':')?.[0] ?? '0');
    
    if (startHour >= endHour) {
      Alert.alert("Error", "Shift end time must be after shift start time");
      return;
    }

    onSave(formData);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData(prev => ({
        ...prev,
        date: formatDateForInput(selectedDate)
      }));
    }
  };

  const handleFromTimeChange = (event: any, selectedTime?: Date) => {
    setShowFromTimePicker(false);
    if (selectedTime) {
      const hours = String(selectedTime.getHours()).padStart(2, '0');
      const minutes = String(selectedTime.getMinutes()).padStart(2, '0');
      setFormData(prev => ({
        ...prev,
        shiftFromTime: `${hours}:${minutes}`
      }));
    }
  };

  const handleToTimeChange = (event: any, selectedTime?: Date) => {
    setShowToTimePicker(false);
    if (selectedTime) {
      const hours = String(selectedTime.getHours()).padStart(2, '0');
      const minutes = String(selectedTime.getMinutes()).padStart(2, '0');
      setFormData(prev => ({
        ...prev,
        shiftToTime: `${hours}:${minutes}`
      }));
    }
  };

  const generateTimeSlots = () => {
    const slots = [];
    const start = parseInt(formData.shiftFromTime?.split(':')?.[0] ?? '0');
    const end = parseInt(formData.shiftToTime?.split(':')?.[0] ?? '0');
    
    for (let i = start; i < end; i++) {
      const fromTime = `${i.toString().padStart(2, '0')}:00`;
      const toTime = `${(i + 1).toString().padStart(2, '0')}:00`;
      slots.push({
        time: `${convertTo12Hour(fromTime)} - ${convertTo12Hour(toTime)}`,
        fromTime,
        toTime,
        available: parseInt(formData.availableSlots ?? '0')
      });
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  const getCurrentDate = () => {
    try {
      return formData.date ? new Date(formData.date + 'T00:00:00') : new Date();
    } catch {
      return new Date();
    }
  };

  const getCurrentFromTime = () => {
    try {
      const [hours, minutes] = formData.shiftFromTime?.split(':') ?? ['9', '0'];
      const date = new Date();
      date.setHours(parseInt(hours ?? '9'), parseInt(minutes ?? '0'));
      return date;
    } catch {
      return new Date();
    }
  };

  const getCurrentToTime = () => {
    try {
      const [hours, minutes] = formData.shiftToTime?.split(':') ?? ['17', '0'];
      const date = new Date();
      date.setHours(parseInt(hours ?? '17'), parseInt(minutes ?? '0'));
      return date;
    } catch {
      return new Date();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { maxHeight: screenHeight * 0.85 }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Slots</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <XIcon size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Content Area */}
          <View style={styles.contentArea}>
            <ScrollView 
              style={styles.scrollView}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.scrollContent}
            >
              {/* Form Fields */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Schedule Details</Text>
                
                {/* Date Input */}
                <View style={styles.formGroup}>
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
                </View>

                {/* Time Row */}
                <View style={styles.timeRow}>
                  <View style={styles.timeFormGroup}>
                    <Text style={styles.label}>Shift Start Time</Text>
                    <TouchableOpacity 
                      style={styles.inputWithIcon}
                      onPress={() => setShowFromTimePicker(true)}
                    >
                      <ClockIcon size={16} color="#64748b" />
                      <Text style={styles.inputDisplayText}>
                        {convertTo12Hour(formData.shiftFromTime)}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.timeFormGroup}>
                    <Text style={styles.label}>Shift End Time</Text>
                    <TouchableOpacity 
                      style={styles.inputWithIcon}
                      onPress={() => setShowToTimePicker(true)}
                    >
                      <ClockIcon size={16} color="#64748b" />
                      <Text style={styles.inputDisplayText}>
                        {convertTo12Hour(formData.shiftToTime)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Available Slots */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Available Slots per Hour</Text>
                  <View style={styles.inputWithIcon}>
                    <UserIcon size={16} color="#64748b" />
                    <TextInput
                      style={styles.inputField}
                      value={formData.availableSlots}
                      onChangeText={(text) => setFormData({...formData, availableSlots: text})}
                      placeholder="6"
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>

              {/* Preview Section */}
              {/* {timeSlots?.length > 0 && (
                <View style={styles.previewSection}>
                  <Text style={styles.sectionTitle}>Preview Slots</Text>
                  <Text style={styles.previewSubtitle}>
                    {timeSlots?.length ?? 0} time slots will be created
                  </Text>
                  
                  <View style={styles.slotsPreview}>
                    {timeSlots?.map?.((slot, index) => (
                      <View key={index} style={styles.slotPreviewItem}>
                        <View style={styles.slotPreviewTime}>
                          <ClockIcon size={14} color="#14b8a6" />
                          <Text style={styles.slotPreviewTimeText}>{slot?.time}</Text>
                        </View>
                        <View style={styles.slotPreviewCount}>
                          <Text style={styles.slotPreviewCountText}>
                            {slot?.available ?? 0} slots
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )} */}
            </ScrollView>
          </View>

          {/* Actions */}
          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={onClose}
              disabled={creating}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.saveButton, creating && styles.disabledButton]} 
              onPress={handleSave}
              disabled={creating}
            >
              <SaveIcon size={16} color="#fff" />
              <Text style={styles.saveButtonText}>
                {creating ? "Creating..." : "Create Slots"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Date and Time Pickers */}
      {showDatePicker && (
        <DateTimePicker
          value={getCurrentDate()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}

      {showFromTimePicker && (
        <DateTimePicker
          value={getCurrentFromTime()}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleFromTimeChange}
          is24Hour={false}
        />
      )}

      {showToTimePicker && (
        <DateTimePicker
          value={getCurrentToTime()}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleToTimeChange}
          is24Hour={false}
        />
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "100%",
    maxWidth: 500,
    minHeight: 500,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
  },
  closeButton: {
    padding: 4,
  },
  contentArea: {
    flex: 1,
    minHeight: 400,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  formSection: {
    padding: 20,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  timeRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 10,
  },
  timeFormGroup: {
    flex: 1,
  },
  label: {
    fontWeight: "600",
    color: "#374151",
    fontSize: 14,
    marginBottom: 8,
  },
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    height: 44,
  },
  inputDisplayText: {
    flex: 1,
    paddingLeft: 8,
    paddingVertical: 10,
    fontSize: 14,
    color: "#374151",
  },
  inputField: {
    flex: 1,
    borderWidth: 0,
    paddingLeft: 8,
    paddingVertical: 10,
    fontSize: 14,
    height: '100%',
  },
  previewSection: {
    padding: 20,
    paddingTop: 10,
    backgroundColor: "#f8fafc",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    marginTop: 10,
  },
  previewSubtitle: {
    color: "#64748b",
    fontSize: 12,
    marginBottom: 12,
  },
  slotsPreview: {
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  slotPreviewItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  slotPreviewTime: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  slotPreviewTimeText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#475569",
  },
  slotPreviewCount: {
    backgroundColor: "#f0fdfa",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  slotPreviewCountText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#14b8a6",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    backgroundColor: "#fff",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#f8fafc",
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    color: "#475569",
    fontWeight: "600",
    fontSize: 14,
  },
  saveButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#14b8a6",
    paddingVertical: 14,
    borderRadius: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});

export default SlotModal;