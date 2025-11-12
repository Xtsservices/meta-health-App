import React from "react";
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from "./navigationTypes";
import splashScreen from "../components/splashScreen";
import login from "../components/login";
import home from "../components/home";
import dashboardOpd from "../components/OPD/dashboard";
import selectCategory from "../components/addPatient/selectCategory";
import addPatientForm from "../components/addPatient/addPatientForm";
import patientList from "../components/patientsList/patientList";







const Stack = createNativeStackNavigator<RootStackParamList>();

const Routing = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={splashScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Login" component={login} options={{ headerShown: false }} />
        <Stack.Screen name="Home" component={home} options={{ headerShown: true }}/>
        <Stack.Screen name="DashboardOpd" component={dashboardOpd} options={{ headerShown: false }}/>
        <Stack.Screen name="AddPatient" component={selectCategory} options={{ title: "Add Patient", headerTitleAlign: "center", headerShown: true }}/>
        <Stack.Screen name="AddPatientForm" component={addPatientForm} options={{ title: "Add Patient Form", headerTitleAlign: "center", headerShown: true }}/>
        <Stack.Screen name="PatientList" component={patientList} options={{ title: "Patients List", headerTitleAlign: "center", headerShown: true }}/>

      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default Routing