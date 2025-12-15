// components/Notification/NotificationScreen.tsx - IMPROVED VERSION
import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useSelector } from "react-redux";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";


import { RootState } from "../../store/store";
import { AuthFetch } from "../../auth/auth";
import { MedicineReminderType } from "../../utils/types";
import MedicineCard from "./MedicineCard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { formatDate, formatTime, isToday } from "../../utils/dateTime";
import Footer from "../dashboard/footer";
import {
  CalendarIcon,
} from "../../utils/SvgIcons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;
const moderateScale = (size: number, factor: number = 0.5) =>
  size + (scale(size) - size) * factor;

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

const FOOTER_H = 70;

const NotificationScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { timelineID, patientName,patientId } =
    (route?.params as RouteParams) ?? ({} as RouteParams);
  const user = useSelector((s: RootState) => s.currentUser);
  const [reminders, setReminders] = useState<RemindersType | null>(null);
  const [dateArray, setDateArray] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [reminderGroup, setReminderGroup] = useState<ReminderGroup[][]>([]);
  const insets = useSafeAreaInsets();
const getNotificationData = async () => {
  if (!timelineID) return;

  try {
    const token = user?.token || (await AsyncStorage.getItem("token"));
    setLoading(true);
    
    // Type the response
    type ApiResponse = {
      status: string;
      message?: string;
      data?: {
        message?: string;
        reminders?: RemindersType;
      };
      reminders?: RemindersType;
    };

    const response = await AuthFetch(
      `medicine/${timelineID}/reminders/all/notifications`,
      token
    ) as ApiResponse;

    if (response?.status === "success" && response?.data?.message === "success") {
      setReminders(response?.data?.reminders || {});
    } else if (response?.message === "success") {
      setReminders(response?.reminders || {});
    } else {
      setReminders({});
    }
  } catch (error) {
    console.error("Error fetching notifications:", error);
    setReminders({});
  } finally {
    setLoading(false);
  }
};

useFocusEffect(
  useCallback(() => {
    getNotificationData();
  }, [timelineID])
);

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
              (group?.reminders?.filter((med) => med?.doseStatus === 1)?.length /
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
  const compareDates = (a: ReminderGroup, b: ReminderGroup) => {
    return new Date(a?.dosageTime).valueOf() - new Date(b?.dosageTime).valueOf();
  };

  const currentTimeGroups = useMemo(() => {
    const groups = reminderGroup[activeIndex] || [];
    const copy = [...groups];
    copy.sort(compareDates);
    return copy;
  }, [reminderGroup, activeIndex]);

  const computeMedicationTimeForMedicine = (medicationTime: string | undefined | null, index: number) => {
    if (!medicationTime) return "—";
    if (typeof medicationTime === "string" && medicationTime.includes(",")) {
      const parts = medicationTime.split(",").map(p => p.trim());
      return parts[index] ?? medicationTime;
    }
    return medicationTime;
  };

  if (loading && !reminders) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.centerContainer}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#14b8a6" />
            <Text style={styles.loadingTitle}>Loading Timeline</Text>
            <Text style={styles.loadingText}>
              Please wait while we fetch medicine notifications...
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

          <View style={styles.container}>
            {/* Date Tabs */}
            {dateArray?.length > 0 ? (
              <View style={styles.dateTabsSection}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.dateTabsContent}
                >
                  {dateArray?.map((date, index) => {
                const selected = index === activeIndex;
                const today = isToday(date);
                return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.dateTab,
                        selected && styles.dateTabActive,
                      ]}
                      onPress={() => setActiveIndex(index)}
                    >
                    <View style={styles.dateTabInner}>
                      <CalendarIcon
                        size={14}
                        color={selected ? "#14b8a6" : "#64748b"}
                      />
                      <Text style={[
                        styles.dateTabText,
                          selected && styles.dateTabTextActive
                      ]}
                        numberOfLines={1}>
                        {formatDate(date)}
                      </Text>
                      {today && (
                        <View style={styles.todayBadge}>
                        <Text style={styles.todayBadgeText}>Today</Text>
                        </View>
                      )}
                    </View>
                    </TouchableOpacity>
                  );
                  })}
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
          <View style={styles.content}>
            <View style={styles.medicineSection}>
              <ScrollView 
                style={styles.scrollView}
              contentContainerStyle={[styles.scrollContent,
                { paddingBottom: FOOTER_H + insets.bottom + 16 },
              ]}
                showsVerticalScrollIndicator={false}
              >
              {dateArray.length > 0 && (
                <View style={styles.innerHeader}>
                  <Text style={styles.innerHeaderTitle}>
                    Timeline for {formatDate(dateArray[activeIndex])}
                    </Text>
                  </View>
                )}

                {currentTimeGroups.length > 0 ? (
                  currentTimeGroups.map((timeGroup, timeIndex) => (
                    <View key={`${timeGroup.dosageTime}-${timeIndex}`} style={styles.timeGroup}>
                      <View style={styles.timeGroupHeader}>
                        {typeof timeGroup.percentage === "number" && (
                          <View style={styles.completionContainer}>
                            <Text style={styles.completionText}>
                              {Math.round(timeGroup.percentage)}% Completed
                            </Text>
                            <View style={styles.progressBar}>
                              <View
                                style={[
                                  styles.progressFill,
                                {
                                  width: `${Math.min(
                                    Math.max(timeGroup.percentage, 0),
                                    100
                                  )}%`,
                                },
                                ]} 
                              />
                            </View>
                          </View>
                        )}
                      </View>
                      
                      <View style={styles.medicinesList}>
                        {timeGroup?.reminders?.map((medicine, idx) => {
                          const medTimeForThisMedicine = computeMedicationTimeForMedicine(medicine?.medicationTime, idx);
                          const formattedMedicineName =
                            (medicine?.medicineName &&
                              medicine?.medicineName
                                ?.slice(0, 1)
                                ?.toUpperCase() +
                                medicine.medicineName
                                  ?.slice(1)
                                  ?.toLowerCase()) ||
                            "Unknown Medicine";

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

                        const givenByName = [
                          medicine?.firstName,
                          medicine?.lastName,
                        ]
                          .filter(Boolean)
                          .join(" ");

                        const dosage =
                          (medicine as any)?.dosage ||
                          (medicine as any)?.dose ||
                          (medicine as any)?.dosageValue ||
                          null;

                          return (
                            <MedicineCard
                              key={medicine?.id ?? `${timeIndex}-${idx}`}
                              medicineID={medicine?.id}
                              medicineType={medicine?.medicineType}
                              medicineName={formattedMedicineName}
                              timeOfMedication={medTimeForThisMedicine}
                              timestamp={formattedTimestamp}
                              givenAt={formattedGivenAt}
                              status={status}
                              day={medicine?.day}
                              isToday={isToday(dateArray[activeIndex])}
                              reminderGroup={reminderGroup}
                              activeIndex={activeIndex}
                              indexTime={timeIndex}
                            dosage={dosage}
                            givenBy={givenByName}
                            onStatusChange={(newStatus: number) => {
                              setReminderGroup(prev => {
                                const copy = prev.map(arr => arr.map(g => ({ ...g, reminders: g.reminders.slice() })));
                                const dateGroups = copy[activeIndex] || [];
                                if (!dateGroups[timeIndex]) return prev;
                                const reminder = dateGroups[timeIndex].reminders[idx];
                                if (!reminder) return prev;
                                reminder.doseStatus = newStatus;
                                const completed = dateGroups[timeIndex].reminders.filter(r => r?.doseStatus === 1).length;
                                dateGroups[timeIndex].percentage = (completed / dateGroups[timeIndex].reminders.length) * 100;
                                const newCopy = prev.slice();
                                newCopy[activeIndex] = dateGroups;
                                return newCopy;
                              });
                            }}
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
        
      </View>

          {/* ADD FOOTER HERE */}
      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active="notifications" brandColor="#14b8a6" />
      </View>
      
      {insets.bottom > 0 && (
        <View pointerEvents="none" style={[styles.navShield, { height: insets.bottom }]} />
      )}
    </SafeAreaView>

  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingContent: {
    alignItems: "center",
    padding: 40,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
    marginTop: 20,
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  // Date tabs
  dateTabsSection: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    backgroundColor: "#fff",
  },
  dateTabsContent: {
    paddingVertical: 2,
  },
  dateTab: {
    marginRight: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  dateTabActive: {
    borderColor: "#14b8a6",
    backgroundColor: "rgba(20, 184, 166, 0.06)",
  },
  dateTabInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dateTabText: {
    fontSize: 12,
    color: "#64748b",
    marginLeft: 6,
    marginRight: 6,
    fontWeight: "500",
  },
  dateTabTextActive: {
    color: "#0f766e",
    fontWeight: "600",
  },
  todayBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "#ecfeff",
  },
  todayBadgeText: {
    fontSize: 10,
    color: "#0e7490",
    fontWeight: "700",
  },

  noDatesContainer: {
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  noDatesText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
  },
  noDatesSubtext: {
    marginTop: 4,
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
  },

  content: {
    flex: 1,
  },
  medicineSection: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 8,
  },

  innerHeader: {
    marginBottom: 12,
  },
  innerHeaderTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "left",
    marginBottom: 2,
    fontStyle: "italic",
  },

  timeGroup: {
    marginBottom: 18,
  },
  timeGroupHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "flex-start",
    marginBottom: 8,
    flex: 1,
    marginRight: 12,
  },

  completionContainer: {
    alignItems: "flex-end",
    flexShrink: 1,
  },
  completionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 4,
  },
  progressBar: {
    width: 110,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#14b8a6",
  },

  medicinesList: {
    marginTop: 4,
  },

  noMedicines: {
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  noMedicinesText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 4,
    textAlign: "center",
  },
  noMedicinesSubtext: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
  },

  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    height: FOOTER_H,
    justifyContent: "center",
  },
  navShield: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
  },
});

export default NotificationScreen;
