import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  FlatList,
  Dimensions,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

import { useDispatch, useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootState } from "../../../store/store";
import { AuthPost } from "../../../auth/auth";
import { debounce } from "../../../utils/debounce";
import { showError, showSuccess } from "../../../store/toast.slice";
import { PlusIcon, XIcon } from "../../../utils/SvgIcons";
import Footer from "../../dashboard/footer";
import usePreOpForm from "../../../utils/usePreOpForm";
import usePostOPStore from "../../../utils/usePostopForm";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;
const moderateScale = (size: number, factor: number = 0.5) => size + (scale(size) - size) * factor;

const COLORS = {
  bg: "#f8fafc",
  card: "#ffffff",
  field: "#f8fafc",
  text: "#0f172a",
  sub: "#475569",
  border: "#e2e8f0",
  brand: "#14b8a6",
  button: "#14b8a6",
  buttonText: "#ffffff",
  danger: "#ef4444",
  pill: "#eef2f7",
  placeholder: "#94a3b8",
};

const FOOTER_HEIGHT = moderateScale(70);

type TestType = {
  testID: string;
  loinc_num_: string;
  name: string;
  department: string;
  note?: string;
};

type TestSuggestion = {
  id: number;
  LOINC_Code: string;
  LOINC_Name: string;
  Department: string;
};

type NewTest = TestType;

export default function AddTestsScreen() {
  const navigation = useNavigation<any>();
  const user = useSelector((s: RootState) => s.currentUser);
 
 
   const route = useRoute<any>();
  const activeTab = route.params?.currentTab;

  const { tests: preOpTests, setTests: setPreOpTests } = usePreOpForm();
  const { tests: postOpTests, setTests: setPostOpTests } = usePostOPStore();

  const cp = useSelector((s: RootState) => s.currentPatient);
  const timeline = cp?.patientTimeLineID;
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  const [selectedItem, setSelectedItem] = useState<TestType | null>(null);
  const [testList, setTestList] = useState<TestType[]>([]);
  const [newSelectedList, setNewSelectedList] = useState<NewTest[]>([]);
  const [noteInput, setNoteInput] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Type-ahead state
  const [suggestions, setSuggestions] = useState<TestType[]>([]);
  const [loadingSugg, setLoadingSugg] = useState(false);
  const dedupeTestsForStore = (
    arr: { test: string; ICD_Code: string; testNotes: string }[]
  ) => {
    const seen = new Set<string>();
    return arr.filter((t) => {
      const key = (t.ICD_Code || t.test || "").toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  // Remove duplicates and filter
  const removeDuplicatesAndFilter = useMemo(
    () => (tests: TestSuggestion[], prefix: string): TestType[] => {
      const map = new Map<string, TestType>();
      tests?.forEach((t) => {
        const testItem: TestType = {
          testID: String(t?.id),
          loinc_num_: t?.LOINC_Code,
          name: t?.LOINC_Name,
          department: t?.Department,
          note: "",
        };
        map.set(t?.LOINC_Name?.toLowerCase(), testItem);
      });
      const uniq = Array.from(map?.values());
      return uniq?.filter((t) => 
        t?.name?.toLowerCase()?.includes(prefix?.toLowerCase())
      ) || [];
    },
    []
  );

  const fetchTestsList = useCallback(async (val: string) => {
    if (!val || val?.length < 1) {
      setSuggestions([]);
      setTestList([]);
      return;
    }
    
    if (!user?.hospitalID) {
      setSuggestions([]);
      setTestList([]);
      return;
    }

    setLoadingSugg(true);
    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      const res = await AuthPost(
        `data/lionicCode/${user?.hospitalID}`, 
        { text: val }, 
        token
      );
      if (res?.data?.message === "success" && Array.isArray(res?.data?.data)) {

        const uniqueTests = removeDuplicatesAndFilter(res?.data?.data, val);
        setTestList(uniqueTests);
        setSuggestions(uniqueTests);
      } else {
        setTestList([]);
        setSuggestions([]);
      }
    } catch {
      setTestList([]);
      setSuggestions([]);
    } finally {
      setLoadingSugg(false);
    }
  }, [user?.hospitalID, removeDuplicatesAndFilter]);

  const latestFetchRef = useRef(fetchTestsList);
  useEffect(() => {
    latestFetchRef.current = fetchTestsList;
  }, [fetchTestsList]);

  const debouncedFetchRef = useRef(
    debounce((q: string) => latestFetchRef.current(q), 300)
  );

  useEffect(() => {
    return () => debouncedFetchRef.current.cancel();
  }, []);

  const handleInputChange = (text: string) => {
    const regex = /^[a-zA-Z][a-zA-Z\s]*$/;
    if ((regex.test(text) || text === "") && text?.length <= 20) {
      const newSelectedItem: TestType = {
        testID: "",
        loinc_num_: "",
        name: text,
        department: "",
        note: selectedItem?.note || noteInput,
      };
      setSelectedItem(newSelectedItem);
      
      const query = text?.trim();
      if (query?.length >= 1) {
        debouncedFetchRef.current(query);
      } else {
        debouncedFetchRef.current.cancel();
        setSuggestions([]);
        setTestList([]);
      }
    }
  };

  const selectSuggestion = (item: TestType) => {
    setSelectedItem(item);
    setSuggestions([]);
  };

  const addToList = () => {
    if (!selectedItem?.name) {
      Alert.alert("Missing", "Please enter a test name.");
      return;
    }

    // Check if it's a valid test from the list
    const isValidTest = testList?.some((test) => test?.name === selectedItem?.name);
    if (!isValidTest) {
      dispatch(showError("Please select a valid test from the list."));
      return;
    }

    // Check if already in the list
    const isAlreadyInList = newSelectedList?.some(
      (list) => list?.name === selectedItem?.name
    );
    if (isAlreadyInList) {
      dispatch(showError("This test is already in the list."));
      return;
    }

    const testToAdd: NewTest = {
      ...selectedItem,
      note: selectedItem?.note || noteInput || "",
    };

    setNewSelectedList((prev) => [testToAdd, ...prev]);
    setSelectedItem(null);
    setNoteInput("");
    setSuggestions([]);
  };

  const removeFromList = (loinc_num_: string) => {
    setNewSelectedList((curr) =>
      curr?.filter((val) => val?.loinc_num_ !== loinc_num_) || []
    );
  };

  const updateTestNote = (loinc_num_: string, note: string) => {
    setNewSelectedList((curr) => {
      const next = [...curr];
      const index = next?.findIndex((item) => item?.loinc_num_ === loinc_num_);
      if (index !== -1) {
        next[index] = { ...next[index], note };
      }
      return next;
    });
  };

  const submit = async () => {
    const tests = newSelectedList?.length
      ? newSelectedList?.map((test) => ({
          testID: test?.testID,
          loinc_num_: test?.loinc_num_,
          test: test?.name,
          department: test?.department,
          testNotes: test?.note || "",
        }))
      : selectedItem &&
        testList?.some((test) => test?.loinc_num_ === selectedItem?.loinc_num_)
      ? [
          {
            testID: selectedItem?.testID,
            loinc_num_: selectedItem?.loinc_num_,
            test: selectedItem?.name,
            department: selectedItem?.department,
            testNotes: selectedItem?.note || noteInput,
          },
        ]
      : [];

    if (tests?.length === 0) {
      dispatch(showError("Please select a valid test from the list."));
      return;
    }

    // Safely resolve timeline id + patient id from store shapes
    const timeLineID = typeof timeline === "object" ? timeline?.id : timeline;
    const patientID = cp?.currentPatient?.id ?? cp?.id;

    if (!timeLineID || !patientID || !user?.hospitalID) {
      Alert.alert("Error", "Missing required information.");
      return;
    }

    setSaving(true);
    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      const body = {
        timeLineID,
        userID: user?.id,
        tests: tests,
        patientID,
      };

      const res = await AuthPost(`test/${user?.hospitalID}`, body, token);
      
      if (res?.data?.message === "success") {
            // ---- Push tests into Pre-Op / Post-Op stores (same as web) ----
    const mappedForStore = tests.map((t) => ({
      test: String(t.test ?? ""),
      ICD_Code: String(t.loinc_num_ ?? ""),
      testNotes: String(t.testNotes ?? ""),
    }));
    if (activeTab === "PreOpRecord") {
      const prev = preOpTests || [];
      const merged = dedupeTestsForStore([...prev, ...mappedForStore]);
      setPreOpTests(merged);
    } else if (activeTab === "PostOpRecord") {
      const prev = postOpTests || [];
      const merged = dedupeTestsForStore([...prev, ...mappedForStore]);
      setPostOpTests(merged);
    }

        dispatch(showSuccess("Tests added successfully!"));
        navigation.goBack();
      } else {
        dispatch(showError(res?.message || "Failed to add tests."));
      }
    } catch (e: any) {
      dispatch(showError(e?.message || "Failed to add tests."));
    } finally {
      setSaving(false);
    }
  };

  const renderSuggestionItem = ({ item }: { item: TestType }) => (
    <Pressable 
      style={styles.suggRow} 
      onPress={() => selectSuggestion(item)}
    >
      <Text style={{ color: COLORS.text, fontWeight: "600", fontSize: moderateScale(14) }}>
        {item?.name}
      </Text>
      <View style={styles.suggDetails}>
        <Text style={{ color: COLORS.sub, fontSize: moderateScale(11) }}>
          LOINC: {item?.loinc_num_}
        </Text>
        <Text style={{ color: COLORS.sub, fontSize: moderateScale(11) }}>
          Dept: {item?.department}
        </Text>
      </View>
    </Pressable>
  );

  const renderSelectedTestItem = (item: NewTest, index: number) => (
    <View key={item?.loinc_num_} style={styles.selectedItemRow}>
      <View style={[styles.chip, { backgroundColor: COLORS.pill, borderColor: COLORS.border }]}>
        <Text style={[styles.chipText, { color: COLORS.text }]}>{item?.name}</Text>
        <Pressable 
          onPress={() => removeFromList(item?.loinc_num_)}
          hitSlop={8}
          style={styles.chipDelete}
        >
          <XIcon size={moderateScale(16)} color={COLORS.danger} />
        </Pressable>
      </View>
      <TextInput
        style={[
          styles.noteInputSmall,
          { 
            borderColor: COLORS.border, 
            color: COLORS.text, 
            backgroundColor: COLORS.field 
          }
        ]}
        placeholder="Note"
        placeholderTextColor={COLORS.placeholder}
        multiline
        numberOfLines={2}
        value={item?.note || ""}
        onChangeText={(text) => updateTestNote(item?.loinc_num_, text)}
      />
    </View>
  );

  return (
    <View style={[styles.safe, { backgroundColor: COLORS.bg }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : undefined} 
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={[styles.scrollContent, { 
            paddingBottom: FOOTER_HEIGHT + moderateScale(16) + insets.bottom 
          }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, { borderColor: COLORS.border, backgroundColor: COLORS.card }]}>
            <Text style={[styles.title, { color: COLORS.text }]}>Add Test</Text>

            {/* Search Row - Matching Web Layout */}
            <View style={styles.searchRow}>
              {/* Test Search Input - 75% width */}
              <View style={styles.searchInputContainer}>
                <Text style={[styles.label, { color: COLORS.sub }]}>Test</Text>
                <View style={{ position: "relative" }}>
                  <TextInput
                    placeholder="Enter 1 letter for search"
                    placeholderTextColor={COLORS.placeholder}
                    style={[
                      styles.input, 
                      { 
                        borderColor: COLORS.border, 
                        color: COLORS.text, 
                        backgroundColor: COLORS.field,
                        height: moderateScale(44),
                      }
                    ]}
                    value={selectedItem?.name || ""}
                    onChangeText={handleInputChange}
                  />
                  
                  {/* Suggestions dropdown */}
                  {(loadingSugg || suggestions?.length > 0) && selectedItem?.name && selectedItem?.name?.length >= 1 && (
                    <View style={[
                      styles.suggBox, 
                      { 
                        borderColor: COLORS.border, 
                        backgroundColor: COLORS.card 
                      }
                    ]}>
                      {loadingSugg ? (
                        <View style={styles.suggRowCenter}>
                          <ActivityIndicator size="small" color={COLORS.brand} />
                        </View>
                      ) : (
                        <FlatList
                          data={suggestions}
                          keyExtractor={(item) => item?.loinc_num_}
                          keyboardShouldPersistTaps="handled"
                          renderItem={renderSuggestionItem}
                          ListEmptyComponent={
                            <View style={styles.suggRowCenter}>
                              <Text style={{ color: COLORS.sub, fontSize: moderateScale(12) }}>
                                No matching tests found
                              </Text>
                            </View>
                          }
                          nestedScrollEnabled
                          style={{ maxHeight: moderateScale(150) }}
                        />
                      )}
                    </View>
                  )}
                </View>
              </View>

              {/* Add Button - 25% width */}
              <View style={styles.addButtonContainer}>
                <Text style={[styles.label, { color: COLORS.sub, opacity: 0 }]}>
                  Add
                </Text>
                <Pressable
                  onPress={addToList}
                  style={[
                    styles.addButton, 
                    { 
                      backgroundColor: COLORS.button,
                      height: moderateScale(44),
                      opacity: !selectedItem?.name ? 0.6 : 1
                    }
                  ]}
                  disabled={!selectedItem?.name}
                >
                  <PlusIcon size={moderateScale(18)} color={COLORS.buttonText} />
                  <Text style={[styles.addButtonText, { color: COLORS.buttonText }]}>
                    Add
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Note Input - Always visible like web */}
            <View style={styles.noteContainer}>
              <Text style={[styles.label, { color: COLORS.sub }]}>Note</Text>
              <TextInput
                placeholder="Enter a note for the selected test"
                placeholderTextColor={COLORS.placeholder}
                style={[
                  styles.noteInput,
                  {
                    borderColor: COLORS.border,
                    color: COLORS.text,
                    backgroundColor: COLORS.field,
                  },
                ]}
                value={selectedItem?.note ?? noteInput}
                onChangeText={(text) => {
                  if (selectedItem) {
                    setSelectedItem({ ...selectedItem, note: text });
                  } else {
                    setNoteInput(text);
                  }
                }}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Selected Tests List */}
            {newSelectedList?.length > 0 && (
              <View style={styles.selectedListContainer}>
                <Text style={[styles.selectedListTitle, { color: COLORS.text }]}>
                  Tests to be Added
                </Text>
                <View style={styles.selectedList}>
                  {newSelectedList?.map((item, index) => 
                    renderSelectedTestItem(item, index)
                  )}
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <Pressable 
                onPress={() => navigation.goBack()} 
                style={[styles.actionButton, { backgroundColor: COLORS.pill }]}
              >
                <Text style={[styles.actionButtonText, { color: COLORS.text }]}>
                  Cancel
                </Text>
              </Pressable>
              
              <Pressable
                disabled={saving}
                onPress={submit}
                style={[
                  styles.actionButton, 
                  { 
                    backgroundColor: COLORS.button,
                    opacity: saving ? 0.6 : 1
                  }
                ]}
              >
                {saving ? (
                  <ActivityIndicator color={COLORS.buttonText} />
                ) : (
                  <Text style={[styles.actionButtonText, { color: COLORS.buttonText }]}>
                    Submit
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <View style={[styles.footerWrap, { 
        bottom: insets.bottom,
        height: FOOTER_HEIGHT,
      }]}>
        <Footer active={"patients"} brandColor="#14b8a6" />
      </View>
      {insets.bottom > 0 && (
        <View pointerEvents="none" style={[styles.navShield, { height: insets.bottom }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { 
    flex: 1 
  },
  scrollContent: { 
    flexGrow: 1, 
    padding: moderateScale(16) 
  },
  card: {
    borderWidth: 1,
    borderRadius: moderateScale(16),
    padding: moderateScale(16),
    marginBottom: moderateScale(16),
  },
  title: { 
    fontSize: moderateScale(18), 
    fontWeight: "800", 
    marginBottom: moderateScale(16) 
  },
  label: { 
    fontSize: moderateScale(14), 
    fontWeight: "700",
    marginBottom: moderateScale(6),
  },
  // Search row layout (75% input + 25% button)
  searchRow: {
    flexDirection: "row",
    gap: moderateScale(12),
    marginTop: moderateScale(8),
  },
  searchInputContainer: {
    flex: 0.75, // 75% width
  },
  addButtonContainer: {
    flex: 0.25, // 25% width
    justifyContent: "flex-end",
  },
  input: {
    borderWidth: 1.5,
    borderRadius: moderateScale(12),
    paddingHorizontal: moderateScale(12),
    fontSize: moderateScale(15),
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: moderateScale(6),
    borderRadius: moderateScale(12),
    paddingHorizontal: moderateScale(8),
  },
  addButtonText: {
    fontWeight: "700",
    fontSize: moderateScale(14),
  },
  // Note container
  noteContainer: {
    marginTop: moderateScale(12),
  },
  noteInput: {
    borderWidth: 1.5,
    borderRadius: moderateScale(12),
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(10),
    fontSize: moderateScale(14),
    textAlignVertical: "top",
    minHeight: moderateScale(80),
  },
  noteInputSmall: {
    borderWidth: 1.5,
    borderRadius: moderateScale(8),
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(6),
    fontSize: moderateScale(12),
    textAlignVertical: "top",
    minHeight: moderateScale(60),
    flex: 1,
    marginLeft: moderateScale(8),
  },
  // Selected tests list
  selectedListContainer: {
    marginTop: moderateScale(20),
  },
  selectedListTitle: {
    fontSize: moderateScale(16),
    fontWeight: "700",
    marginBottom: moderateScale(12),
  },
  selectedList: {
    gap: moderateScale(12),
  },
  selectedItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: moderateScale(8),
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(6),
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(8),
    borderRadius: moderateScale(20),
    borderWidth: 1,
    minWidth: moderateScale(100),
  },
  chipText: {
    fontWeight: "700",
    fontSize: moderateScale(12),
    flex: 1,
  },
  chipDelete: {
    padding: moderateScale(2),
  },
  // Action buttons
  actionButtons: {
    flexDirection: "row",
    gap: moderateScale(12),
    marginTop: moderateScale(20),
  },
  actionButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: moderateScale(12),
    paddingVertical: moderateScale(14),
  },
  actionButtonText: {
    fontWeight: "700",
    fontSize: moderateScale(14),
  },
  // Suggestions
  suggBox: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "100%",
    marginTop: moderateScale(4),
    borderWidth: 1,
    borderRadius: moderateScale(12),
    maxHeight: moderateScale(200),
    overflow: "hidden",
    zIndex: 10,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  suggRow: {
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(10),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  suggDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: moderateScale(2),
  },
  suggRowCenter: {
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(12),
    alignItems: "center",
    justifyContent: "center",
  },
  // Footer
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    justifyContent: "center",
  },
  navShield: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
  },
});