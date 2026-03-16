import React, { useState, useEffect, JSX } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { RootState } from "../../../store/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthFetch } from "../../../auth/auth";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Utils
import { SPACING, FONT_SIZE, FOOTER_HEIGHT } from "../../../utils/responsive";
import { COLORS } from "../../../utils/colour";
import { formatDateTime } from "../../../utils/dateTime";

// Icons
import {
  UserIcon,
  PhoneIcon,
  EmailIcon,
  ChevronLeftIcon,
} from "../../../utils/SvgIcons";

import Footer from "../../dashboard/footer";
import PharmacyExpensesInnerTable from "./PharmacyExpensesInnerTable";

interface ExpenseData {
  id: number;
  agencyName: string;
  email: string;
  contactNo: string;
  agentCode: number | string;
  manufacturer: string;
  addedOn: string;
  medicinesList: any[];
  totalValue?: number;
  status?: string;
  firstName?: string;
  lastName?: string;
}

const OrderDetailScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const user = useSelector((state: RootState) => state.currentUser);

  const { orderData } = route.params as { orderData: ExpenseData };

  const [loading, setLoading] = useState(false);
  const [detailedData, setDetailedData] = useState<ExpenseData | null>(null);

  useEffect(() => {
    if (orderData?.id && user?.hospitalID) {
      fetchOrderDetails();
    } else {
      setDetailedData(orderData);
    }
  }, [orderData, user]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const response: any = await AuthFetch(
        `medicineInventoryExpense/${user?.hospitalID}/getExpenseById/${orderData.id}`,
        token
      );

      if (response?.data?.status === 200) {
        setDetailedData(response.data.data);
      } else {
        setDetailedData(orderData);
      }
    } catch {
      setDetailedData(orderData);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) =>
    `₹${(value || 0).toLocaleString()}`;

  const data = detailedData || orderData;
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.brand} />
        <Text style={styles.loadingText}>Fetching order details…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.card} />

      {/* Header */}
      <View style={styles.header}>
          <Text style={styles.headerSubtitle}>
            #{data.id} • {data.agencyName}
          </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: SPACING.md,
          paddingBottom: FOOTER_HEIGHT + insets.bottom + SPACING.xl,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Summary</Text>

          <InfoRow label="Manufacturer" value={data.manufacturer || "—"} />
          <InfoRow label="Agent Code" value={data.agentCode || "—"} />
          <InfoRow label="Added On" value={formatDateTime(data.addedOn)} />    
        </View>

        {/* Agency Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Agency Details</Text>

          <IconRow icon={<PhoneIcon size={16} color={COLORS.sub} />} value={data.contactNo || "—"} />
          <IconRow icon={<EmailIcon size={16} color={COLORS.sub} />} value={data.email || "—"} />

          {data.firstName && (
            <IconRow
              icon={<UserIcon size={16} color={COLORS.sub} />}
              value={`${data.firstName} ${data.lastName || ""}`}
            />
          )}
        </View>

        {/* Medicines */}
        {!!data.medicinesList?.length && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Medicines ({data.medicinesList.length})
            </Text>

            <PharmacyExpensesInnerTable
              data={data.medicinesList}
              parentComponentName="OrderDetail"
            />

          </View>
        )}
      </ScrollView>

      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active="orderplacement" brandColor={COLORS.brand} />
      </View>
    </SafeAreaView>
  );
};

/* ---------------------------------- */
/* Reusable Components */
/* ---------------------------------- */

const InfoRow = ({ label, value }: { label: string; value: any }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const IconRow = ({ icon, value }: { icon: JSX.Element; value: string }) => (
  <View style={styles.iconRow}>
    {icon}
    <Text style={styles.iconValue}>{value}</Text>
  </View>
);

/* ---------------------------------- */
/* Styles */
/* ---------------------------------- */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: SPACING.sm,
    color: COLORS.sub,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    marginTop: 2,
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
  },

  cardTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
    marginBottom: SPACING.sm,
    color: COLORS.text,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.xs,
  },
  infoLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
  },
  infoValue: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
    color: COLORS.text,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },

  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  amountLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
  },
  amountValue: {
    fontSize: FONT_SIZE.md,
    fontWeight: "800",
    color: COLORS.brand,
  },

  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  iconValue: {
    marginLeft: SPACING.sm,
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
  },

  totalFooter: {
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalFooterLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
  },
  totalFooterValue: {
    fontSize: FONT_SIZE.md,
    fontWeight: "800",
    color: COLORS.brand,
  },

  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    height: FOOTER_HEIGHT,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
});

export default OrderDetailScreen;
