import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import AddStockScreen from "../Screens/Addstock";
import ChemicalDetails from "../Screens/ChemicalDetails";
import ConsumableDetails from "../Screens/ConsumableDetails";
import Dashboard from "../Screens/Dashboard";
import IssuedItemsScreen from "../Screens/Issuestock";
import LoginScreen from "../Screens/Login";
import Profilescreen from "../Screens/Profilescreen";
import ScannerScreen from "../Screens/Scanner";
import SparePartDetails from "../Screens/SparePartDetails";
import TransactionsScreen from "../Screens/Transaction";

const Stack = createStackNavigator();

export default function AppNavigator({ initialRouteName = "Login" }) {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Dashboard" component={Dashboard} />
        <Stack.Screen name="Profile" component={Profilescreen} />
        <Stack.Screen name="Scanner" component={ScannerScreen} />
        <Stack.Screen name="ChemicalDetails" component={ChemicalDetails} />
        <Stack.Screen name="ConsumableDetails" component={ConsumableDetails} />
        <Stack.Screen name="SparePartDetails" component={SparePartDetails} />
        <Stack.Screen name="Addstock" component={AddStockScreen} />
        <Stack.Screen name="IssuedItems" component={IssuedItemsScreen} />
        <Stack.Screen name="Transactions" component={TransactionsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
