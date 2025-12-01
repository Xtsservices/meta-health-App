// Footer.tsx
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from "react-native";
import {
  LayoutDashboard,
  UserPlus2,
  List as ListIcon,
  Settings,
  Package, // For inventory icon
  ShoppingCart, // For sales icon
} from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";

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
  const user = useSelector((state: RootState) => state.currentUser);

  const handleTabPress = (k: TabKey) => {
    if (k === "dashboard") {
      if (user?.roleName === "surgeon" || user?.roleName === "anesthetist") {
        navigation.navigate("OtDashboard");
      } else if (user?.roleName === "pathology" || user?.roleName === "radiology") {
        navigation.navigate("DashboardLab");
      } else if (user?.patientStatus === 1) {
        navigation.navigate("DashboardOpd");
      } else if (user?.patientStatus === 2) {
        navigation.navigate("DashboardIpd");
      } else if (user?.patientStatus === 3) {
        navigation.navigate("DashboardTriage");
      } else if (user?.roleName === "reception") {
        navigation.navigate("DashboardReception");
      } else if (user?.roleName === "pharmacy") {
        navigation.navigate("DashboardPharma");
      } else {
        navigation.navigate("EmergencyDashboard");
      }
    } else if (k === "addPatient") {
      // For pharmacy role, navigate to SaleComp (Walk-in/Sales)
      if (user?.roleName === "pharmacy") {
        navigation.navigate("SaleComp");
      } 
      // For pathology and radiology roles, navigate to SaleComp (Walk-in)
      else if (user?.roleName === "pathology" || user?.roleName === "radiology") {
        navigation.navigate("SaleComp");
      } else {
        navigation.navigate("AddPatient");
      }
    } else if (k === "patients") {
      if (user?.roleName === "pharmacy") {
        navigation.navigate("AddInventory");
      }
      // For pathology and radiology roles, navigate to PatientListLab
      else if (user?.roleName === "pathology" || user?.roleName === "radiology") {
        navigation.navigate("PatientListLab");
      }else if (user?.roleName === "reception") {
        navigation.navigate("ReceptionPatientsList");
      }
       else {
        navigation.navigate("PatientList");
      }
    } else if (k === "management") {
      navigation.navigate("Management");
    }
  };

  const getTabLabel = (k: TabKey): string => {
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
    // Pharmacy specific icons
    if (user?.roleName === "pharmacy") {
      if (k === "addPatient") {
        return ShoppingCart; // Sales icon
      }
      if (k === "patients") {
        return Package; // Inventory icon
      }
    }
    
    // Default icons for other roles
    const icons = {
      dashboard: LayoutDashboard,
      addPatient: UserPlus2,
      patients: ListIcon,
      management: Settings,
    };
    
    return icons[k];
  };

  const Item: React.FC<{
    k: TabKey;
  }> = ({ k }) => {
    const isActive = active === k;
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