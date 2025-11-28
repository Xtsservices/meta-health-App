import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  FlatList,
  Dimensions,
  Keyboard,
  findNodeHandle,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { RouteProp, useRoute } from "@react-navigation/native";
import { RootState } from "../../../store/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthFetch, AuthPost } from "../../../auth/auth";
import {
  SPACING,
  FONT_SIZE,
  responsiveWidth,
  responsiveHeight,
} from "../../../utils/responsive";
import { COLORS } from "../../../utils/colour";

// Import SVG Icons
import {
  PlusIcon,
  EditIcon,
  CalendarIcon,
  ChevronDownIcon,
  XIcon,
} from "../../../utils/SvgIcons";
import DateTimePicker from "@react-native-community/datetimepicker";
import Footer from "../../dashboard/footer";
import { showSuccess, showError } from "../../../store/toast.slice";

interface AddInventoryItemRouteProps {
  AddInventoryItem: {
    editData?: any;
    editId?: number;
  };
}

interface MedicineData {
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

const initialMedicineData: MedicineData = {
  name: "",
  category: "",
  hsn: "",
  quantity: 0,
  costPrice: 0,
  sellingPrice: 0,
  lowStockValue: 0,
  email: "",
  expiryDate: "",
  gst: null,
  agencyName: "",
  agencyID: null,
  contactNo: "",
  agentCode: null,
  manufacturer: "",
};

const AddInventoryItemScreen: React.FC = ({ navigation }: any) => {
  const dispatch = useDispatch();
  const route = useRoute<RouteProp<AddInventoryItemRouteProps, "AddInventoryItem">>();
  const { editData, editId } = route.params || {};
  const user = useSelector((state: RootState) => state.currentUser);

  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [medicineInStockData, setMedicineInStockData] = useState<any[]>([]);
  const [manufactureData, setManufactureData] = useState<any[]>([]);
  const [medicineList, setMedicineList] = useState<MedicineData[]>([]);
  const [medicineData, setMedicineData] = useState<MedicineData>(editData || initialMedicineData);
  
  // New states for dropdown functionality
  const [searchQuery, setSearchQuery] = useState({
    medicine: "",
    category: "",
    agency: "",
    manufacturer: "",
    hsn: "",
  });
  const [suggestions, setSuggestions] = useState({
    medicine: [] as any[],
    category: [] as string[],
    agency: [] as any[],
    manufacturer: [] as any[],
    hsn: [] as any[],
  });
  const [selectedItems, setSelectedItems] = useState({
    medicine: null as any,
    agency: null as any,
    manufacturer: null as any,
    hsn: null as any,
  });
  const [showDropdown, setShowDropdown] = useState({
    medicine: false,
    category: false,
    agency: false,
    manufacturer: false,
    hsn: false,
  });

  // Refs for scroll handling
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRefs = useRef<{[key: string]: TextInput}>({});

  // Fetch initial data
  useEffect(() => {
    fetchInitialData();
    if (editData && !editId) {
      // no-op - preserving existing behavior
    }
  }, []);

  const fetchInitialData = async () => {
    if (!user?.hospitalID) return;
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        dispatch(showError("Not authorized. Please login again."));
        return;
      }

      const manufactureResponse = await AuthFetch(
        `medicineInventoryManufacture/${user.hospitalID}/getAllManufacture`,
        token
      );

      let manufactureDataArray: any[] = [];
      if (Array.isArray(manufactureResponse)) manufactureDataArray = manufactureResponse;
      else if (Array.isArray(manufactureResponse?.data)) manufactureDataArray = manufactureResponse.data;
      else if (Array.isArray(manufactureResponse?.data?.data)) manufactureDataArray = manufactureResponse.data.data;
      else if (manufactureResponse?.status === 200 && Array.isArray(manufactureResponse.data)) manufactureDataArray = manufactureResponse.data;
      else if (manufactureResponse?.data?.status === 200 && Array.isArray(manufactureResponse.data.data))
        manufactureDataArray = manufactureResponse.data.data;

      setManufactureData(manufactureDataArray ?? []);

      const medicineResponse = await AuthFetch(`pharmacy/${user.hospitalID}/getMedicineInventory`, token);

      let medicineDataArray: any[] = [];
      if (Array.isArray(medicineResponse)) medicineDataArray = medicineResponse;
      else if (Array.isArray(medicineResponse?.data)) medicineDataArray = medicineResponse.data;
      else if (Array.isArray(medicineResponse?.data?.medicines)) medicineDataArray = medicineResponse.data.medicines;
      else if (Array.isArray(medicineResponse?.medicines)) medicineDataArray = medicineResponse.medicines;
      else if (medicineResponse?.status === 200 && Array.isArray(medicineResponse.medicines)) medicineDataArray = medicineResponse.medicines;
      else if (medicineResponse?.data?.status === 200 && Array.isArray(medicineResponse.data.medicines)) medicineDataArray = medicineResponse.data.medicines;

      setMedicineInStockData(medicineDataArray ?? []);
    } catch (error) {
      dispatch(showError("Failed to fetch initial data"));
      setManufactureData([]);
      setMedicineInStockData([]);
    }
  };

  // Search and filter functions
  useEffect(() => {
    // Medicine search
    if (searchQuery.medicine.trim()) {
      const filteredMedicines = medicineInStockData?.filter(medicine =>
        medicine?.name?.toLowerCase()?.includes(searchQuery.medicine.toLowerCase())
      ) ?? [];
      setSuggestions(prev => ({ ...prev, medicine: filteredMedicines }));
      setShowDropdown(prev => ({ ...prev, medicine: filteredMedicines?.length > 0 }));
    } else {
      setSuggestions(prev => ({ ...prev, medicine: [] }));
      setShowDropdown(prev => ({ ...prev, medicine: false }));
    }

    // Category search
    if (searchQuery.category.trim()) {
      const filteredCategories = medicineTypes?.filter(category =>
        category.toLowerCase().includes(searchQuery.category.toLowerCase())
      ) ?? [];
      setSuggestions(prev => ({ ...prev, category: filteredCategories }));
      setShowDropdown(prev => ({ ...prev, category: filteredCategories?.length > 0 }));
    } else {
      setSuggestions(prev => ({ ...prev, category: [] }));
      setShowDropdown(prev => ({ ...prev, category: false }));
    }

    // Agency search
    if (searchQuery.agency.trim()) {
      const filteredAgencies = manufactureData?.filter(agency =>
        agency?.agencyName?.toLowerCase()?.includes(searchQuery.agency.toLowerCase())
      ) ?? [];
      setSuggestions(prev => ({ ...prev, agency: filteredAgencies }));
      setShowDropdown(prev => ({ ...prev, agency: filteredAgencies?.length > 0 }));
    } else {
      setSuggestions(prev => ({ ...prev, agency: [] }));
      setShowDropdown(prev => ({ ...prev, agency: false }));
    }

    // Manufacturer search
    if (searchQuery.manufacturer.trim()) {
      const filteredManufacturers = manufactureData?.filter(item =>
        item?.manufacturer?.toLowerCase()?.includes(searchQuery.manufacturer.toLowerCase())
      ) ?? [];
      setSuggestions(prev => ({ ...prev, manufacturer: filteredManufacturers }));
      setShowDropdown(prev => ({ ...prev, manufacturer: filteredManufacturers?.length > 0 }));
    } else {
      setSuggestions(prev => ({ ...prev, manufacturer: [] }));
      setShowDropdown(prev => ({ ...prev, manufacturer: false }));
    }

    // HSN search
    if (searchQuery.hsn.trim()) {
      const filteredHsn = medicineInStockData?.filter(item =>
        item?.hsn?.toLowerCase()?.includes(searchQuery.hsn.toLowerCase())
      ) ?? [];
      setSuggestions(prev => ({ ...prev, hsn: filteredHsn }));
      setShowDropdown(prev => ({ ...prev, hsn: filteredHsn?.length > 0 }));
    } else {
      setSuggestions(prev => ({ ...prev, hsn: [] }));
      setShowDropdown(prev => ({ ...prev, hsn: false }));
    }
  }, [searchQuery, medicineInStockData, manufactureData]);

  // Sync contact/email when agency/manufacturer change
  useEffect(() => {
    const data = Array.isArray(manufactureData) ? manufactureData : [];
    if (data?.length > 0 && medicineData.agencyName && medicineData.manufacturer) {
      const filterData = data?.find(
        (each) =>
          each?.agencyName === medicineData.agencyName &&
          each?.manufacturer === medicineData.manufacturer
      );
      if (filterData) {
        setMedicineData((prev) => ({
          ...prev,
          contactNo: filterData.contactNo || "",
          email: filterData.email || "",
          agentCode: filterData.agentCode || null,
          agencyID: filterData.id || null,
        }));
      }
    }
  }, [medicineData.agencyName, medicineData.manufacturer, manufactureData]);

  // Handler functions for dropdown selections
  const handleSelectMedicine = (medicine: any) => {
    setSelectedItems(prev => ({ ...prev, medicine }));
    setMedicineData(prev => ({
      ...prev,
      name: medicine?.name ?? "",
      category: medicine?.category ?? "",
      manufacturer: medicine?.manufacturer ?? "",
      hsn: medicine?.hsn ?? "",
    }));
    setSearchQuery(prev => ({ ...prev, medicine: medicine?.name ?? "" }));
    setShowDropdown(prev => ({ ...prev, medicine: false }));
  };

  const handleSelectCategory = (category: string) => {
    setMedicineData(prev => ({ ...prev, category }));
    setSearchQuery(prev => ({ ...prev, category }));
    setShowDropdown(prev => ({ ...prev, category: false }));
  };

  const handleSelectAgency = (agency: any) => {
    setSelectedItems(prev => ({ ...prev, agency }));
    setMedicineData(prev => ({
      ...prev,
      agencyName: agency?.agencyName ?? "",
      contactNo: agency?.contactNo ?? "",
      email: agency?.email ?? "",
      agentCode: agency?.agentCode ?? null,
      agencyID: agency?.id ?? null,
    }));
    setSearchQuery(prev => ({ ...prev, agency: agency?.agencyName ?? "" }));
    setShowDropdown(prev => ({ ...prev, agency: false }));
  };

  const handleSelectManufacturer = (manufacturer: any) => {
    setSelectedItems(prev => ({ ...prev, manufacturer }));
    setMedicineData(prev => ({
      ...prev,
      manufacturer: manufacturer?.manufacturer ?? "",
    }));
    setSearchQuery(prev => ({ ...prev, manufacturer: manufacturer?.manufacturer ?? "" }));
    setShowDropdown(prev => ({ ...prev, manufacturer: false }));
  };

  const handleSelectHsn = (item: any) => {
    setSelectedItems(prev => ({ ...prev, hsn: item }));
    setMedicineData(prev => ({
      ...prev,
      hsn: item?.hsn ?? "",
    }));
    setSearchQuery(prev => ({ ...prev, hsn: item?.hsn ?? "" }));
    setShowDropdown(prev => ({ ...prev, hsn: false }));
  };

  // Scroll to input field when focused
  const handleInputFocus = (fieldName: string, yOffset: number = 0) => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: yOffset,
        animated: true
      });
    }, 300);
  };

  const handleAddMedicine = () => {
    if (
      !medicineData.name ||
      !medicineData.category ||
      !medicineData.costPrice ||
      !medicineData.expiryDate ||
      !medicineData.hsn ||
      medicineData.gst === null ||
      !medicineData.quantity ||
      !medicineData.sellingPrice ||
      !medicineData.lowStockValue ||
      !medicineData.agencyName ||
      !medicineData.manufacturer
    ) {
      dispatch(showError("Please fill all required fields"));
      return;
    }

    if (editId) {
      handleEditMedicine();
    } else {
      setMedicineList((prev) => [...prev, { ...medicineData }]);
      setMedicineData(initialMedicineData);
      setSelectedItems({ medicine: null, agency: null, manufacturer: null, hsn: null });
      setSearchQuery({ medicine: "", category: "", agency: "", manufacturer: "", hsn: "" });
      dispatch(showSuccess("Medicine added to list"));
    }
  };

  const handleEditMedicine = async () => {
    if (!editId) return;
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        dispatch(showError("Not authorized. Please login again."));
        return;
      }

      const response = await AuthPost(
        `medicineInventoryLogs/${user?.hospitalID}/editMedicineInventoryData/${editId}`,
        { medicineList: medicineData },
        token
      );

      const isSuccess =
        response?.data?.status === 200 || response?.data?.status === 200 || response?.success === true;

      if (isSuccess) {
        dispatch(showSuccess("Medicine updated successfully"));
        navigation.goBack();
      } else {
        dispatch(showError("Failed to update medicine"));
      }
    } catch (error) {
      dispatch(showError("Something went wrong"));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (medicineList?.length === 0 && !editId) {
      dispatch(showError("No medicines added to the list"));
      return;
    }
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        dispatch(showError("Not authorized. Please login again."));
        return;
      }

      const response = await AuthPost(
        `medicineInventoryLogs/${user?.hospitalID}/addInventoryLogs`,
        { medicineList: medicineList, user },
        token
      );
      
      const isSuccess =
        response?.status === 200 || response?.data?.status === 200 || response?.success === true;

      if (isSuccess) {
        dispatch(showSuccess("Inventory added successfully"));
        navigation.goBack();
      } else {
        dispatch(showError("Failed to add inventory"));
      }
    } catch (error) {
      dispatch(showError("Something went wrong"));
    } finally {
      setLoading(false);
    }
  };

  const removeMedicine = (index: number) => {
    const newList = [...medicineList];
    newList.splice(index, 1);
    setMedicineList(newList);
  };

  // Render dropdown component
  const renderDropdown = (type: 'medicine' | 'category' | 'agency' | 'manufacturer' | 'hsn') => {
    const data = suggestions[type];
    if (!showDropdown[type] || data?.length === 0) return null;

    return (
      <View style={[
        styles.suggBox, 
        { 
          borderColor: COLORS.border, 
          backgroundColor: COLORS.card 
        }
      ]}>
        <FlatList
          data={data}
          keyExtractor={(item, index) => 
            type === 'medicine' ? (item?.id?.toString() || index.toString()) :
            type === 'category' ? (item + index) :
            type === 'agency' ? (item?.id?.toString() || item?.agencyName + index) :
            type === 'manufacturer' ? (item?.id?.toString() || item?.manufacturer + index) :
            (item?.id?.toString() || item?.hsn + index)
          }
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable 
              style={[
                styles.suggRow,
                ((type === 'medicine' && selectedItems.medicine?.id === item?.id) ||
                 (type === 'agency' && selectedItems.agency?.id === item?.id) ||
                 (type === 'manufacturer' && selectedItems.manufacturer?.id === item?.id) ||
                 (type === 'hsn' && selectedItems.hsn?.id === item?.id))
                  ? { backgroundColor: COLORS.brand + '20' }
                  : {}
              ]} 
              onPress={() => {
                if (type === 'medicine') {
                  handleSelectMedicine(item);
                } else if (type === 'category') {
                  handleSelectCategory(item);
                } else if (type === 'agency') {
                  handleSelectAgency(item);
                } else if (type === 'manufacturer') {
                  handleSelectManufacturer(item);
                } else if (type === 'hsn') {
                  handleSelectHsn(item);
                }
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.suggestionText, { color: COLORS.text }]}>
                  {type === 'medicine' ? item?.name :
                   type === 'category' ? item :
                   type === 'agency' ? item?.agencyName :
                   type === 'manufacturer' ? item?.manufacturer :
                   item?.hsn}
                </Text>
                {type === 'medicine' && (
                  <View style={styles.suggDetails}>
                    <Text style={{ color: COLORS.sub, fontSize: FONT_SIZE.xs }}>
                      Category: {item?.category}
                    </Text>
                    <Text style={{ color: COLORS.sub, fontSize: FONT_SIZE.xs }}>
                      HSN: {item?.hsn}
                    </Text>
                  </View>
                )}
                {type === 'agency' && (
                  <View style={styles.suggDetails}>
                    <Text style={{ color: COLORS.sub, fontSize: FONT_SIZE.xs }}>
                      Contact: {item?.contactNo}
                    </Text>
                    <Text style={{ color: COLORS.sub, fontSize: FONT_SIZE.xs }}>
                      Agent Code: {item?.agentCode}
                    </Text>
                  </View>
                )}
                {type === 'manufacturer' && (
                  <View style={styles.suggDetails}>
                    <Text style={{ color: COLORS.sub, fontSize: FONT_SIZE.xs }}>
                      Agency: {item?.agencyName}
                    </Text>
                    <Text style={{ color: COLORS.sub, fontSize: FONT_SIZE.xs }}>
                      Contact: {item?.contactNo}
                    </Text>
                  </View>
                )}
              </View>
              {type === 'medicine' && (
                <Text style={[styles.suggestionPrice, { color: COLORS.text }]}>
                  Stock: {item?.quantity}
                </Text>
              )}
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.suggRowCenter}>
              <Text style={{ color: COLORS.sub, fontSize: FONT_SIZE.xs }}>
                No {type} found
              </Text>
            </View>
          }
          nestedScrollEnabled
          style={{ maxHeight: responsiveHeight(25) }}
        />
      </View>
    );
  };

  // Updated renderField with dropdown support and scroll handling
  const renderField = (
    label: string,
    value: any,
    onChange: (value: any) => void,
    placeholder: string,
    type: "text" | "number" = "text",
    required: boolean = false,
    dropdownType?: 'medicine' | 'category' | 'agency' | 'manufacturer' | 'hsn',
    yOffset: number = 0
  ) => (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      <View style={{ position: "relative" }}>
        <TextInput
          ref={(ref) => {
            if (ref && dropdownType) {
              inputRefs.current[dropdownType] = ref;
            }
          }}
          style={styles.input}
          value={searchQuery[dropdownType || 'medicine'] || (value !== null && value !== undefined ? String(value) : "")}
          onChangeText={(text) => {
            if (dropdownType) {
              setSearchQuery(prev => ({ ...prev, [dropdownType]: text }));
            }
            onChange(text);
          }}
          placeholder={placeholder}
          placeholderTextColor={COLORS.sub}
          keyboardType={type === "number" ? "numeric" : "default"}
          onFocus={() => {
            if (dropdownType && searchQuery[dropdownType]) {
              setShowDropdown(prev => ({ ...prev, [dropdownType]: true }));
            }
            handleInputFocus(dropdownType || 'field', yOffset);
          }}
          onBlur={() => {
            setTimeout(() => {
              if (dropdownType) {
                setShowDropdown(prev => ({ ...prev, [dropdownType]: false }));
              }
            }, 200);
          }}
        />
        {dropdownType && renderDropdown(dropdownType)}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView 
          ref={scrollViewRef}
          style={styles.content} 
          showsVerticalScrollIndicator={false} 
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Medicine Details</Text>

            {renderField(
              "Medicine Name",
              medicineData.name,
              (value) => setMedicineData((p) => ({ ...p, name: value })),
              "Enter medicine name",
              "text",
              true,
              'medicine',
              0
            )}

            {renderField(
              "Category",
              medicineData.category,
              (value) => setMedicineData((p) => ({ ...p, category: value })),
              "Select category",
              "text",
              true,
              'category',
              100
            )}

            <View style={styles.row}>
              <View style={styles.col}>
                {renderField(
                  "Quantity",
                  medicineData.quantity,
                  (value) => setMedicineData((p) => ({ ...p, quantity: Number(value) || 0 })),
                  "Enter quantity",
                  "number",
                  true,
                  undefined,
                  200
                )}
              </View>
              <View style={styles.col}>
                {renderField(
                  "GST %",
                  medicineData.gst,
                  (value) => setMedicineData((p) => ({ ...p, gst: Number(value) || null })),
                  "Enter GST %",
                  "number",
                  true,
                  undefined,
                  200
                )}
              </View>
            </View>

            {renderField(
              "HSN Code",
              medicineData.hsn,
              (value) => setMedicineData((p) => ({ ...p, hsn: value })),
              "Enter HSN code",
              "text",
              true,
              'hsn',
              300
            )}

            <View style={styles.row}>
              <View style={styles.col}>
                {renderField(
                  "Cost Price",
                  medicineData.costPrice,
                  (value) => setMedicineData((p) => ({ ...p, costPrice: Number(value) || 0 })),
                  "Enter cost price",
                  "number",
                  true,
                  undefined,
                  400
                )}
              </View>
              <View style={styles.col}>
                {renderField(
                  "Selling Price",
                  medicineData.sellingPrice,
                  (value) => setMedicineData((p) => ({ ...p, sellingPrice: Number(value) || 0 })),
                  "Enter selling price",
                  "number",
                  true,
                  undefined,
                  400
                )}
              </View>
            </View>

            {renderField(
              "Low Stock Alert",
              medicineData.lowStockValue,
              (value) => setMedicineData((p) => ({ ...p, lowStockValue: Number(value) || 0 })),
              "Enter low stock threshold",
              "number",
              true,
              undefined,
              500
            )}

            {/* Expiry Date */}
            <View style={styles.field}>
              <Text style={styles.label}>Expiry Date <Text style={styles.required}>*</Text></Text>
              <TouchableOpacity 
                style={styles.dateInput} 
                onPress={() => {
                  setShowDatePicker(true);
                  handleInputFocus('expiryDate', 600);
                }}
              >
                <Text style={medicineData.expiryDate ? styles.dateText : styles.placeholderText}>
                  {medicineData.expiryDate || "Select expiry date"}
                </Text>
                <CalendarIcon size={18} color={COLORS.sub} />
              </TouchableOpacity>
            </View>
            {showDatePicker && (
              <DateTimePicker
                value={medicineData.expiryDate ? new Date(medicineData.expiryDate) : new Date()}
                mode="date"
                display="default"
                minimumDate={new Date()}
                onChange={(event, date) => {
                  setShowDatePicker(false);
                  if (date) {
                    setMedicineData((prev) => ({ ...prev, expiryDate: date.toISOString().split("T")[0] }));
                  }
                }}
              />
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Manufacturer Details</Text>

            {renderField(
              "Agency Name",
              medicineData.agencyName,
              (value) => setMedicineData((p) => ({ ...p, agencyName: value })),
              "Enter agency name",
              "text",
              true,
              'agency',
              700
            )}

            {renderField(
              "Manufacturer",
              medicineData.manufacturer,
              (value) => setMedicineData((p) => ({ ...p, manufacturer: value })),
              "Enter manufacturer",
              "text",
              true,
              'manufacturer',
              800
            )}

            <View style={styles.row}>
              <View style={styles.col}>
                {renderField(
                  "Agent Code",
                  medicineData.agentCode,
                  (value) => setMedicineData((p) => ({ ...p, agentCode: Number(value) || null })),
                  "Enter agent code",
                  "number",
                  false,
                  undefined,
                  900
                )}
              </View>
              <View style={styles.col}>
                {renderField(
                  "Contact No",
                  medicineData.contactNo,
                  (value) => setMedicineData((p) => ({ ...p, contactNo: value })),
                  "Enter contact number",
                  "text",
                  false,
                  undefined,
                  900
                )}
              </View>
            </View>

            {renderField(
              "Email",
              medicineData.email,
              (value) => setMedicineData((p) => ({ ...p, email: value })),
              "Enter email address",
              "text",
              false,
              undefined,
              1000
            )}
          </View>

          {/* Add Medicine Button */}
          {!editId && (
            <TouchableOpacity style={styles.primaryButton} onPress={handleAddMedicine} disabled={loading}>
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.buttonText} />
              ) : (
                <>
                  <PlusIcon size={18} color={COLORS.buttonText} />
                  <Text style={styles.primaryButtonText}>Add Medicine to List</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Medicine List */}
          {medicineList?.length > 0 && (
            <View style={[styles.card, { paddingBottom: SPACING.md }]}>
              <Text style={styles.cardTitle}>Added Medicines ({medicineList?.length})</Text>
              {medicineList?.map((medicine, index) => (
                <View key={index} style={styles.medicineItem}>
                  <View style={styles.medicineInfo}>
                    <Text style={styles.medicineName}>{medicine.name}</Text>
                    <Text style={styles.medicineDetails}>
                      {medicine.category} • {medicine.quantity} units • ₹{medicine.costPrice}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.removeButton} onPress={() => removeMedicine(index)}>
                    <XIcon size={16} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Submit Button */}
          {(medicineList?.length > 0 || editId) && (
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={editId ? handleEditMedicine : handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.buttonText} />
              ) : (
                <>
                  {editId ? <EditIcon size={18} color={COLORS.buttonText} /> : <PlusIcon size={18} color={COLORS.buttonText} />}
                  <Text style={styles.submitButtonText}>{editId ? "Update Medicine" : "Save Inventory"}</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <View style={{ height: 120 }} /> {/* Extra spacing for keyboard */}
        </ScrollView>

        {/* Footer - pass active and brandColor */}
        <View style={styles.footerWrap}>
          <Footer active={"billing"} brandColor={COLORS.brand} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: COLORS.bg 
  },
  container: { 
    flex: 1 
  },
  content: { 
    flex: 1, 
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl, // Extra padding for scroll
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },

  row: { 
    flexDirection: "row", 
    marginBottom: SPACING.sm 
  },
  col: { 
    flex: 1, 
    marginRight: SPACING.sm 
  },
  field: { 
    marginBottom: SPACING.sm 
  },
  label: { 
    fontSize: FONT_SIZE.sm, 
    fontWeight: "600", 
    color: COLORS.sub, 
    marginBottom: SPACING.xs 
  },
  required: { 
    color: COLORS.danger 
  },
  input: {
    backgroundColor: COLORS.field,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
  },
  
  // Dropdown styles
  suggBox: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "100%",
    marginTop: SPACING.xs,
    borderWidth: 1,
    borderRadius: SPACING.sm,
    maxHeight: responsiveHeight(25),
    overflow: "hidden",
    zIndex: 10,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  suggRow: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
  },
  suggDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
  suggRowCenter: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
  },
  suggestionPrice: {
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
  },

  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.field,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  dateText: { 
    fontSize: FONT_SIZE.sm, 
    color: COLORS.text 
  },
  placeholderText: { 
    fontSize: FONT_SIZE.sm, 
    color: COLORS.sub 
  },

  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.brand,
    paddingVertical: SPACING.md,
    borderRadius: 10,
    marginVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  primaryButtonText: { 
    color: COLORS.buttonText, 
    fontSize: FONT_SIZE.md, 
    fontWeight: "700", 
    marginLeft: 8 
  },

  medicineItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.field,
    padding: SPACING.sm,
    borderRadius: 8,
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  medicineInfo: { 
    flex: 1, 
    paddingRight: SPACING.sm 
  },
  medicineName: { 
    fontSize: FONT_SIZE.md, 
    fontWeight: "700", 
    color: COLORS.text 
  },
  medicineDetails: { 
    fontSize: FONT_SIZE.sm, 
    color: COLORS.sub 
  },
  removeButton: { 
    padding: SPACING.xs 
  },

  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.brand,
    paddingVertical: SPACING.md,
    borderRadius: 10,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  submitButtonDisabled: { 
    backgroundColor: COLORS.sub 
  },
  submitButtonText: { 
    color: COLORS.buttonText, 
    fontSize: FONT_SIZE.md, 
    fontWeight: "700", 
    marginLeft: 8 
  },

  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
});

export default AddInventoryItemScreen;