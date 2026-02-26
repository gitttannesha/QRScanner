import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { Image, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";


const Dashboard = () => {
  const navigation = useNavigation();
  const [userName, setUserName] = useState("User");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("userData");
        if (storedUser) {
          const user = JSON.parse(storedUser);
          // This pulls 'fname' from the data we saved during login
          setUserName(user.fname || "User"); 
        }
      } catch (error) {
        console.log("Error loading profile:", error);
      }
    };
    loadProfile();
  }, []);

  // Open Camera
  const handleScan = () => {
    
    navigation.navigate("Scanner");
  };

  // Go to Current Stock page
  const handleCurrentStock = () => {
    navigation.navigate("CurrentStock");
  };

  // Go to Add Stock page
  const handleAddStock = () => {
    navigation.navigate("AddStock");
  };

  // Logout
  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("token");
      navigation.replace("Login");
    } catch (error) {
      console.log("Logout Error:", error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Ensures the top icons like battery/clock don't look messy */}
      <StatusBar barStyle="dark-content" />

      <Image
          source={require("../assets/scanner.png")}
          style={styles.qrImage}
      />
      
      <TouchableOpacity style={styles.btn} onPress={handleScan}>
        <Text style={styles.btnText}>SCAN ME</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btn} onPress={handleCurrentStock}>
        <Text style={styles.btnText}>CURRENT STOCK</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btn} onPress={handleAddStock}>
        <Text style={styles.btnText}>ADD STOCK</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logout} onPress={handleLogout}>
        <Text style={styles.btnText}>LOG OUT</Text>
      </TouchableOpacity>

    </View>
  );
};

export default Dashboard;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F0DB",
    justifyContent: "center",
    alignItems: "center",
  },

  qrImage: {
    width: 180,
    height: 180,
    marginBottom: 40,
  },

  btn: {
    backgroundColor: "#F2A65A",
    paddingVertical: 18,
    width: 260,
    borderRadius: 15,
    alignItems: "center",
    marginVertical: 12,
    elevation: 3, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
  },

  btnText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },

  logout: {
    position: "absolute",
    top: 50, // If this overlaps with your phone's clock, increase to 60
    right: 20,
    backgroundColor: "#F2A65A",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
});