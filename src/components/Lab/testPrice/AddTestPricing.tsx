import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { useNavigation, useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthPost } from "../../../auth/auth";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Utils
import { 
  SPACING, 
  FONT_SIZE, 
  ICON_SIZE,
  responsiveWidth,
  responsiveHeight,
  isTablet,
  isSmallDevice,
  FOOTER_HEIGHT 
} from "../../../utils/responsive";
import { COLORS } from "../../../utils/colour";
import Footer from "../../dashboard/footer";

// Icons
import { 
  XIcon, 
  PlusIcon, 
  Trash2Icon,
  SearchIcon,
  CheckIcon 
} from "../../../utils/SvgIcons";
import { showError, showSuccess } from "../../../store/toast.slice";

const FOOTER_H = FOOTER_HEIGHT;

// Types
interface TestData {
  id?: number;
  labTestID?: number;
  hospitalID?: number;
  testName: string;
  lonicCode: string;
  hsn: string;
  gst: number;
  testPrice: number;
  addedOn?: string;
  updatedOn?: string;
  testType?: string;
}

interface SelectedListType {
  id: number;
  loinc_num_: string;
  name: string;
  department: string;
}

interface ApiTestItem {
  id: number;
  LOINC_Code: string;
  LOINC_Name: string;
  Department: string;
}

const TestSuggestionItem: React.FC<{ 
  test: SelectedListType;
  onSelect: (test: SelectedListType) => void;
}> = ({ test, onSelect }) => (
  <TouchableOpacity
    style={styles.suggestionItem}
    onPress={() => onSelect(test)}
    activeOpacity={0.7}
  >
    <View style={styles.suggestionContent}>
      <Text style={styles.suggestionName} numberOfLines={1}>{test.name}</Text>
      <Text style={styles.suggestionCode}>LOINC: {test.loinc_num_}</Text>
      <Text style={styles.suggestionDepartment}>{test.department}</Text>
    </View>
    <View style={styles.selectIndicator}>
      <CheckIcon size={ICON_SIZE.sm} color={COLORS.brand} />
    </View>
  </TouchableOpacity>
);

const TestListItem: React.FC<{ 
  test: TestData; 
  index: number;
  onRemove: (index: number) => void;
}> = ({ test, index, onRemove }) => {
  const totalPrice = test.testPrice + (test.testPrice * test.gst) / 100;

  return (
    <View style={styles.testListItem}>
      <View style={styles.testListContent}>
        <View style={styles.testListHeader}>
          <Text style={styles.testListName} numberOfLines={1}>{test.testName}</Text>
          <Text style={styles.testListTotal}>₹{totalPrice.toFixed(2)}</Text>
        </View>
        <View style={styles.testListDetails}>
          <Text style={styles.testListDetail}>LOINC: {test.lonicCode}</Text>
          <Text style={styles.testListSeparator}>•</Text>
          <Text style={styles.testListDetail}>HSN: {test.hsn}</Text>
          <Text style={styles.testListSeparator}>•</Text>
          <Text style={styles.testListDetail}>GST: {test.gst}%</Text>
          <Text style={styles.testListSeparator}>•</Text>
          <Text style={styles.testListDetail}>Base: ₹{test.testPrice}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => onRemove(index)}
        activeOpacity={0.7}
      >
        <Trash2Icon size={ICON_SIZE.sm} color={COLORS.danger} />
      </TouchableOpacity>
    </View>
  );
};

const AddTestPricing: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const user = useSelector((state: any) => state.currentUser);
  const insets = useSafeAreaInsets();
  
  const { editData, department } = route?.params ?? { 
    editData: null, 
    department: "",
  };

  const scrollViewRef = useRef<ScrollView>(null);
  const inputRefs = {
    testName: useRef<TextInput>(null),
    hsn: useRef<TextInput>(null),
    basePrice: useRef<TextInput>(null),
    gst: useRef<TextInput>(null),
  };

  const [testList, setTestList] = useState<TestData[]>([]);
  const [fetchedTestList, setFetchedTestList] = useState<SelectedListType[]>([]);
  const [selectedTestData, setSelectedTestData] = useState<TestData>({
    id: 0,
    testName: "",
    lonicCode: "",
    hsn: "",
    gst: 18,
    testPrice: 0,
  });
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (editData) {
      setSelectedTestData({
        testName: editData.testName,
        lonicCode: editData.lonicCode,
        hsn: editData.hsn,
        gst: editData.gst,
        testPrice: editData.testPrice,
        id: editData.labTestID,
      });
    }
  }, [editData]);

  useEffect(() => {
    const fetchTestsData = async (query: string) => {
      try {
        setLoading(true);
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          dispatch(showError("Please login again"));
          navigation.navigate("Login" as never);
          return;
        }

        const response = await AuthPost(
          `data/lionicCode`,
          { text: query },
          token
        );

        if (response?.data?.message === "success") {
          const testData = response?.data?.data;
          
          if (Array.isArray(testData)) {
            const filteredTests = department 
              ? testData?.filter((el: ApiTestItem) => el?.Department === department)
              : testData;

            const uniqueTests: SelectedListType[] = Array.from(
              new Map(
                filteredTests?.map((el: ApiTestItem) => [
                  el?.id, 
                  {
                    id: el?.id,
                    loinc_num_: el?.LOINC_Code,
                    name: el?.LOINC_Name,
                    department: el?.Department,
                  }
                ])
              ).values()
            );

            setFetchedTestList(uniqueTests);
          } else {
            setFetchedTestList([]);
          }
        } else {
          setFetchedTestList([]);
        }
      } catch (error) {
        dispatch(showError("Failed to fetch test suggestions"));
        setFetchedTestList([]);
      } finally {
        setLoading(false);
      }
    };

    if (searchQuery.trim().length >= 1) {
      const timeoutId = setTimeout(() => {
        fetchTestsData(searchQuery.trim());
      }, 300);

      return () => clearTimeout(timeoutId);
    } else {
      setFetchedTestList([]);
      setShowSuggestions(false);
    }
  }, [searchQuery, department, navigation, dispatch]);

  const handleTestNameChange = (text: string) => {
    setSearchQuery(text);
    setSelectedTestData(prev => ({
      ...prev,
      testName: text,
    }));

    if (text.length >= 1) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      setFetchedTestList([]);
    }
  };

  const selectTest = (test: SelectedListType) => {
    setSelectedTestData(prev => ({
      ...prev,
      testName: test?.name,
      lonicCode: test?.loinc_num_,
      id: test?.id,
    }));
    setSearchQuery(test?.name);
    setShowSuggestions(false);
    setFetchedTestList([]);
    
    setTimeout(() => {
      scrollToField('hsn');
    }, 100);
  };

  const scrollToField = (fieldName: keyof typeof inputRefs) => {
    const fieldRef = inputRefs[fieldName];
    if (fieldRef.current) {
      fieldRef.current.focus();
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: getFieldPosition(fieldName), animated: true });
      }, 300);
    }
  };

  const getFieldPosition = (fieldName: string): number => {
    const positions: { [key: string]: number } = {
      testName: 0,
      hsn: 120,
      basePrice: 240,
      gst: 240,
    };
    return positions[fieldName] || 0;
  };

  const addTestToList = () => {
    if (
      selectedTestData.testName &&
      selectedTestData.lonicCode &&
      selectedTestData.hsn &&
      selectedTestData.gst &&
      selectedTestData.testPrice &&
      selectedTestData.id
    ) {
      const isDuplicate = testList.some(
        (test) => test.id === selectedTestData.id
      );

      if (isDuplicate) {
        dispatch(showError("This test is already in the list!"));
        return;
      }

      setTestList([...testList, { ...selectedTestData }]);
      setSelectedTestData({
        id: 0,
        testName: "",
        lonicCode: "",
        hsn: "",
        gst: 18,
        testPrice: 0,
      });
      setSearchQuery("");
      setFetchedTestList([]);
      setShowSuggestions(false);
      
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    } else {
      dispatch(showError("Please fill all required fields"));
    }
  };

  const handleRemoveTest = (index: number) => {
    setTestList(prevList => prevList.filter((_, i) => i !== index));
  };

  const handleUpdatePrice = async () => {
    if (
      selectedTestData.hsn &&
      selectedTestData.gst &&
      selectedTestData.testPrice &&
      selectedTestData.id
    ) {
      setIsSubmitting(true);
      try {
        const token = await AsyncStorage.getItem("token");
        if (!user?.hospitalID || !token) {
          dispatch(showError("Authentication failed"));
          return;
        }

        const response = await AuthPost(
          `test/updateLabTestPricing/${user.hospitalID}`,
          { testPricingData: selectedTestData },
          token
        );
        
        if (response?.data?.status === 200) {
          dispatch(showSuccess("Test price updated successfully"));
          navigation.goBack();
        } else {
          dispatch(showError(response?.message || "Failed to update test price"));
        }
      } catch (error) {
        dispatch(showError("Failed to update test price"));
      } finally {
        setIsSubmitting(false);
      }
    } else {
      dispatch(showError("Please fill all required fields"));
    }
  };

  const handleSubmit = async () => {
    if (testList.length > 0 && user?.hospitalID) {
      setIsSubmitting(true);
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          dispatch(showError("Authentication failed"));
          return;
        }

        const response = await AuthPost(
          `test/addlabTestPricing/${user.hospitalID}`,
          { testPricingData: testList },
          token
        );

        if (response?.data?.status === 200) {
          dispatch(showSuccess("Test prices added successfully"));
          navigation.goBack();
        } else {
          dispatch(showError(response?.message || "Failed to add test prices"));
        }
      } catch (error) {
        dispatch(showError("Failed to add test prices"));
      } finally {
        setIsSubmitting(false);
      }
    } else {
      dispatch(showError("Please add at least one test"));
    }
  };

  const calculateTotalPrice = () => {
    const basePrice = selectedTestData.testPrice || 0;
    const gst = selectedTestData.gst || 0;
    const gstAmount = (basePrice * gst) / 100;
    return basePrice + gstAmount;
  };

  const isFormValid = selectedTestData.testName && 
                     selectedTestData.lonicCode && 
                     selectedTestData.hsn && 
                     selectedTestData.gst && 
                     selectedTestData.testPrice;

  const isAddButtonEnabled = !editData && isFormValid;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.brand} />
      
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {editData ? "Edit Test Price" : "Add Test Pricing"}
          </Text>
          <Text style={styles.headerSubtitle}>
            {editData 
              ? `Update pricing for ${selectedTestData.testName}`
              : "Configure test pricing and billing information"
            }
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <XIcon size={ICON_SIZE.lg} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView 
          ref={scrollViewRef}
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: FOOTER_H + insets.bottom + SPACING.xl }
          ]}
        >
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Test Name <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.autocompleteContainer}>
                <View style={styles.searchInputContainer}>
                  <SearchIcon size={ICON_SIZE.sm} color={COLORS.sub} />
                  <TextInput
                    ref={inputRefs.testName}
                    style={[
                      styles.input,
                      styles.searchInput,
                      editData && styles.disabledInput
                    ]}
                    placeholder="Search and select test name..."
                    placeholderTextColor={COLORS.placeholder}
                    value={searchQuery}
                    onChangeText={handleTestNameChange}
                    editable={!editData}
                    returnKeyType="next"
                    onSubmitEditing={() => scrollToField('hsn')}
                  />
                  {loading && (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color={COLORS.brand} />
                    </View>
                  )}
                </View>
                {showSuggestions && fetchedTestList.length > 0 && (
                  <View style={styles.suggestionsContainer}>
                    <FlatList
                      data={fetchedTestList}
                      renderItem={({ item }) => (
                        <TestSuggestionItem test={item} onSelect={selectTest} />
                      )}
                      keyExtractor={(item) => item?.id?.toString()}
                      style={styles.suggestionsList}
                      keyboardShouldPersistTaps="always"
                      nestedScrollEnabled={true}
                    />
                  </View>
                )}
                {showSuggestions && fetchedTestList.length === 0 && searchQuery.length >= 1 && !loading && (
                  <View style={styles.noResultsContainer}>
                    <Text style={styles.noResultsText}>No tests found</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                LOINC Code <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, styles.disabledInput]}
                placeholder="LOINC code will auto-fill when test is selected"
                placeholderTextColor={COLORS.placeholder}
                value={selectedTestData.lonicCode}
                editable={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                HSN Code <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                ref={inputRefs.hsn}
                style={styles.input}
                placeholder="Enter HSN code"
                placeholderTextColor={COLORS.placeholder}
                value={selectedTestData.hsn}
                onChangeText={(text) => setSelectedTestData(prev => ({ ...prev, hsn: text }))}
                returnKeyType="next"
                onSubmitEditing={() => scrollToField('basePrice')}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>
                  Base Price (₹) <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  ref={inputRefs.basePrice}
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor={COLORS.placeholder}
                  keyboardType="decimal-pad"
                  value={selectedTestData.testPrice === 0 ? "" : selectedTestData.testPrice.toString()}
                  onChangeText={(text) => setSelectedTestData(prev => ({ 
                    ...prev, 
                    testPrice: Number(text) || 0 
                  }))}
                  returnKeyType="next"
                  onSubmitEditing={() => scrollToField('gst')}
                />
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>
                  GST Rate (%) <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  ref={inputRefs.gst}
                  style={styles.input}
                  placeholder="18"
                  placeholderTextColor={COLORS.placeholder}
                  keyboardType="decimal-pad"
                  value={selectedTestData.gst === 0 ? "" : selectedTestData.gst.toString()}
                  onChangeText={(text) => setSelectedTestData(prev => ({ 
                    ...prev, 
                    gst: Number(text) || 0 
                  }))}
                  returnKeyType="done"
                />
              </View>
            </View>

            {(selectedTestData.testPrice > 0 || selectedTestData.gst > 0) && (
              <View style={styles.totalCalculation}>
                <View style={styles.calculationRow}>
                  <Text style={styles.calculationLabel}>Base Price:</Text>
                  <Text style={styles.calculationValue}>₹{selectedTestData.testPrice}</Text>
                </View>
                <View style={styles.calculationRow}>
                  <Text style={styles.calculationLabel}>GST ({selectedTestData.gst}%):</Text>
                  <Text style={styles.calculationValue}>
                    ₹{((selectedTestData.testPrice * selectedTestData.gst) / 100).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.calculationDivider} />
                <View style={styles.calculationRow}>
                  <Text style={styles.totalLabel}>Total Price:</Text>
                  <Text style={styles.totalPrice}>₹{calculateTotalPrice().toFixed(2)}</Text>
                </View>
              </View>
            )}

            {!editData && (
              <TouchableOpacity 
                style={[
                  styles.addToListButton,
                  !isAddButtonEnabled && styles.addToListButtonDisabled
                ]} 
                onPress={addTestToList}
                disabled={!isAddButtonEnabled}
                activeOpacity={0.8}
              >
                <PlusIcon size={ICON_SIZE.md} color={COLORS.buttonText} />
                <Text style={styles.addToListText}>Add to List</Text>
              </TouchableOpacity>
            )}

            {testList.length > 0 && (
              <View style={styles.testListContainer}>
                <View style={styles.testListHeader}>
                  <Text style={styles.testListTitle}>
                    Tests to be Added ({testList.length})
                  </Text>
                  <TouchableOpacity 
                    style={styles.clearListButton}
                    onPress={() => setTestList([])}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.clearListText}>Clear All</Text>
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={testList}
                  renderItem={({ item, index }) => (
                    <TestListItem 
                      test={item} 
                      index={index}
                      onRemove={handleRemoveTest}
                    />
                  )}
                  keyExtractor={(item, index) => `${item?.id}-${index}`}
                  scrollEnabled={false}
                />
              </View>
            )}
          </View>

          <View style={styles.footerActions}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            
            {editData ? (
              <TouchableOpacity 
                style={[
                  styles.submitButton,
                  (!isFormValid || isSubmitting) && styles.submitButtonDisabled
                ]}
                onPress={handleUpdatePrice}
                disabled={!isFormValid || isSubmitting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={COLORS.buttonText} size="small" />
                ) : (
                  <Text style={styles.submitText}>Update Test</Text>
                )}
              </TouchableOpacity>
            ) : testList.length > 0 ? (
              <TouchableOpacity 
                style={[
                  styles.submitButton,
                  isSubmitting && styles.submitButtonDisabled
                ]}
                onPress={handleSubmit}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={COLORS.buttonText} size="small" />
                ) : (
                  <Text style={styles.submitText}>
                    Add {testList.length} Test{testList.length !== 1 ? 's' : ''}
                  </Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[
                  styles.submitButton,
                  (!isFormValid || isSubmitting) && styles.submitButtonDisabled
                ]}
                onPress={addTestToList}
                disabled={!isFormValid || isSubmitting}
                activeOpacity={0.8}
              >
                <Text style={styles.submitText}>Add Test</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={"patients"} brandColor={COLORS.brand} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.card,
    paddingTop: Platform.OS === 'ios' ? SPACING.xl : SPACING.lg,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: isTablet ? FONT_SIZE.xl : FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  headerSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    lineHeight: 20,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  form: {
    padding: SPACING.lg,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  row: {
    flexDirection: isSmallDevice ? "column" : "row",
    gap: SPACING.md,
  },
  halfWidth: {
    flex: 1,
    marginBottom: isSmallDevice ? SPACING.lg : 0,
  },
  label: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  required: {
    color: COLORS.danger,
  },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONT_SIZE.md,
    backgroundColor: COLORS.card,
    color: COLORS.text,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    paddingHorizontal: SPACING.md,
  },
  searchInput: {
    flex: 1,
    borderWidth: 0,
    marginLeft: SPACING.sm,
    paddingHorizontal: 0,
  },
  disabledInput: {
    backgroundColor: COLORS.pill,
    color: COLORS.sub,
  },
  autocompleteContainer: {
    position: "relative",
  },
  loadingContainer: {
    marginLeft: SPACING.sm,
  },
  suggestionsContainer: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    maxHeight: responsiveHeight(25),
    zIndex: 1000,
    elevation: 8,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    marginTop: SPACING.xs,
  },
  suggestionsList: {
    maxHeight: responsiveHeight(25),
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionName: {
    fontSize: FONT_SIZE.md,
    fontWeight: "500",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  suggestionCode: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    marginBottom: 2,
  },
  suggestionDepartment: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.brand,
    fontWeight: "500",
  },
  selectIndicator: {
    marginLeft: SPACING.sm,
  },
  noResultsContainer: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.md,
    zIndex: 1000,
    marginTop: SPACING.xs,
  },
  noResultsText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    textAlign: "center",
  },
  totalCalculation: {
    backgroundColor: COLORS.pillBg,
    padding: SPACING.lg,
    borderRadius: 12,
    marginBottom: SPACING.lg,
  },
  calculationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  calculationLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
  },
  calculationValue: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "500",
    color: COLORS.text,
  },
  calculationDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  totalLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    color: COLORS.text,
  },
  totalPrice: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.success,
  },
  addToListButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.brand,
    padding: SPACING.lg,
    borderRadius: 12,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addToListButtonDisabled: {
    backgroundColor: COLORS.sub,
    shadowOpacity: 0,
    elevation: 0,
  },
  addToListText: {
    color: COLORS.buttonText,
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
  },
  testListContainer: {
    marginTop: SPACING.lg,
  },
  testListHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  testListTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "600",
    color: COLORS.text,
  },
  clearListButton: {
    padding: SPACING.sm,
  },
  clearListText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.danger,
    fontWeight: "500",
  },
  testListItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  testListContent: {
    flex: 1,
  },
  testListHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  testListName: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
  },
  testListTotal: {
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
    color: COLORS.success,
  },
  testListDetails: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  testListDetail: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
  },
  testListSeparator: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    marginHorizontal: SPACING.xs,
  },
  removeButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.sm,
  },
  footerActions: {
    flexDirection: isSmallDevice ? "column" : "row",
    justifyContent: "flex-end",
    gap: SPACING.md,
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  cancelButton: {
    flex: isSmallDevice ? 0 : 1,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelText: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    color: COLORS.text,
  },
  submitButton: {
    flex: isSmallDevice ? 0 : 2,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.brand,
    borderRadius: 12,
    minWidth: responsiveWidth(35),
    alignItems: "center",
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.sub,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitText: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    color: COLORS.buttonText,
  },
  footerWrap: {
    left: 0,
    right: 0,
    height: FOOTER_H,
    justifyContent: "center",
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
});

export default AddTestPricing;