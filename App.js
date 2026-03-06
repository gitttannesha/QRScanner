import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import AddStock from './src/Screens/AddStock';
import ChemicalDetails from './src/Screens/ChemicalDetails';
import CurrentStock from './src/Screens/CurrentStock';
import Dashboard from './src/Screens/Dashboard';
import LoginScreen from './src/Screens/Login';
import ScannerScreen from './src/Screens/Scanner';
// Remove this if you have it: import { AsyncStorage } from 'react-native';
// Add this:
import AsyncStorage from '@react-native-async-storage/async-storage';
const Stack = createStackNavigator();

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    const checkStatus = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (token) {
          setIsLoggedIn(true);
        }
      } catch (e) {
        console.log("Error reading token:", e);
      } finally {
        // This is the most important part! 
        // It stops the loading circle no matter what.
        setLoading(false); 
      }
    };
    checkStatus();
  }, []);

  if (loading) return <ActivityIndicator size="large" style={{flex:1}} />;
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Dashboard" component={Dashboard} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Scanner" component={ScannerScreen} />
          <Stack.Screen name = "ChemicalDetails" component= {ChemicalDetails}/>
          <Stack.Screen name="CurrentStock" component={CurrentStock} />
<Stack.Screen name="AddStock" component={AddStock} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}