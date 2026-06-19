import { Feather as Icon, MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
//import rateLimit from "express-rate-limit";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getRequest, postRequest } from '../services/authservice';
import { clearStorage, getToken, saveToken, saveUser } from "../utilis/storage";
import Header from "./Header";

const LoginScreen = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secureText, setSecureText] = useState(true);
  

 const checkLogin = async () => {
  try {
    const token = await getToken();
    if (token) {
      const res = await getRequest('/verify-token');
      if (res.data.success) {
        navigation.replace("Dashboard");
      } else {
        await clearStorage();
      }
    }
  } catch (e) {
    console.log("Token invalid or expired", e);
    await clearStorage();
  } finally {
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
      const res = await postRequest('/login', {
        email: email,
        password: password,
        device: Platform.OS
      }, { requiresAuth: false });
      if (res.data.success) {
        await saveToken(res.data.token);
        await saveUser(res.data.user);
        Alert.alert("Login Success, your session will last for 15 days");
        navigation.replace("Dashboard");
      }
    }
  catch (error) {
  console.log("FULL ERROR:", error);

  if (error.response) {
    console.log("SERVER ERROR:", error.response.data);
    Alert.alert("Login Failed", error.response.data.message);
  } else if (error.request) {
    console.log("NO RESPONSE:", error.request);
    Alert.alert("Login Failed", "Server not reachable");
  } else {
    console.log("ERROR:", error.message);
    Alert.alert("Login Failed", error.message);
  }
}


router.post("/login", loginLimiter, loginHandler);


  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior="padding"
      keyboardVerticalOffset={0}
      
    >
      <StatusBar barStyle="light-content" backgroundColor="#1A3C6E" />

      {/* ── Header added (logo only, no person icon) ── */}
      <Header showProfile={false} />

      <SafeAreaView style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>IITBNF APP</Text>

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
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#d9d6c3",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
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
