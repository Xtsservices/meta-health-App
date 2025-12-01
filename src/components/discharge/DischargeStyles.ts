// DischargeStyles.ts
import { StyleSheet, Platform } from "react-native";
import {
  SPACING,
  FONT_SIZE,
  ICON_SIZE,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  isTablet,
  isSmallDevice,
  responsiveWidth,
  responsiveHeight,
  GRID,
} from "../../utils/responsive";
import { COLORS } from "../../utils/colour";

export const RESPONSIVE = {
  spacing: SPACING,
  fontSize: FONT_SIZE,
  icon: ICON_SIZE,
  screen: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  grid: GRID,
  isTablet,
  isSmallDevice,
};

export const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: isTablet ? SPACING.xl : SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxl * 2,
  },
  gridContainer: {
    flexDirection: isTablet ? "row" : "column",
    gap: GRID.gap,
  },
  formColumn: {
    flex: isTablet ? 1 : 0,
    width: "100%",
  },
  imageColumn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.lg,
  },
  dischargeImage: {
    width: responsiveWidth(80),
    height: responsiveHeight(40),
    maxWidth: 400,
    maxHeight: 400,
  },
  formGroup: {
    marginBottom: isSmallDevice ? SPACING.sm : SPACING.md,
  },
  row: {
    flexDirection: isTablet ? "row" : "column",
    gap: isTablet ? SPACING.md : SPACING.sm,
  },
  halfWidth: {
    flex: isTablet ? 1 : 0,
    width: isTablet ? "auto" : "100%",
  },
  label: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "500",
    marginBottom: SPACING.xs,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    marginBottom: SPACING.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: isSmallDevice ? SPACING.sm : SPACING.md,
    fontSize: FONT_SIZE.md,
    minHeight: isSmallDevice ? 44 : 48,
  },
  disabledInput: {
    opacity: 0.7,
  },
  textArea: {
    minHeight: isSmallDevice ? 80 : 100,
    textAlignVertical: "top",
    paddingTop: SPACING.md,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    minHeight: isSmallDevice ? 44 : 48,
    justifyContent: "center",
  },
  picker: {
    paddingVertical: 0,
    margin: 0,
  },

  // Diet Styles
  dietDropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: isSmallDevice ? SPACING.sm : SPACING.md,
    minHeight: isSmallDevice ? 44 : 48,
  },
  dietDropdownText: {
    fontSize: FONT_SIZE.md,
    flex: 1,
    marginRight: SPACING.sm,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    // removed maxWidth so long text is visible
    marginRight: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  chipText: {
    fontSize: FONT_SIZE.xs,
    flex: 1,
    marginRight: SPACING.xs,
    color: COLORS.text,
  },
  chipRemove: {
    padding: 2,
  },

  // Dropdown Modal Styles
  dropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  dropdownContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    maxHeight: responsiveHeight(75),
    marginBottom: Platform.OS === "ios" ? 0 : 0,
  },
  dropdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  dropdownTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "600",
  },
  selectedSummaryText: {
    fontSize: FONT_SIZE.sm,
    marginBottom: SPACING.sm,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZE.md,
    marginBottom: SPACING.md,
    minHeight: 44,
  },
  dietList: {
    maxHeight: responsiveHeight(45),
  },
  dietItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.xs,
    minHeight: 44,
  },
  dietItemText: {
    fontSize: FONT_SIZE.md,
    flex: 1,
    marginRight: SPACING.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmark: {
    color: "#FFFFFF",
    fontSize: FONT_SIZE.xs,
    fontWeight: "bold",
  },
  dropdownActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: SPACING.md,
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  dropdownButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: SPACING.sm,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  dropdownButtonText: {
    color: "#FFFFFF",
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
  },

  // Actions (Submit / Cancel)
  actions: {
    flexDirection: "row",
    gap: SPACING.md,
    paddingHorizontal: isTablet ? SPACING.xl : SPACING.md,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.card,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  button: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: SPACING.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  cancelButtonText: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
  },

  // Footer
  footerWrap: {
    width: "100%",
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  navShield: {
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.bg,
  },

  // Utility
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
  },
  loadingText: {
    fontSize: FONT_SIZE.md,
    textAlign: "center",
  },
});
