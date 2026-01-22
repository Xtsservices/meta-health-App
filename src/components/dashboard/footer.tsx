// Footer.tsx
import React, { useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from "react-native";
import {
  AlertTriangle,
  Stethoscope,
  Bell,
  Users,
  ClipboardList,
  Package,
} from "lucide-react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { zoneType } from "../../utils/role";
import useOTConfig, { OTScreenType } from "../../utils/otConfig";
import {UserPlusIcon, LayoutDashboardIcon, ListIcon,  Package2Icon, SettingsIcon, ShoppingCartIcon } from "../../utils/SvgIcons";

const { width: W } = Dimensions.get("window");

export type TabKey = "dashboard" | "addPatient" | "patients" | "management";

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
  const user = useSelector((state: RootState) => state.currentUser);
  const { screenType, setScreenType } = useOTConfig();

  const isOTUser = user?.roleName === "surgeon" || user?.roleName === "anesthetist";
  const isNurseUser = user?.role === 2002 || user?.role === 2003; // Nurse roles
  
  const resolvedActive: TabKey = useMemo(() => {
    if (isNurseUser) {
      // For nurse users, map routes to tabs
      if (route.name === "NurseDashboard") return "dashboard";
      if (route.name === "NurseAlerts") return "addPatient"; // Alerts tab
      if (route.name === "nursePatientList" || route.name === "NursePatientsList") return "patients";
      if (route.name === "NurseManagement" || route.name === "NurseManagement") return "management";
      return active;
    }

    if (!isOTUser) return active;

    if (route.name === "PatientList") {
      return screenType === OTScreenType.EMERGENCY
        ? "patients"
        : "management";
    }

    if (route.name === "DashboardAlerts") return "addPatient";
    if (route.name === "OtDashboard") return "dashboard";

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
    // NURSE USERS (role 2002 or 2003)
    if (isNurseUser) {
      if (k === "dashboard") {
        navigation.navigate("NurseDashboard");
      } else if (k === "addPatient") {
        // For nurse users, this should navigate to Medicine Alerts
        navigation.navigate("NurseAlerts");
      } else if (k === "patients") {
        navigation.navigate("nursePatientList");
      } else if (k === "management") {
        // For nurse users, this should navigate to Management or Attendance
        if (user?.role === 2002) { // Head nurse - show attendance
          navigation.navigate("NurseManagement");
        }
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
    } else if (k === "management") {
      // For surgeon and anesthetist, navigate to Elective list
      if (isOTUser) {
        goPatientListWithType(OTScreenType.ELECTIVE);
      } else {
      navigation.navigate("Management");
      }
    }
  };

  const getTabLabel = (k: TabKey): string => {
    // NURSE USERS (role 2002 or 2003) - Use nurse-specific labels
    if (isNurseUser) {
      if (k === "addPatient") return "Alerts";
      if (k === "patients") return "Patients";
      if (k === "management") {
        return user?.role === 2002 ? "Management" : "Management";
      }
      return "Dashboard";
    }

    // Surgeon/Anesthetist specific labels
    if (isOTUser) {
      if (k === "addPatient") return "Alerts";
      if (k === "patients") return "Emergency List";
      if (k === "management") return "Elective List";
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
      management: "Management",
    };
    
    return labels[k];
  };

  const getTabIcon = (k: TabKey): React.ElementType => {
    // NURSE USERS (role 2002 or 2003) - Use nurse-specific icons
    if (isNurseUser) {
      if (k === "dashboard") return LayoutDashboardIcon;
      if (k === "addPatient") return Bell; // Alerts icon
      if (k === "patients") return Users; // Patients icon
      if (k === "management") {
        return user?.role === 2002 ? ClipboardList : SettingsIcon; // Attendance for head nurse, Settings for regular nurse
      }
    }

    // Surgeon/Anesthetist specific icons
    if (isOTUser) {
      if (k === "addPatient") return AlertTriangle; // Alerts icon
      if (k === "patients") return Stethoscope; // Emergency icon
      if (k === "management") return Stethoscope; // Elective icon
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
      management: SettingsIcon,
    };
    
    return icons[k];
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

  return (
    <View style={[styles.footer, { backgroundColor: brandColor }]}>
      <Item k="dashboard" />
      <Item k="addPatient" />
      <Item k="patients" />
      <Item k="management" />
    </View>
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
});