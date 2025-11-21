// AllAlerts.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from "react-native";
import { AlertType } from "../../../utils/types";
import { styles } from "./AlertsStyles";
import { formatDateTime } from "../../../utils/dateTime";



interface AllAlertsProps {
  HighPriorityData: AlertType[];
  MediumPriorityData: AlertType[];
  LowPriorityData: AlertType[];
  handleIsSeen: (id: number) => void;
  navigation: any;
}

const AlertCard: React.FC<{
  alert: AlertType;
  onViewDetails: (alert: AlertType) => void;
  onMarkSeen: (id: number) => void;
}> = ({ alert, onViewDetails, onMarkSeen }) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High": return "#dc2626";
      case "Medium": return "#ca8a04";
      case "Low": return "#16a34a";
      default: return "#6b7280";
    }
  };

  const getPriorityBackground = (priority: string) => {
    switch (priority) {
      case "High": return "#fee2e2";
      case "Medium": return "#fef9c3";
      case "Low": return "#dcfce7";
      default: return "#f3f4f6";
    }
  };

  return (
    <TouchableOpacity
      style={styles.alertCard}
      onPress={() => onViewDetails(alert)}
      activeOpacity={0.7}
    >
      <View style={styles.alertHeader}>
        <View style={styles.patientInfo}>
          <Text style={styles.patientName}>{alert.patientName}</Text>
          <Text style={styles.patientId}>ID: {alert.patientID}</Text>
        </View>
        <View style={[styles.priorityBadge, { backgroundColor: getPriorityBackground(alert.priority) }]}>
          <Text style={[styles.priorityText, { color: getPriorityColor(alert.priority) }]}>
            {alert.priority}
          </Text>
        </View>
      </View>

      <View style={styles.alertBody}>
        <Text style={styles.alertMessage}>{alert.alertMessage}</Text>
        <Text style={styles.alertValue}>Value: {alert.alertValue}</Text>
      </View>

      <View style={styles.alertFooter}>
        <View style={styles.footerLeft}>
          <Text style={styles.wardText}>Ward: {alert.ward}</Text>
          <Text style={styles.dateText}>{formatDateTime(alert.datetime)}</Text>
        </View>
        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => {
            onMarkSeen(alert.id);
            onViewDetails(alert);
          }}
        >
          <Text style={styles.viewButtonText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const PrioritySection: React.FC<{
  title: string;
  alerts: AlertType[];
  color: string;
  onViewDetails: (alert: AlertType) => void;
  onMarkSeen: (id: number) => void;
}> = ({ title, alerts, color, onViewDetails, onMarkSeen }) => {
  if (alerts?.length === 0) return null;

  return (
    <View style={styles.prioritySection}>
      <View style={[styles.sectionHeader, { borderLeftColor: color }]}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionCount}>{alerts?.length ?? 0} alerts</Text>
      </View>
      <View style={styles.alertsList}>
        {alerts?.map((alert) => (
          <AlertCard
            key={alert.id}
            alert={alert}
            onViewDetails={onViewDetails}
            onMarkSeen={onMarkSeen}
          />
        ))}
      </View>
    </View>
  );
};

const AlertDetailModal: React.FC<{
  visible: boolean;
  alert: AlertType | null;
  onClose: () => void;
  onViewPatient: (patientID: number) => void;
}> = ({ visible, alert, onClose, onViewPatient }) => {
  if (!alert) return null;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High": return "#dc2626";
      case "Medium": return "#ca8a04";
      case "Low": return "#16a34a";
      default: return "#6b7280";
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Alert Details</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>Patient Information</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>Name:</Text>
              <Text style={styles.detailValue}>{alert.patientName}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>Patient ID:</Text>
              <Text style={styles.detailValue}>{alert.patientID}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>Ward:</Text>
              <Text style={styles.detailValue}>{alert.ward}</Text>
            </View>
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>Alert Details</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>Priority:</Text>
              <View style={[styles.priorityBadge, { backgroundColor: `${getPriorityColor(alert.priority)}15` }]}>
                <Text style={[styles.priorityText, { color: getPriorityColor(alert.priority) }]}>
                  {alert.priority}
                </Text>
              </View>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>Message:</Text>
              <Text style={[styles.detailValue, styles.alertMessageText]}>{alert.alertMessage}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>Value:</Text>
              <Text style={styles.detailValue}>{alert.alertValue}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>Time:</Text>
              <Text style={styles.detailValue}>{formatDateTime(alert.datetime)}</Text>
            </View>
          </View>

          {alert.nurseName && (
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Assigned Staff</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Nurse:</Text>
                <Text style={styles.detailValue}>{alert.nurseName}</Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={styles.patientButton}
            onPress={() => onViewPatient(alert.patientID)}
          >
            <Text style={styles.patientButtonText}>View Patient Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const AllAlerts: React.FC<AllAlertsProps> = ({
  HighPriorityData,
  MediumPriorityData,
  LowPriorityData,
  handleIsSeen,
  navigation,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAlert, setSelectedAlert] = useState<AlertType | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<"All" | "High" | "Medium" | "Low">("All");

  const filterAlerts = (alerts: AlertType[]) => {
    return alerts?.filter(alert => {
      const matchesSearch = 
        searchQuery === "" ||
        alert.patientName?.toLowerCase()?.includes(searchQuery.toLowerCase()) ||
        alert.alertMessage?.toLowerCase()?.includes(searchQuery.toLowerCase()) ||
        alert.alertValue?.toLowerCase()?.includes(searchQuery.toLowerCase());
      
      const matchesSeverity = 
        severityFilter === "All" ||
        alert.priority === severityFilter;

      return matchesSearch && matchesSeverity;
    }) ?? [];
  };

  const filteredHighPriority = filterAlerts(HighPriorityData);
  const filteredMediumPriority = filterAlerts(MediumPriorityData);
  const filteredLowPriority = filterAlerts(LowPriorityData);

  const handleViewDetails = (alert: AlertType) => {
    setSelectedAlert(alert);
    setShowModal(true);
  };

  const handleViewPatient = (patientID: number) => {
    setShowModal(false);
    navigation.navigate("PatientDetails", { patientId: patientID });
  };

  const handleMarkSeen = (id: number) => {
    handleIsSeen(id);
  };

  const totalAlerts = filteredHighPriority.length + filteredMediumPriority.length + filteredLowPriority.length;

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search alerts..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <View style={styles.filterButtons}>
          {(["All", "High", "Medium", "Low"] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterButton, severityFilter === filter && styles.filterButtonActive]}
              onPress={() => setSeverityFilter(filter)}
            >
              <Text style={[styles.filterButtonText, severityFilter === filter && styles.filterButtonTextActive]}>
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={styles.resultsCount}>
        {totalAlerts} alert{totalAlerts !== 1 ? 's' : ''} found
      </Text>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <PrioritySection
          title="High Priority - Immediate Attention"
          alerts={filteredHighPriority}
          color="#dc2626"
          onViewDetails={handleViewDetails}
          onMarkSeen={handleMarkSeen}
        />

        <PrioritySection
          title="Medium Priority - Monitor Closely"
          alerts={filteredMediumPriority}
          color="#ca8a04"
          onViewDetails={handleViewDetails}
          onMarkSeen={handleMarkSeen}
        />

        <PrioritySection
          title="Low Priority - Routine Alerts"
          alerts={filteredLowPriority}
          color="#16a34a"
          onViewDetails={handleViewDetails}
          onMarkSeen={handleMarkSeen}
        />

        {totalAlerts === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No Alerts Found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery || severityFilter !== "All" 
                ? "Try adjusting your search or filter criteria"
                : "All alerts are currently resolved"
              }
            </Text>
          </View>
        )}
      </ScrollView>

      <AlertDetailModal
        visible={showModal}
        alert={selectedAlert}
        onClose={() => setShowModal(false)}
        onViewPatient={handleViewPatient}
      />
    </View>
  );
};

export default AllAlerts;