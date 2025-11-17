import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import usePostOPStore from "../../utils/usePostopForm";
import Footer from "../dashboard/footer";


const { width: SCREEN_WIDTH } = Dimensions.get("window");
const scale = (s: number) => (SCREEN_WIDTH / 375) * s;

const COLORS = {
  bg: "#f8fafc",
  card: "#ffffff",
  text: "#0f172a",
  border: "#e2e8f0",
  placeholder: "#94a3b8",
  brand: "#14b8a6",
  pill: "#eef2f7",
};

export default function PostOpNotesScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const { notes, setNotes } = usePostOPStore();

  const [localNotes, setLocalNotes] = useState(notes || "");

  // update local → store
  useEffect(() => {
    setNotes(localNotes);
  }, [localNotes]);

  const handleNext = () => {
    navigation.navigate("PostOpTestsScreen" as never, {
      currentTab: "PostOpRecord",
    });
  };

  return (
    <View style={[styles.safe, { paddingBottom: insets.bottom }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: scale(16),
            paddingBottom: scale(120),
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, { borderColor: COLORS.border }]}>
            <Text style={[styles.title, { color: COLORS.text }]}>
              Post-Op Notes
            </Text>

            <Text style={[styles.label, { color: COLORS.text }]}>Notes</Text>

            <TextInput
              style={[
                styles.textArea,
                {
                  borderColor: COLORS.border,
                  color: COLORS.text,
                  backgroundColor: COLORS.card,
                },
              ]}
              placeholder="Write Post-Op notes here..."
              placeholderTextColor={COLORS.placeholder}
              multiline
              numberOfLines={6}
              value={localNotes}
              onChangeText={setLocalNotes}
              textAlignVertical="top"
            />
          </View>

          {/* NEXT BUTTON */}
          <Pressable
            onPress={handleNext}
            style={({ pressed }) => [
              styles.nextBtn,
              {
                backgroundColor: COLORS.brand,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Text style={styles.nextBtnText}>Next</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* FOOTER */}
      <View style={[styles.footerWrap, { bottom: insets.bottom }]}>
        <Footer active={"patients"} brandColor="#14b8a6" />
      </View>

      {/* Shield for nav buttons */}
      {insets.bottom > 0 && (
        <View
          pointerEvents="none"
          style={[styles.navShield, { height: insets.bottom }]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  card: {
    borderWidth: 1,
    borderRadius: scale(16),
    padding: scale(16),
    backgroundColor: COLORS.card,
  },
  title: {
    fontSize: scale(20),
    fontWeight: "800",
    marginBottom: scale(12),
  },
  label: {
    fontSize: scale(15),
    fontWeight: "700",
    marginBottom: scale(8),
  },
  textArea: {
    borderWidth: 1.5,
    borderRadius: scale(12),
    paddingHorizontal: scale(12),
    paddingVertical: scale(12),
    fontSize: scale(15),
    minHeight: scale(120),
  },
  nextBtn: {
    marginTop: scale(24),
    borderRadius: scale(12),
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: scale(14),
  },
  nextBtnText: {
    color: "#fff",
    fontSize: scale(16),
    fontWeight: "700",
  },
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    height: scale(70),
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  navShield: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
  },
});
