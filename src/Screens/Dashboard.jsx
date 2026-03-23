
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from "react-native";


const Dashboard = () => {
  const navigation = useNavigation();
  const [userName, setUserName] = useState("User");
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("userData");
        if (storedUser) {
          const user = JSON.parse(storedUser);
          setUserName(`${user.fname} ${user.lname}` || "User");
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
  const handleCurrentStock = () => navigation.navigate("CurrentStock");
  const handleAddStock = () => navigation.navigate("AddStock");

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
      <StatusBar barStyle="light-content" backgroundColor="#2f5081" />

      {/* ── Header Nav ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={require("../assets/IITB_logo.png")}
            style={styles.headerLogo}
          />
          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerTitle}>IITB</Text>
            <Text style={styles.headerSubtitle}>NanoFabrication Laboratory</Text>
          </View>
        </View>

        {/* Person icon + dropdown */}
        <TouchableOpacity style={styles.avatarBtn} onPress={toggleDropdown}>
          {/* Person SVG-style icon using View shapes */}
          <View style={styles.personIcon}>
            <View style={styles.personHead} />
            <View style={styles.personBody} />
          </View>
          <Text style={styles.chevron}>{dropdownVisible ? "▲" : "▼"}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Dropdown Modal ── */}
      {dropdownVisible && (
        <TouchableWithoutFeedback onPress={toggleDropdown}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <Animated.View style={[styles.dropdown, { opacity: fadeAnim }]}>
                <View style={styles.dropdownUserRow}>
                  <View style={styles.dropdownAvatar}>
                    <Text style={styles.dropdownAvatarText}>
                      {userName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.dropdownName}>{userName}</Text>
                    
                  </View>
                </View>
                <View style={styles.dropdownDivider} />
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={handleLogout}
                >
                  {/* Logout icon */}
                  <Text style={styles.dropdownIcon}>⎋</Text>
                  <Text style={styles.dropdownLogoutText}>Log Out</Text>
                </TouchableOpacity>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      )}

      {/* ── Body ── */}
      <View style={styles.body}>
        <Text style={styles.welcomeText}> Hi, {userName}!👋 {'\n'} Welcome to IITBNF Inventory{'\n'} Module</Text>

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

       
        <Text style={styles.versionText}>IITBNF Inventory Module • v2.0.0{'\n'}Release date</Text>
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

  /* ── Header ── */
  header: {
    backgroundColor: NAVY,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 30,
    paddingBottom: 10,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerLogo: {
    width: 60,
    height: 60,
    resizeMode: "contain",
  },
  headerTitleBlock: {
    justifyContent: "center",
  },
  headerTitle: {
    color: AMBER,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 2,
  },
  headerSubtitle: {
    color: "#C8D8F0",
    fontSize: 13,
    fontWeight: "400",
    letterSpacing: 0.5,
  },
  avatarBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  personIcon: {
    width: 22,
    height: 22,
    alignItems: "center",
  },
  personHead: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: WHITE,
    marginBottom: 2,
  },
  personBody: {
    width: 16,
    height: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: WHITE,
  },
  chevron: {
    color: WHITE,
    fontSize: 9,
    marginTop: 1,
  },

  /* ── Dropdown ── */
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  dropdown: {
    position: "absolute",
    top: 108,
    right: 16,
    backgroundColor: WHITE,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 200,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    zIndex: 101,
  },
  dropdownUserRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  dropdownAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: NAVY,
    alignItems: "center",
    justifyContent: "center",
  },
  dropdownAvatarText: {
    color: WHITE,
    fontWeight: "700",
    fontSize: 16,
  },
  dropdownName: {
    fontWeight: "700",
    fontSize: 14,
    color: "#1A1A2E",
  },
  dropdownRole: {
    fontSize: 11,
    color: "#888",
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: "#EFEFEF",
    marginBottom: 8,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  dropdownIcon: {
    fontSize: 18,
    color: "#C0392B",
  },
  dropdownLogoutText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#C0392B",
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
  versionText: {
  position: "absolute",
  bottom: 20,
  fontSize: 11,
  color: "#AAA",
  textAlign: "center",
  letterSpacing: 0.4,
},
});












