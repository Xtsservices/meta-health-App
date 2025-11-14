// Routing.tsx
import React from "react";
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from "./navigationTypes";
import splashScreen from "../components/splashScreen";
import login from "../components/login";
import home from "../components/home";
import dashboardOpd from "../components/OPD/dashboard";
import DashboardIpd from "../components/IPD/DashboardIpd";
import selectCategory from "../components/addPatient/selectCategory";
import addPatientForm from "../components/addPatient/addPatientForm";
import patientList from "../components/patientsList/patientList";
import Management from "../components/Management/Management";
import SlotsManagement from "../components/Management/SlotsManagement/SlotsManagement";
import HelpScreen from "../components/helpStaff/HelpScreen";
import DashboardInfoScreen from "../components/helpStaff/DashboardInfo";
import TicketsScreen from "../components/helpStaff/TicketsScreen";
import NewTicketScreen from "../components/helpStaff/NewTicketScreen";
import MyTasks from "../pages/nurseDashboard/MyTasks";
import DashboardLab from "../components/Lab/DashboardLab";
import DashboardPharma from "../components/Pharmacy/DashboardPharma";
import DashboardReception from "../components/Reception/DashboardReception";
import EmergencyDashboard from "../components/Emergency/EmergencyDashboard";
const Stack = createNativeStackNavigator<RootStackParamList>();

const Routing = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={splashScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Login" component={login} options={{ headerShown: false }} />
        <Stack.Screen name="Home" component={home} options={{ headerShown: true }} />
        <Stack.Screen name="DashboardOpd" component={dashboardOpd} options={{ headerShown: false }} />
        <Stack.Screen name="DashboardIpd" component={DashboardIpd} options={{ headerShown: false }} />
        <Stack.Screen name="AddPatient" component={selectCategory} options={{ title: "Add Patient", headerTitleAlign: "center", headerShown: true }} />
        <Stack.Screen name="AddPatientForm" component={addPatientForm} options={{ title: "Add Patient Form", headerTitleAlign: "center", headerShown: true }} />
        <Stack.Screen name="PatientList" component={patientList} options={{ title: "Patients List", headerTitleAlign: "center", headerShown: true }} />
        <Stack.Screen name="DashboardLab" component={DashboardLab} />
        <Stack.Screen name="DashboardPharma" component={DashboardPharma} />
        <Stack.Screen name="DashboardReception" component={DashboardReception} />
        <Stack.Screen name="Management" component={Management} options={{ title: "Management", headerTitleAlign: "center", headerShown: true }} />
        <Stack.Screen
          name="SlotsManagement"
          component={SlotsManagement}
          options={{
            title: "Slots Management",
            headerTitleAlign: "center",
            headerShown: true
          }}
        />

        {/* Help & Support Screens */}
        <Stack.Screen
          name="HelpScreen"
          component={HelpScreen}
          options={{
            headerShown: false
          }}
        />
        <Stack.Screen
          name="DashboardInfoScreen"
          component={DashboardInfoScreen}
          options={{
            title: "Dashboard Documentation",
            headerTitleAlign: "center",
            headerShown: true
          }}
        />
        <Stack.Screen
          name="TicketsScreen"
          component={TicketsScreen}
          options={{
            title: "Support Tickets",
            headerTitleAlign: "center",
            headerShown: true
          }}
        />
        <Stack.Screen
          name="NewTicketScreen"
          component={NewTicketScreen}
          options={{
            title: "Create New Ticket",
            headerTitleAlign: "center",
            headerShown: true
          }}
        />
        <Stack.Screen
          name="MyTasks"
          component={MyTasks}
          options={{
            title: "MyTasks",
            headerTitleAlign: "center",
            headerShown: true
          }}
        />
        <Stack.Screen
          name="EmergencyDashboard"
          component={EmergencyDashboard}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default Routing;