import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "../Screens/LoginScreen";
import Dashboard from "../Screens/Dashboard";
import ScannerScreen from "../Screens/Scanner";
import CurrentStock from "../screens/CurrentStock";
import AddStock from "../screens/AddStock";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        
        <Stack.Screen name="Login" component={LoginScreen}/>
        <Stack.Screen name="Dashboard" component={Dashboard}/>
         <Stack.Screen name="Scanner" component={ScannerScreen} />
        <Stack.Screen name="CurrentStock" component={CurrentStock} />
        <Stack.Screen name="AddStock" component={AddStock} />

      </Stack.Navigator>
    </NavigationContainer>
  );
}
