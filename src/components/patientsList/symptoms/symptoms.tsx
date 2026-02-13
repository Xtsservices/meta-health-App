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
import { RouteProp, useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Trash2, Plus, User } from "lucide-react-native";
import { AuthDelete, AuthFetch } from "../../../auth/auth";
import { formatDate, formatDateTime, formatDurationParameter } from "../../../utils/dateTime";
import Footer from "../../dashboard/footer";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showError, showSuccess } from "../../../store/toast.slice";
import { COLORS } from "../../../utils/colour";

type RouteParams = { ot: boolean };

type RootState = any;
const selectUser = (s: RootState) => s.currentUser;
const selectCurrentPatient = (s: RootState) => s.currentPatient;

type SymptomRow = {
  id: number;
  conceptID?: number | string | null;
  symptom: string;
  duration?: string;
  durationParameter?: string;
  addedOn?: string | null;
  userID?: number | null;
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

export default function SymptomsScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch()
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const isOt = route.params?.ot;
  const user = useSelector((s: RootState) => s.currentUser);
  const currentpatient = useSelector((s: RootState) => s.currentPatient);
  const timeline = currentpatient?.patientTimeLineID;
  
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<SymptomRow[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [viewDepartment, setViewDepartment] = useState<string>("");
  const [viewRole, setViewRole] = useState<string>("");
  const [viewGender, setViewGender] = useState<string>("");
  const [loadingUserData, setLoadingUserData] = useState(false);

  const load = useCallback(async () => {
    if (!timeline) return;
    setLoading(true);
    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      const res = await AuthFetch(`symptom/${currentpatient.id}`, token);
      if (res?.status === "success" && "data" in res) {
        const rows: SymptomRow[] = (res?.data?.symptoms || []).map((s: any) => ({
          id: Number(s?.id),
          conceptID: s?.conceptID ?? s?.concept_id ?? null,
          symptom: String(s?.symptom || s?.term || ""),
          duration: s?.duration || "",
          durationParameter: s?.durationParameter || "",
          addedOn: s?.addedOn || s?.createdAt || null,
          userID: s?.userID ?? null,
        }));
        rows.sort((a, b) => new Date(b.addedOn || 0).getTime() - new Date(a.addedOn || 0).getTime());
        setList(rows);
      } else {
        setList([]);
      }
    } finally {
      setLoading(false);
    }
  }, [timeline?.patientID, user?.token]);

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
      const res = await AuthFetch(`user/${userId}`, token);
      
      if (res?.status === "success" && "data" in res && res.data?.message === "success") {
        const userData = res.data.user;
        
        // Fetch department name
        if (userData.departmentID) {
          const deptRes = await AuthFetch(`department/singledpt/${userData.departmentID}`, token);
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
      Alert.alert("Error", "Failed to load user details");
    } finally {
      setLoadingUserData(false);
    }
  };

  const handleUserPress = (userId: number) => {
    setSelectedUserId(userId);
    fetchUserData(userId);
  };

  const onDelete = async (row: SymptomRow) => {
    if (!timeline || !row?.id) return;
    Alert.alert("Delete Symptom", "Are you sure you want to delete this symptom?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            let token = user?.token;
            if (!token || token === "" || token === "null" || token === "undefined") {
              token = await AsyncStorage.getItem("token");
            }

            const url = `symptom/${timeline}/${row.id}`
            const res = await AuthDelete(url, token);
            if (res?.status === "success" && "data" in res) {
              dispatch(showSuccess(res?.data?.message))
              setList((prev) => prev.filter((x) => x.id !== row.id));
            } else {
              dispatch(showError("message" in res && res?.message || res?.status || "Failed to delete symptom."))
            }
          } catch (error: any) {
            dispatch(showError(
              (typeof error === "object" && error !== null && "message" in error ? (error as any).message : undefined) ||
              (typeof error === "object" && error !== null && "status" in error ? (error as any).status : undefined) ||
              "Failed to delete symptom."
            ));
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: SymptomRow }) => (
    <View style={[styles.row, { borderColor: COLORS.border }]}>
      <View style={styles.rowLeft}>
        <Text style={[styles.title, { color: COLORS.text }]}>{cap(item.symptom)}</Text>
        
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: COLORS.sub }]}>SNOMED:</Text>
            <Text style={[styles.detailValue, { color: COLORS.text }]}>{item.conceptID || "N/A"}</Text>
          </View>
          
<View style={styles.detailItem}>
  <Text style={[styles.detailLabel, { color: COLORS.sub }]}>Duration:</Text>
  <Text style={[styles.detailValue, { color: COLORS.text }]}>
    {item.duration ? `${item.duration} ${formatDurationParameter(item.durationParameter, item.duration)}` : "—"}
  </Text>
</View>
        </View>
        
        <View style={styles.metaContainer}>
          <Text style={[styles.metaText, { color: COLORS.sub }]}>
            Added: {formatDateTime(item.addedOn)}
          </Text>
          
          {item.userID && (
            <Pressable 
              onPress={() => handleUserPress(item.userID!)}
              style={styles.userContainer}
            >
              <User size={moderateScale(12)} color={COLORS.brand} />
              <Text style={[styles.userText, { color: COLORS.brand }]}>
                Added By: {user.firstName} {user.lastName}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
      
      {!isOt && user?.roleName !== "reception" && currentpatient.ptype != 21 && (
        <Pressable onPress={() => onDelete(item)} style={styles.deleteBtn} hitSlop={8}>
          <Trash2 size={moderateScale(18)} color={COLORS.danger} />
        </Pressable>
      )}
    </View>
  );

  const empty = !loading && list.length === 0;

  return (
    <View style={[styles.safe, { backgroundColor: COLORS.bg }]}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.brand} />
        </View>
      ) : empty ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: COLORS.sub }]}>No symptoms recorded yet</Text>
          {!isOt && user?.roleName !== "reception" && currentpatient.ptype != 21 && (
            <Pressable
              style={[styles.cta, { backgroundColor: COLORS.button }]}
              onPress={() => navigation.navigate("AddSymptoms" as never)}
            >
              <Plus size={moderateScale(18)} color={COLORS.buttonText} />
              <Text style={[styles.ctaText, { color: COLORS.buttonText }]}>Add Symptom</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <>
          <FlatList
            data={list}
            keyExtractor={(it) => String(it.id)}
            renderItem={renderItem}
            contentContainerStyle={{ 
              padding: moderateScale(16), 
              paddingBottom: FOOTER_HEIGHT + moderateScale(16) + insets.bottom 
            }}
            ItemSeparatorComponent={() => <View style={{ height: moderateScale(12) }} />}
            showsVerticalScrollIndicator={false}
          />
          
          {currentpatient.ptype != 21 && !isOt && user?.roleName !== "reception" && (
            <Pressable
              style={[styles.fab, { 
                backgroundColor: COLORS.button,
                bottom: FOOTER_HEIGHT + moderateScale(16) + insets.bottom 
              }]}
              onPress={() => navigation.navigate("AddSymptoms" as never)}
            >
              <Plus size={moderateScale(20)} color={COLORS.buttonText} />
            </Pressable>
          )}
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
                        <User size={moderateScale(40)} color={COLORS.sub} />
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
                            {userData?.dob ? formatDate(userData.dob) : "-"}
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
  title: { 
    fontSize: moderateScale(15), 
    fontWeight: "800",
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
    position: 'absolute',
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
  imageContainer: {
    alignItems: 'center',
    marginBottom: moderateScale(16),
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