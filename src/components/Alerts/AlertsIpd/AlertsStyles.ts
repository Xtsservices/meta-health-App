// styles/AlertsStyles.ts
import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Responsive scaling
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;
const verticalScale = (size: number) => (SCREEN_HEIGHT / 812) * size;
const moderateScale = (size: number, factor: number = 0.5) => size + (scale(size) - size) * factor;

export const RESPONSIVE = {
  screen: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT },
  headerHeight: verticalScale(60) + (Platform.OS === 'ios' ? 44 : 24),
  spacing: {
    xs: verticalScale(4),
    sm: verticalScale(8),
    md: verticalScale(12),
    lg: verticalScale(16),
    xl: verticalScale(20),
  },
  fontSize: {
    xs: moderateScale(10),
    sm: moderateScale(12),
    md: moderateScale(14),
    lg: moderateScale(16),
    xl: moderateScale(18),
    xxl: moderateScale(20),
  },
  borderRadius: {
    sm: moderateScale(4),
    md: moderateScale(8),
    lg: moderateScale(12),
  },
  cardMinWidth: SCREEN_WIDTH < 375 ? (SCREEN_WIDTH - scale(44)) / 2 : (SCREEN_WIDTH - scale(44)) / 2,
  icon: {
    sm: moderateScale(16),
    md: moderateScale(20),
    lg: moderateScale(24),
  },
};

export const styles = StyleSheet.create({
  // Common Styles
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollView: {
    flex: 1,
  },

  // Header Styles
  header: {
    height: RESPONSIVE.headerHeight,
    paddingHorizontal: RESPONSIVE.spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#14b8a6",
    paddingTop: Platform.OS === 'ios' ? 40 : 20,
  },
  headerTitle: {
    fontSize: RESPONSIVE.fontSize.xxl,
    fontWeight: "700",
    color: "#ffffff",
    flex: 1,
    textAlign: 'center',
    marginRight: 40,
  },
  menuBtn: {
    width: 38,
    height: 38,
    borderRadius: RESPONSIVE.borderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },

  // Stats Grid Styles
  statsGrid: {
    gap: RESPONSIVE.spacing.md,
  },
  statsRow: {
    flexDirection: "row",
    gap: RESPONSIVE.spacing.md,
    justifyContent: "space-between",
    alignItems: "stretch",
  },
  
  // Update the existing statsCard style:
  statsCard: {
    flex: 1,
    padding: RESPONSIVE.spacing.lg,
    borderRadius: RESPONSIVE.borderRadius.lg,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    backgroundColor: "#ffffff",
    minHeight: 80, // Add minimum height for consistency
  },

  // Keep your existing statsContent, statsTitle, statsValue, statsIcon styles as they are
  statsContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  statsTitle: {
    fontSize: RESPONSIVE.fontSize.sm,
    color: "#6b7280",
    marginBottom: 4,
    fontWeight: "400",
  },
  statsValue: {
    fontSize: RESPONSIVE.fontSize.lg,
    fontWeight: "bold",
  },
  statsIcon: {
    width: 36,
    height: 36,
    borderRadius: RESPONSIVE.borderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },

  // Tab Styles
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: RESPONSIVE.borderRadius.lg,
    padding: 4,
    marginVertical: RESPONSIVE.spacing.sm,
  },
  tabButton: {
    flex: 1,
    paddingVertical: RESPONSIVE.spacing.md,
    paddingHorizontal: RESPONSIVE.spacing.lg,
    borderRadius: RESPONSIVE.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  tabButtonActive: {
    backgroundColor: "#14b8a6",
    shadowColor: "#14b8a6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  tabButtonInactive: {
    backgroundColor: "transparent",
  },
  tabContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: RESPONSIVE.spacing.sm,
  },
  tabText: {
    fontSize: RESPONSIVE.fontSize.md,
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#ffffff",
  },
  tabTextInactive: {
    color: "#64748b",
  },
  tabBadge: {
    backgroundColor: "#ef4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  tabBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },

  // Filter Styles
  filterContainer: {
    backgroundColor: "#ffffff",
    borderRadius: RESPONSIVE.borderRadius.lg,
    padding: RESPONSIVE.spacing.lg,
    marginBottom: RESPONSIVE.spacing.sm,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  searchInput: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: RESPONSIVE.borderRadius.md,
    paddingHorizontal: RESPONSIVE.spacing.md,
    paddingVertical: RESPONSIVE.spacing.sm,
    fontSize: RESPONSIVE.fontSize.md,
    marginBottom: RESPONSIVE.spacing.sm,
    color: "#111827",
  },
  filterButtons: {
    flexDirection: "row",
    gap: RESPONSIVE.spacing.xs,
  },
  filterButton: {
    flex: 1,
    paddingVertical: RESPONSIVE.spacing.xs,
    paddingHorizontal: RESPONSIVE.spacing.sm,
    borderRadius: RESPONSIVE.borderRadius.sm,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
  },
  filterButtonActive: {
    backgroundColor: "#14b8a6",
  },
  filterButtonText: {
    fontSize: RESPONSIVE.fontSize.xs,
    fontWeight: "600",
    color: "#6b7280",
  },
  filterButtonTextActive: {
    color: "#ffffff",
  },

  // Alert Card Styles
  alertCard: {
    backgroundColor: "#ffffff",
    borderRadius: RESPONSIVE.borderRadius.lg,
    padding: RESPONSIVE.spacing.lg,
    marginHorizontal: RESPONSIVE.spacing.xs,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  watchedCard: {
    opacity: 0.8,
    borderLeftWidth: 4,
    borderLeftColor: "#14b8a6",
  },
  alertHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: RESPONSIVE.spacing.md,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: RESPONSIVE.fontSize.lg,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  patientId: {
    fontSize: RESPONSIVE.fontSize.xs,
    color: "#6b7280",
  },
  priorityBadge: {
    paddingHorizontal: RESPONSIVE.spacing.xs,
    paddingVertical: RESPONSIVE.spacing.xs,
    borderRadius: RESPONSIVE.borderRadius.sm,
  },
  priorityText: {
    fontSize: RESPONSIVE.fontSize.xs,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  alertBody: {
    marginBottom: RESPONSIVE.spacing.md,
  },
  alertMessage: {
    fontSize: RESPONSIVE.fontSize.md,
    color: "#374151",
    lineHeight: 20,
    marginBottom: 4,
  },
  alertValue: {
    fontSize: RESPONSIVE.fontSize.sm,
    color: "#6b7280",
    fontWeight: "500",
  },
  alertFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerLeft: {
    flex: 1,
  },
  wardText: {
    fontSize: RESPONSIVE.fontSize.xs,
    color: "#6b7280",
    marginBottom: 2,
  },
  dateText: {
    fontSize: RESPONSIVE.fontSize.xs,
    color: "#6b7280",
  },
  viewButton: {
    backgroundColor: "#14b8a6",
    paddingHorizontal: RESPONSIVE.spacing.lg,
    paddingVertical: RESPONSIVE.spacing.xs,
    borderRadius: RESPONSIVE.borderRadius.sm,
  },
  viewButtonText: {
    color: "#ffffff",
    fontSize: RESPONSIVE.fontSize.xs,
    fontWeight: "600",
  },
  watchedIndicator: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: RESPONSIVE.spacing.xs,
    paddingVertical: RESPONSIVE.spacing.xs,
    borderRadius: RESPONSIVE.borderRadius.sm,
  },
  watchedText: {
    fontSize: RESPONSIVE.fontSize.xs,
    color: "#16a34a",
    fontWeight: "600",
  },

  // Section Styles
  prioritySection: {
    marginBottom: RESPONSIVE.spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: RESPONSIVE.spacing.lg,
    paddingVertical: RESPONSIVE.spacing.md,
    backgroundColor: "#ffffff",
    borderLeftWidth: 4,
    marginBottom: RESPONSIVE.spacing.xs,
    borderRadius: RESPONSIVE.borderRadius.md,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  sectionTitle: {
    fontSize: RESPONSIVE.fontSize.lg,
    fontWeight: "700",
    color: "#111827",
  },
  sectionCount: {
    fontSize: RESPONSIVE.fontSize.xs,
    color: "#6b7280",
    fontWeight: "500",
  },
  alertsList: {
    gap: RESPONSIVE.spacing.xs,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: RESPONSIVE.spacing.xl,
    paddingVertical: RESPONSIVE.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: RESPONSIVE.fontSize.xl,
    fontWeight: "700",
    color: "#111827",
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 20,
    color: "#6b7280",
    fontWeight: "300",
  },
  modalContent: {
    flex: 1,
    padding: RESPONSIVE.spacing.xl,
  },
  modalFooter: {
    padding: RESPONSIVE.spacing.xl,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  watchedBadge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: RESPONSIVE.spacing.md,
    paddingVertical: RESPONSIVE.spacing.sm,
    borderRadius: RESPONSIVE.borderRadius.sm,
    alignSelf: "flex-start",
    marginBottom: RESPONSIVE.spacing.lg,
  },
  watchedBadgeText: {
    color: "#16a34a",
    fontSize: RESPONSIVE.fontSize.xs,
    fontWeight: "600",
  },
  detailSection: {
    marginBottom: RESPONSIVE.spacing.xl,
  },
  detailLabel: {
    fontSize: RESPONSIVE.fontSize.lg,
    fontWeight: "600",
    color: "#111827",
    marginBottom: RESPONSIVE.spacing.md,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: RESPONSIVE.spacing.xs,
  },
  detailKey: {
    fontSize: RESPONSIVE.fontSize.md,
    color: "#6b7280",
    width: 80,
    fontWeight: "500",
  },
  detailValue: {
    fontSize: RESPONSIVE.fontSize.md,
    color: "#111827",
    flex: 1,
  },
  alertMessageText: {
    lineHeight: 20,
  },
  patientButton: {
    backgroundColor: "#14b8a6",
    paddingVertical: RESPONSIVE.spacing.md,
    borderRadius: RESPONSIVE.borderRadius.md,
    alignItems: "center",
  },
  patientButtonText: {
    color: "#ffffff",
    fontSize: RESPONSIVE.fontSize.lg,
    fontWeight: "600",
  },

  // Empty State Styles
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: RESPONSIVE.fontSize.xl,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: RESPONSIVE.fontSize.md,
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 20,
  },

  // Loading Styles
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingBottom: 100,
  },
  loadingText: {
    marginTop: RESPONSIVE.spacing.md,
    fontSize: RESPONSIVE.fontSize.md,
    color: "#14b8a6",
  },

  // Footer Styles
  footer: {
    backgroundColor: "#ffffff",
    paddingVertical: RESPONSIVE.spacing.md,
    paddingHorizontal: RESPONSIVE.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  footerText: {
    fontSize: RESPONSIVE.fontSize.sm,
    color: "#6b7280",
    textAlign: "center",
  },

  // Container Content
  containerContent: {
    padding: RESPONSIVE.spacing.lg,
    gap: RESPONSIVE.spacing.lg,
  },
  resultsCount: {
    fontSize: RESPONSIVE.fontSize.sm,
    color: "#6b7280",
    marginBottom: RESPONSIVE.spacing.sm,
    paddingHorizontal: RESPONSIVE.spacing.xs,
  },
footerWrap: {
  left: 0,
  right: 0,
  bottom: 0,
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