// Footer.tsx
import React, { useMemo, useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
  Modal,
  TouchableWithoutFeedback,
  Animated,
  Image,
  ActivityIndicator,
} from "react-native";
import {
  AlertTriangle,
  Stethoscope,
  Bell,
  Users,
  User,
  LogOut,
  UserCog,
  ChevronRight,
} from "lucide-react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../store/store";
import { zoneType } from "../../utils/role";
import useOTConfig, { OTScreenType } from "../../utils/otConfig";
import { UserPlusIcon, LayoutDashboardIcon, ListIcon, Package2Icon, ShoppingCartIcon } from "../../utils/SvgIcons";
import { currentUser } from "../../store/store";
import { showError, showSuccess } from "../../store/toast.slice";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthPost } from "../../auth/auth";

const { width: W } = Dimensions.get("window");

export type TabKey = "dashboard" | "addPatient" | "patients" | "profile";

type Props = {
  active?: TabKey;                     // default 'dashboard'
  brandColor?: string;                 // default '#14b8a6'
};

const Footer: React.FC<Props> = ({
  active = "dashboard",
  brandColor = "#14b8a6",
}) => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.currentUser);
  const { screenType, setScreenType } = useOTConfig();
  
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const popupAnimation = useRef(new Animated.Value(0)).current;

  const isOTUser = user?.roleName === "surgeon" || user?.roleName === "anesthetist";
  const isNurseUser = user?.role === 2002 || user?.role === 2003; // Nurse roles
  const isDoctorUser = user?.role === 4001; // Doctor/OPD role

  // Extract doctor hospital associations for profile switching
  useEffect(() => {
    const loadProfiles = () => {
      if (isDoctorUser && user?.doctorHospitalAssociations) {
        const formattedProfiles = user.doctorHospitalAssociations.map((association: any) => ({
          id: association.associationId,
          name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Doctor",
          role: "Doctor",
          email: user.email,
          avatar: user.photo,
          isCurrent: association.isPrimary || association.hospitalID === user.hospitalID,
          hospitalID: association.hospitalID,
          hospitalDetails: association.hospitalDetails,
          departmentDetails: association.departmentDetails,
          currentRole: user.role,
          employmentType: association.employmentType,
          commissionPercentage: association.commissionPercentage,
          consultationFee: association.consultationFee,
        }));
        
        setProfiles(formattedProfiles);
      }
    };
    
    loadProfiles();
  }, [user, isDoctorUser]);
  const resolvedActive: TabKey = useMemo(() => {
    if (isNurseUser) {
      // For nurse users, map routes to tabs
      if (route.name === "NurseDashboard") return "dashboard";
      if (route.name === "NurseAlerts") return "addPatient"; // Alerts tab
      if (route.name === "nursePatientList" || route.name === "NursePatientsList") return "patients";
      if (route.name === "NurseProfile" || route.name === "Profile") return "profile";
      return active;
    }

    if (!isOTUser) return active;

    if (route.name === "PatientList") {
      return screenType === OTScreenType.EMERGENCY
        ? "patients"
        : "profile";
    }

    if (route.name === "DashboardAlerts") return "addPatient";
    if (route.name === "OtDashboard") return "dashboard";
    if (route.name === "Profile") return "profile";

    return active;
  }, [active, isNurseUser, isOTUser, route.name, screenType]);

  /**
   * ✅ FORCE REFRESH ON MODE SWITCH for surgeon/anesthetist
   */
  const goPatientListWithType = (type: OTScreenType) => {
    setScreenType(type);
    navigation.replace("PatientList", {
      __otType: type, // force rerender
    });
  };

  const handleTabPress = (k: TabKey) => {
    if (k === "profile") {
      toggleProfilePopup();
      return;
    }
    // NURSE USERS (role 2002 or 2003)
    if (isNurseUser) {
      if (k === "dashboard") {
        navigation.navigate("NurseDashboard");
      } else if (k === "addPatient") {
        // For nurse users, this should navigate to Medicine Alerts
        navigation.navigate("NurseAlerts");
      } else if (k === "patients") {
        navigation.navigate("nursePatientList");
      }
      return;
    }

    // ORIGINAL LOGIC FOR OTHER ROLES
    if (k === "dashboard") {
      if (isOTUser) {
        navigation.navigate("OtDashboard");
      } else if (user?.roleName === "pathology" || user?.roleName === "radiology") {
        navigation.navigate("DashboardLab");
      } else if (user?.patientStatus === 1) {
        navigation.navigate("DashboardOpd");
      } else if (user?.patientStatus === 2) {
        navigation.navigate("DashboardIpd");
      } else if (user?.patientStatus === 3 && user?.roleName !== "emergency") {
        navigation.navigate("DashboardTriage");
      } else if (user?.roleName === "reception") {
        navigation.navigate("DashboardReception");
      } else if (user?.roleName === "pharmacy") {
        navigation.navigate("DashboardPharma");
      } else {
        navigation.navigate("EmergencyDashboard");
      }
    } else if (k === "addPatient") {
      // For surgeon and anesthetist, navigate to OT Alerts
      if (isOTUser) {
        navigation.navigate("DashboardAlerts", { type: "surgeries" });
      }
      // For pharmacy role, navigate to SaleComp (Walk-in/Sales)
      else if (user?.roleName === "pharmacy") {
        navigation.navigate("SaleComp");
      }
      // For pathology and radiology roles, navigate to SaleComp (Walk-in)
      else if (user?.roleName === "pathology" || user?.roleName === "radiology") {
        navigation.navigate("SaleComp");
      }  // For emergency role, navigate to DischargedPatientsIPD
      else if (user?.roleName === "emergency") {
        navigation.navigate("DischargedPatientsIPD");
      }else {
        navigation.navigate("AddPatient");
      }
    } else if (k === "patients") {
      if (isOTUser) {
        goPatientListWithType(OTScreenType.EMERGENCY);
      }
      else if (user?.roleName === "pharmacy") {
        navigation.navigate("AddInventory");
      }
      // For pathology and radiology roles, navigate to PatientListLab
      else if (user?.roleName === "pathology" || user?.roleName === "radiology") {
        navigation.navigate("PatientListLab");
      }else if (user?.roleName === "reception") {
        navigation.navigate("ReceptionPatientsList");
      }else if (user?.roleName === "emergency") {
         navigation.navigate("PatientList", { zone: zoneType[user?.emergencyType as keyof typeof zoneType] });
      }
       else {
        navigation.navigate("PatientList");
      }
    }
  };

  const getTabLabel = (k: TabKey): string => {
    // NURSE USERS (role 2002 or 2003) - Use nurse-specific labels
    if (isNurseUser) {
      if (k === "addPatient") return "Alerts";
      if (k === "patients") return "Patients";
      if (k === "profile") return "Profile";
      return "Dashboard";
    }

    // Surgeon/Anesthetist specific labels
    if (isOTUser) {
      if (k === "addPatient") return "Alerts";
      if (k === "patients") return "Emergency List";
      if (k === "profile") return "Profile";
    }

    // Pharmacy specific labels
    if (user?.roleName === "pharmacy") {
      if (k === "addPatient") {
        return "Sales";
      }
      if (k === "patients") {
        return "Inventory";
      }
    }
    
    // Pathology/Radiology specific labels
    if (k === "addPatient" && (user?.roleName === "pathology" || user?.roleName === "radiology")) {
      return "Walk-in";
    }else if (k=== "addPatient" && user?.roleName === "emergency"){
      return "Discharge List";
    }
    
    const labels = {
      dashboard: "Dashboard",
      addPatient: "Add Patient",
      patients: "Patients List",
      profile: "Profile",
    };
    
    return labels[k];
  };

  const getTabIcon = (k: TabKey): React.ElementType => {
    // NURSE USERS (role 2002 or 2003) - Use nurse-specific icons
    if (isNurseUser) {
      if (k === "dashboard") return LayoutDashboardIcon;
      if (k === "addPatient") return Bell; // Alerts icon
      if (k === "patients") return Users; // Patients icon
      if (k === "profile") return User; // Profile icon
    }

    // Surgeon/Anesthetist specific icons
    if (isOTUser) {
      if (k === "addPatient") return AlertTriangle; // Alerts icon
      if (k === "patients") return Stethoscope; // Emergency icon
      if (k === "profile") return User; 
    }

    // Pharmacy specific icons
    if (user?.roleName === "pharmacy") {
      if (k === "addPatient") {
        return ShoppingCartIcon; // Sales icon
      }
      if (k === "patients") {
        return Package2Icon; // Inventory icon
      }
    }

    if (user?.roleName === "emergency") {
      if (k === "addPatient") {
        return ListIcon; // Sales icon
      }
    }
    
    // Default icons for other roles
    const icons = {
      dashboard: LayoutDashboardIcon,
      addPatient: UserPlusIcon,
      patients: ListIcon,
      profile: User,
    };
    
    return icons[k];
  };

  const toggleProfilePopup = () => {
    if (showProfilePopup) {
      Animated.timing(popupAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setShowProfilePopup(false));
    } else {
      setShowProfilePopup(true);
      Animated.timing(popupAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleProfileSwitch = async (profileId: number) => {
    if (!isDoctorUser) {
      // For non-doctor users, just update the UI state
      const updatedProfiles = profiles.map(profile => ({
        ...profile,
        isCurrent: profile.id === profileId,
      }));
      setProfiles(updatedProfiles);
      toggleProfilePopup();
      return;
    }

    // For doctor users, call API to switch hospital
    const profileToSwitch = profiles.find(p => p.id === profileId);
    if (!profileToSwitch) {
      dispatch(showError("Profile not found"));
      return;
    }

    setIsSwitching(true);
    try {
      const token = user?.token || (await AsyncStorage.getItem("token"));
      const response = await AuthPost(
        'user/switchHospital',
        {
          hospitalID: profileToSwitch.hospitalID,
          currentRole: profileToSwitch.currentRole,
        },
        token
      ) as any;
      if (response?.data?.message === "Hospital switched successfully" || response?.message === "Hospital switched successfully") {
        const responseData = response?.data?.data || response?.data;
        dispatch(currentUser(responseData));
        await AsyncStorage.setItem('token', responseData.token);
        if (responseData.id != null) {
          await AsyncStorage.setItem('userID', String(responseData.id));
        }
        dispatch(showSuccess("Hospital switched successfully"));
        
        // Reload the current screen to reflect changes
        const currentRoute = route.name;
        navigation.replace(currentRoute);
      } else {
        const errorMessage = response?.data?.message || response?.message || "Failed to switch hospital";
        dispatch(showError(errorMessage));
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to switch hospital. Please try again.";
      dispatch(showError(errorMessage));
    } finally {
      setIsSwitching(false);
      toggleProfilePopup();
    }
  };

  const handleLogout = () => {
    toggleProfilePopup();
    navigation.navigate("Login"); 
  };

  const handleProfileSettings = () => {
    toggleProfilePopup();
    navigation.navigate("DoctorProfile");
  };

  const Item: React.FC<{
    k: TabKey;
  }> = ({ k }) => {
    const isActive = resolvedActive === k;
    const label = getTabLabel(k);
    const IconComponent = getTabIcon(k);
    
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => handleTabPress(k)}
        activeOpacity={0.9}
        style={styles.tab}
      >
        <IconComponent size={22} color="#ffffff" />
        <Text style={[styles.tabText, { opacity: isActive ? 1 : 0.85 }]}>
          {label}
        </Text>
        {/* Top indicator for active tab */}
        <View
          style={[
            styles.activeBar,
            {
              backgroundColor: isActive ? "rgba(255,255,255,0.9)" : "transparent",
            },
          ]}
        />
      </TouchableOpacity>
    );
  };

  const currentProfile = profiles.find(p => p.isCurrent) || (profiles.length > 0 ? profiles[0] : null);

  const renderProfileContent = () => {
    if (isLoadingProfiles) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#14b8a6" />
          <Text style={styles.loadingText}>Loading profiles...</Text>
        </View>
      );
    }

    if (profiles.length === 0) {
      return (
        <View style={styles.noProfilesContainer}>
          <User size={40} color="#ccc" />
          <Text style={styles.noProfilesText}>No profiles available</Text>
        </View>
      );
    }

    return (
      <>
        {/* Current Profile Section */}
        {currentProfile && (
          <View style={styles.currentProfileSection}>
            <View style={styles.profileAvatar}>
              {currentProfile.avatar ? (
                <Image 
                  source={{ uri: currentProfile.avatar }} 
                  style={styles.avatarImage}
                />
              ) : (
                <User size={30} color="#14b8a6" />
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{currentProfile.name}</Text>
              <Text style={styles.profileRole}>{currentProfile.hospitalDetails.name}</Text>
              {currentProfile.email && (
                <Text style={styles.profileEmail}>{currentProfile.email}</Text>
              )}
              
            </View>
          </View>
        )}

        <View style={styles.separator} />

        {/* Switch Profile Section - only show if multiple hospitals */}
        {profiles.length > 1 && (
          <>
            <Text style={styles.sectionTitle}>Switch Hospital</Text>
            {profiles
              .filter(profile => !profile.isCurrent)
              .map(profile => (
                <TouchableOpacity
                  key={profile.id}
                  style={styles.profileItem}
                  onPress={() => handleProfileSwitch(profile.id)}
                  disabled={isSwitching}
                >
                  <View style={styles.profileItemLeft}>
                    <View style={styles.profileItemAvatar}>
                      {profile.avatar ? (
                        <Image 
                          source={{ uri: profile.avatar }} 
                          style={styles.avatarImageSmall}
                        />
                      ) : (
                        <User size={20} color="#666" />
                      )}
                    </View>
                    <View style={styles.profileItemInfo}>
                      <Text style={styles.profileItemName}>{profile.name}</Text>
                      {profile.hospitalDetails && (
                        <Text style={styles.profileItemHospital}>
                          {profile.hospitalDetails.name}
                        </Text>
                      )}
                      {profile.departmentDetails && (
                        <Text style={styles.profileItemRole}>
                          {profile.departmentDetails.name || "No department"}
                        </Text>
                      )}
                    </View>
                  </View>
                  <ChevronRight size={20} color="#999" />
                </TouchableOpacity>
              ))}
          </>
        )}

        {profiles.length > 1 && <View style={styles.separator} />}

        {/* Actions Section */}
        <TouchableOpacity
          style={styles.actionItem}
          onPress={handleProfileSettings}
        >
          <UserCog size={20} color="#666" />
          <Text style={styles.actionText}>View Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionItem}
          onPress={handleLogout}
        >
          <LogOut size={20} color="#e74c3c" />
          <Text style={[styles.actionText, { color: "#e74c3c" }]}>Logout</Text>
        </TouchableOpacity>
      </>
    );
  };

  return (
    <>
    <View style={[styles.footer, { backgroundColor: brandColor }]}>
      <Item k="dashboard" />
      <Item k="addPatient" />
      <Item k="patients" />
        <Item k="profile" />
      </View>

      {/* Profile Popup Modal */}
      <Modal
        visible={showProfilePopup}
        transparent
        animationType="fade"
        onRequestClose={toggleProfilePopup}
      >
        <TouchableWithoutFeedback onPress={toggleProfilePopup}>
          <View style={styles.modalOverlay}>
            <Animated.View 
              style={[
                styles.popupContainer,
                {
                  opacity: popupAnimation,
                  transform: [
                    {
                      translateY: popupAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-20, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <TouchableWithoutFeedback>
                <View style={styles.popupContent}>
                  {isSwitching ? (
                    <View style={styles.switchingContainer}>
                      <ActivityIndicator size="large" color="#14b8a6" />
                      <Text style={styles.switchingText}>Switching hospital...</Text>
                    </View>
                  ) : (
                    renderProfileContent()
                  )}
                </View>
              </TouchableWithoutFeedback>
            </Animated.View>
    </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

export default Footer;

const styles = StyleSheet.create({
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingBottom: Platform.OS === "ios" ? 10 : 8,
    paddingTop: 8,
    borderTopWidth: 0,
    width: W,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 6,
    paddingTop: 2,
    height: "100%",
  },
  tabText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },
  activeBar: {
    position: "absolute",
    top: 0,
    height: 3,
    width: "30%",
    borderRadius: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 60,
    paddingRight: 16,
  },
  popupContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    width: 320,
    maxHeight: 500,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: "hidden",
  },
  popupContent: {
    padding: 16,
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
    fontSize: 14,
  },
  noProfilesContainer: {
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  noProfilesText: {
    marginTop: 10,
    color: "#999",
    fontSize: 14,
  },
  switchingContainer: {
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  switchingText: {
    marginTop: 10,
    color: "#14b8a6",
    fontSize: 14,
    fontWeight: "500",
  },
  currentProfileSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#f0f9ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 2,
    borderColor: "#14b8a6",
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarImageSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 2,
  },
  profileRole: {
    fontSize: 14,
    color: "#14b8a6",
    fontWeight: "600",
    marginBottom: 2,
  },
  profileHospital: {
    fontSize: 13,
    color: "#555",
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  profileBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#e6f7ff",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 2,
  },
  profileBadgeText: {
    fontSize: 11,
    color: "#14b8a6",
    fontWeight: "500",
    textTransform: "capitalize",
  },
  separator: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  profileItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  profileItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  profileItemAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  profileItemInfo: {
    flex: 1,
  },
  profileItemName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 2,
  },
  profileItemHospital: {
    fontSize: 13,
    color: "#555",
    marginBottom: 1,
  },
  profileItemRole: {
    fontSize: 12,
    color: "#666",
    marginBottom: 1,
  },
  profileItemEmployment: {
    fontSize: 11,
    color: "#888",
    marginBottom: 1,
    textTransform: "capitalize",
  },
  profileItemCommission: {
    fontSize: 11,
    color: "#888",
    fontStyle: "italic",
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  actionText: {
    fontSize: 14,
    color: "#333",
    marginLeft: 12,
    fontWeight: "500",
  },
});