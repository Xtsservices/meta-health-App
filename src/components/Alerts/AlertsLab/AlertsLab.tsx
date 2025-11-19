import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Dimensions,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute } from "@react-navigation/native";

// Utils
import AsyncStorage from "@react-native-async-storage/async-storage";
import PatientOuterTable from "./OuterTable";
import CustomTabs from "./CustomTabs";
import Pagination from "./Pagination";
import { AuthFetch } from "../../../auth/auth";

const { width: W, height: H } = Dimensions.get("window");
const isTablet = W >= 768;
const isSmallScreen = W < 375;

const AlertsLab = () => {
  const route = useRoute();
  const user = useSelector((state: any) => state.currentUser);
  const insets = useSafeAreaInsets();

  const [allAlerts, setAllAlerts] = useState<any[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<any[]>([]);
  const [rejectedOrders, setRejectedOrders] = useState<any[]>([]);
  const [tabIndex, setTabIndex] = useState(0);
  const [filter, setFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(0);
  const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const rowsPerPage = 10;

  const navigationState = route.params?.state || {};

  useEffect(() => {
    if (navigationState?.patientData) {
      const patientId = navigationState.patientData.patientID || 
                       navigationState.patientData.pID || 
                       navigationState.patientData.id;
      setExpandedPatientId(patientId);
      
      const patientType = navigationState.patientData.ptype;
      if (patientType === 21) {
        setFilter("OPD");
      } else if (patientType === 2) {
        setFilter("IPD");
      } else if (patientType === 3) {
        setFilter("Emergency");
      }
      
      setTabIndex(0);
      
      if (patientId && allAlerts.length > 0) {
        const patientIndex = allAlerts.findIndex((alert: any) => 
          alert.patientID === patientId || 
          alert.pID === patientId ||
          alert.id === patientId
        );
        
        if (patientIndex !== -1) {
          const targetPage = Math.floor(patientIndex / rowsPerPage);
          setCurrentPage(targetPage);
        }
      }
    }
  }, [navigationState, allAlerts]);

  // Fetch all test alerts
  useEffect(() => {
    const getAlerts = async () => {
      try {
        setLoading(true);
        const token = await AsyncStorage.getItem("token");
        const response = await AuthFetch(
          `test/${user.roleName}/${user.hospitalID}/getAlerts`,
          token
        );

        console.log("neuuuuu:", response);

        // Handle both response formats
        const alertsData = response?.data?.alerts || response?.alerts;
        
        if ((response?.data?.message === "success" || response?.message === "success") && Array.isArray(alertsData)) {
          const processedAlerts = alertsData.map((alert: any) => {
            // Determine department based on ptype
            let dept = "Unknown";
            if (alert.ptype === 21) dept = "OPD";
            else if (alert.ptype === 2) dept = "IPD";
            else if (alert.ptype === 3) dept = "Emergency";
            
            return {
              ...alert,
              id: alert.id?.toString() || alert.patientID?.toString() || alert.pID?.toString(),
              patientID: alert.patientID || alert.pID,
              pName: alert.pName || alert.patientName,
              dept: dept,
              doctor_firstName: alert.doctor_firstName || alert.firstName,
              doctor_lastName: alert.doctor_lastName || alert.lastName,
              ptype: alert.ptype,
              testsList: alert.testsList || [],
              addedOn: alert.addedOn || new Date().toISOString()
            };
          });
          
          console.log("Processed alerts with departments:", processedAlerts.map(a => ({ id: a.id, ptype: a.ptype, dept: a.dept })));
          setAllAlerts(processedAlerts);
          setFilteredAlerts(processedAlerts);
          console.log("Alerts loaded:", processedAlerts.length);
        } else {
          console.log("No alerts found or invalid response:", response);
          setAllAlerts([]);
          setFilteredAlerts([]);
        }
      } catch (error) {
        console.error("Error fetching alerts:", error);
        setAllAlerts([]);
        setFilteredAlerts([]);
      } finally {
        setLoading(false);
      }
    };

    if (user?.hospitalID) {
      getAlerts();
    } else {
      console.log("Missing hospitalID or token");
      setLoading(false);
    }
  }, [user?.hospitalID, user?.token]);

  // Fetch rejected alerts
  useEffect(() => {
    const getRejectedOrders = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        const response = await AuthFetch(
          `test/${user.roleName}/${user.hospitalID}/rejected/getBillingData`,
          token
        );

        console.log("Rejected Orders API Response:", response);

        // Handle both response formats
        const billingData = response?.data?.billingData || response?.billingData;
        
        if ((response?.data?.message === "success" || response?.message === "success") && Array.isArray(billingData)) {
          const processedRejected = billingData.map((order: any) => {
            let dept = "Unknown";
            if (order.ptype === 21) dept = "OPD";
            else if (order.ptype === 2) dept = "IPD";
            else if (order.ptype === 3) dept = "Emergency";
            
            return {
              ...order,
              id: order.id?.toString() || order.patientID?.toString() || order.pID?.toString(),
              patientID: order.patientID || order.pID,
              pName: order.pName || order.patientName,
              rejectedReason: order.rejectedReason || order.reason,
              testsList: order.testsList || [],
              addedOn: order.addedOn || new Date().toISOString(),
              dept: dept
            };
          });
          
          setRejectedOrders(processedRejected);
          console.log("Rejected orders loaded:", processedRejected.length);
        } else {
          console.log("No rejected orders found:", response);
          setRejectedOrders([]);
        }
      } catch (error) {
        console.error("Error fetching rejected alerts:", error);
        setRejectedOrders([]);
      }
    };

    if (user?.hospitalID) getRejectedOrders();
  }, [user?.hospitalID]);

  // Apply department filter for Test Alerts - CORRECTED VERSION
  useEffect(() => {
    console.log("Applying filter:", filter, "to", allAlerts.length, "alerts");
    
    let filtered = [...allAlerts];
    
    if (filter === "OPD") {
      filtered = allAlerts.filter((order) => order.ptype === 21); // CHANGED: 21 for OPD
    } else if (filter === "IPD") {
      filtered = allAlerts.filter((order) => order.ptype === 2);
    } else if (filter === "Emergency") {
      filtered = allAlerts.filter((order) => order.ptype === 3);
    } else {
      filtered = allAlerts;
    }
    
    console.log("Filtered results:", filtered.length);
    console.log("Sample filtered data:", filtered.slice(0, 3).map(f => ({ id: f.id, ptype: f.ptype, dept: f.dept })));
    
    setFilteredAlerts(filtered);
    setCurrentPage(0);
  }, [filter, allAlerts]);

  // Pagination logic
  const indexOfFirstRow = currentPage * rowsPerPage;
  const indexOfLastRow = indexOfFirstRow + rowsPerPage;
  const currentAlerts = filteredAlerts.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(filteredAlerts.length / rowsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setExpandedPatientId(null);
  };

  const handleFilterChange = (newFilter: string) => {
    console.log("Changing filter to:", newFilter);
    setFilter(newFilter);
    setExpandedPatientId(null);
  };

  const handleTabChange = (index: number) => {
    setTabIndex(index);
    setExpandedPatientId(null);
    setCurrentPage(0);
  };

  const tabs = [
    { key: "test-alerts", label: "Test Alerts" },
    { key: "rejected-alerts", label: "Rejected Alerts" },
  ];

  const filterOptions = [
    { label: "All Departments", value: "All" },
    { label: "Outpatient Care", value: "OPD" },
    { label: "Inpatient Services", value: "IPD" },
    { label: "Emergency", value: "Emergency" },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#14b8a6" />
        <Text style={styles.loadingText}>Loading Alerts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle={Platform.OS === "android" ? "dark-content" : "dark-content"} backgroundColor="#14b8a6" />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Custom Tabs and Filter */}
        <View style={styles.buttonContainer}>
          <CustomTabs
            tabs={tabs}
            activeTab={tabIndex}
            onTabChange={handleTabChange}
          />

          {tabIndex === 0 && (
            <View style={styles.filterContainer}>
              <Text style={styles.filterLabel}>Filter By Department:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                {filterOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.filterButton,
                      filter === option.value && styles.filterButtonActive,
                    ]}
                    onPress={() => handleFilterChange(option.value)}
                  >
                    <Text
                      style={[
                        styles.filterButtonText,
                        filter === option.value && styles.filterButtonTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              {/* Debug info */}
              <Text style={styles.debugText}>
                Showing: {filteredAlerts.length} patients | Filter: {filter} | 
                OPD (21): {allAlerts.filter(a => a.ptype === 21).length} | 
                IPD (2): {allAlerts.filter(a => a.ptype === 2).length} | 
                Emergency (3): {allAlerts.filter(a => a.ptype === 3).length}
              </Text>
            </View>
          )}
        </View>

        {/* TAB 1 - Test Alerts */}
        {tabIndex === 0 && (
          <View style={styles.tabContent}>
            <PatientOuterTable
              title={`Lab Test Alerts - ${filter}`}
              data={currentAlerts}
              isButton={true}
              alertFrom="Lab"
              expandedPatientId={expandedPatientId}
              onPatientExpand={setExpandedPatientId}
            />

            {/* Pagination Controls */}
            {filteredAlerts.length > rowsPerPage && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                totalItems={filteredAlerts.length}
                itemsPerPage={rowsPerPage}
                currentItemsCount={currentAlerts.length}
              />
            )}

            <Text style={styles.resultsText}>
              Showing {currentAlerts.length} of {filteredAlerts.length} result
              {filteredAlerts.length !== 1 ? "s" : ""}
              {expandedPatientId && " • Patient details expanded above"}
            </Text>
          </View>
        )}

        {/* TAB 2 - Rejected Alerts */}
        {tabIndex === 1 && (
          <View style={styles.tabContent}>
            <PatientOuterTable
              title="Rejected Alerts"
              data={rejectedOrders}
              isButton={false}
              alertFrom="Lab"
              isRejectedTab={true}
            />

            <Text style={styles.resultsText}>
              Showing {rejectedOrders.length} result
              {rejectedOrders.length !== 1 ? "s" : ""}
            </Text>
          </View>
        )}
      </ScrollView>
      
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: isSmallScreen ? 14 : 16,
    color: '#64748b',
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  buttonContainer: {
    padding: isSmallScreen ? 12 : 16,
    gap: 16,
  },
  filterContainer: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: "#14b8a6",
  },
  filterButtonText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  filterButtonTextActive: {
    color: "#ffffff",
  },
  tabContent: {
    padding: isSmallScreen ? 12 : 16,
  },
  resultsText: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 16,
  },
  debugText: {
    fontSize: 10,
    color: "#9ca3af",
    fontStyle: 'italic',
    marginTop: 4,
  },
});

export default AlertsLab;