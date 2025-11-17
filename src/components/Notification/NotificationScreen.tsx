// components/Notification/NotificationScreen.tsx - IMPROVED VERSION
import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { useSelector } from "react-redux";
import { useNavigation, useRoute } from "@react-navigation/native";
import { RootState } from "../../store/store";
import { AuthFetch } from "../../auth/auth";
import { MedicineReminderType } from "../../utils/types";
import MedicineCard from "./MedicineCard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { formatDate, formatTime, isToday } from "../../utils/dateTime";
import { NotificationStyles as styles } from "./NotificationStyles";
import { ArrowLeftIcon , ClockIcon, CalendarIcon } from "../../utils/SvgIcons";

type RouteParams = {
  timelineID: number;
  patientName: string;
  patientId: number;
};

type RemindersType = {
  [date: string]: MedicineReminderType[];
};

type ReminderGroup = {
  dosageTime: string;
  reminders: MedicineReminderType[];
  percentage?: number;
};

const NotificationScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { timelineID, patientName, patientId } = route?.params as RouteParams ?? {};
  
  const user = useSelector((s: RootState) => s.currentUser);
  const [reminders, setReminders] = useState<RemindersType | null>(null);
  const [dateArray, setDateArray] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [reminderGroup, setReminderGroup] = useState<ReminderGroup[][]>([]);

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
      setReminders({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getNotificationData();
    
    const interval = setInterval(() => {
      getNotificationData();
    }, 5000);

    return () => clearInterval(interval);
  }, [timelineID]);

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

  const getCurrentTime = () => {
    return new Date()?.toLocaleString("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#14b8a6" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
        >
          <ArrowLeftIcon size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.title}>Treatment Notifications</Text>
          <Text style={styles.patientName}>{patientName}</Text>
        </View>
        
        <View style={styles.currentTimeContainer}>
          <ClockIcon size={16} color="#fff" />
          <Text style={styles.currentTime}>{getCurrentTime()}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#14b8a6" />
            <Text style={styles.loadingText}>Loading notifications...</Text>
          </View>
        ) : (
          <View style={styles.container}>
            {/* Date Tabs */}
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
                        index === activeIndex && styles.dateTabActive,
                        isToday(date) && styles.dateTabToday
                      ]}
                      onPress={() => setActiveIndex(index)}
                    >
                      <Text style={[
                        styles.dateTabText,
                        index === activeIndex && styles.dateTabTextActive
                      ]}>
                        {formatDate(date)}
                      </Text>
                      {isToday(date) && (
                        <Text style={styles.todayBadge}>Today</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : (
              <View style={styles.noDatesContainer}>
                <CalendarIcon size={48} color="#94a3b8" />
                <Text style={styles.noDatesText}>No medication dates found</Text>
                <Text style={styles.noDatesSubtext}>
                  No medication schedule available for this patient.
                </Text>
              </View>
            )}

            {/* Medicine Section */}
            <View style={styles.medicineSection}>
              <ScrollView 
                style={styles.medicinesScroll}
                contentContainerStyle={styles.medicinesScrollContent}
                showsVerticalScrollIndicator={false}
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
                              isToday={isToday(dateArray[activeIndex])}
                              reminderGroup={reminderGroup}
                              activeIndex={activeIndex}
                              indexTime={timeIndex}
                            />
                          );
                        })}
                      </View>
                    </View>
                  ))
                ) : dateArray?.length > 0 ? (
                  <View style={styles.noMedicines}>
                    <Text style={styles.noMedicinesText}>
                      No medicines scheduled for this date.
                    </Text>
                    <Text style={styles.noMedicinesSubtext}>
                      All medications for {formatDate(dateArray[activeIndex])} have been completed or not scheduled.
                    </Text>
                  </View>
                ) : null}
              </ScrollView>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default NotificationScreen;