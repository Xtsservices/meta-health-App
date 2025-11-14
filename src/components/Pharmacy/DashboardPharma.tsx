// components/Pharmacy/DashboardPharma.tsx
import React, { useEffect, useState, useCallback } from "react";
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
  Modal,
  FlatList,
} from "react-native";
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import { RootState } from "../../store/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthFetch } from "../../auth/auth";
import Footer from "../dashboard/footer";
import Sidebar, { SidebarItem } from "../Sidebar/sidebarPharmacy";
import { LineChart } from "react-native-chart-kit";
import { formatDate } from "../../utils/dateTime";

// Import SVG Icons
import {
  ClockIcon,
  AlertTriangleIcon,
  PillIcon,
  IndianRupeeIcon,
  EyeIcon,
  ChevronRightIcon,
  PlusIcon,
  MenuIcon,
  LayoutDashboardIcon,
  ShoppingCartIcon,
  BellIcon,
  PackageIcon,
  DollarSignIcon,
  HelpCircleIcon,
  LogOutIcon,
  GridIcon,
  FileTextIcon
} from "../../utils/SvgIcons";

// Types
interface DashboardCounts {
  prescriptionsToday: number;
  acceptedPrescriptions: number;
  lowStockItems: number;
  revenueToday: number;
  paidPatientsToday: number;
}

interface WeeklySalesData {
  day: string;
  sales: number;
  prescriptions: number;
}

interface TopMedication {
  name: string;
  prescribed: number;
  category: string;
}

interface PharmacyOrder {
  id: number;
  patientID?: number;
  pName: string;
  departmentID?: number;
  addedOn: string;
  medicinesList: any[];
  location: string;
  paidAmount: string;
  alertStatus?: string;
}

interface LowStock {
  id: number;
  name: string;
  quantity: number;
  totalQuantity: number;
  isOutofStock?: boolean;
  category: string;
}

interface ExpiredMedicineData {
  id: number;
  name: string;
  totalQuantity: number;
  expiryDate: string;
  category: string;
}

const { width: W, height: H } = Dimensions.get("window");
const isTablet = W >= 768;
const isSmallPhone = W < 375;

/* -------------------------- Confirm Dialog -------------------------- */
const ConfirmDialog: React.FC<{
  visible: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmText?: string;
}> = ({ visible, title, message, onCancel, onConfirm, confirmText = "Logout" }) => {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalMsg}>{message}</Text>
          <View style={styles.modalActions}>
            <TouchableOpacity onPress={onCancel} style={[styles.modalBtn, styles.modalBtnGhost]}>
              <Text style={[styles.modalBtnText, { color: "#1C7C6B" }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onConfirm} style={[styles.modalBtn, styles.modalBtnDanger]}>
              <Text style={[styles.modalBtnText, { color: "#fff" }]}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

/* -------------------------- Header -------------------------- */
const HeaderBar: React.FC<{ title: string; onMenu: () => void }> = ({ title, onMenu }) => {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
      <TouchableOpacity onPress={onMenu} style={styles.menuBtn} accessibilityLabel="Open menu">
        <MenuIcon size={isSmallPhone ? 24 : 30} color="#ffffffff" />
      </TouchableOpacity>
    </View>
  );
};

/* -------------------------- Stat Card -------------------------- */
const StatCard: React.FC<{
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
}> = ({ title, value, icon: Icon, color }) => (
  <View style={[styles.statCard, { backgroundColor: `${color}15` }]}>
    <View style={styles.statContent}>
      <View style={styles.statInfo}>
        <Text style={styles.statTitle}>{title}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <View style={[styles.statIcon, { backgroundColor: `${color}30` }]}>
        <Icon size={isSmallPhone ? 22 : 28} color={color} />
      </View>
    </View>
  </View>
);

/* -------------------------- Chart Card -------------------------- */
const ChartCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View style={styles.chartCard}>
    <View style={styles.chartHeader}>
      <Text style={styles.chartTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

/* -------------------------- Main Dashboard -------------------------- */
const DashboardPharma: React.FC = () => {
  const navigation = useNavigation<any>();
  const user = useSelector((s: RootState) => s.currentUser);
  const insets = useSafeAreaInsets();
  const userName = `${user?.firstName} ${user?.lastName}` || "User";
  const userImg = user?.avatarUrl || user?.profileImage;

  const hasBottomInsets = insets.bottom > 0;

  // Sidebar & logout
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  // Dashboard data states
  const [dashboardCounts, setDashboardCounts] = useState<DashboardCounts | null>(null);
  const [weeklySalesData, setWeeklySalesData] = useState<WeeklySalesData[]>([]);
  const [topMedications, setTopMedications] = useState<TopMedication[]>([]);
  const [recentPrescriptions, setRecentPrescriptions] = useState<PharmacyOrder[]>([]);
  const [lowStockMedicineData, setLowStockMedicineData] = useState<LowStock[]>([]);
  const [expiredMedicineData, setExpiredMedicineData] = useState<ExpiredMedicineData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isWeeklyDataLoading, setIsWeeklyDataLoading] = useState(false);
  const [isTopMedicationsLoading, setIsTopMedicationsLoading] = useState(false);
  const [isDashboardCountsLoading, setIsDashboardCountsLoading] = useState(false);

  const FOOTER_HEIGHT = hasBottomInsets ? 80 : 70;

  // Fetch dashboard counts
  const fetchDashboardCounts = useCallback(async () => {
    if (!user?.hospitalID || !user?.token) return;

    setIsDashboardCountsLoading(true);
    try {
      const token = user.token || (await AsyncStorage.getItem("token"));
      const response = await AuthFetch(
        `medicineInventoryPatientsOrder/${user.hospitalID}/getPharmacyDashboardCount`,
        token
      );

      if (response?.status === 'success' && response?.data) {
        const data = response?.data?.data;
        setDashboardCounts({
          prescriptionsToday: Number(data?.prescriptionsToday) || 0,
          acceptedPrescriptions: Number(data?.acceptedPrescriptions) || 0,
          lowStockItems: Number(data?.lowStockItems) || 0,
          revenueToday: Number(data?.revenueToday) || 0,
          paidPatientsToday: Number(data?.paidPatientsToday) || 0,
        });
      } else {
        setDashboardCounts({
          prescriptionsToday: 0,
          acceptedPrescriptions: 0,
          lowStockItems: 0,
          revenueToday: 0,
          paidPatientsToday: 0,
        });
      }
    } catch (error) {
      setDashboardCounts({
        prescriptionsToday: 0,
        acceptedPrescriptions: 0,
        lowStockItems: 0,
        revenueToday: 0,
        paidPatientsToday: 0,
      });
    } finally {
      setIsDashboardCountsLoading(false);
    }
  }, [user]);

  // Fetch weekly sales data
  const fetchWeeklySalesData = useCallback(async () => {
    if (!user?.hospitalID || !user?.token) return;

    setIsWeeklyDataLoading(true);
    try {
      const token = user.token || (await AsyncStorage.getItem("token"));
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const formattedFromDate = startDate.toISOString().split('T')[0];
      const formattedToDate = new Date().toISOString().split('T')[0];

      const response = await AuthFetch(
        `medicineInventoryPatientsOrder/${user.hospitalID}/weeklySalesPrescriptions?from=${formattedFromDate}&to=${formattedToDate}`,
        token
      );

      if (response?.status === 'success' && response?.data) {
        const responseData = response?.data?.data;

        if (responseData?.dates && responseData?.prescriptions && responseData?.sales) {
          const processedData: WeeklySalesData[] = responseData?.dates?.map((date: string) => {
            const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
            return {
              day: dayName,
              sales: Number(responseData?.sales?.[date]) || 0,
              prescriptions: Number(responseData?.prescriptions?.[date]) || 0,
            };
          });
          setWeeklySalesData(processedData);
        } else if (Array.isArray(responseData)) {
          const processedData: WeeklySalesData[] = responseData?.map((item: any) => ({
            day: item?.day || 'Unknown',
            sales: Number(item?.sales) || 0,
            prescriptions: Number(item?.prescriptions) || 0,
          }));
          setWeeklySalesData(processedData);
        } else {
          setWeeklySalesData([]);
        }
      } else {
        setWeeklySalesData([]);
      }
    } catch (error) {
      setWeeklySalesData([]);
    } finally {
      setIsWeeklyDataLoading(false);
    }
  }, [user]);

  // Fetch top medications
  const fetchTopMedications = useCallback(async () => {
    if (!user?.hospitalID || !user?.token) return;

    setIsTopMedicationsLoading(true);
    try {
      const token = user.token || (await AsyncStorage.getItem("token"));
      const response = await AuthFetch(
        `medicineInventoryPatientsOrder/${user.hospitalID}/getTopMedications`,
        token
      );

      if (response?.status === 'success') {
        let medicationsData = [];

        if (Array.isArray(response?.data)) {
          medicationsData = response.data;
        } else if (response?.data && Array.isArray(response?.data?.data)) {
          medicationsData = response.data.data;
        }

        const processedData: TopMedication[] = medicationsData?.map((item: any) => ({
          name: item?.name || 'Unknown',
          prescribed: Number(item?.totalSold) || 0,
          category: item?.category || 'Unknown',
        }));
        setTopMedications(processedData.slice(0, 5));
      } else {
        setTopMedications([]);
      }
    } catch (error) {
      setTopMedications([]);
    } finally {
      setIsTopMedicationsLoading(false);
    }
  }, [user]);

  // Fetch recent prescriptions
  const fetchRecentPrescriptions = useCallback(async () => {
    if (!user?.hospitalID || !user?.token) return;

    setIsLoading(true);
    try {
      const token = user.token || (await AsyncStorage.getItem("token"));
      const response = await AuthFetch(
        `medicineInventoryPatientsOrder/${user.hospitalID}/pending/getMedicineInventoryPatientsOrder`,
        token
      );

      if (response?.status === 'success') {
        let prescriptionsData = [];

        if (Array.isArray(response?.data)) {
          prescriptionsData = response.data;
        } else if (response?.data && Array.isArray(response?.data?.data)) {
          prescriptionsData = response.data.data;
        }

        const sortedPrescriptions = prescriptionsData
          ?.sort((a: any, b: any) => new Date(b?.addedOn).getTime() - new Date(a?.addedOn).getTime())
          ?.slice(0, 5) || [];
        setRecentPrescriptions(sortedPrescriptions);
      } else {
        setRecentPrescriptions([]);
      }
    } catch (error) {
      setRecentPrescriptions([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Fetch low stock medicines
  const fetchLowStockMedicines = useCallback(async () => {
    if (!user?.hospitalID || !user?.token) return;

    try {
      const token = user.token || (await AsyncStorage.getItem("token"));
      const response = await AuthFetch(
        `/medicineInventoryPatientsOrder/${user.hospitalID}/getLowStockProductInfo`,
        token
      );

      if (response?.status === 'success') {
        if (Array.isArray(response?.data)) {
          setLowStockMedicineData(response.data);
        } else if (response?.data && Array.isArray(response?.data?.data)) {
          setLowStockMedicineData(response.data.data);
        } else {
          setLowStockMedicineData([]);
        }
      } else if (response?.message === 'Something went wrong') {
        setLowStockMedicineData([]);
      } else {
        setLowStockMedicineData([]);
      }
    } catch (error) {
      setLowStockMedicineData([]);
    }
  }, [user]);

  // Fetch expired medicines
  const fetchExpiredMedicines = useCallback(async () => {
    if (!user?.hospitalID || !user?.token) return;

    try {
      const token = user.token || (await AsyncStorage.getItem("token"));
      const response = await AuthFetch(
        `/medicineInventoryPatientsOrder/${user.hospitalID}/getExpiryProductInfo`,
        token
      );

      if (response?.status === 'success') {
        if (Array.isArray(response?.data)) {
          setExpiredMedicineData(response.data);
        } else if (response?.data && Array.isArray(response?.data?.data)) {
          setExpiredMedicineData(response.data.data);
        } else {
          setExpiredMedicineData([]);
        }
      } else if (response?.message === 'Something went wrong') {
        setExpiredMedicineData([]);
      } else {
        setExpiredMedicineData([]);
      }
    } catch (error) {
      setExpiredMedicineData([]);
    }
  }, [user]);

  // Load all data
  useEffect(() => {
    if (user?.hospitalID) {
      fetchDashboardCounts();
      fetchWeeklySalesData();
      fetchTopMedications();
      fetchRecentPrescriptions();
      fetchLowStockMedicines();
      fetchExpiredMedicines();
    }
  }, [
    user,
    fetchDashboardCounts,
    fetchWeeklySalesData,
    fetchTopMedications,
    fetchRecentPrescriptions,
    fetchLowStockMedicines,
    fetchExpiredMedicines
  ]);

  const onAddInventory = () => navigation.navigate("AddInventory");

  /* ----------- Sidebar actions ----------- */
  const go = (route: string) => {
    setMenuOpen(false);
    navigation.navigate(route as never);
  };

  const onLogoutPress = () => setConfirmVisible(true);
  const confirmLogout = async () => {
    try {
      await AsyncStorage.multiRemove(["token", "userID"]);
    } catch (e) {
      // Logout error handled silently
    } finally {
      setConfirmVisible(false);
      setMenuOpen(false);
      navigation.reset({ index: 0, routes: [{ name: "Login" as never }] });
    }
  };

  // Sidebar items for Pharmacy with SVG icons
  const sidebarItems: SidebarItem[] = [
    {
      key: "dash",
      label: "Dashboard",
      icon: LayoutDashboardIcon,
      onPress: () => go("DashboardPharma")
    },
    {
      key: "sale",
      label: "Sale",
      icon: ShoppingCartIcon,
      onPress: () => go("PharmacySale")
    },
    {
      key: "alerts",
      label: "Alerts",
      icon: BellIcon,
      onPress: () => go("PharmacyAlerts")
    },
    {
      key: "orders",
      label: "Patient Orders",
      icon: FileTextIcon,
      onPress: () => go("PatientOrders")
    },
    {
      key: "tax",
      label: "Tax Invoice",
      icon: DollarSignIcon,
      onPress: () => go("TaxInvoice")
    },
    {
      key: "stock",
      label: "In Stock",
      icon: PackageIcon,
      onPress: () => go("InStock")
    },
    {
      key: "add",
      label: "Add Inventory",
      icon: PlusIcon,
      onPress: () => go("AddInventory")
    },
    {
      key: "orderplacement",
      label: "Order Placement",
      icon: ShoppingCartIcon,
      onPress: () => go("OrderPlacement")
    },
  ];

  const bottomItems: SidebarItem[] = [
    {
      key: "modules",
      label: "Go to Modules",
      icon: GridIcon,
      onPress: () => go("Home")
    },
    {
      key: "help",
      label: "Help",
      icon: HelpCircleIcon,
      onPress: () => go("HelpScreen")
    },
    {
      key: "logout",
      label: "Logout",
      icon: LogOutIcon,
      onPress: onLogoutPress,
      variant: "danger"
    },
  ];

  // Render medication item
  const renderMedicationItem = ({ item, index }: { item: TopMedication; index: number }) => (
    <View style={styles.medicationItem}>
      <View style={styles.medicationRank}>
        <Text style={styles.rankText}>#{index + 1}</Text>
      </View>
      <View style={styles.medicationIcon}>
        <PillIcon size={isSmallPhone ? 16 : 20} color="#14b8a6" />
      </View>
      <View style={styles.medicationInfo}>
        <Text style={styles.medicationName} numberOfLines={1}>
          {item?.name}
        </Text>
        <Text style={styles.medicationCategory}>{item?.category}</Text>
      </View>
      <View style={styles.prescribedCount}>
        <Text style={styles.prescribedText}>{item?.prescribed}</Text>
        <Text style={styles.prescribedLabel}>prescribed</Text>
      </View>
    </View>
  );

  // Render prescription item
  const renderPrescriptionItem = ({ item }: { item: PharmacyOrder }) => (
    <TouchableOpacity style={styles.prescriptionItem}>
      <View style={styles.prescriptionHeader}>
        <Text style={styles.patientName}>{item?.pName}</Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: item?.alertStatus?.toLowerCase() === 'pending' ? '#fef3c7' : '#d1fae5' }
        ]}>
          <Text style={[
            styles.statusText,
            { color: item?.alertStatus?.toLowerCase() === 'pending' ? '#92400e' : '#065f46' }
          ]}>
            {item?.alertStatus || 'Pending'}
          </Text>
        </View>
      </View>
      <View style={styles.prescriptionDetails}>
        <Text style={styles.detailText}>
          {item?.medicinesList?.length || 0} items • {formatDate(item?.addedOn)}
        </Text>
        <Text style={styles.detailText}>
          {item?.location || '-'}
        </Text>
      </View>
      <View style={styles.prescriptionFooter}>
        <Text style={styles.amountText}>
        </Text>
        <EyeIcon size={isSmallPhone ? 14 : 16} color="#6b7280" />
      </View>
    </TouchableOpacity>
  );

  // Format currency to remove "₹0" display
  const formatCurrency = (amount: number) => {
    if (amount === 0) return '₹0';
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#14b8a6" />
        <Text style={styles.loadingText}>Loading Pharmacy Dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle={Platform.OS === "android" ? "dark-content" : "dark-content"} />
      <HeaderBar title="Pharmacy Management" onMenu={() => setMenuOpen(true)} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.containerContent, 
          { 
            paddingBottom: FOOTER_HEIGHT + (hasBottomInsets ? insets.bottom : 16) + 16 
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {isDashboardCountsLoading ? (
            <ActivityIndicator size="small" color="#14b8a6" />
          ) : dashboardCounts ? (
            <>
              <StatCard
                title="Prescriptions Today"
                value={dashboardCounts.prescriptionsToday}
                icon={FileTextIcon}
                color="#14b8a6"
              />
              <StatCard
                title="Pending Orders"
                value={dashboardCounts.prescriptionsToday - dashboardCounts.acceptedPrescriptions}
                icon={ClockIcon}
                color="#f59e0b"
              />
              <StatCard
                title="Low Stock Items"
                value={dashboardCounts.lowStockItems}
                icon={AlertTriangleIcon}
                color="#ef4444"
              />
              <StatCard
                title="Revenue Today"
                value={formatCurrency(dashboardCounts.revenueToday)}
                icon={IndianRupeeIcon}
                color="#10b981"
              />
            </>
          ) : (
            <Text style={styles.noDataText}>No dashboard data available</Text>
          )}
        </View>

        {/* Primary action */}
        <View style={styles.controlPanel}>
          <TouchableOpacity style={styles.primaryBtn} onPress={onAddInventory} activeOpacity={0.85}>
            <PlusIcon size={isSmallPhone ? 16 : 18} color="#fff" />
            <Text style={styles.primaryBtnText}>Add New Inventory</Text>
          </TouchableOpacity>
        </View>

        {/* Charts Section */}
        <View style={styles.chartsSection}>
          {/* Sales Chart */}
          <ChartCard title="Weekly Sales & Prescriptions">
            {isWeeklyDataLoading ? (
              <ActivityIndicator size="small" color="#14b8a6" />
            ) : weeklySalesData?.length > 0 ? (
              <View style={styles.chartContainer}>
                <LineChart
                  data={{
                    labels: weeklySalesData?.map(item => item?.day),
                    datasets: [
                      {
                        data: weeklySalesData?.map(item => item?.sales),
                        color: () => '#14b8a6',
                        strokeWidth: 3,
                      },
                      {
                        data: weeklySalesData?.map(item => item?.prescriptions),
                        color: () => '#f59e0b',
                        strokeWidth: 2,
                        withDots: false,
                      },
                    ],
                    legend: ['Sales Revenue', 'Prescriptions'],
                  }}
                  width={W - (isSmallPhone ? 48 : 64)}
                  height={isSmallPhone ? 180 : 220}
                  yAxisLabel="₹"
                  yAxisSuffix=""
                  chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                    style: {
                      borderRadius: 16,
                    },
                    propsForDots: {
                      r: '5',
                      strokeWidth: '2',
                      stroke: '#14b8a6',
                    },
                    propsForBackgroundLines: {
                      stroke: '#e5e7eb',
                      strokeDasharray: '3 3',
                    },
                  }}
                  bezier
                  style={{
                    marginVertical: 8,
                    borderRadius: 16,
                  }}
                  withVerticalLines={false}
                  withHorizontalLines={true}
                  withHorizontalLabels={true}
                  withVerticalLabels={true}
                  fromZero={true}
                />
                <View style={styles.legend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#14b8a6' }]} />
                    <Text style={styles.legendText}>Sales Revenue</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
                    <Text style={styles.legendText}>Prescriptions</Text>
                  </View>
                </View>
              </View>
            ) : (
              <Text style={styles.noDataText}>No sales data available</Text>
            )}
          </ChartCard>

          {/* Top Medications */}
          <ChartCard title="Top Medications">
            {isTopMedicationsLoading ? (
              <ActivityIndicator size="small" color="#14b8a6" />
            ) : topMedications?.length > 0 ? (
              <FlatList
                data={topMedications}
                renderItem={renderMedicationItem}
                keyExtractor={(item, index) => `${item?.name}-${index}`}
                scrollEnabled={false}
              />
            ) : (
              <Text style={styles.noDataText}>No medication data available</Text>
            )}
          </ChartCard>
        </View>

        {/* Recent Prescriptions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Prescriptions</Text>
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View All</Text>
              <ChevronRightIcon size={isSmallPhone ? 14 : 16} color="#14b8a6" />
            </TouchableOpacity>
          </View>
          {recentPrescriptions?.length > 0 ? (
            <FlatList
              data={recentPrescriptions}
              renderItem={renderPrescriptionItem}
              keyExtractor={(item) => item?.id?.toString()}
              scrollEnabled={false}
              style={styles.prescriptionsList}
            />
          ) : (
            <Text style={styles.noDataText}>No recent prescriptions</Text>
          )}
        </View>

      </ScrollView>

      <View style={[
        styles.footerWrap, 
        { 
          bottom: hasBottomInsets ? insets.bottom : 0,
          height: FOOTER_HEIGHT
        }
      ]}>
        <Footer active={"dashboard"} brandColor="#14b8a6" />
      </View>

      {hasBottomInsets && (
        <View pointerEvents="none" style={[styles.navShield, { height: insets.bottom }]} />
      )}

      {/* Slide-in Sidebar */}
      <Sidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        userName={userName}
        userImage={userImg}
        onProfile={() => {
          setMenuOpen(false);
          navigation.navigate("Profile" as never);
        }}
        items={sidebarItems}
        bottomItems={bottomItems}
      />

      {/* Logout confirm */}
      <ConfirmDialog
        visible={confirmVisible}
        title="Confirm Logout"
        message="Are you sure you want to logout? This will clear your saved session."
        onCancel={() => setConfirmVisible(false)}
        onConfirm={confirmLogout}
        confirmText="Logout"
      />
    </View>
  );
};

export default DashboardPharma;

/* -------------------------- Styles -------------------------- */
const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: "#fff" 
  },

  /* Header */
  header: {
    height: isSmallPhone ? 80 : 100,
    paddingHorizontal: isSmallPhone ? 12 : 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#14b8a6",
  },
  headerTitle: { 
    fontSize: isSmallPhone ? 20 : 24, 
    fontWeight: "700", 
    color: "#fdfdfdff" 
  },
  menuBtn: {
    width: isSmallPhone ? 32 : 38,
    height: isSmallPhone ? 32 : 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  container: { 
    flex: 1, 
    backgroundColor: "#fff" 
  },
  containerContent: { 
    padding: isSmallPhone ? 12 : 16, 
    paddingBottom: 32, 
    gap: isSmallPhone ? 12 : 16 
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: isSmallPhone ? 14 : 16,
    color: '#6b7280',
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: isSmallPhone ? 8 : 12,
    justifyContent: "space-between"
  },
  statCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: isSmallPhone ? 12 : 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    width: (W - (isSmallPhone ? 12 * 2 : 16 * 2) - (isSmallPhone ? 8 : 12)) / 2,
    minHeight: isSmallPhone ? 80 : 100,
  },
  statContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flex: 1,
  },
  statInfo: {
    flex: 1,
  },
  statTitle: {
    fontSize: isSmallPhone ? 12 : 14,
    color: "#6b7280",
    marginBottom: 4,
  },
  statValue: {
    fontSize: isSmallPhone ? 16 : 20,
    fontWeight: "bold",
    color: "#0f172a",
  },
  statIcon: {
    width: isSmallPhone ? 40 : 48,
    height: isSmallPhone ? 40 : 48,
    borderRadius: isSmallPhone ? 20 : 24,
    justifyContent: "center",
    alignItems: "center",
  },

  controlPanel: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "flex-end" 
  },
  primaryBtn: {
    backgroundColor: "#1C7C6B",
    height: isSmallPhone ? 40 : 44,
    borderRadius: 12,
    paddingHorizontal: isSmallPhone ? 12 : 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  primaryBtnText: { 
    color: "#fff", 
    fontWeight: "700", 
    fontSize: isSmallPhone ? 13 : 14 
  },

  chartsSection: { 
    gap: isSmallPhone ? 12 : 16 
  },
  chartCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: isSmallPhone ? 12 : 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  chartHeader: {
    marginBottom: isSmallPhone ? 12 : 16,
  },
  chartTitle: {
    fontSize: isSmallPhone ? 16 : 18,
    fontWeight: "600",
    color: "#0f172a",
  },
  chartContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: isSmallPhone ? 11 : 12,
    color: "#6b7280",
  },

  medicationItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: isSmallPhone ? 10 : 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  medicationRank: {
    width: isSmallPhone ? 28 : 32,
    height: isSmallPhone ? 28 : 32,
    borderRadius: isSmallPhone ? 14 : 16,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: isSmallPhone ? 8 : 12,
  },
  rankText: {
    fontSize: isSmallPhone ? 10 : 12,
    fontWeight: "bold",
    color: "#475569",
  },
  medicationIcon: {
    width: isSmallPhone ? 32 : 36,
    height: isSmallPhone ? 32 : 36,
    borderRadius: isSmallPhone ? 16 : 18,
    backgroundColor: "#ecfdf5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: isSmallPhone ? 8 : 12,
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: isSmallPhone ? 13 : 14,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 2,
  },
  medicationCategory: {
    fontSize: isSmallPhone ? 11 : 12,
    color: "#6b7280",
  },
  prescribedCount: {
    alignItems: "flex-end",
  },
  prescribedText: {
    fontSize: isSmallPhone ? 14 : 16,
    fontWeight: "bold",
    color: "#14b8a6",
  },
  prescribedLabel: {
    fontSize: isSmallPhone ? 9 : 10,
    color: "#6b7280",
    textTransform: "uppercase",
  },

  section: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: isSmallPhone ? 12 : 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: isSmallPhone ? 12 : 16,
  },
  sectionTitle: {
    fontSize: isSmallPhone ? 16 : 18,
    fontWeight: "600",
    color: "#0f172a",
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewAllText: {
    fontSize: isSmallPhone ? 13 : 14,
    color: "#14b8a6",
    fontWeight: "500",
  },
  prescriptionsList: {
    gap: isSmallPhone ? 10 : 12,
  },
  prescriptionItem: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: isSmallPhone ? 12 : 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  prescriptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  patientName: {
    fontSize: isSmallPhone ? 14 : 16,
    fontWeight: "600",
    color: "#0f172a",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: isSmallPhone ? 11 : 12,
    fontWeight: "500",
  },
  prescriptionDetails: {
    marginBottom: 8,
  },
  detailText: {
    fontSize: isSmallPhone ? 13 : 14,
    color: "#6b7280",
    marginBottom: 2,
  },
  prescriptionFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amountText: {
    fontSize: isSmallPhone ? 14 : 16,
    fontWeight: "600",
    color: "#0f172a",
  },

  alertsSection: {
    gap: isSmallPhone ? 12 : 16,
  },
  alertCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: isSmallPhone ? 12 : 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  alertTitle: {
    fontSize: isSmallPhone ? 14 : 16,
    fontWeight: "600",
    color: "#0f172a",
  },
  alertCount: {
    fontSize: isSmallPhone ? 13 : 14,
    color: "#6b7280",
  },
  alertList: {
    gap: 8,
  },
  alertItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  alertItemName: {
    fontSize: isSmallPhone ? 13 : 14,
    color: "#0f172a",
    flex: 1,
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stockText: {
    fontSize: isSmallPhone ? 11 : 12,
    fontWeight: "500",
  },
  expiryDate: {
    fontSize: isSmallPhone ? 11 : 12,
    color: "#ef4444",
    fontWeight: "500",
  },

  noDataText: {
    textAlign: "center",
    color: "#6b7280",
    fontSize: isSmallPhone ? 13 : 14,
    paddingVertical: 20,
  },

  /* Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
  },
  modalTitle: { 
    fontSize: isSmallPhone ? 16 : 17, 
    fontWeight: "800", 
    color: "#0b1220" 
  },
  modalMsg: { 
    fontSize: isSmallPhone ? 13 : 14, 
    color: "#334155", 
    marginTop: 8 
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
  },
  modalBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalBtnGhost: {
    backgroundColor: "#ecfeff",
  },
  modalBtnDanger: {
    backgroundColor: "#ef4444",
  },
  modalBtnText: {
    fontWeight: "700",
    fontSize: isSmallPhone ? 13 : 14,
  },
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e2e8f0",
    zIndex: 10,
    elevation: 6,
  },
  navShield: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    zIndex: 9,
  },
});