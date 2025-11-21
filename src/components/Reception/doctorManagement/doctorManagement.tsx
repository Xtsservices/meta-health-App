// src/screens/doctors/DoctorManagementMobile.tsx

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
  Platform,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { PlusCircle, Eye } from "lucide-react-native";
import {
  FONT_SIZE,
  FOOTER_HEIGHT,
  ICON_SIZE,
  responsiveWidth,
  SPACING,
} from "../../../utils/responsive";
import { RootState } from "../../../store/store";
import { AuthFetch, AuthPost } from "../../../auth/auth";
import { showError, showSuccess } from "../../../store/toast.slice";
import { Role_NAME } from "../../../utils/role";
import { COLORS } from "../../../utils/colour";
import Footer from "../../dashboard/footer";
import SlotModal from "../../Management/SlotsManagement/SlotModal";


const { width: SCREEN_WIDTH } = Dimensions.get("window");
const FOOTER_H = FOOTER_HEIGHT || 70;

type Doctor = {
  id: number;
  name: string;
  department: string;
  qualification?: string;
  experience?: string;
  designation?: string;
  doctorImage?: string | null;
};

type Department = {
  id: number;
  name: string;
};

const DoctorManagementMobile: React.FC = () => {
  const user = useSelector((s: RootState) => s.currentUser);
  const dispatch = useDispatch();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // creating slots using SlotModal
  const [slotCreating, setSlotCreating] = useState<boolean>(false);
  const [slotModalVisible, setSlotModalVisible] = useState(false);
  const [activeDoctorForSlots, setActiveDoctorForSlots] = useState<Doctor | null>(null);

  // simple local pagination
  const [page, setPage] = useState<{ limit: number; page: number }>({
    limit: 10,
    page: 1,
  });

  const bottomPad = FOOTER_H + insets.bottom + 24;

  /* ----------------------- Fetch Departments & Doctors ---------------------- */

  const fetchDepartments = useCallback(async () => {
    if (!user?.hospitalID) return;

    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      if (!token) return;

      const res = await AuthFetch(`department/${user.hospitalID}`, token);
      if (res?.status === "success" && Array.isArray(res?.data?.departments)) {
        setDepartments(res.data?.departments);
      } else {
        dispatch(showError("Failed to fetch departments"));
      }
    } catch {
      dispatch(showError("Error fetching departments"));
    }
  }, [user?.hospitalID, user?.token, dispatch]);

  const fetchDoctors = useCallback(async () => {
    if (!user?.hospitalID) return;

    try {
      setLoading(true);
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      if (!token) {
        setLoading(false);
        return;
      }

      const res = await AuthFetch(
        `user/${user.hospitalID}/list/${Role_NAME.doctor}`,
        token
      );

      if (res?.status === "success" && Array.isArray(res?.data?.users)) {
        const mapped: Doctor[] = res.data?.users.map((u: any): Doctor => {
          const departmentName =
            departments.find((d) => d.id === u.departmentID)?.name || "Unknown";

          return {
            id: u.id,
            name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "Doctor",
            department: departmentName,
            designation: u.designation || "Doctor",
            qualification: u.qualification || "",
            experience: u.experience || "",
            doctorImage: u.imageURL || null,
          };
        });

        setDoctors(mapped);
      } else {
        setDoctors([]);
      }
    } catch {
      setDoctors([]);
      dispatch(showError("Failed to fetch doctors"));
    } finally {
      setLoading(false);
    }
  }, [user?.hospitalID, user?.token, departments, dispatch]);

  useEffect(() => {
    if (!user?.hospitalID) return;
    fetchDepartments();
  }, [user?.hospitalID, fetchDepartments]);

  useEffect(() => {
    if (!user?.hospitalID || departments.length === 0) return;
    fetchDoctors();
  }, [user?.hospitalID, departments, fetchDoctors]);

  /* ------------------------------ Pagination -------------------------------- */

  const totalPages = Math.max(
    1,
    Math.ceil(doctors.length / Math.max(1, page.limit))
  );

  const pagedDoctors = useMemo(() => {
    const start = (page.page - 1) * page.limit;
    const end = start + page.limit;
    return doctors.slice(start, end);
  }, [doctors, page]);

  /* -------------------------- Slots via SlotModal --------------------------- */

  const generateTimeSlotsWithDate = (slotData: any) => {
    const slots: any[] = [];
    const start = parseInt(slotData.shiftFromTime?.split(":")?.[0] ?? "0", 10);
    const end = parseInt(slotData.shiftToTime?.split(":")?.[0] ?? "0", 10);
    const available = parseInt(slotData.availableSlots ?? "0", 10);

    for (let i = start; i < end; i++) {
      slots.push({
        date: slotData.date,
        fromTime: `${i.toString().padStart(2, "0")}:00:00`,
        toTime: `${(i + 1).toString().padStart(2, "0")}:00:00`,
        availableSlots: available,
        persons: 0,
        bookedIds: [],
      });
    }
    return slots;
  };

  // when user taps "Add Slots" chip on a doctor card
  const handleAddSlots = (doctor: Doctor) => {
    setActiveDoctorForSlots(doctor);
    setSlotModalVisible(true);
  };

  const handleCloseSlotModal = () => {
    if (slotCreating) return; // optional: prevent closing while saving
    setSlotModalVisible(false);
    setActiveDoctorForSlots(null);
  };

  const handleSaveSlotsFromModal = async (slotData: any) => {
    if (!user?.hospitalID || !activeDoctorForSlots) {
      dispatch(showError("Missing hospital or doctor details"));
      return;
    }

    try {
      setSlotCreating(true);
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      if (!token) {
        setSlotCreating(false);
        dispatch(showError("Missing authentication token"));
        return;
      }

      const scheduleData = [
        {
          date: slotData.date,
          shiftFromTime: `${slotData.shiftFromTime}:00`,
          shiftToTime: `${slotData.shiftToTime}:00`,
          dayToggles: {},
          addedBy: user.id,
          doctorID: activeDoctorForSlots.id,
          slots: generateTimeSlotsWithDate(slotData),
        },
      ];

      const url = `doctor/${user.hospitalID}/doctorAppointmentSchedule`;
      const resp = await AuthPost(url, { data: scheduleData }, token);

      if (resp?.status === "error") {
        dispatch(showError(resp?.message || "Failed to create slots"));
      } else {
        dispatch(
          showSuccess(resp?.message || "Slots created successfully for doctor")
        );
        setSlotModalVisible(false);
        setActiveDoctorForSlots(null);
      }
    } catch (e: any) {
      dispatch(showError(e?.message || "Failed to create slots"));
    } finally {
      setSlotCreating(false);
    }
  };

  /* ------------------------------ Actions ----------------------------------- */

  const handleShowSlots = (doctor: Doctor) => {
    navigation.navigate("DoctorSlots", { doctorId: doctor?.id });
  };

  const renderDoctorCard = ({ item }: { item: Doctor }) => {
    const firstLetter =
      (item.name && item.name.trim().charAt(0).toUpperCase()) || "D";

    return (
      <View
        style={[
          styles.card,
          { backgroundColor: COLORS.card, borderColor: COLORS.border },
        ]}
      >
        <View style={styles.cardRow}>
          {/* Avatar */}
          <View
            style={[
              styles.avatar,
              { borderColor: COLORS.border, backgroundColor: COLORS.bg },
            ]}
          >
            {item.doctorImage ? (
              <Image
                source={{ uri: item.doctorImage }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={[styles.avatarInitial, { color: COLORS.brand }]}>
                {firstLetter}
              </Text>
            )}
          </View>

          {/* Info */}
          <View style={styles.meta}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: COLORS.text }]}>
                {item.name}
              </Text>

              {/* Add Slots button (opens SlotModal) */}
              <TouchableOpacity
                style={[
                  styles.addSlotsChip,
                  { backgroundColor: COLORS.brandSoft },
                ]}
                onPress={() => handleAddSlots(item)}
                disabled={slotCreating}
              >
                <PlusCircle
                  size={ICON_SIZE.sm}
                  color={COLORS.brandDark}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.addSlotsChipText,
                    { color: COLORS.brandDark },
                  ]}
                >
                  {slotCreating ? "Creating..." : "Add Slots"}
                </Text>
              </TouchableOpacity>
            </View>

            <Text
              style={[styles.subText, { color: COLORS.sub }]}
              numberOfLines={1}
            >
              {item.designation || "Doctor"} • {item.department}
            </Text>

            {item.qualification ? (
              <Text
                style={[styles.subText, { color: COLORS.sub }]}
                numberOfLines={2}
              >
                {item.qualification}
              </Text>
            ) : null}

            {item.experience ? (
              <Text
                style={[styles.subText, { color: COLORS.sub }]}
                numberOfLines={1}
              >
                Experience: {item.experience}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Show slots button at bottom of card */}
        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={[styles.showSlotsBtn, { borderColor: COLORS.border }]}
            onPress={() => handleShowSlots(item)}
          >
            <Eye size={ICON_SIZE.sm} color={COLORS.text} />
            <Text style={[styles.showSlotsText, { color: COLORS.text }]}>
              Show Slots
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyWrap}>
      <Text style={[styles.emptyTitle, { color: COLORS.text }]}>
        No doctors found
      </Text>
      <Text style={[styles.emptySub, { color: COLORS.sub }]}>
        Please add doctors or check your connection.
      </Text>
    </View>
  );

  const renderPaginationBar = () => (
    <View style={[styles.pagination, { borderTopColor: COLORS.border }]}>
      <Text style={[styles.resultsText, { color: COLORS.sub }]}>
        Results: {doctors.length}
      </Text>

      <View style={styles.pageRight}>
        <Text style={[styles.pageLabel, { color: COLORS.text }]}>
          Page {page.page} of {totalPages}
        </Text>

        <View style={styles.pageButtons}>
          <TouchableOpacity
            style={[
              styles.pageBtn,
              { backgroundColor: COLORS.card },
              page.page === 1 && styles.pageBtnDisabled,
            ]}
            disabled={page.page === 1}
            onPress={() =>
              setPage((p) => ({ ...p, page: Math.max(1, p.page - 1) }))
            }
          >
            <Text
              style={{
                color: page.page === 1 ? COLORS.sub : COLORS.text,
              }}
            >
              {"<"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.pageBtn,
              { backgroundColor: COLORS.card },
              page.page === totalPages && styles.pageBtnDisabled,
            ]}
            disabled={page.page === totalPages}
            onPress={() =>
              setPage((p) => ({
                ...p,
                page: Math.min(totalPages, p.page + 1),
              }))
            }
          >
            <Text
              style={{
                color:
                  page.page === totalPages ? COLORS.sub : COLORS.text,
              }}
            >
              {">"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView
      style={[
        styles.safe,
        {
          backgroundColor: COLORS.bg,
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: COLORS.text }]}>
          List of Doctors
        </Text>
        <Text style={[styles.subtitle, { color: COLORS.sub }]}>
          Manage doctor schedules & appointment slots
        </Text>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={COLORS.brand} />
          <Text style={[styles.loadingText, { color: COLORS.sub }]}>
            Loading doctors…
          </Text>
        </View>
      ) : (
        <FlatList
          data={pagedDoctors}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderDoctorCard}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: bottomPad },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
        />
      )}

      {doctors.length > 0 && renderPaginationBar()}

      {/* Fixed footer */}
      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={"management"} brandColor={COLORS.brand} />
      </View>

      {/* Slot Modal (reused, DO NOT MODIFY its file) */}
      <SlotModal
        visible={slotModalVisible}
        onClose={handleCloseSlotModal}
        onSave={handleSaveSlotsFromModal}
        creating={slotCreating}
      />
    </SafeAreaView>
  );
};

export default DoctorManagementMobile;

/* -------------------------------------------------------------------------- */
/*                                   Styles                                   */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 4,
    fontSize: FONT_SIZE.sm,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 24,
  },
  avatarInitial: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
  },
  meta: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  name: {
    fontSize: SCREEN_WIDTH < 360 ? 15 : 16,
    fontWeight: "700",
    flex: 1,
    marginRight: SPACING.sm,
  },
  addSlotsChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs * 0.8,
    borderRadius: 999,
  },
  addSlotsChipText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
  },
  subText: {
    fontSize: SCREEN_WIDTH < 360 ? 12 : 13,
    marginTop: 2,
    lineHeight: 16,
  },
  cardFooter: {
    marginTop: SPACING.sm,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  showSlotsBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs * 1.5,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  showSlotsText: {
    marginLeft: 6,
    fontSize: SCREEN_WIDTH < 360 ? 12 : 13,
    fontWeight: "700",
  },
  emptyWrap: {
    paddingVertical: SPACING.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: responsiveWidth(40),
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 15,
  },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
  },
  resultsText: {
    fontSize: 14,
    fontWeight: "600",
  },
  pageRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pageLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  pageButtons: {
    flexDirection: "row",
    gap: 8,
  },
  pageBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    height: FOOTER_H,
    justifyContent: "center",
  },
});
