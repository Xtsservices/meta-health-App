import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Platform,
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import {
  SPACING,
  FONT_SIZE,
  FOOTER_HEIGHT,
} from "../../../utils/responsive";

// Icons
import {
  XIcon,
  PlusIcon,
  ShoppingCartIcon,
  DeleteIcon,
  ArrowLeftIcon,
} from "../../../utils/SvgIcons";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthFetch, AuthPost } from "../../../auth/auth";
import { RootState } from "../../../store/store";
import { COLORS } from "../../../utils/colour";
import { showError, showSuccess } from "../../../store/toast.slice";
import Footer from "../../dashboard/footer";
import { useSafeAreaInsets } from "react-native-safe-area-context";
const FOOTER_H = FOOTER_HEIGHT;

// Mobile number validation function
const validateMobileNumber = (number: string): boolean => {
  if (!number) return false;
  // Check if starts with 6,7,8,9 and has exactly 10 digits
  const mobileRegex = /^[6-9]\d{9}$/;
  return mobileRegex.test(number);
};

// Get validation error message
const getMobileValidationMessage = (number: string): string => {
  if (!number) return "Contact number is required";
  if (!/^[6-9]/.test(number)) {
    return "Mobile number must start with 6, 7, 8, or 9";
  }
  if (number.length !== 10) {
    return "Mobile number must be 10 digits";
  }
  if (!/^\d+$/.test(number)) {
    return "Mobile number must contain only digits";
  }
  return "";
};

/* ===================== TYPES ===================== */

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

/* ===================== COMPONENT ===================== */

const AddOrderScreen: React.FC = () => {
  const navigation = useNavigation();
  const user = useSelector((state: RootState) => state.currentUser);
  const dispatch = useDispatch();

  const [medicineList, setMedicineList] = useState<SelectedMedicineData[]>([]);
  const [medicineInStockData, setMedicineInStockData] = useState<StockData[]>([]);
  const [manufactureData, setManufactureData] = useState<ManufacturerData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Mobile number validation state
  const [contactError, setContactError] = useState<string>("");
  const [contactTouched, setContactTouched] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const addedMedicinesRef = useRef<View>(null);
  
  // Refs for dropdown positioning
  const medicineInputRef = useRef<TextInput>(null);
  const categoryInputRef = useRef<TextInput>(null);
  const agencyInputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();

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

  const [selectedMedicineData, setSelectedMedicineData] =
    useState<SelectedMedicineData>(initialSelectedMedicineData);

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

  /* ===================== FETCH MANUFACTURERS ===================== */

  useEffect(() => {
    if (!user?.hospitalID) return;

    const getManufactureData = async () => {
      try {
        setIsLoading(true);
        const token = await AsyncStorage.getItem("token");
        const response = await AuthFetch(
          `medicineInventoryManufacture/${user.hospitalID}/getAllManufacture`,
          token
        ) as any;

        if (response?.data?.status === 200) {
          setManufactureData(response.data.data || []);
        }
      } catch {
        dispatch(showError("Failed to fetch manufacturer data"));
      } finally {
        setIsLoading(false);
      }
    };

    getManufactureData();
  }, [user, dispatch]);

  /* ===================== FETCH INVENTORY ===================== */

  useEffect(() => {
    if (!user?.hospitalID) return;

    const getMedicineInventory = async () => {
      try {
        setIsLoading(true);
        const token = await AsyncStorage.getItem("token");
        const response = await AuthFetch(
          `pharmacy/${user.hospitalID}/getMedicineInventory`,
          token
        ) as any;

        if (response?.data?.status === 200) {
          setMedicineInStockData(response.data.medicines || []);
        }
      } catch {
        dispatch(showError("Failed to fetch inventory data"));
      } finally {
        setIsLoading(false);
      }
    };

    getMedicineInventory();
  }, [user, dispatch]);

  /* ===================== AUTO FILL AGENCY ===================== */

  useEffect(() => {
    const selectedAgency = manufactureData.find(
      (a) => a.agencyName === selectedMedicineData.agencyName
    );

    if (selectedAgency) {
      // Validate contact number when auto-filled
      const contactNo = selectedAgency.contactNo || "";
      const error = getMobileValidationMessage(contactNo);
      
      setSelectedMedicineData((prev) => ({
        ...prev,
        contactNo: contactNo,
        email: selectedAgency.email || "",
        agentCode: selectedAgency.agentCode,
        manufacturer: selectedAgency.manufacturer,
      }));
      
      setContactError(error);
    }
  }, [selectedMedicineData.agencyName, manufactureData]);

  /* ===================== SUGGESTIONS ===================== */

  const filteredMedicineSuggestions = useMemo(() => {
    const q = selectedMedicineData.name.toLowerCase();
    if (!q) return [];
    return medicineInStockData
      .filter((m) => m.name?.toLowerCase().includes(q))
      .slice(0, 5);
  }, [selectedMedicineData.name, medicineInStockData]);

  const filteredCategorySuggestions = useMemo(() => {
    const q = selectedMedicineData.category.toLowerCase();
    if (!q) return medicineTypes.slice(0, 6);
    return medicineTypes.filter((c) => c.toLowerCase().includes(q));
  }, [selectedMedicineData.category]);

  const filteredAgencySuggestions = useMemo(() => {
    const q = selectedMedicineData.agencyName.toLowerCase();
    if (!q) return manufactureData.slice(0, 6);
    return manufactureData
      .filter((a) => a.agencyName?.toLowerCase().includes(q))
      .slice(0, 6);
  }, [selectedMedicineData.agencyName, manufactureData]);

  /* ===================== ADD MEDICINE ===================== */

  const scrollToAddedMedicines = () => {
    setTimeout(() => {
      if (scrollViewRef.current && addedMedicinesRef.current) {
        addedMedicinesRef.current.measureInWindow((x, y, width, height) => {
          scrollViewRef.current?.scrollTo({
            y: y - 100,
            animated: true
          });
        });
      }
    }, 200);
  };

  const validateContactNumber = (contactNo: string): boolean => {
    if (!contactNo) {
      setContactError("Contact number is required");
      return false;
    }
    
    if (!/^[6-9]/.test(contactNo)) {
      setContactError("Mobile number must start with 6, 7, 8, or 9");
      return false;
    }
    
    if (contactNo.length !== 10) {
      setContactError("Mobile number must be 10 digits");
      return false;
    }
    
    if (!/^\d+$/.test(contactNo)) {
      setContactError("Mobile number must contain only digits");
      return false;
    }
    
    setContactError("");
    return true;
  };

  const addMedicineToList = () => {
    const errors: string[] = [];

    if (!selectedMedicineData.name) errors.push("Medicine Name");
    if (!selectedMedicineData.category) errors.push("Category");
    if (!selectedMedicineData.quantity || selectedMedicineData.quantity <= 0) errors.push("Quantity");
    if (!selectedMedicineData.agencyName) errors.push("Agency");
    
    // Validate contact number
    const isContactValid = validateContactNumber(selectedMedicineData.contactNo);
    if (!isContactValid) {
      errors.push("Valid Contact Number (10 digits starting with 6-9)");
    }
    
    if (!selectedMedicineData.email) errors.push("Email");
    if (!selectedMedicineData.manufacturer) errors.push("Manufacturer");

    if (errors.length) {
      dispatch(showError(`Please fill required fields: ${errors.join(", ")}`));
      return;
    }

    setMedicineList((prev) => [
      ...prev,
      { ...selectedMedicineData, id: Date.now() },
    ]);

    setSelectedMedicineData(initialSelectedMedicineData);
    setContactError("");
    setContactTouched(false);
    setShowMedicineSuggestions(false);
    setShowAgencySuggestions(false);
    setShowCategorySuggestions(false);
    
    setTimeout(scrollToAddedMedicines, 100);
    
    dispatch(showSuccess(`${selectedMedicineData.name} added to order`));
  };

  const removeMedicineFromList = (index: number) => {
    setMedicineList((prev) => prev.filter((_, i) => i !== index));
    dispatch(showSuccess("Medicine removed from order"));
  };

  /* ===================== SUBMIT ===================== */

  const submitHandler = async () => {
    if (!medicineList.length) {
      dispatch(showError("No medicines added to the order"));
      return;
    }

    // Validate all medicines in the list
    for (const medicine of medicineList) {
      if (!validateMobileNumber(medicine.contactNo)) {
        const errorMsg = getMobileValidationMessage(medicine.contactNo);
        dispatch(showError(`Invalid contact number for ${medicine.name}: ${errorMsg || "Must be 10 digits starting with 6-9"}`));
        return;
      }
    }

    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem("token");

      const response = await AuthPost(
        `medicineInventoryExpense/${user?.hospitalID}/AddInventoryExpense`,
        { medicineList },
        token
      ) as any;

      if (response?.status === "success" || response?.status === 201) {
        dispatch(showSuccess(response?.data?.message));
        setMedicineList([]);
        setSelectedMedicineData(initialSelectedMedicineData);
        navigation.goBack();
      } else {
        dispatch(showError(`Failed to place order. Status: ${response?.status}`));
      }
    } catch {
      dispatch(showError("Error placing order. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    if (medicineList.length > 0) {
      dispatch(showError("You have unsaved changes. Please submit or clear the order before going back."));
    } else {
      navigation.goBack();
    }
  };

  // Handle outside clicks for dropdowns
  const handleOutsideClick = () => {
    setShowMedicineSuggestions(false);
    setShowCategorySuggestions(false);
    setShowAgencySuggestions(false);
  };

  /* ===================== RENDER ===================== */

  const renderMedicineItem = ({
    item,
    index,
  }: {
    item: SelectedMedicineData;
    index: number;
  }) => {
    const isContactValid = validateMobileNumber(item.contactNo);
    
    return (
    <View style={styles.medicineItem}>
      <View style={styles.medicineContent}>
        <View style={styles.medicineHeader}>
          <Text style={styles.medicineName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.medicineQty}>{item.quantity} Qty</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Category</Text>
          <Text style={styles.detailValue}>: {item.category}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Agency</Text>
          <Text style={styles.detailValue}>: {item.agencyName}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Manufacturer</Text>
          <Text style={styles.detailValue}>: {item.manufacturer}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Agent Code</Text>
          <Text style={styles.detailValue}>: {item.agentCode || "N/A"}</Text>
        </View>
        <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Contact</Text>
            <Text style={[
              styles.detailValue,
              !isContactValid && { color: COLORS.danger }
            ]}>
              : {item.contactNo || "N/A"}
            </Text>
        </View>
      </View>
      <TouchableOpacity 
        style={styles.deleteBtn}
        onPress={() => removeMedicineFromList(index)}
      >
        <DeleteIcon size={18} color={COLORS.danger} />
      </TouchableOpacity>
    </View>
  );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.card} />

        <ScrollView 
          ref={scrollViewRef}
          style={styles.body}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Medicine Details */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Add New Medicine</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Medicine Name *</Text>
              <View style={{ position: "relative" }}>
                <TextInput
                  ref={medicineInputRef}
                  style={styles.input}
                  placeholder="Enter medicine name"
                  placeholderTextColor={COLORS.sub}
                  value={selectedMedicineData.name}
                  onChangeText={(t) => {
                    setSelectedMedicineData((p) => ({ ...p, name: t }));
                    setShowMedicineSuggestions(true);
                  }}
                  onFocus={() => setShowMedicineSuggestions(true)}
                />
                
                {showMedicineSuggestions && filteredMedicineSuggestions.length > 0 && (
                  <View style={styles.suggestionBox}>
                    {isLoading ? (
                      <View style={styles.suggRowCenter}>
                        <ActivityIndicator size="small" color={COLORS.brand} />
                      </View>
                    ) : (
                      <FlatList
                        data={filteredMedicineSuggestions}
                        keyExtractor={(item) => String(item.id)}
                        keyboardShouldPersistTaps="handled"
                        renderItem={({ item }) => (
                          <Pressable
                            style={styles.suggestionItem}
                            onPress={() => {
                              setSelectedMedicineData((p) => ({
                                ...p,
                                name: item.name,
                                category: item.category,
                                manufacturer: item.manufacturer,
                              }));
                              setShowMedicineSuggestions(false);
                            }}
                          >
                            <Text style={styles.suggestionText}>{item.name}</Text>
                            <Text style={styles.suggestionSubText}>{item.category} • {item.manufacturer}</Text>
                          </Pressable>
                        )}
                        ListEmptyComponent={
                          <View style={styles.suggRowCenter}>
                            <Text style={{ color: COLORS.sub, fontSize: 12 }}>No matches</Text>
                          </View>
                        }
                      />
                    )}
                  </View>
                )}
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Category *</Text>
  <Pressable
    style={styles.dropdownSelector}
    onPress={() => setShowCategorySuggestions(!showCategorySuggestions)}
  >
    <Text style={[
      styles.dropdownText,
      !selectedMedicineData.category && styles.placeholderText
    ]}>
      {selectedMedicineData.category || "Select category"}
    </Text>
    <ArrowLeftIcon 
      size={16} 
      color={COLORS.sub}
      style={{
        transform: [{ rotate: showCategorySuggestions ? '-90deg' : '90deg' }]
      }}
    />
  </Pressable>
  
  {showCategorySuggestions && (
    <View style={styles.dropdownList}>
      <FlatList
        data={medicineTypes}
        keyExtractor={(item) => item}
        keyboardShouldPersistTaps="always"
        nestedScrollEnabled={true}  
        scrollEnabled={true}
        showsVerticalScrollIndicator={true}
        style={{ maxHeight: 200 }}
        renderItem={({ item }) => (
                        <Pressable
                          style={[
                            styles.dropdownItem,
                            selectedMedicineData.category === item && styles.dropdownItemSelected
                          ]}
                          onPress={() => {
                            setSelectedMedicineData((p) => ({ ...p, category: item }));
                            setShowCategorySuggestions(false);
                          }}
                        >
            <Text
              style={[
                            styles.dropdownItemText,
                            selectedMedicineData.category === item &&
                  styles.dropdownItemTextSelected
              ]}
            >
                            {item}
                          </Text>
                        </Pressable>
                      )}
                    />
                    </View>
                  )}
  </View>

              <View style={[styles.inputGroup, { width: 100 }]}>
                <Text style={styles.label}>Quantity *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Qty"
                  placeholderTextColor={COLORS.sub}
                  keyboardType="numeric"
                  value={selectedMedicineData.quantity > 0 ? selectedMedicineData.quantity.toString() : ""}
                  onChangeText={(t) =>
                    setSelectedMedicineData((p) => ({
                      ...p,
                      quantity: parseInt(t) || 0,
                    }))
                  }
                />
              </View>
            </View>
          </View>

          {/* Agency Details */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Agency Details</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Agency Name *</Text>
              <View style={{ position: "relative" }}>
                <TextInput
                  ref={agencyInputRef}
                  style={styles.input}
                  placeholder="Search agency name"
                  placeholderTextColor={COLORS.sub}
                  value={selectedMedicineData.agencyName}
                  onChangeText={(t) => {
                    setSelectedMedicineData((p) => ({ ...p, agencyName: t }));
                    setShowAgencySuggestions(true);
                  }}
                  onFocus={() => setShowAgencySuggestions(true)}
                />
                
                {showAgencySuggestions && filteredAgencySuggestions.length > 0 && (
                  <View style={styles.suggestionBox}>
                    <FlatList
                      data={filteredAgencySuggestions}
                      keyExtractor={(item, index) => String(item.agentCode || index)}
                      keyboardShouldPersistTaps="handled"
                      renderItem={({ item, index }) => (
                        <Pressable
                          key={index}
                          style={styles.suggestionItem}
                          onPress={() => {
                            // Validate contact number when selecting from suggestions
                            const contactNo = item.contactNo || "";
                            const error = getMobileValidationMessage(contactNo);
                            
                            setSelectedMedicineData((p) => ({ 
                              ...p, 
                              ...item,
                              contactNo: contactNo 
                            }));
                            
                            setContactError(error);
                            setContactTouched(true);
                            setShowAgencySuggestions(false);
                          }}
                        >
                          <Text style={styles.suggestionText}>{item.agencyName}</Text>
                          <Text style={styles.suggestionSubText}>{item.contactNo} • {item.manufacturer}</Text>
                        </Pressable>
                      )}
                      ListEmptyComponent={
                        <View style={styles.suggRowCenter}>
                          <Text style={{ color: COLORS.sub, fontSize: 12 }}>No matches</Text>
                        </View>
                      }
                    />
                  </View>
                )}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contact Number *</Text>
              <TextInput
                style={[
                  styles.input,
                  contactTouched && contactError ? styles.inputError : null
                ]}
                placeholder="Enter 10-digit mobile number"
                placeholderTextColor={COLORS.sub}
                keyboardType="phone-pad"
                maxLength={10}
                value={selectedMedicineData.contactNo}
                onChangeText={(t) => {
                  // Allow only digits
                  const cleaned = t.replace(/[^0-9]/g, '');
                  setSelectedMedicineData((p) => ({ ...p, contactNo: cleaned }));
                  
                  // Validate in real-time
                  if (cleaned.length === 10) {
                    const error = getMobileValidationMessage(cleaned);
                    setContactError(error);
                  } else if (cleaned.length > 0) {
                    setContactError("Mobile number must be 10 digits");
                  } else {
                    setContactError("Contact number is required");
                  }
                }}
                onBlur={() => {
                  setContactTouched(true);
                  validateContactNumber(selectedMedicineData.contactNo);
                }}
                onFocus={() => setContactTouched(true)}
              />
              {contactTouched && contactError ? (
                <Text style={styles.errorText}>{contactError}</Text>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter email address"
                placeholderTextColor={COLORS.sub}
                keyboardType="email-address"
                autoCapitalize="none"
                value={selectedMedicineData.email}
                onChangeText={(t) =>
                  setSelectedMedicineData((p) => ({ ...p, email: t }))
                }
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Manufacturer *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter manufacturer"
                placeholderTextColor={COLORS.sub}
                value={selectedMedicineData.manufacturer}
                onChangeText={(t) =>
                  setSelectedMedicineData((p) => ({
                    ...p,
                    manufacturer: t,
                  }))
                }
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Agent Code *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter agent code"
                placeholderTextColor={COLORS.sub}
                keyboardType="numeric"
                value={selectedMedicineData.agentCode ? selectedMedicineData.agentCode.toString() : ""}
                onChangeText={(t) =>
                  setSelectedMedicineData((p) => ({
                    ...p,
                    agentCode: parseInt(t) || null,
                  }))
                }
              />
            </View>

            <Pressable 
              style={[styles.addBtn, { backgroundColor: COLORS.brand }]} 
              onPress={addMedicineToList}
              disabled={isLoading}
            >
              <PlusIcon size={18} color={COLORS.buttonText} />
              <Text style={styles.addText}>Add Medicine to Order</Text>
            </Pressable>
          </View>

          {/* Added Medicines List */}
          {medicineList.length > 0 && (
            <View ref={addedMedicinesRef} style={styles.card}>
              <View style={styles.sectionHeader}>
                <Text style={styles.cardTitle}>Order Summary ({medicineList.length})</Text>
                <Pressable 
                  style={styles.clearBtn}
                  onPress={() => setMedicineList([])}
                >
                  <Text style={styles.clearText}>Clear All</Text>
                </Pressable>
              </View>

              <FlatList
                data={medicineList}
                renderItem={renderMedicineItem}
                keyExtractor={(item, index) => `medicine-${item.id}-${index}`}
                scrollEnabled={false}
                style={styles.medicinesList}
              />
            </View>
          )}
          
        {/* Order Action Buttons - NOW INSIDE SCROLLVIEW */}
        {medicineList.length > 0 && (
          <View style={styles.orderActionsContainer}>
            <Pressable 
              style={[styles.cancelBtn, isLoading && styles.disabledBtn]}
              onPress={() => {
                setMedicineList([]);
                setSelectedMedicineData(initialSelectedMedicineData);
                navigation.goBack();
              }}
              disabled={isLoading}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            
            <Pressable
              style={[styles.orderBtn, { backgroundColor: COLORS.brand }, isLoading && styles.disabledBtn]}
              onPress={submitHandler}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.buttonText} />
              ) : (
                <>
                  <ShoppingCartIcon size={20} color={COLORS.buttonText} />
                  <Text style={styles.orderText}>
                    Place Order ({medicineList.length})
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        )}
        
        {/* Bottom padding for scrolling */}
        <View style={{ height: FOOTER_H + 20 }} />
      </ScrollView>

      {/* Footer Navigation - Fixed at bottom */}
      <View style={[styles.footerWrap, { bottom: insets.bottom || 0 }]}>
        <Footer active={"orderplacement"} brandColor={COLORS.brand} />
      </View>

      {/* Bottom Safe Area Shield */}
      {insets.bottom > 0 && (
        <View pointerEvents="none" style={[styles.navShield, { height: insets.bottom }]} />
      )}
    </SafeAreaView>
  );
};

export default AddOrderScreen;

/* ===================== STYLES ===================== */

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.bg 
  },
dropdownSelector: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderWidth: 1.5,
  borderColor: COLORS.border,
  borderRadius: 12,
  paddingHorizontal: 12,
  paddingVertical: 10,
  backgroundColor: COLORS.field,
  minHeight: 44, // Match input height
},

dropdownText: {
  fontSize: 15,
  color: COLORS.text,
  flex: 1,
},

placeholderText: {
  color: COLORS.sub,
},

dropdownList: {
  position: 'absolute',
  left: 0,
  right: 0,
  top: '100%',
  marginTop: 4,
  borderWidth: 1,
  borderColor: COLORS.border,
  borderRadius: 12,
  backgroundColor: COLORS.card,
  maxHeight: 200,
  overflow: 'hidden',
  zIndex: 1000,
  elevation: 10,
  shadowColor: '#000',
  shadowOpacity: 0.1,
  shadowOffset: { width: 0, height: 4 },
  shadowRadius: 8,
},

dropdownItem: {
  paddingHorizontal: 12,
  paddingVertical: 12,
  borderBottomWidth: StyleSheet.hairlineWidth,
  borderBottomColor: COLORS.border,
},

dropdownItemSelected: {
  backgroundColor: COLORS.brandLight,
},

dropdownItemText: {
  fontSize: 14,
  color: COLORS.text,
  fontWeight: '500',
},

dropdownItemTextSelected: {
  color: COLORS.brand,
  fontWeight: '700',
},


  headerRightPlaceholder: {
    width: 36,
  },


  body: {
    flex: 1,
  },

  scrollContent: {
    padding: 16,
  },

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
    marginBottom: 8,
  },

  inputGroup: {
    marginBottom: 12,
  },

  label: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 6,
  },

  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.field,
    fontSize: 15,
    color: COLORS.text,
  },
  
  inputError: {
    borderColor: COLORS.danger,
  },
  
  errorText: {
    color: COLORS.danger,
    fontSize: 11,
    marginTop: 4,
    fontWeight: "500",
  },

  row: {
    flexDirection: "row",
    gap: 12,
  },

  addBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 4,
  },

  addText: { 
    color: COLORS.buttonText, 
    fontWeight: "700", 
    marginLeft: 8,
    fontSize: 14,
  },

  suggestionBox: {
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
    zIndex: 1000,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },

  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    gap: 2,
  },

  suggestionText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "600",
  },

  suggestionSubText: {
    fontSize: 11,
    color: COLORS.sub,
  },

  suggRowCenter: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  chipRow: { 
    flexDirection: "row", 
    flexWrap: "wrap", 
    gap: 6,
    marginTop: 8,
  },

  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1.5,
  },

  chipText: { 
    fontSize: 12, 
    fontWeight: "700",
  },

  medicinesList: {
    flexGrow: 0,
  },

  medicineItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.field,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  medicineContent: {
    flex: 1,
    minWidth: 0,
  },

  medicineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
    flexWrap: "nowrap",
  },

  medicineName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
    flexShrink: 1,
  },

  medicineQty: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.brand,
    backgroundColor: COLORS.brandLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
    flexWrap: "wrap",
  },

  detailLabel: {
    fontSize: 11,
    color: COLORS.sub,
    fontWeight: "600",
    width: 80,
    flexShrink: 0,
  },

  detailValue: {
    fontSize: 11,
    color: COLORS.text,
    fontWeight: "600",
    flex: 1,
    flexShrink: 1,
    paddingLeft: 4,
  },

  deleteBtn: {
    padding: 4,
    marginLeft: 4,
    marginTop: 2,
  },

  clearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  clearText: {
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: "700",
  },

  orderActionsContainer: {
    flexDirection: "row",
    paddingHorizontal: 0,
    paddingVertical: 8,
    backgroundColor: 'transparent',
    gap: 10,
    marginBottom: 16,
  },

  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.pill,
  },

  cancelText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "700",
  },

  orderBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },

  orderText: {
    color: COLORS.buttonText,
    fontSize: 14,
    fontWeight: "700",
  },

  disabledBtn: {
    opacity: 0.6,
  },
  
  // Footer Navigation
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    height: FOOTER_H,
    justifyContent: "center",
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  
  navShield: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.card,
    zIndex: 9,
  },
});