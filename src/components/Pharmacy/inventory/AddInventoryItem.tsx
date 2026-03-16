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
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import { RootState } from "../../../store/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthFetch, AuthPost } from "../../../auth/auth";
import {
  SPACING,
  FONT_SIZE,
  FOOTER_HEIGHT,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

type AddInventoryItemRouteProps = {
  AddInventoryItem: {
    editData?: any;
    editId?: number;
  };
};


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
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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

  const resetForm = () => {
    setMedicineData(initialMedicineData);
    setSelectedItems({ medicine: null, agency: null, manufacturer: null, hsn: null });
    setSearchQuery({ medicine: "", category: "", agency: "", manufacturer: "", hsn: "" });
  };

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
      )as any;

      let manufactureDataArray: any[] = [];
      if (Array.isArray(manufactureResponse)) manufactureDataArray = manufactureResponse;
      else if (Array.isArray(manufactureResponse?.data)) manufactureDataArray = manufactureResponse.data;
      else if (Array.isArray(manufactureResponse?.data?.data)) manufactureDataArray = manufactureResponse.data.data;
      else if (manufactureResponse?.status === 200 && Array.isArray(manufactureResponse.data)) manufactureDataArray = manufactureResponse.data;
      else if (manufactureResponse?.data?.status === 200 && Array.isArray(manufactureResponse.data.data))
        manufactureDataArray = manufactureResponse.data.data;

      setManufactureData(manufactureDataArray ?? []);

      const medicineResponse = await AuthFetch(`pharmacy/${user.hospitalID}/getMedicineInventory`, token) as any;

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
  if (showDropdown.category) {
    // When dropdown is open, show filtered results based on search
    if (searchQuery.category.trim()) {
      const filteredCategories = medicineTypes.filter(category =>
        category.toLowerCase().includes(searchQuery.category.toLowerCase())
      );
      setSuggestions(prev => ({ ...prev, category: filteredCategories }));
    } else {
      // When no search query, show all categories
      setSuggestions(prev => ({ ...prev, category: medicineTypes }));
    }
    } else {
      setSuggestions(prev => ({ ...prev, category: [] }));
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
  }, [searchQuery, medicineInStockData, manufactureData, showDropdown.category]);

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

  const handleSelectMedicine = (medicine: any) => {
    setSelectedItems(prev => ({ ...prev, medicine }));
    setMedicineData(prev => ({
      ...prev,
      name: medicine?.name ?? "",
      category: medicine?.category ?? "",
      manufacturer: medicine?.manufacturer ?? "",
      hsn: medicine?.hsn ?? "",
    }));
    setSearchQuery(prev => ({ 
      ...prev, 
      medicine: "",
      category: medicine?.category ? "" : prev.category,
      manufacturer: medicine?.manufacturer ? "" : prev.manufacturer,
      hsn: medicine?.hsn ? "" : prev.hsn
    }));
    setShowDropdown(prev => ({ ...prev, medicine: false }));
  };

  const handleSelectCategory = (category: string) => {
    setMedicineData(prev => ({ ...prev, category }));
    setSearchQuery(prev => ({ ...prev, category: "" }));
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
    setSearchQuery(prev => ({ ...prev, agency: "" }));
    setShowDropdown(prev => ({ ...prev, agency: false }));
  };

  const handleSelectManufacturer = (manufacturer: any) => {
    setSelectedItems(prev => ({ ...prev, manufacturer }));
    setMedicineData(prev => ({
      ...prev,
      manufacturer: manufacturer?.manufacturer ?? "",
    }));
    setSearchQuery(prev => ({ ...prev, manufacturer: "" }));
    setShowDropdown(prev => ({ ...prev, manufacturer: false }));
  };

  const handleSelectHsn = (item: any) => {
    setSelectedItems(prev => ({ ...prev, hsn: item }));
    setMedicineData(prev => ({
      ...prev,
      hsn: item?.hsn ?? "",
    }));
    setSearchQuery(prev => ({ ...prev, hsn: "" }));
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
      medicineData.gst === null ||
      !medicineData.quantity ||
      !medicineData.sellingPrice ||
      !medicineData.lowStockValue ||
      !medicineData.agencyName ||
      !medicineData.manufacturer ||
      !medicineData.agentCode ||
      !medicineData.contactNo
    ) {
      dispatch(showError("Please fill all required fields"));
      return;
    }

    if (editId) {
      handleEditMedicine();
    } else {
      const newMedicine: MedicineData = {
        name: medicineData.name,
        category: medicineData.category,
        hsn: medicineData.hsn,
        quantity: medicineData.quantity,
        costPrice: medicineData.costPrice,
        sellingPrice: medicineData.sellingPrice,
        lowStockValue: medicineData.lowStockValue,
        email: medicineData.email,
        expiryDate: medicineData.expiryDate,
        gst: medicineData.gst,
        agencyName: medicineData.agencyName,
        agencyID: medicineData.agencyID,
        contactNo: medicineData.contactNo,
        agentCode: medicineData.agentCode,
        manufacturer: medicineData.manufacturer,
      };
      
      setMedicineList((prev) => [...prev, newMedicine]);
      resetForm();
      dispatch(showSuccess("Medicine added to list"));
      
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
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
      ) as any;

      const isSuccess =
        response?.data?.status === 200 || response?.success === true;

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
    setSaving(true);
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
      ) as any;
      
      const isSuccess =
        response?.status === 200 || response?.data?.status === 200 || response?.success === true;

      if (isSuccess) {
        dispatch(showSuccess("Inventory added successfully"));
        navigation.navigate('AddInventory' as never);
      } else {
        dispatch(showError("Failed to add inventory"));
      }
    } catch (error) {
      dispatch(showError("Something went wrong"));
    } finally {
      setSaving(false);
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
                    <Text style={{ color: COLORS.sub, fontSize: 11 }}>
                      Category: {item?.category}
                    </Text>
                    <Text style={{ color: COLORS.sub, fontSize: 11 }}>
                      HSN: {item?.hsn}
                    </Text>
                  </View>
                )}
                {type === 'agency' && (
                  <View style={styles.suggDetails}>
                    <Text style={{ color: COLORS.sub, fontSize: 11 }}>
                      Contact: {item?.contactNo}
                    </Text>
                    <Text style={{ color: COLORS.sub, fontSize: 11 }}>
                      Agent Code: {item?.agentCode}
                    </Text>
                  </View>
                )}
                {type === 'manufacturer' && (
                  <View style={styles.suggDetails}>
                    <Text style={{ color: COLORS.sub, fontSize: 11 }}>
                      Agency: {item?.agencyName}
                    </Text>
                    <Text style={{ color: COLORS.sub, fontSize: 11 }}>
                      Contact: {item?.contactNo}
                    </Text>
                  </View>
                )}
              </View>
              {type === 'medicine' && (
                <Text style={[styles.suggestionPrice, { color: COLORS.text }]}>
                  Stock: {item?.totalQuantity}
                </Text>
              )}
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.suggRowCenter}>
              <Text style={{ color: COLORS.sub, fontSize: 12 }}>
                No {type} found
              </Text>
            </View>
          }
          nestedScrollEnabled
          style={{ maxHeight: 200 }}
        />
      </View>
    );
  };

  const renderField = (
    label: string,
    value: any,
    onChange: (value: any) => void,
    placeholder: string,
    type: "text" | "number" = "text",
    required: boolean = false,
    dropdownType?: 'medicine' | 'category' | 'agency' | 'manufacturer' | 'hsn',
    yOffset: number = 0,
    editable: boolean = true // Add this parameter
  ) => {
    const displayValue = dropdownType 
      ? medicineData[dropdownType === 'medicine' ? 'name' : 
                    dropdownType === 'category' ? 'category' : 
                    dropdownType === 'agency' ? 'agencyName' : 
                    dropdownType === 'manufacturer' ? 'manufacturer' : 
                    'hsn']
      : (value !== null && value !== undefined ? String(value) : "");

  if (dropdownType === 'category') {
    // Special handling for category - make it non-editable
    return (
      <View style={styles.field}>
        <Text style={styles.label}>
          {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
        <Pressable
          style={styles.input}
          onPress={() => {
            // Clear previous search and show all categories
            setSearchQuery(prev => ({ ...prev, category: "" }));
            setShowDropdown(prev => ({ 
              ...prev, 
              category: true,
              medicine: false,
              agency: false,
              manufacturer: false,
              hsn: false
            }));
            handleInputFocus('category', yOffset);
            
            // Show all categories when dropdown opens
            setSuggestions(prev => ({ ...prev, category: medicineTypes }));
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flex: 1 }}>
            <Text style={medicineData.category ? styles.dateText : styles.placeholderText}>
              {medicineData.category || placeholder}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {medicineData.category && (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    setMedicineData(prev => ({ ...prev, category: "" }));
                  }}
                  hitSlop={10}
                >
                  <XIcon size={16} color={COLORS.sub} />
                </Pressable>
              )}
              <ChevronDownIcon size={18} color={COLORS.sub} />
            </View>
          </View>
        </Pressable>
        {renderDropdown('category')}
      </View>
    );
  }

    return (
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
            value={displayValue}
            onChangeText={(text) => {
              if (dropdownType) {
                setSearchQuery(prev => ({ ...prev, [dropdownType]: text }));
                const fieldToUpdate = dropdownType === 'medicine' ? 'name' : 
                                     dropdownType === 'category' ? 'category' : 
                                     dropdownType === 'agency' ? 'agencyName' : 
                                     dropdownType === 'manufacturer' ? 'manufacturer' : 
                                     'hsn';
                onChange(text);
              } else {
                onChange(text);
              }
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
          editable={editable}
          />
          {dropdownType && renderDropdown(dropdownType)}
        </View>
      </View>
    );
  };

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
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>
                {editId ? "Edit Medicine" : "Add New Medicine"}
              </Text>
              <Text style={styles.headerSubtitle}>
                Fill in the medicine details below
              </Text>
            </View>
            {!editId && medicineList.length > 0 && (
              <Pressable 
                style={styles.clearBtn}
                onPress={() => setMedicineList([])}
              >
                <Text style={styles.clearText}>Clear All</Text>
              </Pressable>
            )}
          </View>

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
              100,
              false
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
              <Pressable 
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
              </Pressable>
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
                  true,
                  undefined,
                  900
                )}
              </View>
              <View style={styles.col}>
                {renderField(
                  "Contact No",
                  medicineData.contactNo,
                  (value) => setMedicineData((p) => ({ ...p, contactNo: value })),
                  "Enter contact",
                  "text",
                  true,
                  undefined,
                  900
                )}
              </View>
            </View>
          </View>

          {/* Add Medicine Button */}
          {!editId && (
            <Pressable style={styles.addButton} onPress={handleAddMedicine} disabled={loading}>
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.buttonText} />
              ) : (
                <>
                  <PlusIcon size={18} color={COLORS.buttonText} />
                  <Text style={styles.addButtonText}>Add Medicine to List</Text>
                </>
              )}
            </Pressable>
          )}

          {/* Added Medicines List */}
          {medicineList?.length > 0 && (
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Text style={styles.cardTitle}>
                  Added Medicines ({medicineList.length})
                </Text>
              </View>

              {medicineList.map((medicine, index) => (
                <View key={index} style={styles.medicineCard}>
                  {/* Header */}
                  <View style={styles.medicineCardHeader}>
                    <Text style={styles.medicineName} numberOfLines={1}>
                      {medicine.name}
                    </Text>
                    <Pressable
                      onPress={() => removeMedicine(index)}
                      style={styles.removeIcon}
                      hitSlop={10}
                    >
                      <XIcon size={20} color={COLORS.danger} />
                    </Pressable>
                  </View>

                  {/* Details */}
                  <View style={styles.medicineDetails}>
                    <View style={styles.medicineRow}>
                      <Text style={styles.medicineLabel}>Category:</Text>
                      <Text style={styles.medicineValue}>{medicine.category}</Text>
                    </View>
                    <View style={styles.medicineRow}>
                      <Text style={styles.medicineLabel}>Expiry:</Text>
                      <Text style={styles.medicineValue}>{medicine.expiryDate}</Text>
                    </View>
                    <View style={styles.medicineRow}>
                      <Text style={styles.medicineLabel}>Quantity:</Text>
                      <Text style={[styles.medicineValue, styles.quantityValue]}>
                        {medicine.quantity}
                      </Text>
                    </View>
                    <View style={styles.medicineRow}>
                      <Text style={styles.medicineLabel}>Cost:</Text>
                      <Text style={[styles.medicineValue, styles.costValue]}>
                        ₹{medicine.costPrice}
                      </Text>
                    </View>
                    <View style={styles.medicineRow}>
                      <Text style={styles.medicineLabel}>Selling:</Text>
                      <Text style={[styles.medicineValue, styles.sellingValue]}>
                        ₹{medicine.sellingPrice}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Submit Button */}
          {(medicineList?.length > 0 || editId) && (
            <View style={styles.buttonRow}>
              <Pressable
                style={[styles.cancelButton, (loading || saving) && styles.disabledButton]}
                onPress={() => navigation.goBack()}
                disabled={loading || saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.submitButton, (loading || saving) && styles.disabledButton]}
                onPress={editId ? handleEditMedicine : handleSubmit}
                disabled={loading || saving}
              >
                {(loading || saving) ? (
                  <ActivityIndicator size="small" color={COLORS.buttonText} />
                ) : (
                  <>
                    {editId ? (
                      <EditIcon size={18} color={COLORS.buttonText} />
                    ) : (
                      <PlusIcon size={18} color={COLORS.buttonText} />
                    )}
                    <Text style={styles.submitButtonText}>
                      {editId ? "Update Medicine" : "Save Inventory"}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          )}

          <View style={{ height: 120 }} /> {/* Extra spacing for keyboard */}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
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
    padding: 16,
    paddingBottom: 100,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.sub,
  },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: COLORS.danger,
    borderRadius: 8,
  },
  clearText: {
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: "700",
  },

  // Card
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  // Form
  row: { 
    flexDirection: "row", 
    gap: 12,
    marginBottom: 12,
  },
  col: { 
    flex: 1,
  },
  field: { 
    marginBottom: 12,
  },
  label: { 
    fontSize: 12, 
    fontWeight: "800", 
    color: COLORS.sub, 
    marginBottom: 6,
  },
  required: { 
    color: '#000000',
    fontWeight: "700",
  },
  input: {
    backgroundColor: COLORS.field,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
  },

  // Dropdown
  suggBox: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 58,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    maxHeight: 220,
    overflow: "hidden",
    zIndex: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 5,
  },
  suggRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    gap: 2,
  },
  suggDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
  suggRowCenter: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "600",
  },
  suggestionPrice: {
    fontSize: 14,
    fontWeight: "700",
  },

  // Date Picker
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.field,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateText: { 
    fontSize: 15, 
    color: COLORS.text,
    fontWeight: "500",
  },
  placeholderText: { 
    fontSize: 15, 
    color: COLORS.sub,
    fontWeight: "500",
  },

  // Add Button
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.brand,
    paddingVertical: 14,
    borderRadius: 12,
    marginVertical: 8,
    gap: 8,
    borderWidth: 1.5,
    borderColor: COLORS.brand,
  },
  addButtonText: { 
    color: COLORS.buttonText, 
    fontSize: 14, 
    fontWeight: "700",
  },

  // Medicine Card
  medicineCard: {
    backgroundColor: COLORS.field,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  medicineCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  medicineName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    flex: 1,
  },
  removeIcon: {
    padding: 4,
  },
  medicineDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  medicineRow: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: "45%",
  },
  medicineLabel: {
    fontSize: 12,
    color: COLORS.sub,
    fontWeight: "600",
    marginRight: 4,
  },
  medicineValue: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: "700",
  },
  quantityValue: {
    color: COLORS.brand,
    backgroundColor: COLORS.brandLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  costValue: {
    color: COLORS.success,
  },
  sellingValue: {
    color: COLORS.brand,
  },

  // Action Buttons
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.pill,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
  },
  submitButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.brand,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1.5,
    borderColor: COLORS.brand,
  },
  submitButtonText: {
    color: COLORS.buttonText,
    fontSize: 14,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.6,
  },

  // Footer
  footerWrap: {
    left: 0,
    right: 0,
    height: FOOTER_HEIGHT,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
});

export default AddInventoryItemScreen;