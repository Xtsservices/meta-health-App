import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  FlatList,
  Platform,
} from "react-native";
import { useSelector } from "react-redux";
import {
  SPACING,
  FONT_SIZE,
  isSmallDevice,
} from "../../../utils/responsive";

// Icons
import {
  XIcon,
  PlusIcon,
  ShoppingCartIcon,
  DeleteIcon,
} from "../../../utils/SvgIcons";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthFetch, AuthPost } from "../../../auth/auth";
import { RootState } from "../../../store/store";
import { COLORS } from "../../../utils/colour";

interface SelectedMedicineData {
  id: number | null;
  name: string;
  category: string;
  quantity: number;
  agencyName: string;
  contactNo: string;
  email: string;
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
  manufacturer: string;
  email: string;
  expiryDate: string;
  addedOn?: string;
}

interface ManufacturerData {
  gst: number | null;
  agencyName: string;
  contactNo: string;
  email: string;
  agentCode: number | null;
  manufacturer: string;
}

interface OrderExpenseDialogProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onOrderPlaced?: () => void;
}

const OrderExpenseDialog: React.FC<OrderExpenseDialogProps> = ({
  open,
  setOpen,
  onOrderPlaced,
}) => {
  const user = useSelector((state: RootState) => state.currentUser);
  const [medicineList, setMedicineList] = useState<SelectedMedicineData[]>([]);
  const [medicineInStockData, setMedicineInStockData] = useState<StockData[]>([]);
  const [manufactureData, setManufactureData] = useState<ManufacturerData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const initialSelectedMedicineData: SelectedMedicineData = {
    id: null,
    name: "",
    category: "",
    quantity: 0,
    agencyName: "",
    contactNo: "",
    email: "",
    agentCode: null,
    manufacturer: "",
  };

  const [selectedMedicineData, setSelectedMedicineData] = useState<SelectedMedicineData>(
    initialSelectedMedicineData
  );

  // UI state to control suggestions visibility (can add debounce later if desired)
  const [showMedicineSuggestions, setShowMedicineSuggestions] = useState(false);
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const [showAgencySuggestions, setShowAgencySuggestions] = useState(false);

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

  // Fetch manufacturer data
  useEffect(() => {
    const getManufactureData = async () => {
      if (!user?.hospitalID) return;

      try {
        setIsLoading(true);
        const token = await AsyncStorage.getItem("token");
        const response = await AuthFetch(
          `medicineInventoryManufacture/${user.hospitalID}/getAllManufacture`,
          token
        );

        if (response?.data?.status === 200) {
          setManufactureData(response?.data?.data || []);
        }
      } catch (error) {
        Alert.alert("Error", "Failed to fetch manufacturer data");
      } finally {
        setIsLoading(false);
      }
    };

    if (open) {
      getManufactureData();
    }
  }, [user, open]);

  // Fetch medicine inventory data
  useEffect(() => {
    const getMedicineInventory = async () => {
      if (!user?.hospitalID) return;

      try {
        setIsLoading(true);
        const token = await AsyncStorage.getItem("token");
        const response = await AuthFetch(
          `pharmacy/${user.hospitalID}/getMedicineInventory`,
          token
        );

        if (response?.data?.status === 200) {
          setMedicineInStockData(response?.data?.medicines || []);
        }
      } catch (error) {
        Alert.alert("Error", "Failed to fetch inventory data");
      } finally {
        setIsLoading(false);
      }
    };

    if (open) {
      getMedicineInventory();
    }
  }, [user, open]);

  // Auto-fill agency details when agency name changes (keeps as-is)
  useEffect(() => {
    const selectedAgency = manufactureData.find(
      (agency) => agency.agencyName === selectedMedicineData.agencyName
    );

    if (selectedAgency) {
      setSelectedMedicineData((prev) => ({
        ...prev,
        contactNo: selectedAgency.contactNo,
        email: selectedAgency.email,
        agentCode: selectedAgency.agentCode,
        manufacturer: selectedAgency.manufacturer,
      }));
    }
  }, [selectedMedicineData.agencyName, manufactureData]);

  // Derived suggestion lists (filtered)
  const filteredMedicineSuggestions = useMemo(() => {
    const q = selectedMedicineData.name.trim().toLowerCase();
    if (!q) return [];
    return medicineInStockData
      .filter((m) => m.name?.toLowerCase().includes(q))
      .slice(0, 6); // limit to 6
  }, [selectedMedicineData.name, medicineInStockData]);

  const filteredCategorySuggestions = useMemo(() => {
    const q = selectedMedicineData.category.trim().toLowerCase();
    if (!q) return medicineTypes.slice(0, 6);
    return medicineTypes.filter((c) => c.toLowerCase().includes(q)).slice(0, 6);
  }, [selectedMedicineData.category]);

  const filteredAgencySuggestions = useMemo(() => {
    const q = selectedMedicineData.agencyName.trim().toLowerCase();
    if (!q) return manufactureData.slice(0, 6);
    return manufactureData
      .filter((a) => a.agencyName?.toLowerCase().includes(q))
      .slice(0, 6);
  }, [selectedMedicineData.agencyName, manufactureData]);

  const addMedicineToList = () => {
    // Validate all required fields
    const validationErrors: string[] = [];

    if (!selectedMedicineData.name?.trim()) {
      validationErrors.push("Medicine Name");
    }
    if (!selectedMedicineData.category?.trim()) {
      validationErrors.push("Category");
    }
    if (!selectedMedicineData.quantity || selectedMedicineData.quantity <= 0) {
      validationErrors.push("Quantity (must be greater than 0)");
    }
    if (!selectedMedicineData.agencyName?.trim()) {
      validationErrors.push("Agency Name");
    }
    if (!selectedMedicineData.email?.trim()) {
      validationErrors.push("Email");
    }
    if (!selectedMedicineData.contactNo?.trim()) {
      validationErrors.push("Contact Number");
    }
    if (!selectedMedicineData.manufacturer?.trim()) {
      validationErrors.push("Manufacturer");
    }

    if (validationErrors.length > 0) {
      Alert.alert("Validation Error", `Please fill required fields: ${validationErrors.join(", ")}`);
      return;
    }

    // Add medicine to list
    const newMedicine = {
      ...selectedMedicineData,
      id: Date.now(), // Generate unique ID
    };

    setMedicineList([...medicineList, newMedicine]);
    setSelectedMedicineData(initialSelectedMedicineData);
    setShowMedicineSuggestions(false);
    setShowAgencySuggestions(false);
    setShowCategorySuggestions(false);
    Alert.alert("Success", `${selectedMedicineData.name} added to order`);
  };

  const removeMedicineFromList = (index: number) => {
    const updatedList = medicineList.filter((_, i) => i !== index);
    setMedicineList(updatedList);
    Alert.alert("Success", "Medicine removed from order");
  };

  const submitHandler = async () => {
    if (medicineList.length === 0) {
      Alert.alert("Error", "No medicines added to the order");
      return;
    }

    try {
      setIsLoading(true);

      const token = await AsyncStorage.getItem("token");
      const response = await AuthPost(
        `medicineInventoryExpense/${user.hospitalID}/AddInventoryExpense`,
        { medicineList },
        token
      );

      if (response?.status === 200 || response?.status === 201) {
        Alert.alert("Success", "Order placed successfully");
        setMedicineList([]);
        setSelectedMedicineData(initialSelectedMedicineData);
        setOpen(false);

        if (onOrderPlaced) {
          onOrderPlaced();
        }
      } else {
        Alert.alert("Error", `Failed to place order. Status: ${response?.status}`);
      }
    } catch (error) {
      Alert.alert("Error", "Error placing order. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (medicineList.length > 0) {
      Alert.alert(
        "Confirm Close",
        "You have unsaved changes. Are you sure you want to close?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Close",
            style: "destructive",
            onPress: () => {
              setMedicineList([]);
              setSelectedMedicineData(initialSelectedMedicineData);
              setOpen(false);
            }
          }
        ]
      );
    } else {
      setOpen(false);
    }
  };

  const renderMedicineItem = ({ item, index }: { item: SelectedMedicineData; index: number }) => (
    <View style={styles.medicineItem}>
      <View style={styles.medicineInfo}>
        <Text style={styles.medicineName}>{item.name}</Text>
        <Text style={styles.medicineDetails}>
          {item.category} • {item.agencyName} • Qty: {item.quantity}
        </Text>
        <Text style={styles.medicineCode}>Agent Code: {item.agentCode || "N/A"}</Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => removeMedicineFromList(index)}
      >
        <DeleteIcon size={20} color={COLORS.danger} />
      </TouchableOpacity>
    </View>
  );

  // helpers to select suggestion items
  const onSelectMedicineSuggestion = (stock: StockData) => {
    setSelectedMedicineData((prev) => ({
      ...prev,
      name: stock.name || "",
      category: stock.category || prev.category,
      manufacturer: stock.manufacturer || prev.manufacturer,
    }));
    setShowMedicineSuggestions(false);
  };

  const onSelectCategorySuggestion = (category: string) => {
    setSelectedMedicineData((prev) => ({
      ...prev,
      category,
    }));
    setShowCategorySuggestions(false);
  };

  const onSelectAgencySuggestion = (agency: ManufacturerData) => {
    setSelectedMedicineData((prev) => ({
      ...prev,
      agencyName: agency.agencyName || "",
      contactNo: agency.contactNo || prev.contactNo,
      email: agency.email || prev.email,
      agentCode: agency.agentCode ?? prev.agentCode,
      manufacturer: agency.manufacturer || prev.manufacturer,
    }));
    setShowAgencySuggestions(false);
  };

  return (
    <Modal
      visible={open}
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? "pageSheet" : "formSheet"}
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Order Medicine</Text>
            <Text style={styles.subtitle}>
              Create new supplier order for pharmaceutical medications
            </Text>
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
          >
            <XIcon size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Medicine Details Card */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Medicine Details</Text>

            <View style={styles.formRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Medicine Name *</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter medicine name"
                    value={selectedMedicineData.name}
                    onChangeText={(text) => {
                      setSelectedMedicineData(prev => ({ ...prev, name: text }));
                      setShowMedicineSuggestions(true);
                    }}
                    placeholderTextColor={COLORS.sub}
                    autoCorrect={false}
                    autoCapitalize="none"
                    keyboardType="default"
                  />
                </View>

                {showMedicineSuggestions && filteredMedicineSuggestions.length > 0 && (
                  <View style={styles.suggestionBox}>
                    {filteredMedicineSuggestions.map((m) => (
                      <TouchableOpacity
                        key={m.id}
                        style={styles.suggestionItem}
                        onPress={() => onSelectMedicineSuggestion(m)}
                      >
                        <Text style={styles.suggestionText}>{m.name}</Text>
                        <Text style={styles.suggestionSubText}>{m.category}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Category *</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Select category"
                    value={selectedMedicineData.category}
                    onChangeText={(text) => {
                      setSelectedMedicineData(prev => ({ ...prev, category: text }));
                      setShowCategorySuggestions(true);
                    }}
                    placeholderTextColor={COLORS.sub}
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                </View>

                {showCategorySuggestions && filteredCategorySuggestions.length > 0 && (
                  <View style={styles.suggestionBox}>
                    {filteredCategorySuggestions.map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={styles.suggestionItem}
                        onPress={() => onSelectCategorySuggestion(type)}
                      >
                        <Text style={styles.suggestionText}>{type}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Quantity *</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter quantity"
                    value={selectedMedicineData.quantity > 0 ? selectedMedicineData.quantity.toString() : ""}
                    onChangeText={(text) => {
                      const quantity = parseInt(text) || 0;
                      setSelectedMedicineData(prev => ({ ...prev, quantity: Math.max(0, quantity) }));
                    }}
                    keyboardType="numeric"
                    placeholderTextColor={COLORS.sub}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Agency Details Card */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Agency Details</Text>

            <View style={styles.formRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Agency Name *</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter agency name"
                    value={selectedMedicineData.agencyName}
                    onChangeText={(text) => {
                      setSelectedMedicineData(prev => ({ ...prev, agencyName: text }));
                      setShowAgencySuggestions(true);
                    }}
                    placeholderTextColor={COLORS.sub}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>

                {showAgencySuggestions && filteredAgencySuggestions.length > 0 && (
                  <View style={styles.suggestionBox}>
                    {filteredAgencySuggestions.map((agency, index) => (
                      <TouchableOpacity
                        key={`${agency.agencyName}-${index}`}
                        style={styles.suggestionItem}
                        onPress={() => onSelectAgencySuggestion(agency)}
                      >
                        <Text style={styles.suggestionText}>{agency.agencyName}</Text>
                        <Text style={styles.suggestionSubText}>{agency.contactNo}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Contact Number *</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter contact number"
                    value={selectedMedicineData.contactNo}
                    onChangeText={(text) => setSelectedMedicineData(prev => ({ ...prev, contactNo: text.slice(0, 10) }))}
                    keyboardType="phone-pad"
                    maxLength={10}
                    placeholderTextColor={COLORS.sub}
                  />
                </View>
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address *</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter email address"
                    value={selectedMedicineData.email}
                    onChangeText={(text) => setSelectedMedicineData(prev => ({ ...prev, email: text }))}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor={COLORS.sub}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Agent Code *</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter agent code"
                    value={selectedMedicineData.agentCode ? selectedMedicineData.agentCode.toString() : ""}
                    onChangeText={(text) => {
                      const code = parseInt(text) || null;
                      setSelectedMedicineData(prev => ({ ...prev, agentCode: code }));
                    }}
                    keyboardType="numeric"
                    placeholderTextColor={COLORS.sub}
                  />
                </View>
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.inputGroup, styles.fullWidth]}>
                <Text style={styles.label}>Manufacturer *</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter manufacturer"
                    value={selectedMedicineData.manufacturer}
                    onChangeText={(text) => setSelectedMedicineData(prev => ({ ...prev, manufacturer: text }))}
                    placeholderTextColor={COLORS.sub}
                  />
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.addButton}
              onPress={addMedicineToList}
              disabled={isLoading}
            >
              <PlusIcon size={18} color={COLORS.buttonText} />
              <Text style={styles.addButtonText}>Add Medicine</Text>
            </TouchableOpacity>
          </View>

          {/* Added Medicines List */}
          {medicineList.length > 0 && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Added Medicines ({medicineList.length})</Text>

              <FlatList
                data={medicineList}
                renderItem={renderMedicineItem}
                keyExtractor={(item, index) => `medicine-${index}`}
                scrollEnabled={false}
                style={styles.medicinesList}
              />
            </View>
          )}
        </ScrollView>

        {/* Footer Actions */}
        {medicineList.length > 0 && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.orderButton, isLoading && styles.orderButtonDisabled]}
              onPress={submitHandler}
              disabled={isLoading}
            >
              <ShoppingCartIcon size={20} color={COLORS.buttonText} />
              <Text style={styles.orderButtonText}>
                {isLoading ? "Placing Order..." : "Place Order"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};

export default OrderExpenseDialog;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: SPACING.lg,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    lineHeight: 20,
  },
  closeButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.md,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
  },

  // Card style for sections
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.md,
  },

  formRow: {
    flexDirection: isSmallDevice ? "column" : "row",
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  inputGroup: {
    flex: 1,
    marginBottom: SPACING.sm,
  },
  fullWidth: {
    flex: 2,
  },
  label: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  inputContainer: {
    backgroundColor: COLORS.field,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  textInput: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    padding: 0,
  },

  suggestionBox: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: 200,
    overflow: "hidden",
  },
  suggestionItem: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  suggestionText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    fontWeight: "600",
  },
  suggestionSubText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
  },

  categorySuggestions: {
    marginTop: SPACING.sm,
  },
  categoryChip: {
    backgroundColor: COLORS.brandLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 16,
    marginRight: SPACING.sm,
  },
  categoryChipText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.brand,
    fontWeight: "600",
  },

  agencySuggestions: {
    marginTop: SPACING.sm,
  },
  agencyChip: {
    backgroundColor: COLORS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 16,
    marginRight: SPACING.sm,
  },
  agencyChipText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    fontWeight: "600",
  },

  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.brand,
    padding: SPACING.md,
    borderRadius: 8,
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  addButtonText: {
    color: COLORS.buttonText,
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
  },

  medicinesList: {
    marginTop: SPACING.md,
  },
  medicineItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.field,
    padding: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  medicineInfo: {
    flex: 1,
  },
  medicineName: {
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 2,
  },
  medicineDetails: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    marginBottom: 2,
  },
  medicineCode: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
  },
  deleteButton: {
    padding: SPACING.sm,
  },

  footer: {
    flexDirection: "row",
    padding: SPACING.lg,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.md,
  },
  cancelButton: {
    flex: 1,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    fontWeight: "600",
  },
  orderButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.brand,
    padding: SPACING.md,
    borderRadius: 8,
    gap: SPACING.sm,
  },
  orderButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  orderButtonText: {
    color: COLORS.buttonText,
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
  },
});
