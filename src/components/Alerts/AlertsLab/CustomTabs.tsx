import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS } from "../../../utils/colour";
import { SPACING, FONT_SIZE, isTablet } from "../../../utils/responsive";

interface Tab {
  key: string;
  label: string;
}

interface CustomTabsProps {
  tabs: Tab[];
  activeTab: number;
  onTabChange: (index: number) => void;
}

const CustomTabs: React.FC<CustomTabsProps> = ({ tabs, activeTab, onTabChange }) => {
  return (
    <View style={styles.container}>
      <View style={styles.tabsContainer}>
        {tabs?.map((tab, index) => (
          <TouchableOpacity
            key={tab?.key}
            style={[
              styles.tab,
              activeTab === index && styles.activeTab,
            ]}
            onPress={() => onTabChange(index)}
          >
            <Text style={[
              styles.tabText,
              activeTab === index && styles.activeTabText,
            ]}>
              {tab?.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 4,
  },
  tabsContainer: {
    flexDirection: "row",
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  activeTab: {
    backgroundColor: COLORS.card,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "500",
    color: COLORS.sub,
  },
  activeTabText: {
    color: COLORS.brand,
    fontWeight: "600",
  },
});

export default CustomTabs;