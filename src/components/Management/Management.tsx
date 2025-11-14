import React from "react";
import { View, StyleSheet, SafeAreaView } from "react-native";
import DoctorManagmentTabs from "./DoctorManagmentTabs";

const Management: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <DoctorManagmentTabs />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  content: {
    flex: 1,
    padding: 16,
  },
});

export default Management;