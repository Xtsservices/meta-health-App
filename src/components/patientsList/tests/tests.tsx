import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Pressable,
  Alert,
  Dimensions,
  Modal,
  ScrollView,
  Image,
} from "react-native";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthDelete, AuthFetch } from "../../../auth/auth";
import { FileTextIcon, PlusIcon, Trash2Icon, UserIcon } from "../../../utils/SvgIcons";
import { formatDateTime } from "../../../utils/dateTime";
import Footer from "../../dashboard/footer";
import usePreOpForm from "../../../utils/usePreOpForm";
import { COLORS } from "../../../utils/colour";
import { showSuccess } from "../../../store/toast.slice";

type RootState = any;
const selectUser = (s: RootState) => s.currentUser;
const selectCurrentPatient = (s: RootState) => s.currentPatient;

type TestRow = {
  ICD_Code: string;
  id: number;
  test: string;
  loinc_num_: string;
  category?: string; // Make optional
  status?: string; // Make optional
  addedOn?: string | null;
  userID?: number | null;
  notes?: string | null;
  alertStatus?: string | null;
};

type UserData = {
  imageURL?: string;
  firstName: string;
  lastName: string;
  phoneNo: string;
  gender: string;
  dob: string;
  state: string;
  city: string;
  pinCode: string;
  email: string;
  address: string;
  departmentID: string;
  role: number;
};

const RoleList: { [key: number]: string } = {
  10007: "sAdmin",
  9999: "admin",
  4001: "doctor",
  2003: "nurse",
  1003: "staff",
  3001: "management",
  6001: "reception"
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;
const moderateScale = (size: number, factor: number = 0.5) => size + (scale(size) - size) * factor;

const FOOTER_HEIGHT = moderateScale(70);

const cap = (s: string) => (s ? s.slice(0, 1).toUpperCase() + s.slice(1).toLowerCase() : "");

export default function TestsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();    
  const insets = useSafeAreaInsets();
  const user = useSelector(selectUser);
  const currentpatient = useSelector(selectCurrentPatient);
  const timeline = currentpatient?.patientTimeLineID;
  const [list, setList] = useState<TestRow[]>([]);
  const {
    tests
  } = usePreOpForm();
  const activetab = route.params?.currentTab;
  const shouldShowPreOpTests = activetab === "PreOpRecord";
  
  let readOnly = false;
  if ((shouldShowPreOpTests && user?.roleName === "surgeon") || activetab === "PatientFile") {
    readOnly = true;
  } else if (shouldShowPreOpTests && user?.roleName !== "surgeon") {
    readOnly = false;
  }
  
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [viewDepartment, setViewDepartment] = useState<string>("");
  const [viewRole, setViewRole] = useState<string>("");
  const [viewGender, setViewGender] = useState<string>("");
  const [loadingUserData, setLoadingUserData] = useState(false);
  const dispatch = useDispatch(); 
const load = useCallback(async () => {
  if (!currentpatient?.id) return;
  setLoading(true);
  
  if (shouldShowPreOpTests) {
    // Convert pre-op tests to TestRow format
    const preOpTestRows: TestRow[] = (tests || []).map((test: any, index: number) => ({
      id: index + 1, // Temporary ID
      ICD_Code: test.ICD_Code || "",
      test: test.test || "",
      loinc_num_: test.ICD_Code || "", // Use ICD_Code as loinc_num_ for pre-op tests
      category: "", // Not applicable for pre-op
      status: "", // Not applicable for pre-op
      notes: test.testNotes || null,
    }));
    setList(preOpTestRows);
    setLoading(false);
    return;
  }
  
  try {
    const token = user?.token ?? (await AsyncStorage.getItem("token"));
    const res = await AuthFetch(`test/${currentpatient.id}`, token) as any; // Add 'as any'
    
    if (res?.data?.message === "success") {
      const rows: TestRow[] = (res?.data?.tests || []).map((t: any) => ({
        id: Number(t?.id),
        test: String(t?.test || ""),
        loinc_num_: t?.loinc_num_ || "",
        category: t?.category || "",
        status: t?.status || "",
        addedOn: t?.addedOn || null,
        userID: t?.userID ?? null,
        notes: t?.testNotes || null,
        alertStatus: t?.alertStatus || null,
        ICD_Code: t?.loinc_num_ || "", // Add ICD_Code
      }));
      rows.sort((a, b) => new Date(b?.addedOn || 0).getTime() - new Date(a?.addedOn || 0).getTime());
      setList(rows);
    } else {
      setList([]);
    }
  } catch {
    setList([]);
  } finally {
    setLoading(false);
  }
}, [currentpatient?.id, user?.token, shouldShowPreOpTests, tests]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

const fetchUserData = async (userId: number) => {
  if (!userId) return;
  
  setLoadingUserData(true);
  try {
    const token = user?.token ?? (await AsyncStorage.getItem("token"));
    
    // Add 'as any' to fix TypeScript error
    const res = await AuthFetch(`user/${userId}`, token) as any;
    
    if (res?.data?.message === "success") {
      const userData = res.data.user;
      
      // Fetch department name
      if (userData.departmentID) {
        // Add 'as any' here too
        const deptRes = await AuthFetch(`department/singledpt/${userData.departmentID}`, token) as any;
        if (deptRes?.data?.message === "success") {
          setViewDepartment(deptRes.data.department[0]?.name || "");
        }
      }
      
      // Set role
      setViewRole(RoleList[userData.role] || "");
      
      // Set gender
      let gender = "others";
      if (userData.gender === "1") {
        gender = "male";
      } else if (userData.gender === "2") {
        gender = "female";
      }
      setViewGender(gender);
      
      setUserData(userData);
      setModalVisible(true);
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
    Alert.alert("Error", "Failed to load user details");
  } finally {
    setLoadingUserData(false);
  }
};

  const handleUserPress = (userId: number) => {
    setSelectedUserId(userId);
    fetchUserData(userId);
  };

  const onDelete = async (row: TestRow) => {
    if (row?.alertStatus && row?.alertStatus?.toLowerCase() !== "pending") {
      Alert.alert("Cannot Delete", "Cannot delete test that is already approved.");
      return;
    }

    if (!timeline || !row?.id) return;
    Alert.alert("Delete Test", "Are you sure you want to delete this test?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const token = user?.token ?? (await AsyncStorage.getItem("token"));
            const res = await AuthDelete(`test/${timeline}/${row.id}`, token) as any;
            console.log(res);
            if (res?.data?.message === "success") {
              setList((prev) => prev?.filter((x) => x?.id !== row?.id) || []);
              dispatch(showSuccess("Test deleted successfully"));
            }
          } catch {
            Alert.alert("Error", "Failed to delete test.");
          }
        },
      },
    ]);
  };

  const navigateToReports = () => {
    navigation.navigate("Reports");
  };

  const renderItem = ({ item, index }: { item: TestRow; index: number }) => (
    <View style={[styles.row, { borderColor: COLORS.border }]}>
      <View style={styles.rowLeft}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: COLORS.text }]}>
            {index + 1}. {cap(item?.test || "")}
          </Text>
          {item?.status === "completed" ? (
            <Pressable onPress={navigateToReports} style={styles.viewReportBtn}>
              <FileTextIcon size={moderateScale(16)} color={COLORS.brand} />
              <Text style={[styles.viewReportText, { color: COLORS.brand }]}>View Report</Text>
            </Pressable>
          ) : (
            <Text style={[styles.status, { color: COLORS.sub }]}>{item?.status}</Text>
          )}
        </View>
        
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: COLORS.sub }]}>LOINC:</Text>
            <Text style={[styles.detailValue, { color: COLORS.text }]}>{item?.loinc_num_ || item?.ICD_Code}</Text>
          </View>
          {!shouldShowPreOpTests && 
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: COLORS.sub }]}>Department:</Text>
            <Text style={[styles.detailValue, { color: COLORS.text }]}>{cap(item?.category || "")}</Text>
          </View>}
        </View>

        {item?.notes && item?.notes?.trim() !== "" && (
          <View style={styles.notesContainer}>
            <Text style={[styles.notesLabel, { color: COLORS.sub }]}>Notes:</Text>
            <Text style={[styles.notesText, { color: COLORS.text }]}>{item?.notes}</Text>
          </View>
        )}
        
        {!shouldShowPreOpTests &&
        <View style={styles.metaContainer}>
          <Text style={[styles.metaText, { color: COLORS.sub }]}>
            Added: {formatDateTime(item?.addedOn)}
          </Text>
            {item?.userID && (
          <Pressable 
                onPress={() => handleUserPress(item.userID!)}
                style={styles.userContainer}
              >
                <UserIcon size={moderateScale(12)} color={COLORS.brand} />
                <Text style={[styles.userText, { color: COLORS.brand }]}>
                  Added By: {user.firstName} {user.lastName}
                </Text>
              </Pressable>
            )}
          </View>
        }
      </View>
      
      {(!item?.alertStatus || item?.alertStatus?.toLowerCase() === "pending") && (
        <Pressable onPress={() => onDelete(item)} style={styles.deleteBtn} hitSlop={8}>
          <Trash2Icon size={moderateScale(18)} color={COLORS.danger} />
        </Pressable>
      )}
    </View>
  );

  const empty = !loading && list?.length === 0;

  return (
    <View style={[styles.safe, { backgroundColor: COLORS.bg }]}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.brand} />
        </View>
      ) : empty ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: COLORS.sub }]}>No tests prescribed yet</Text>
          {!readOnly && user?.roleName !== "reception" && currentpatient.ptype != 21 && 
          <Pressable
            style={[styles.cta, { backgroundColor: COLORS.button }]}
            onPress={() => navigation.navigate("AddTests" as never, {currentTab: activetab})}
          >
            <PlusIcon size={moderateScale(18)} color={COLORS.buttonText} />
            <Text style={[styles.ctaText, { color: COLORS.buttonText }]}>Add Test</Text>
          </Pressable>
          }
        </View>
      ) : (
        <>
          <FlatList
            data={list}
            keyExtractor={(it) => String(it?.id)}
            renderItem={renderItem}
            contentContainerStyle={{ 
              padding: moderateScale(16), 
              paddingBottom: FOOTER_HEIGHT + moderateScale(16) + insets.bottom 
            }}
            ItemSeparatorComponent={() => <View style={{ height: moderateScale(12) }} />}
            showsVerticalScrollIndicator={false}
          />
          {!readOnly && user?.roleName !== "reception" && currentpatient.ptype != 21 &&
          <Pressable
            style={[styles.fab, { 
              backgroundColor: COLORS.button,
              bottom: FOOTER_HEIGHT + moderateScale(16) + insets.bottom 
            }]}
            onPress={() => navigation.navigate("AddTests" as never, {currentTab: activetab})}
          >
            <PlusIcon size={moderateScale(20)} color={COLORS.buttonText} />
          </Pressable>
        }
        </>
      )}
      
      {/* User Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Added By</Text>
                <Pressable onPress={() => setModalVisible(false)} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </Pressable>
              </View>
              
              {loadingUserData ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.brand} />
                  <Text style={styles.loadingText}>Loading user details...</Text>
                </View>
              ) : (
                <>
                  <View style={styles.modalBody}>                    
                       {userData?.imageURL ? (
                <View style={styles.imageContainer}>
                  <Image 
                    source={{ uri: userData.imageURL }} 
                    style={styles.profileImage}
                    resizeMode="cover"
                  />
                </View>
              ) : (
                <View style={styles.noImageContainer}>
                  <UserIcon size={moderateScale(40)} color={COLORS.sub} />
                  <Text style={styles.noImageText}>No profile image</Text>
                </View>
              )}
                    
                    <Text style={styles.userId}>ID: {selectedUserId}</Text>
                    
                    <View style={styles.gridContainer}>
                      {/* First Name */}
                      <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>First Name</Text>
                        <View style={styles.inputValue}>
                          <Text style={styles.inputText}>{userData?.firstName || ""}</Text>
                        </View>
                      </View>
                      
                      {/* Last Name */}
                      <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Last Name</Text>
                        <View style={styles.inputValue}>
                          <Text style={styles.inputText}>{userData?.lastName || ""}</Text>
                        </View>
                      </View>
                      
                      {/* Department */}
                      <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Department</Text>
                        <View style={styles.inputValue}>
                          <Text style={styles.inputText}>{viewDepartment || ""}</Text>
                        </View>
                      </View>
                      
                      {/* Role */}
                      <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Role</Text>
                        <View style={styles.inputValue}>
                          <Text style={styles.inputText}>{viewRole || ""}</Text>
                        </View>
                      </View>
                      
                      {/* Phone Number */}
                      <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Phone Number</Text>
                        <View style={styles.inputValue}>
                          <Text style={styles.inputText}>{userData?.phoneNo || ""}</Text>
                        </View>
                      </View>
                      
                      {/* Gender */}
                      <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Gender</Text>
                        <View style={styles.inputValue}>
                          <Text style={styles.inputText}>{viewGender || ""}</Text>
                        </View>
                      </View>
                      
                      {/* Date of Birth */}
                      <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Date of Birth</Text>
                        <View style={styles.inputValue}>
                          <Text style={styles.inputText}>
                            {userData?.dob ? userData.dob.split("T")[0] : ""}
                          </Text>
                        </View>
                      </View>
                      
                      {/* State */}
                      <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>State</Text>
                        <View style={styles.inputValue}>
                          <Text style={styles.inputText}>{userData?.state || ""}</Text>
                        </View>
                      </View>
                      
                      {/* City */}
                      <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>City</Text>
                        <View style={styles.inputValue}>
                          <Text style={styles.inputText}>{userData?.city || ""}</Text>
                        </View>
                      </View>
                      
                      {/* Pincode */}
                      <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Pincode</Text>
                        <View style={styles.inputValue}>
                          <Text style={styles.inputText}>{userData?.pinCode || ""}</Text>
                        </View>
                      </View>
                      
                      {/* Email */}
                      <View style={[styles.inputContainer, styles.fullWidth]}>
                        <Text style={styles.inputLabel}>Email</Text>
                        <View style={styles.inputValue}>
                          <Text style={styles.inputText}>{userData?.email || ""}</Text>
                        </View>
                      </View>
                      
                      {/* Address */}
                      {userData?.address && (
                        <View style={[styles.inputContainer, styles.fullWidth]}>
                          <Text style={styles.inputLabel}>Address</Text>
                          <View style={styles.inputValue}>
                            <Text style={styles.inputText}>{userData?.address || ""}</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                  
                  <View style={styles.modalFooter}>
                    <Pressable
                      style={[styles.modalButton, { backgroundColor: COLORS.brand }]}
                      onPress={() => setModalVisible(false)}
                    >
                      <Text style={[styles.modalButtonText, { color: '#fff' }]}>Close</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      
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
  center: { 
    flex: 1, 
    alignItems: "center", 
    justifyContent: "center", 
    gap: moderateScale(14) 
  },
  emptyText: { 
    fontSize: moderateScale(14), 
    fontWeight: "600" 
  },
  row: {
    borderWidth: 1,
    borderRadius: moderateScale(12),
    padding: moderateScale(16),
    backgroundColor: COLORS.card,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: moderateScale(12),
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  rowLeft: { 
    flex: 1, 
    gap: moderateScale(8) 
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: moderateScale(4),
  },
  title: { 
    fontSize: moderateScale(15), 
    fontWeight: "800",
    flex: 1,
    marginRight: moderateScale(8),
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: moderateScale(12),
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4),
  },
  detailLabel: {
    fontSize: moderateScale(12),
    fontWeight: "600",
  },
  detailValue: {
    fontSize: moderateScale(12),
    fontWeight: "700",
  },
  notesContainer: {
    marginTop: moderateScale(4),
  },
  notesLabel: {
    fontSize: moderateScale(12),
    fontWeight: "600",
    marginBottom: moderateScale(2),
  },
  notesText: {
    fontSize: moderateScale(12),
    fontWeight: "500",
    fontStyle: 'italic',
  },
  metaContainer: {
    marginTop: moderateScale(6),
    gap: moderateScale(2),
  },
  metaText: {
    fontSize: moderateScale(11),
    fontWeight: "500",
  },
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4),
  },
  userText: {
    fontSize: moderateScale(11),
    fontWeight: "600",
    textDecorationLine: 'underline',
  },
  deleteBtn: { 
    paddingHorizontal: moderateScale(6), 
    paddingVertical: moderateScale(4), 
    alignSelf: "flex-start",
    marginTop: moderateScale(4),
  },
  viewReportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(4),
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(4),
    backgroundColor: `${COLORS.brand}15`,
    borderRadius: moderateScale(6),
  },
  viewReportText: {
    fontSize: moderateScale(12),
    fontWeight: "700",
  },
  fab: {
    position: "absolute",
    right: moderateScale(16),
    width: moderateScale(52),
    height: moderateScale(52),
    borderRadius: moderateScale(26),
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cta: {
    flexDirection: "row",
    gap: moderateScale(8),
    paddingHorizontal: moderateScale(16),
    paddingVertical: moderateScale(12),
    borderRadius: moderateScale(999),
    alignItems: "center",
  },
  ctaText: { 
    fontWeight: "800", 
    fontSize: moderateScale(14) 
  },
  footerWrap: {
    // position: 'absolute',
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
  status: {
    fontSize: moderateScale(12),
    fontWeight: "600",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: moderateScale(12),
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: moderateScale(16),
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: moderateScale(8),
  },
  closeButtonText: {
    fontSize: moderateScale(18),
    color: '#666',
  },
  modalBody: {
    padding: moderateScale(16),
  },
  sectionTitle: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    marginBottom: moderateScale(16),
    color: '#333',
    textAlign: 'center',
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: moderateScale(16),
  },
  imagePlaceholder: {
    fontSize: moderateScale(14),
    color: '#666',
    marginBottom: moderateScale(4),
  },
  imageNote: {
    fontSize: moderateScale(10),
    color: '#999',
    fontStyle: 'italic',
  },
  userId: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: moderateScale(16),
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  inputContainer: {
    width: '48%',
    marginBottom: moderateScale(12),
  },
  fullWidth: {
    width: '100%',
  },
  inputLabel: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#666',
    marginBottom: moderateScale(4),
  },
   profileImage: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(50),
    borderWidth: 2,
    borderColor: COLORS.brand,
  },
    noImageContainer: {
    alignItems: 'center',
    marginBottom: moderateScale(16),
    padding: moderateScale(20),
    backgroundColor: '#f5f5f5',
    borderRadius: moderateScale(50),
  },
  noImageText: {
    fontSize: moderateScale(12),
    color: COLORS.sub,
    marginTop: moderateScale(4),
  },
  inputValue: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: moderateScale(6),
    padding: moderateScale(8),
    backgroundColor: '#f9f9f9',
  },
  inputText: {
    fontSize: moderateScale(14),
    color: '#333',
  },
  modalFooter: {
    padding: moderateScale(16),
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  modalButton: {
    paddingVertical: moderateScale(12),
    borderRadius: moderateScale(8),
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
  },
  loadingContainer: {
    padding: moderateScale(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: moderateScale(12),
    fontSize: moderateScale(14),
    color: '#666',
  },
});