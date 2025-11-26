// components/Pharmacy/AddInventoryDialog.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  Platform,
} from "react-native";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthFetch, AuthPost } from "../../auth/auth";
import { COLORS } from "../../utils/colour";
import { SPACING, FONT_SIZE, responsiveWidth, responsiveHeight } from "../../utils/responsive";
import {
  PlusIcon,
  EditIcon,
  XIcon,
} from "../../utils/SvgIcons";
import DateTimePicker from '@react-native-community/datetimepicker';

// Types
interface SelectedMedicineData {
  name: string;
  category: string;
  hsn: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  lowStockValue: number;
  email: string;
  expiryDate: string;
  gst: number | null;
  agencyName: string;
  agencyID: number | null;
  contactNo: string;
  agentCode: number | null;
  manufacturer: string;
}

interface StockData {
  name: string;
  id: number;
  hospitalID?: number;
  category: string;
  hsn: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  lowStockValue: number;
  manufacturer: string;
  email: string;
  expiryDate: string;
  addedOn?: string;
}

interface ManufacturerData {
  id: number;
  gst: number | null;
  agencyName: string;
  contactNo: string;
  email: string;
  agentCode: number | null;
  manufacturer: string;
}

interface AddInventoryDialogProps {
  visible: boolean;
  onClose: () => void;
  editMedicineData: SelectedMedicineData;
  editMEdId: number | null;
  onSave: () => void;
}

const AddInventoryDialog: React.FC<AddInventoryDialogProps> = ({
  visible,
  onClose,
  editMedicineData,
  editMEdId,
  onSave,
}) => {
  const user = useSelector((state: RootState) => state.currentUser);
  const [medicineList, setMedicineList] = useState<SelectedMedicineData[]>([]);
  const [medicineInStockData, setMedicineInStockData] = useState<StockData[]>([]);
  const [manufactureData, setManufactureData] = useState<ManufacturerData[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const medicineTypes = [
    "Capsules",
    "Syrups",
    "Tablets",
    "Injections",
    "IvLine",
    "Tubing",
    "Topical",
    "Drops",
    "Spray",
  ];

  const initialSelectedMedicineData = {
    name: "",
    category: "",
    hsn: "",
    quantity: 0,
    costPrice: 0,
    sellingPrice: 0,
    lowStockValue: 0,
    email: "",
    expiryDate: "",
    agencyName: "",
    contactNo: "",
    agentCode: null,
    manufacturer: "",
    addedOn: "",
    gst: null,
    agencyID: null,
  };

  const [selectedMedicineData, setSelectedMedicineData] = useState<SelectedMedicineData>(
    editMedicineData ? editMedicineData : initialSelectedMedicineData
  );

  // Fetch manufacturer data
  const fetchManufactureData = async () => {
    if (!user?.hospitalID) return;

    try {
      const token = await AsyncStorage.getItem("token");
      const response = await AuthFetch(
        `medicineInventoryManufacture/${user.hospitalID}/getAllManufacture`,
        token
      );

      if (response?.status === 200) {
        setManufactureData(response.data || []);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to fetch manufacturer data");
    }
  };

  // Fetch medicine inventory
  const fetchMedicineInventory = async () => {
    if (!user?.hospitalID) return;

    try {
      const token = await AsyncStorage.getItem("token");
      const response = await AuthFetch(
        `pharmacy/${user.hospitalID}/getMedicineInventory`,
        token
      );

      if (response?.status === 200) {
        setMedicineInStockData(response.medicines || []);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to fetch medicine inventory");
    }
  };

  useEffect(() => {
    if (visible) {
      fetchManufactureData();
      fetchMedicineInventory();
      
      if (editMEdId) {
        setSelectedMedicineData(editMedicineData);
      } else {
        setSelectedMedicineData(initialSelectedMedicineData);
        setMedicineList([]);
      }
    }
  }, [visible, editMEdId, editMedicineData]);

  // Update contact info when agency/manufacturer changes
  useEffect(() => {
    if (manufactureData.length > 0 && selectedMedicineData.agencyName && selectedMedicineData.manufacturer) {
      const filterData = manufactureData.filter(
        (each) =>
          each.agencyName === selectedMedicineData.agencyName &&
          each.manufacturer === selectedMedicineData.manufacturer
      );
      
      if (filterData.length > 0) {
        setSelectedMedicineData(prev => ({
          ...prev,
          contactNo: filterData[0].contactNo,
          email: filterData[0].email,
          agentCode: filterData[0].agentCode,
          manufacturer: filterData[0].manufacturer,
          agencyID: filterData[0].id,
        }));
      }
    }
  }, [selectedMedicineData.agencyName, selectedMedicineData.manufacturer, manufactureData]);

  const addMedicineToList = () => {
    if (
      selectedMedicineData.name &&
      selectedMedicineData.category &&
      selectedMedicineData.costPrice > 0 &&
      selectedMedicineData.expiryDate &&
      selectedMedicineData.hsn &&
      selectedMedicineData.gst !== null &&
      selectedMedicineData.quantity > 0 &&
      selectedMedicineData.sellingPrice > 0 &&
      selectedMedicineData.lowStockValue >= 0
    ) {
      setMedicineList([
        ...medicineList,
        {
          ...selectedMedicineData,
        },
      ]);
      setSelectedMedicineData(initialSelectedMedicineData);
    } else {
      Alert.alert("Error", "Please fill all required fields with valid values");
    }
  };

  const submitHandler = async () => {
    if (medicineList.length === 0) {
      Alert.alert("Error", "Please add at least one medicine to the list");
      return;
    }

    try {
      const token = await AsyncStorage.getItem("token");
      const response = await AuthPost(
        `medicineInventoryLogs/${user.hospitalID}/addInventoryLogs`,
        { medicineList: medicineList, user: user },
        token
      );

      if (response?.status === 200) {
        Alert.alert("Success", "Inventory added successfully");
        onSave();
        onClose();
      } else {
        Alert.alert("Error", "Failed to add inventory");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to add inventory");
    }
  };

  const handleEditMedicine = async () => {
    if (
      selectedMedicineData.category &&
      selectedMedicineData.quantity > 0 &&
      selectedMedicineData.gst !== null &&
      selectedMedicineData.sellingPrice > 0 &&
      selectedMedicineData.costPrice > 0 &&
      selectedMedicineData.hsn &&
      selectedMedicineData.lowStockValue >= 0 && 
      editMEdId
    ) {
      try {
        const token = await AsyncStorage.getItem("token");
        const response = await AuthPost(
          `medicineInventoryLogs/${user.hospitalID}/editMedicineInventoryData/${editMEdId}`,
          { medicineList: selectedMedicineData },
          token
        );

        if (response?.status === 200) {
          Alert.alert("Success", "Medicine updated successfully");
          onSave();
          onClose();
        } else {
          Alert.alert("Error", "Failed to update medicine");
        }
      } catch (error) {
        Alert.alert("Error", "Failed to update medicine");
      }
    } else {
      Alert.alert("Error", "Please fill all required fields with valid values");
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setSelectedMedicineData(prev => ({
        ...prev,
        expiryDate: selectedDate.toISOString(),
      }));
    }
  };

  const InputField: React.FC<{
    label: string;
    value: string | number;
    onChange: (value: string) => void;
    placeholder?: string;
    keyboardType?: "default" | "numeric" | "email-address" | "phone-pad";
    required?: boolean;
    disabled?: boolean;
  }> = ({ label, value, onChange, placeholder, keyboardType = "default", required = false, disabled = false }) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      <TextInput
        style={[
          styles.textInput,
          disabled && styles.inputDisabled
        ]}
        value={value.toString()}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={COLORS.sub}
        keyboardType={keyboardType}
        editable={!disabled}
      />
    </View>
  );

  const SelectField: React.FC<{
    label: string;
    value: string;
    onSelect: (value: string) => void;
    options: string[];
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
  }> = ({ label, value, onSelect, options, placeholder, required = false, disabled = false }) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      <ScrollView horizontal style={styles.selectOptions}>
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.selectOption,
              value === option && styles.selectedOption
            ]}
            onPress={() => onSelect(option)}
            disabled={disabled}
          >
            <Text style={[
              styles.selectOptionText,
              value === option && styles.selectedOptionText
            ]}>
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {value ? (
        <Text style={styles.selectedValue}>{value}</Text>
      ) : (
        <Text style={styles.placeholderText}>{placeholder}</Text>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {editMEdId ? "Edit Inventory" : "Add Inventory"}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <XIcon size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Medicine Details Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Enter The Specific Details Of The Medicine
              </Text>
              
              <View style={styles.formGrid}>
                <SelectField
                  label="Medicine Name"
                  value={selectedMedicineData.name}
                  onSelect={(value) => setSelectedMedicineData(prev => ({ ...prev, name: value }))}
                  options={[...new Set(medicineInStockData.map(item => item.name))]}
                  placeholder="Select medicine"
                  required
                  disabled={!!editMEdId}
                />

                <SelectField
                  label="Category"
                  value={selectedMedicineData.category}
                  onSelect={(value) => setSelectedMedicineData(prev => ({ ...prev, category: value }))}
                  options={medicineTypes}
                  placeholder="Select category"
                  required
                />

                <InputField
                  label="Quantity"
                  value={selectedMedicineData.quantity}
                  onChange={(value) => setSelectedMedicineData(prev => ({ ...prev, quantity: Number(value) }))}
                  placeholder="Enter quantity"
                  keyboardType="numeric"
                  required
                />

                <InputField
                  label="GST %"
                  value={selectedMedicineData.gst || ""}
                  onChange={(value) => setSelectedMedicineData(prev => ({ ...prev, gst: Number(value) }))}
                  placeholder="Enter GST percentage"
                  keyboardType="numeric"
                  required
                />
              </View>
            </View>

            {/* Manufacturer Details Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Fill In The Details Below To Add A New Medicine To The Inventory
              </Text>
              
              <View style={styles.formGrid}>
                <SelectField
                  label="Agency Name"
                  value={selectedMedicineData.agencyName}
                  onSelect={(value) => setSelectedMedicineData(prev => ({ ...prev, agencyName: value }))}
                  options={[...new Set(manufactureData.map(item => item.agencyName))]}
                  placeholder="Select agency"
                  required
                  disabled={!!editMEdId}
                />

                <SelectField
                  label="Manufacturer"
                  value={selectedMedicineData.manufacturer}
                  onSelect={(value) => setSelectedMedicineData(prev => ({ ...prev, manufacturer: value }))}
                  options={[...new Set(manufactureData.map(item => item.manufacturer))]}
                  placeholder="Select manufacturer"
                  required
                  disabled={!!editMEdId}
                />

                <InputField
                  label="Agent Code"
                  value={selectedMedicineData.agentCode || ""}
                  onChange={(value) => setSelectedMedicineData(prev => ({ ...prev, agentCode: Number(value) }))}
                  placeholder="Enter agent code"
                  keyboardType="numeric"
                  required
                  disabled={!!editMEdId}
                />

                <InputField
                  label="Contact No"
                  value={selectedMedicineData.contactNo}
                  onChange={(value) => setSelectedMedicineData(prev => ({ ...prev, contactNo: value }))}
                  placeholder="Enter contact number"
                  keyboardType="phone-pad"
                  required
                  disabled={!!editMEdId}
                />

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>
                    Expiry Date <Text style={styles.required}>*</Text>
                  </Text>
                  <TouchableOpacity 
                    style={styles.dateInput}
                    onPress={() => setShowDatePicker(true)}
                    disabled={!!editMEdId}
                  >
                    <Text style={[
                      styles.dateText,
                      !selectedMedicineData.expiryDate && styles.placeholderText
                    ]}>
                      {selectedMedicineData.expiryDate 
                        ? new Date(selectedMedicineData.expiryDate).toLocaleDateString()
                        : "Select expiry date"
                      }
                    </Text>
                  </TouchableOpacity>
                </View>

                <InputField
                  label="Selling Price"
                  value={selectedMedicineData.sellingPrice}
                  onChange={(value) => setSelectedMedicineData(prev => ({ ...prev, sellingPrice: Number(value) }))}
                  placeholder="Enter selling price"
                  keyboardType="numeric"
                  required
                />

                <InputField
                  label="Cost Price"
                  value={selectedMedicineData.costPrice}
                  onChange={(value) => setSelectedMedicineData(prev => ({ ...prev, costPrice: Number(value) }))}
                  placeholder="Enter cost price"
                  keyboardType="numeric"
                  required
                />

                <SelectField
                  label="HSN/Code"
                  value={selectedMedicineData.hsn}
                  onSelect={(value) => setSelectedMedicineData(prev => ({ ...prev, hsn: value }))}
                  options={[...new Set(medicineInStockData.map(item => item.hsn))]}
                  placeholder="Select HSN code"
                  required
                />

                <InputField
                  label="Low Stock Alert"
                  value={selectedMedicineData.lowStockValue}
                  onChange={(value) => setSelectedMedicineData(prev => ({ ...prev, lowStockValue: Number(value) }))}
                  placeholder="Enter low stock threshold"
                  keyboardType="numeric"
                  required
                />
              </View>
            </View>

            {/* Add Button */}
            {!editMEdId && (
              <TouchableOpacity 
                style={styles.addButton}
                onPress={addMedicineToList}
              >
                <PlusIcon size={20} color={COLORS.buttonText} />
                <Text style={styles.addButtonText}>Add to List</Text>
              </TouchableOpacity>
            )}

            {/* Medicine List */}
            {medicineList.length > 0 && (
              <View style={styles.medicineListSection}>
                <Text style={styles.sectionTitle}>Medicine List</Text>
                <ScrollView style={styles.medicineList}>
                  {medicineList.map((medicine, index) => (
                    <View key={index} style={styles.medicineItem}>
                      <Text style={styles.medicineName}>{medicine.name}</Text>
                      <Text style={styles.medicineDetails}>
                        {medicine.category} • Qty: {medicine.quantity} • 
                        Cost: ₹{medicine.costPrice} • Sell: ₹{medicine.sellingPrice}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>Close</Text>
              </TouchableOpacity>
              
              {editMEdId ? (
                <TouchableOpacity 
                  style={styles.saveButton}
                  onPress={handleEditMedicine}
                >
                  <EditIcon size={20} color={COLORS.buttonText} />
                  <Text style={styles.saveButtonText}>Edit Medicine</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={styles.saveButton}
                  onPress={submitHandler}
                  disabled={medicineList.length === 0}
                >
                  <Text style={styles.saveButtonText}>Save Inventory</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>

          {/* Date Picker */}
          {showDatePicker && (
            <DateTimePicker
              value={selectedMedicineData.expiryDate ? new Date(selectedMedicineData.expiryDate) : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    width: '100%',
    maxWidth: 800,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  scrollContent: {
    flex: 1,
  },
  section: {
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  formGrid: {
    gap: SPACING.md,
  },
  inputContainer: {
    gap: SPACING.xs,
  },
  inputLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '500',
    color: COLORS.text,
  },
  required: {
    color: COLORS.danger,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: SPACING.sm,
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    backgroundColor: COLORS.field,
  },
  inputDisabled: {
    backgroundColor: COLORS.pill,
    color: COLORS.sub,
  },
  selectOptions: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  selectOption: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 6,
    backgroundColor: COLORS.field,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectedOption: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  selectOptionText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
  },
  selectedOptionText: {
    color: COLORS.buttonText,
    fontWeight: '500',
  },
  selectedValue: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    fontWeight: '500',
    marginTop: SPACING.xs,
  },
  placeholderText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    fontStyle: 'italic',
    marginTop: SPACING.xs,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: SPACING.sm,
    backgroundColor: COLORS.field,
  },
  dateText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.brand,
    padding: SPACING.md,
    margin: SPACING.lg,
    borderRadius: 8,
    gap: SPACING.sm,
  },
  addButtonText: {
    color: COLORS.buttonText,
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  medicineListSection: {
    padding: SPACING.lg,
  },
  medicineList: {
    maxHeight: 200,
  },
  medicineItem: {
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.field,
  },
  medicineName: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  medicineDetails: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  cancelButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    fontWeight: '500',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.brand,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    minWidth: 150,
    gap: SPACING.sm,
  },
  saveButtonText: {
    color: COLORS.buttonText,
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
});

export default AddInventoryDialog;