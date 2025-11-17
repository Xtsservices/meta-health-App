// components/Notification/NotificationDialog.tsx
import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useSelector ,useDispatch} from "react-redux";
import { RootState } from "../../store/store";
import { AuthFetch } from "../../auth/auth";
import { MedicineReminderType } from "../../utils/types";
import MedicineCard from "./MedicineCard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { formatDate, formatTime } from "../../utils/dateTime";
import { NotificationStyles as styles } from "./NotificationStyles";
import { ClockIcon } from "../../utils/SvgIcons";
import { showError } from "../../store/toast.slice";

type NotificationDialogProps = {
  visible: boolean;
  onClose: () => void;
  timelineID: number | undefined;
  patientName: string;
};

type RemindersType = {
  [date: string]: MedicineReminderType[];
};

type ReminderGroup = {
  dosageTime: string;
  reminders: MedicineReminderType[];
  percentage?: number;
};

const NotificationDialog: React.FC<NotificationDialogProps> = ({
  visible,
  onClose,
  timelineID,
  patientName,
}) => {
  const user = useSelector((s: RootState) => s.currentUser);
  const [reminders, setReminders] = useState<RemindersType | null>(null);
  const [dateArray, setDateArray] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [reminderGroup, setReminderGroup] = useState<ReminderGroup[][]>([]);
  const dispatch = useDispatch();
  const getNotificationData = async () => {
    if (!timelineID) return;

    try {
      const token = user?.token || (await AsyncStorage.getItem("token"));
      setLoading(true);
      const response = await AuthFetch(
        `medicine/${timelineID}/reminders/all/notifications`,
        token
      );

      if (response?.status === "success" && response?.data?.message === "success") {
        setReminders(response?.data?.reminders || {});
      } else if (response?.message === "success") {
        setReminders(response?.reminders || {});
      } else {
        setReminders({});
      }
    } catch (error) {
      dispatch(showError(error?.response?.data?.message || 'Failed to load notifications'));
      setReminders({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && timelineID) {
      getNotificationData();
      
      const interval = setInterval(() => {
        getNotificationData();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [visible, timelineID]);

  useEffect(() => {
    if (reminders) {
      const dates = Object.keys(reminders);
      setDateArray(dates);
      
      if (activeIndex >= dates?.length) {
        setActiveIndex(0);
      }
    }
  }, [reminders]);

  useEffect(() => {
    if (reminders && dateArray?.length > 0) {
      const finalGroupReminder: ReminderGroup[][] = [];
      
      dateArray?.forEach((date) => {
        const dateReminders = reminders[date] || [];
        
        const groupedReminders: ReminderGroup[] = dateReminders?.reduce<ReminderGroup[]>(
          (acc, reminder) => {
            const dosageTime = reminder?.dosageTime;
            const existingGroup = acc?.find(group => group?.dosageTime === dosageTime);

            if (existingGroup) {
              existingGroup?.reminders?.push(reminder);
            } else {
              acc?.push({
                dosageTime: dosageTime,
                reminders: [reminder],
              });
            }
            return acc;
          }, []
        );

        if (groupedReminders?.length > 0) {
          const groupsWithPercentage = groupedReminders?.map(group => {
            const percentage =
              (group?.reminders?.filter(medicine => medicine?.doseStatus === 1)?.length /
                group?.reminders?.length) * 100;
            return { ...group, percentage };
          });
          finalGroupReminder?.push(groupsWithPercentage);
        } else {
          finalGroupReminder?.push([]);
        }
      });

      setReminderGroup(finalGroupReminder);
    }
  }, [reminders, dateArray]);

  const currentTimeGroups = useMemo(() => {
    const groups = reminderGroup[activeIndex]?.sort(compareDates) || [];
    return groups;
  }, [reminderGroup, activeIndex]);

  const compareDates = (a: ReminderGroup, b: ReminderGroup) => {
    return new Date(a?.dosageTime)?.valueOf() - new Date(b?.dosageTime)?.valueOf();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header - Fixed Height */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderContent}>
              <Text style={styles.modalTitle}>Treatment Notification</Text>
              <Text style={styles.modalPatientName}>Patient: {patientName}</Text>
              <Text style={styles.patientId}>Timeline ID: {timelineID}</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          {/* Content - Flexible */}
          <View style={styles.content}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#14b8a6" />
                <Text style={styles.loadingText}>Loading notifications...</Text>
              </View>
            ) : (
              <View style={styles.container}>
                {/* Date Tabs - Fixed Height */}
                {dateArray?.length > 0 ? (
                  <View style={styles.dateTabsWrapper}>
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.dateTabsContent}
                    >
                      {dateArray?.map((date, index) => (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.dateTab,
                            index === activeIndex && styles.dateTabActive
                          ]}
                          onPress={() => setActiveIndex(index)}
                        >
                          <Text style={[
                            styles.dateTabText,
                            index === activeIndex && styles.dateTabTextActive
                          ]}>
                            {formatDate(date)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                ) : (
                  <View style={styles.noDatesContainer}>
                    <Text style={styles.noDatesText}>No medication dates found</Text>
                  </View>
                )}

                {/* Medicine Section - Flexible */}
                <View style={styles.medicineSection}>
                  <View style={styles.medicineHeader}>
                    <Text style={styles.medicineTitle}>Medicine Details</Text>
                    <Text style={styles.currentTime}>
                      Current: {new Date()?.toLocaleString("en-US", {
                        hour: "numeric",
                        minute: "numeric",
                        hour12: true,
                      })}
                    </Text>
                  </View>

                  <View style={styles.medicinesContainer}>
                    <ScrollView 
                      style={styles.medicinesScroll}
                      contentContainerStyle={styles.medicinesScrollContent}
                      showsVerticalScrollIndicator={true}
                    >
                      {currentTimeGroups?.length > 0 ? (
                        currentTimeGroups?.map((timeGroup, timeIndex) => (
                          <View key={timeIndex} style={styles.timeGroup}>
                            <View style={styles.timeGroupHeader}>
                              <View style={styles.timeGroupTitleContainer}>
                                <View style={styles.timeGroupTimeRow}>
                                  <ClockIcon size={18} color="#14b8a6" />
                                  <Text style={styles.timeGroupTitle}>
                                    {formatTime(timeGroup?.dosageTime)}
                                  </Text>
                                </View>
                                <Text style={styles.timeGroupSubtitle}>
                                  Dosage Time
                                </Text>
                              </View>
                              {timeGroup?.percentage !== undefined && (
                                <View style={styles.completionContainer}>
                                  <Text style={styles.completionText}>
                                    {Math?.round(timeGroup?.percentage)}% Completed
                                  </Text>
                                  <View style={styles.progressBar}>
                                    <View 
                                      style={[
                                        styles.progressFill,
                                        { width: `${timeGroup?.percentage}%` }
                                      ]} 
                                    />
                                  </View>
                                </View>
                              )}
                            </View>
                            
                            <View style={styles.medicinesList}>
                              {timeGroup?.reminders?.map((medicine) => {
                                const formattedMedicineName =
                                  medicine?.medicineName?.slice(0, 1)?.toUpperCase() +
                                  medicine?.medicineName?.slice(1)?.toLowerCase() || "Unknown Medicine";

                                const formattedTimestamp = medicine?.dosageTime
                                  ? formatTime(medicine?.dosageTime)
                                  : "------";

                                const formattedGivenAt = medicine?.givenTime
                                  ? formatTime(medicine?.givenTime)
                                  : "Not given yet";

                                const status =
                                  medicine?.doseStatus === 0
                                    ? "Pending"
                                    : medicine?.doseStatus === 1
                                    ? "Completed"
                                    : "Not Required";

                                return (
                                  <MedicineCard
                                    key={medicine?.id}
                                    medicineID={medicine?.id}
                                    medicineType={String(medicine?.medicineType) || "Tablets"}
                                    medicineName={formattedMedicineName}
                                    timeOfMedication={medicine?.medicationTime}
                                    timestamp={formattedTimestamp}
                                    givenAt={formattedGivenAt}
                                    status={status}
                                    day={medicine?.day}
                                    dosageTime={medicine?.dosageTime}
                                    isToday={activeIndex === 0}
                                    reminderGroup={reminderGroup}
                                    activeIndex={activeIndex}
                                    indexTime={timeIndex}
                                  />
                                );
                              })}
                            </View>
                          </View>
                        ))
                      ) : (
                        <View style={styles.noMedicines}>
                          <Text style={styles.noMedicinesText}>
                            {dateArray?.length > 0 
                              ? "No medicines scheduled for this date." 
                              : "No medication data available."}
                          </Text>
                        </View>
                      )}
                    </ScrollView>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Footer - Fixed Height */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.closeFooterButton} onPress={onClose}>
              <Text style={styles.closeFooterButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default NotificationDialog;