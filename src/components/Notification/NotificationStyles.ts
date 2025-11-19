// styles/NotificationStyles.ts
import { StyleSheet, Dimensions, Platform } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export const NotificationStyles = StyleSheet.create({
  // Common Styles
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: Platform.OS === 'ios' ? 20 : 10,
  },
  modalContainer: {
    width: "100%",
    height: "90%",
    maxWidth: Platform.OS === 'ios' ? 900 : 1000,
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: SCREEN_WIDTH < 375 ? 14 : 16,
    color: "#64748b",
  },

  // Header Styles
  header: {
    backgroundColor: "#14b8a6",
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  modalHeader: {
    backgroundColor: "#14b8a6",
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    minHeight: 100,
  },
  backButton: {
    padding: 8,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "300",
    lineHeight: 22,
    marginTop: -2,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  modalHeaderContent: {
    flex: 1,
  },
  title: {
    fontSize: SCREEN_WIDTH < 375 ? 18 : 20,
    fontWeight: "700",
    color: "#fff",
    textAlign: 'center',
  },
  modalTitle: {
    fontSize: SCREEN_WIDTH < 375 ? 20 : 22,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 6,
  },
  patientName: {
    fontSize: SCREEN_WIDTH < 375 ? 14 : 16,
    color: "#fff",
    opacity: 0.9,
    marginTop: 4,
    textAlign: 'center',
  },
  modalPatientName: {
    fontSize: SCREEN_WIDTH < 375 ? 15 : 16,
    color: "#fff",
    opacity: 0.95,
    marginBottom: 2,
  },
  patientId: {
    fontSize: SCREEN_WIDTH < 375 ? 13 : 14,
    color: "#fff",
    opacity: 0.8,
  },
  currentTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  currentTime: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
  },

  // Content Styles
  content: {
    flex: 1,
  },
  container: {
    flex: 1,
  },

  // Date Tabs Styles
  dateTabsWrapper: {
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    maxHeight: SCREEN_WIDTH < 375 ? 70 : 80,
  },
  dateTabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateTab: {
    paddingHorizontal: SCREEN_WIDTH < 375 ? 16 : 20,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    alignItems: 'center',
    minWidth: SCREEN_WIDTH < 375 ? 90 : 100,
  },
  dateTabActive: {
    backgroundColor: "#14b8a6",
    borderColor: "#0d9488",
    shadowColor: "#14b8a6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  dateTabToday: {
    borderColor: "#f59e0b",
  },
  dateTabText: {
    fontSize: SCREEN_WIDTH < 375 ? 12 : 14,
    fontWeight: "600",
    color: "#64748b",
  },
  dateTabTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  todayBadge: {
    fontSize: 10,
    color: "#f59e0b",
    fontWeight: "700",
    marginTop: 2,
  },

  // No Data States
  noDatesContainer: {
    padding: 40,
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  noDatesText: {
    fontSize: SCREEN_WIDTH < 375 ? 15 : 16,
    color: "#64748b",
    marginTop: 12,
    fontWeight: "600",
  },
  noDatesSubtext: {
    fontSize: SCREEN_WIDTH < 375 ? 13 : 14,
    color: "#94a3b8",
    marginTop: 4,
    textAlign: "center",
  },

  // Medicine Section
  medicineSection: {
    flex: 1,
  },
  medicineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  medicineTitle: {
    fontSize: SCREEN_WIDTH < 375 ? 17 : 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  medicinesScroll: {
    flex: 1,
  },
  medicinesScrollContent: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  medicinesContainer: {
    flex: 1,
  },

  // Time Group Styles
  timeGroup: {
    marginBottom: 20,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  timeGroupHeader: {
    flexDirection: SCREEN_WIDTH < 375 ? "column" : "row",
    justifyContent: "space-between",
    alignItems: SCREEN_WIDTH < 375 ? "flex-start" : "center",
    marginBottom: 16,
    gap: SCREEN_WIDTH < 375 ? 12 : 0,
  },
  timeGroupTitleContainer: {
    flex: 1,
  },
  timeGroupTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  timeGroupTitle: {
    fontSize: SCREEN_WIDTH < 375 ? 16 : 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  timeGroupSubtitle: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
    marginLeft: SCREEN_WIDTH < 375 ? 24 : 26,
  },
  completionContainer: {
    alignItems: "flex-end",
    minWidth: SCREEN_WIDTH < 375 ? '100%' : 120,
  },
  completionText: {
    fontSize: 12,
    color: "#14b8a6",
    fontWeight: "700",
    marginBottom: 6,
  },
  progressBar: {
    width: SCREEN_WIDTH < 375 ? '100%' : 100,
    height: 6,
    backgroundColor: "#e2e8f0",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#14b8a6",
    borderRadius: 3,
  },
  medicinesList: {
    gap: 12,
  },

  // No Medicines State
  noMedicines: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  noMedicinesText: {
    fontSize: SCREEN_WIDTH < 375 ? 15 : 16,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 24,
    fontWeight: "600",
  },
  noMedicinesSubtext: {
    fontSize: SCREEN_WIDTH < 375 ? 13 : 14,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },

  // Footer Styles
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  closeFooterButton: {
    backgroundColor: "#14b8a6",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
    alignSelf: "center",
    minWidth: 120,
    shadowColor: "#14b8a6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  closeFooterButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
   footerWrap: {
    left: 0,
    right: 0,
    justifyContent: "center",
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