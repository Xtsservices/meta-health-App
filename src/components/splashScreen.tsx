import React, { useEffect } from "react";
import { Image, StyleSheet, Dimensions, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthFetch } from "../auth/auth";
import { useDispatch } from "react-redux";
import { currentUser } from "../store/store";
import { showError } from "../store/toast.slice";

const { width } = Dimensions.get("window");

const SplashScreen = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        const userId = await AsyncStorage.getItem("userID");

        // ❌ No token → Go to Login
        if (!token || !userId) {
          navigation.replace("Login");
          return;
        }

        // Try auto-login
        const res = await AuthFetch(`user/${Number(userId)}`, token);
        const user = res?.data?.user;

        if (!user) {
          navigation.replace("Login");
          return;
        }

        // Store in redux
        

        // Route selection
        if (user.scope === "5008" || user.scope === "5007") {
          const newRoleName = user.scope === "5007" ? "surgeon" : "anesthetist"
          const updatedUser = {
        ...user,
        roleName: newRoleName
      };
       dispatch(currentUser(updatedUser));
          navigation.replace("OtDashboard");
        } else {
          dispatch(currentUser(user));
          navigation.replace("Home");
        }

      } catch (e) {
        dispatch(showError("Auto login failed"));
        navigation.replace("Login");
      }
    };

    // Give small delay to show splash
    const timer = setTimeout(checkLogin, 1400);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Image source={require("../assets/Logo.png")} style={styles.logo} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: width * 0.6,
    height: width * 0.6,
    resizeMode: "contain",
  },
});

export default SplashScreen;
