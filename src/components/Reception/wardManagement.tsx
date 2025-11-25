// src/screens/ward/WardManagementMobile.tsx

import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ChevronDown, Search } from "lucide-react-native";

import { RootState } from "../../store/store";
import { AuthFetch } from "../../auth/auth";
import Footer from "../dashboard/footer";

import {
  SPACING,
  FONT_SIZE,
  ICON_SIZE,
  FOOTER_HEIGHT,
  responsiveWidth,
  responsiveHeight,
  isTablet,
} from "../../utils/responsive";
import { COLORS } from "../../utils/colour";
import { formatDate } from "../../utils/dateTime";

import {
  Ward,
  buildFloorGroups,
  floorDisplayLabel,
  getAmenityIcon,
  getBedsArray,
} from "../../utils/wardUtils";

const WardManagementMobile: React.FC = () => {
  const user = useSelector((s: RootState) => s.currentUser);
  const insets = useSafeAreaInsets();

  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchWards = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = user?.token ?? (await AsyncStorage.getItem("token"));
        if (!user?.hospitalID || !token) {
          setError("Hospital or authentication missing");
          setWards([]);
          return;
        }

        const res = await AuthFetch(`ward/${user?.hospitalID}`, token);

        if (res?.status === "success" && Array.isArray(res?.data?.wards)) {
          setWards(res?.data?.wards);
        } else if (Array.isArray(res)) {
          setWards(res);
        } else {
          setError(res?.message || "Failed to fetch wards");
        }
      } catch (e) {
        setError("Failed to fetch wards");
        setWards([]);
      } finally {
        setLoading(false);
      }
    };

    fetchWards();
  }, [user?.hospitalID, user?.token]);

  /* ---------------------------- Search ------------------------ */

  const filteredWards = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return wards;
    return wards.filter((w) => (w.name || "").toLowerCase().includes(term));
  }, [wards, search]);

  /* ---------------------- Grouping + Pagination by floor ------------------- */

  const floorGroups = useMemo(
    () => buildFloorGroups(filteredWards),
    [filteredWards]
  );

  const totalPages = Math.max(1, floorGroups.pages.length || 1);

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages, page]);

  const floorsForCurrentPage = floorGroups.pages[page - 1] || [];
  const hasPagination = totalPages > 1;

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handlePrev = () => {
    if (page > 1) setPage((p) => p - 1);
  };

  const handleNext = () => {
    if (page < totalPages) setPage((p) => p + 1);
  };

  /* -------------------------------------------------------------------------- */

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: FOOTER_HEIGHT + SPACING.xl + insets.bottom,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header row */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Ward Management</Text>
            <Text style={styles.subtitle}>
              View wards by floor, availability and amenities
            </Text>
          </View>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>
              {wards.length || 0} wards
            </Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Search
              size={ICON_SIZE.sm}
              color={COLORS.placeholder}
              style={styles.searchIcon}
            />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by ward name"
              placeholderTextColor={COLORS.placeholder}
              style={styles.searchInput}
            />
          </View>
        </View>

        {/* Loading / Error / Empty */}
        {loading && (
          <View style={styles.centerMessage}>
            <ActivityIndicator color={COLORS.brand} size="small" />
            <Text style={styles.centerText}>Loading wards...</Text>
          </View>
        )}

        {!loading && error && (
          <View style={styles.centerMessage}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {!loading && !error && filteredWards.length === 0 && (
          <View style={styles.centerMessage}>
            <Text style={styles.centerText}>
              No wards found for "{search.trim()}".
            </Text>
          </View>
        )}

        {/* Floor groups for current page */}
        {!loading &&
          !error &&
          filteredWards.length > 0 &&
          floorsForCurrentPage.map((groupKey) => {
            const list = floorGroups.groups[groupKey] || [];
            const repFloor = floorGroups.rep[groupKey] || "Unassigned";
            const isOpen = openGroups[groupKey] ?? true;

            return (
              <View key={groupKey} style={styles.groupCard}>
                {/* Group header / accordion */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => toggleGroup(groupKey)}
                  style={styles.groupHeader}
                >
                  <View style={styles.groupHeaderLeft}>
                    <ChevronDown
                      size={ICON_SIZE.md}
                      color={COLORS.sub}
                      style={isOpen ? styles.chevronOpen : styles.chevronClosed}
                    />
                    <View>
                      <Text style={styles.groupTitle}>
                        {floorDisplayLabel(repFloor)}
                      </Text>
                      <Text style={styles.groupSubtitle}>
                        {list.length} ward{list.length > 1 ? "s" : ""}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.groupRightBadge}>
                    <Text style={styles.groupRightBadgeText}>
                      Available wards
                    </Text>
                    <View style={styles.groupCountPill}>
                      <Text style={styles.groupCountPillText}>
                        {list.length}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {isOpen && (
                  <View style={styles.groupContent}>
                    {list.map((w) => {
                      const bedsArray = getBedsArray(
                        w.availableBeds ?? 0,
                        w.totalBeds ?? 0
                      );

                      return (
                        <View key={w.id} style={styles.wardCard}>
                          {/* Ward header */}
                          <View style={styles.wardHeader}>
                            <View style={styles.wardHeaderLeft}>
                              <Text style={styles.wardName}>
                                {(w.name ?? "").toUpperCase()}
                              </Text>
                              {w.floor && (
                                <View style={styles.floorChip}>
                                  <Text style={styles.floorChipText}>
                                    {w.floor}
                                  </Text>
                                </View>
                              )}
                            </View>
                            <View style={styles.priceBadge}>
                              <Text style={styles.priceBadgeText}>
                                ₹{w.price ?? "0"}
                              </Text>
                            </View>
                          </View>

                          {/* Meta Row */}
                          <View style={styles.metaRow}>
                            <View style={styles.metaLeft}>
                              <View style={styles.roomRow}>
                                <Text style={styles.metaEmoji}>🛏️</Text>
                                <Text style={styles.metaRoomText}>
                                  {w.room || "-"}
                                </Text>
                              </View>
                              {w.location ? (
                                <Text style={styles.locationText}>
                                  {w.location}
                                </Text>
                              ) : null}
                            </View>
                            <View style={styles.metaRight}>
                              <Text style={styles.metaLabel}>Attendees:</Text>
                              <Text style={styles.metaValue}>
                                {w.Attendees ?? "-"}
                              </Text>
                            </View>
                          </View>

                          {/* Description */}
                          {w.description ? (
                            <Text style={styles.descriptionText}>
                              {w.description}
                            </Text>
                          ) : null}

                          {/* Dates */}
                          <View style={styles.dateRow}>
                            <Text style={styles.dateText}>
                              Added:{" "}
                              {w.addedOn ? formatDate(w.addedOn) : "—"}
                            </Text>
                            <Text style={styles.dateText}>
                              Updated:{" "}
                              {w.lastModified
                                ? formatDate(w.lastModified)
                                : "—"}
                            </Text>
                          </View>

                          {/* Amenities */}
                          <View style={styles.amenitiesBlock}>
                            <Text style={styles.amenitiesTitle}>Amenities</Text>
                            <View style={styles.amenitiesRow}>
                              {w.amenities && w.amenities.length > 0 ? (
                                w.amenities.map((a, idx) => (
                                  <View
                                    key={idx}
                                    style={styles.amenityPill}
                                  >
                                    <Text style={styles.amenityIcon}>
                                      {getAmenityIcon(a)}
                                    </Text>
                                    <Text
                                      style={styles.amenityLabel}
                                      numberOfLines={1}
                                    >
                                      {a}
                                    </Text>
                                  </View>
                                ))
                              ) : (
                                <Text style={styles.noAmenitiesText}>
                                  No amenities listed
                                </Text>
                              )}
                            </View>
                          </View>

                          {/* Beds */}
                          <View style={styles.bedsBlock}>
                            <View style={styles.bedsHeaderRow}>
                              <Text style={styles.bedsTitle}>
                                Available Beds
                              </Text>
                              <Text style={styles.bedsSummaryText}>
                                {(w.availableBeds ?? 0)} out of{" "}
                                {(w.totalBeds ?? 0)}
                              </Text>
                            </View>
                            <View style={styles.bedsVisualRow}>
                              <View style={styles.bedsRow}>
                                {bedsArray.map((filled, idx) => (
                                  <View
                                    key={idx}
                                    style={[
                                      styles.bed,
                                      filled && styles.bedFilled,
                                    ]}
                                  />
                                ))}
                              </View>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}

        {/* Pagination */}
        {!loading && !error && hasPagination && (
          <View style={styles.paginationRow}>
            <TouchableOpacity
              disabled={page === 1}
              onPress={handlePrev}
              style={[
                styles.pageBtn,
                page === 1 && styles.pageBtnDisabled,
              ]}
            >
              <Text
                style={[
                  styles.pageBtnText,
                  page === 1 && styles.pageBtnTextDisabled,
                ]}
              >
                Previous
              </Text>
            </TouchableOpacity>

            <Text style={styles.pageInfo}>
              Page {page} of {totalPages}
            </Text>

            <TouchableOpacity
              disabled={page === totalPages}
              onPress={handleNext}
              style={[
                styles.pageBtn,
                page === totalPages && styles.pageBtnDisabled,
              ]}
            >
              <Text
                style={[
                  styles.pageBtnText,
                  page === totalPages && styles.pageBtnTextDisabled,
                ]}
              >
                Next
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Footer fixed at bottom */}
      <View
        style={[
          styles.footerWrap,
          { bottom: insets.bottom },
        ]}
      >
        <Footer active={"dashboard"} brandColor={COLORS.brand} />
      </View>
    </View>
  );
};

export default WardManagementMobile;

/* -------------------------------------------------------------------------- */
/*                                   Styles                                   */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
  },

  /* Header + search */
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: "700",
    color: COLORS.text,
  },
  subtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    marginTop: SPACING.xs * 0.4,
  },
  countPill: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs * 0.6,
    borderRadius: SPACING.lg,
    backgroundColor: COLORS.pillBg,
  },
  countPillText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.pillText,
    fontWeight: "600",
  },

  searchRow: {
    marginBottom: SPACING.md,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.inputBg,
    borderRadius: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs * 0.8,
  },
  searchIcon: {
    marginRight: SPACING.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    paddingVertical: 0,
  },

  centerMessage: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.lg,
  },
  centerText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    marginTop: SPACING.xs,
    textAlign: "center",
  },
  errorText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.error,
    textAlign: "center",
  },

  /* Group cards */
  groupCard: {
    backgroundColor: COLORS.card,
    borderRadius: SPACING.md,
    marginBottom: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: SPACING.xs * 0.4 },
    shadowOpacity: 0.05,
    shadowRadius: SPACING.xs,
    elevation: 2,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  groupHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },
  chevronOpen: {
    transform: [{ rotate: "0deg" }],
    marginRight: SPACING.sm,
  },
  chevronClosed: {
    transform: [{ rotate: "-90deg" }],
    marginRight: SPACING.sm,
  },
  groupTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    color: COLORS.text,
  },
  groupSubtitle: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    marginTop: SPACING.xs * 0.2,
  },
  groupRightBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  groupRightBadgeText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    marginRight: SPACING.xs * 0.5,
  },
  groupCountPill: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs * 0.3,
    borderRadius: SPACING.lg,
    backgroundColor: COLORS.brandLight,
  },
  groupCountPillText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.brandDark,
    fontWeight: "600",
  },
  groupContent: {
    marginTop: SPACING.sm,
  },

  /* Ward card */
  wardCard: {
    backgroundColor: COLORS.card2,
    borderRadius: SPACING.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  wardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  wardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },
  wardName: {
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
    color: COLORS.text,
  },
  floorChip: {
    marginLeft: SPACING.xs,
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs * 0.3,
    borderRadius: SPACING.lg,
    backgroundColor: COLORS.pillBg,
  },
  floorChipText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.pillText,
    fontWeight: "600",
  },
  priceBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs * 0.4,
    borderRadius: SPACING.lg,
    backgroundColor: COLORS.brandSoft,
  },
  priceBadgeText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.brandDark,
    fontWeight: "600",
  },

  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  metaLeft: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  roomRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaEmoji: {
    fontSize: FONT_SIZE.lg,
    marginRight: SPACING.xs * 0.5,
  },
  metaRoomText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    fontWeight: "500",
  },
  locationText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
    marginTop: SPACING.xs * 0.3,
  },
  metaRight: {
    flexShrink: 0,
    alignItems: "flex-end",
  },
  metaLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
  },
  metaValue: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    fontWeight: "500",
  },

  descriptionText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
    marginTop: SPACING.xs,
  },

  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: SPACING.xs,
  },
  dateText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
  },

  amenitiesBlock: {
    marginTop: SPACING.sm,
  },
  amenitiesTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  amenitiesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  amenityPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs * 0.4,
    borderRadius: SPACING.lg,
    backgroundColor: COLORS.chipBg,
    marginRight: SPACING.xs,
    marginBottom: SPACING.xs,
    maxWidth: responsiveWidth(isTablet ? 30 : 44),
  },
  amenityIcon: {
    fontSize: FONT_SIZE.sm,
    marginRight: SPACING.xs * 0.5,
  },
  amenityLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.chipText,
  },
  noAmenitiesText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
  },

  bedsBlock: {
    marginTop: SPACING.sm,
  },
  bedsHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bedsTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: COLORS.text,
  },
  bedsSummaryText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
  },
  bedsVisualRow: {
    marginTop: SPACING.xs,
  },
  bedsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  bed: {
    width: responsiveWidth(4),
    height: responsiveHeight(1.3),
    borderRadius: SPACING.xs * 0.4,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
    marginRight: SPACING.xs * 0.5,
    marginBottom: SPACING.xs * 0.5,
  },
  bedFilled: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.green,
  },

  /* Pagination */
  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: SPACING.md,
  },
  pageBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs * 0.7,
    borderRadius: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.hover,
  },
  pageBtnDisabled: {
    borderColor: COLORS.chip,
    backgroundColor: COLORS.chip,
  },
  pageBtnText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    fontWeight: "600",
  },
  pageBtnTextDisabled: {
    color: COLORS.sub,
  },
  pageInfo: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.sub,
  },

  /* Footer */
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
  },
});

