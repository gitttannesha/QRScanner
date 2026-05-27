import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AddStockScreen from './src/Screens/Addstock';
import ChemicalDetails from './src/Screens/ChemicalDetails';
import ConsumableDetails from './src/Screens/ConsumableDetails';
import Dashboard from './src/Screens/Dashboard';
import Form from './src/Screens/Form';
import IssuedItemsScreen from './src/Screens/Issuestock';
import LoginScreen from './src/Screens/Login';
import ScannerScreen from './src/Screens/Scanner';
import SparePartDetails from './src/Screens/SparePartDetails';
import TransactionsScreen from './src/Screens/Transaction';
// import Troubleshooting from './src/Screens/Troubleshooting';
import { getRequest } from './src/services/authservice';
import { logError } from './src/utilis/errorLogger';
import { getToken } from './src/utilis/storage';


const Stack = createStackNavigator();

if (global.ErrorUtils?.getGlobalHandler && global.ErrorUtils?.setGlobalHandler) {
  const defaultErrorHandler = global.ErrorUtils.getGlobalHandler();

  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    logError(error, {
      screen: 'GLOBAL',
      action: isFatal ? 'FATAL_CRASH' : 'JS_ERROR',
    });

    if (typeof defaultErrorHandler === 'function') {
      defaultErrorHandler(error, isFatal);
    }
  });
}

export default function App() {
  const [initialRouteName, setInitialRouteName] = useState('Login');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const token = await getToken();

        if (!token) {
          setInitialRouteName('Login');
          return;
        }

        await getRequest('/verify-token');
        setInitialRouteName('Dashboard');
      } catch (error) {
        console.log('Startup auth check failed:', error?.message || error);
        setInitialRouteName('Login');
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  if (loading) {
    return (
      <SafeAreaProvider>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#1A3C6E" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{ headerShown: false }}
          initialRouteName={initialRouteName}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Dashboard" component={Dashboard} />
          <Stack.Screen name="Scanner" component={ScannerScreen} />
          <Stack.Screen name="ChemicalDetails" component={ChemicalDetails} />
          {/* <Stack.Screen name="Troubleshooting" component={Troubleshooting} /> */}
          <Stack.Screen name="Form" component={Form} />
          <Stack.Screen name="ConsumableDetails" component={ConsumableDetails} />
          <Stack.Screen name="SparePartDetails" component={SparePartDetails} />
          <Stack.Screen name="Addstock" component={AddStockScreen} />
          <Stack.Screen name="IssuedItems" component={IssuedItemsScreen} />
          <Stack.Screen name="Transactions" component={TransactionsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F0E8',
  },
});
