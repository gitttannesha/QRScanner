import { useNavigation } from "@react-navigation/native";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  Linking,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { clearStorage, getUser } from '../utilis/storage';
import Header from "./Header";

const Dashboard = () => {
  const navigation = useNavigation();
  const [userName, setUserName] = useState("User");
  const [userRole, setUserRole] = useState("Member");
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const user = await getUser();
	  if(user){
		setUserName(`${user.fname} ${user.lname}`);
                setUserRole(user.position || "Member");
}
      } catch (error) {
        console.log("Error loading profile:", error);
      }
    };
    loadProfile();
  }, []); 
 

  const toggleDropdown = () => {
    if (dropdownVisible) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => setDropdownVisible(false));
    } else {
      setDropdownVisible(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleScan = () => navigation.navigate("Scanner");

  const handleLogout = async () => {
    try {
      await clearStorage();
      navigation.replace("Login");
    } catch (error) {
      console.log("Logout Error:", error);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2f5081" />
      <Header showProfile = {true} userName= {userName} userRole={userRole}/>       
   

      {/* ── Body ── */}
      <View style={styles.body}>
        <Text style={styles.welcomeText}> Hi, {userName}!👋 {'\n'} Welcome to the IITBNF Inventory{'\n'} App</Text>

        <View style={styles.qrCard}>
          <Image
            source={require("../assets/scanner.png")}
            style={styles.qrImage}
          />
        </View>

        
        <TouchableOpacity style={styles.btn} onPress={handleScan}>
          <Text style={styles.btnIcon}>⬡</Text>
          <Text style={styles.btnText}>SCAN ME</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.footer , { bottom: insets.bottom + 30 }]}>
      <Text style={styles.versionText}>IITBNF Inventory App • v2.0.0</Text>
        <TouchableOpacity onPress={() => Linking.openURL('https://www.iitbnf.iitb.ac.in/iitbnf/it-team/it-team.php')}>
        <Text style={styles.linkText}>IITBNF</Text>
        </TouchableOpacity>
        </View>
    </View>
  );
};

export default Dashboard;

const NAVY = "#1A3C6E";
const AMBER = "#E8A020";
const AMBER_LIGHT = "#FFD786";
const BG = "#F5F0E8";
const WHITE = "#FFFFFF";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },

 

  /* ── Body ── */
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  welcomeText: {
    fontSize: 19,
    fontWeight: "700",
    color: NAVY,
    marginBottom: 20,
    letterSpacing: 0.3,
    textAlign: "center",

  },
  qrCard: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 16,
    marginBottom: 36,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  qrImage: {
    width: 160,
    height: 160,
    resizeMode: "contain",
  },

  /* ── Buttons ── */
  btn: {
    backgroundColor: AMBER_LIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    width: 280,
    borderRadius: 14,
    marginVertical: 8,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    gap: 10,
  },
  btnAccent: {
    backgroundColor: AMBER,
  },
  btnIcon: {
    fontSize: 20,
  },
  btnText: {
    fontSize: 15,
    fontWeight: "700",
    color: NAVY,
    letterSpacing: 1.2,
  },
  footer: {
  position: "absolute",
  bottom: 20,
  left:0,
  right:0,
  alignItems: "center",
  gap: 4,
},
versionText: {
  fontSize: 11,
  color: "#AAA",
  textAlign: "center",
  letterSpacing: 0.4,
},
linkText: {
  fontSize: 11,
  color: NAVY,
  textDecorationLine: "underline",
  fontWeight: "600",
  letterSpacing: 0.4,
},

});












