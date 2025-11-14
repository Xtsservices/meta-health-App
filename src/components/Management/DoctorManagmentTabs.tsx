import React, { useState, useRef } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  Dimensions 
} from "react-native";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import MySchedule from "./MySchedule/MySchedule";
import SlotsManagement from "./SlotsManagement/SlotsManagement";
import MyTasks from "../../pages/nurseDashboard/MyTasks";

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Constants
const TAB_CONFIG = {
  minTabWidth: 140,
  scrollThreshold: 768, 
} as const;

// Selector function for current user
const selectCurrentUser = (state: RootState) => state.currentUser;

// Tab button component
const TabButton = ({ 
  isActive, 
  onPress, 
  title 
}: { 
  isActive: boolean; 
  onPress: () => void; 
  title: string 
}) => (
  <TouchableOpacity
    style={[
      styles.tabButton,
      isActive && styles.activeTab
    ]}
    onPress={onPress}
  >
    <Text style={[
      styles.tabButtonText,
      isActive && styles.activeTabText
    ]}>
      {title}
    </Text>
    {isActive && <View style={styles.activeIndicator} />}
  </TouchableOpacity>
);

// Arrow component for scroll indicators
const ScrollArrow = ({ direction, onPress, visible }: { 
  direction: 'left' | 'right'; 
  onPress: () => void; 
  visible: boolean 
}) => {
  if (!visible) return null;
  
  return (
    <TouchableOpacity 
      style={[
        styles.arrowButton,
        direction === 'left' ? styles.arrowLeft : styles.arrowRight
      ]} 
      onPress={onPress}
    >
      <Text style={styles.arrowText}>
        {direction === 'left' ? '‹' : '›'}
      </Text>
    </TouchableOpacity>
  );
};

const DoctorManagmentTabs: React.FC = () => {
  const user = useSelector(selectCurrentUser);
  const scrollViewRef = useRef<ScrollView>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  
  const defaultTab = user?.role === 4000 ? "LeaveManagment" : "MySchedule";
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Check if tabs need scrolling
  const needsScrolling = screenWidth < TAB_CONFIG.scrollThreshold;

  // Handle scroll events to show/hide arrows
  const handleScroll = (event: any) => {
    if (!needsScrolling) return;
    
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const scrollX = contentOffset.x;
    const contentWidth = contentSize.width;
    const containerWidth = layoutMeasurement.width;

    setShowLeftArrow(scrollX > 0);
    setShowRightArrow(scrollX + containerWidth < contentWidth - 10);
  };

  // Scroll tab container
  const scrollTabs = (direction: 'left' | 'right') => {
    if (!scrollViewRef.current) return;
    
    const scrollAmount = 150; // Adjust scroll distance as needed
    
    scrollViewRef.current.scrollTo({
      x: direction === 'left' ? -scrollAmount : scrollAmount,
      animated: true,
    });
  };

  const renderContent = () => {
    switch (activeTab) {
      case "MySchedule":
        return <MySchedule />;
      case "SlotsManagement":
        return <SlotsManagement />;
      case "MyTasks":
        return <MyTasks />;
      default:
        return <SlotsManagement />;
    }
  };

  const getAvailableTabs = () => {
    const tabs = [
      { id: "SlotsManagement", title: "Slots Management" },
      { id: "MySchedule", title: "My Schedule" },
      { id: "MyTasks", title: "My Notes" },
    ];

    if (user?.role === 4000) {
      tabs.unshift({ id: "LeaveManagment", title: "Leave Management" });
    }

    return tabs;
  };

  const availableTabs = getAvailableTabs();

  return (
    <View style={styles.container}>
      {/* Stats Section for Admin */}
      {user?.role === 4000 && (
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, styles.present]}>
            <Text style={styles.statTitle}>Present Log</Text>
            <View style={styles.statContent}>
              <View style={styles.statNumbers}>
                <Text style={styles.countNumber}>25</Text>
                <Text style={styles.countLabel}>Present</Text>
              </View>
              <View style={styles.statIcon}>
                <Text style={styles.reportIcon}>📊</Text>
              </View>
            </View>
          </View>
          
          <View style={[styles.statCard, styles.absent]}>
            <Text style={styles.statTitle}>Absence Log</Text>
            <View style={styles.statContent}>
              <View style={styles.statNumbers}>
                <Text style={styles.countNumber}>02</Text>
                <Text style={styles.countLabel}>Absent</Text>
              </View>
              <View style={styles.statIcon}>
                <Text style={styles.reportIcon}>📊</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Tabs Navigation */}
      <View style={styles.tabHeadersContainer}>
        {needsScrolling && (
          <ScrollArrow 
            direction="left" 
            onPress={() => scrollTabs('left')} 
            visible={showLeftArrow} 
          />
        )}
        
        <ScrollView 
          ref={scrollViewRef}
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.tabHeaders,
            !needsScrolling && styles.tabHeadersCentered
          ]}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {availableTabs?.map?.((tab) => (
            <TabButton
              key={tab.id}
              isActive={activeTab === tab.id}
              onPress={() => setActiveTab(tab.id)}
              title={tab.title}
            />
          ))}
        </ScrollView>

        {needsScrolling && (
          <ScrollArrow 
            direction="right" 
            onPress={() => scrollTabs('right')} 
            visible={showRightArrow} 
          />
        )}
      </View>

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {renderContent()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    overflow: "hidden",
  },
  statsContainer: {
    flexDirection: screenWidth < 768 ? "column" : "row",
    gap: 16,
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    minHeight: 100,
  },
  present: {
    borderLeftWidth: 4,
    borderLeftColor: "#10b981",
  },
  absent: {
    borderLeftWidth: 4,
    borderLeftColor: "#f59e0b",
  },
  statTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  statContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statNumbers: {
    flexDirection: "row",
    alignItems: "baseline",
    flex: 1,
  },
  countNumber: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
    marginRight: 12,
  },
  countLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#64748b",
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  reportIcon: {
    fontSize: 20,
  },
  tabHeadersContainer: {
    borderBottomWidth: 2,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "transparent",
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
  },
  tabHeaders: {
    paddingHorizontal: 8,
    flexGrow: 1,
  },
  tabHeadersCentered: {
    justifyContent: "center",
  },
  tabButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    minWidth: TAB_CONFIG.minTabWidth,
    alignItems: "center",
    position: "relative",
    marginHorizontal: 4,
  },
  activeTab: {
    backgroundColor: "transparent",
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  activeTabText: {
    color: "#0f172a",
    fontWeight: "700",
  },
  activeIndicator: {
    position: "absolute",
    bottom: -2,
    left: 8,
    right: 8,
    height: 3,
    backgroundColor: "#14b8a6",
    borderRadius: 2,
  },
  tabContent: {
    flex: 1,
    padding: 8,
  },
  arrowButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    minWidth: 40,
  },
  arrowLeft: {
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
  },
  arrowRight: {
    borderLeftWidth: 1,
    borderLeftColor: "#e2e8f0",
  },
  arrowText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#64748b",
  },
});

export default DoctorManagmentTabs;