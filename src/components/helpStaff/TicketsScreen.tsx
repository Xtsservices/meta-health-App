import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Alert,
  SafeAreaView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { ArrowLeftIcon, PlusIcon } from "../../utils/SvgIcons";
import { RootState } from "../../store/store";
import { AuthFetch } from "../../auth/auth";
import { formatDate } from "../../utils/dateTime";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Types
type TicketType = {
  id: number;
  priority: number;
  status: number;
  dueDate: string;
  type: string;
  assignedName: string;
  module: string;
  subject: string;
};

type PriorityBadgeProps = {
  priority: number;
};

const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
  const getPriorityStyle = () => {
    switch (priority) {
      case 0: return styles.priorityLow;
      case 1: return styles.priorityMedium;
      case 2: return styles.priorityHigh;
      default: return styles.priorityLow;
    }
  };

  const getPriorityText = () => {
    switch (priority) {
      case 0: return "Low";
      case 1: return "Medium";
      case 2: return "High";
      default: return "Low";
    }
  };

  return (
    <View style={[styles.priorityBadge, getPriorityStyle()]}>
      <Text style={styles.priorityText}>{getPriorityText()}</Text>
    </View>
  );
};

const TicketsScreen: React.FC = () => {
  const navigation = useNavigation();
  const user = useSelector((state: RootState) => state.currentUser);
  const [ticketData, setTicketData] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);

  const getAllData = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!user?.hospitalID) return;
      
      const res = await AuthFetch(
        `ticket/hospital/${user.hospitalID}/getAllTickets/${user.id}`,
        token
      ) as any;
      
      if (res?.status === "success") {
        setTicketData(res?.data?.tickets || []);
      }
    } catch (error) {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getAllData();
  }, [user]);
  const handleCreateNewTicket = () => {
    navigation.navigate("NewTicketScreen" as never);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading tickets...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <ScrollView style={styles.scrollView}>
        {/* Create New Ticket Button */}
        <TouchableOpacity 
          style={styles.createNewButton}
          onPress={handleCreateNewTicket}
        >
          <PlusIcon size={20} color="#fff" />
          <Text style={styles.createNewButtonText}>Create New Ticket</Text>
        </TouchableOpacity>

        {/* Tickets List */}
        <View style={styles.ticketsList}>
          {ticketData?.length === 0 ? (
            <View style={styles.noTickets}>
              <Text style={styles.noTicketsText}>No tickets found</Text>
            </View>
          ) : (
            ticketData?.map?.((ticket, index) => (
              <TouchableOpacity
                key={ticket.id}
                style={[
                  styles.ticketCard,
                  index % 2 === 0 ? styles.ticketCardEven : styles.ticketCardOdd,
                ]}
              >
                <View style={styles.ticketRow}>
                  <View style={styles.ticketCell}>
                    <Text style={styles.cellLabel}>Ticket ID</Text>
                    <Text style={styles.cellValue}>#{ticket.id}</Text>
                  </View>
                  <View style={styles.ticketCell}>
                    <Text style={styles.cellLabel}>Status</Text>
                    <PriorityBadge priority={ticket.priority} />
                  </View>
                </View>

                <View style={styles.ticketRow}>
                  <View style={styles.ticketCell}>
                    <Text style={styles.cellLabel}>Due By</Text>
                    <Text style={styles.cellValue}>{ticket.dueDate ? formatDate(ticket.dueDate) : "Not assigned"}</Text>
                  </View>
                  <View style={styles.ticketCell}>
                    <Text style={styles.cellLabel}>Type</Text>
                    <Text style={styles.cellValue}>{ticket.type}</Text>
                  </View>
                </View>

                <View style={styles.ticketRow}>
                  <View style={styles.ticketCell}>
                    <Text style={styles.cellLabel}>Assigned To</Text>
                    <Text style={styles.cellValue}>
                      {ticket.assignedName?.[0]?.toUpperCase() + 
                       ticket.assignedName?.slice?.(1) || "Not assigned yet"}
                    </Text>
                  </View>
                  <View style={styles.ticketCell}>
                    <Text style={styles.cellLabel}>Module</Text>
                    <Text style={styles.cellValue}>{ticket.module || "N/A"}</Text>
                  </View>
                  
                </View>
                <View style={styles.ticketRow}>
                  <View style={styles.ticketCell}>
                    <Text style={styles.cellLabel}>Subject</Text>
                    <Text style={styles.cellValue}>
                      {ticket?.subject}
                    </Text>
                  </View>
                
                  
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const { width } = Dimensions.get("window");
const isTablet = width >= 768;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  createNewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#14b8a6",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  createNewButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    fontStyle: "italic",
  },
  ticketsList: {
    gap: 12,
      marginBottom: 30,
  },
  ticketCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  ticketCardEven: {
    backgroundColor: "#fff",
  },
  ticketCardOdd: {
    backgroundColor: "#f8f9fa",
  },
  ticketRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  ticketCell: {
    flex: 1,
  },
  cellLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
    fontWeight: "500",
    fontStyle: "italic",
  },
  cellValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  priorityLow: {
    backgroundColor: "#d1fae5",
  },
  priorityMedium: {
    backgroundColor: "#fef3c7",
  },
  priorityHigh: {
    backgroundColor: "#fee2e2",
  },
  priorityText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
  },
  noTickets: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  noTicketsText: {
    fontSize: 16,
    color: "#666",
  },
});

export default TicketsScreen;