
import { Feather as Icon, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import { useEffect, useState } from "react";
import {
  Alert, Platform, StatusBar, StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_BASE_URL } from '../config/api';
import Header from "./Header";

const LoginScreen = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secureText, setSecureText] = useState(true);
  const [loading, setLoading] = useState(true);

  const checkLogin = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (token) {
        console.log("TOKEN found, redirecting...");
        navigation.replace("Dashboard");
      }
    } catch (e) {
      console.log("Error reading token", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkLogin();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Enter email & password");
      return;
    }
    try {
      const res = await axios.post(`${API_BASE_URL}/login`, {
        email: email,
        password: password,
        device: Platform.OS
      });
      if (res.data.success) {
        await AsyncStorage.setItem("token", res.data.token);
        await AsyncStorage.setItem("userData", JSON.stringify(res.data.user));
        Alert.alert("Login Success");
        navigation.replace("Dashboard");
      }
    } catch (error) {
      if (error.response && error.response.data && error.response.data.message) {
        Alert.alert("Login Failed", error.response.data.message);
      } else {
        Alert.alert("Login Failed", "Check your server connection");
      }
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor="#1A3C6E" />

      {/* ── Header added (logo only, no person icon) ── */}
      <Header showProfile={false} />

      {/* ── Everything below is exactly the same as before ── */}
      <SafeAreaView style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>QR INVENTORY APP</Text>

          <View style={styles.qrContainer}>
            <MaterialIcons name="qr-code-scanner" size={60} color="#333" />
          </View>

          <View style={styles.inputContainer}>
            <Icon name="mail" size={20} color="#555" style={styles.leftIcon} />
            <TextInput
              placeholder="Email"
              placeholderTextColor="#555"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Icon name="lock" size={20} color="#555" style={styles.leftIcon} />
            <TextInput
              placeholder="Password"
              placeholderTextColor="#555"
              style={styles.input}
              secureTextEntry={secureText}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setSecureText(!secureText)}>
              <Icon name={secureText ? "eye-off" : "eye"} size={20} color="#555" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
            <Text style={styles.loginText}>Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#d9d6c3",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: "80%",
    backgroundColor: "#FFD786",
    padding: 25,
    borderRadius: 10,
    alignItems: "center",
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 20,
    color: "#000",
  },
  qrContainer: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 25,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#d9d9d9",
    borderRadius: 25,
    paddingHorizontal: 15,
    width: "100%",
    marginBottom: 15,
  },
  leftIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 45,
    color: "#000",
  },
  loginBtn: {
    backgroundColor: "#d9d9d9",
    borderRadius: 25,
    paddingVertical: 12,
    width: "100%",
    alignItems: "center",
    marginTop: 10,
  },
  loginText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
});