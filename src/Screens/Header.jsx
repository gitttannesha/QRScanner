import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { useRef, useState } from "react";
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const NAVY = "#1A3C6E";
const AMBER = "#E8A020";

const Header = ({ userName, showProfile = false }) => {
  const navigation = useNavigation();
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

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

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("token");
      navigation.replace("Login");
    } catch (error) {
      console.log("Logout Error:", error);
    }
  };

  return (
    <>
      <View style={styles.header}>

        {/* Left side — Logo + Title */}
        <View style={styles.headerLeft}>
          <Image
            source={require("../assets/IITB_logo.png")}
            style={styles.headerLogo}
          />
          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerTitle}>IITBNF</Text>
            <Text style={styles.headerSubtitle}>Nano Fabrication Laboratory</Text>
          </View>
        </View>

        {/* Right side — Person icon (only on Dashboard) */}
        {showProfile && (
          <TouchableOpacity style={styles.avatarBtn} onPress={toggleDropdown}>
            <View style={styles.personIcon}>
              <View style={styles.personHead} />
              <View style={styles.personBody} />
            </View>
            <Text style={styles.chevron}>{dropdownVisible ? "▲" : "▼"}</Text>
          </TouchableOpacity>
        )}

      </View>

      {/* Dropdown — only visible when showProfile is true and toggled */}
      {showProfile && dropdownVisible && (
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={toggleDropdown}
          activeOpacity={1}
        >
          <Animated.View style={[styles.dropdown, { opacity: fadeAnim }]}>

            {/* User info row */}
            <View style={styles.dropdownUserRow}>
              <View style={styles.dropdownAvatar}>
                <Text style={styles.dropdownAvatarText}>
                  {userName ? userName.charAt(0).toUpperCase() : "U"}
                </Text>
              </View>
              <View>
                <Text style={styles.dropdownName}>{userName || "User"}</Text>
                <Text style={styles.dropdownRole}>Lab Member</Text>
              </View>
            </View>

            <View style={styles.dropdownDivider} />

            {/* Logout button */}
            <TouchableOpacity style={styles.dropdownItem} onPress={handleLogout}>
              <Text style={styles.dropdownIcon}>⎋</Text>
              <Text style={styles.dropdownLogoutText}>Log Out</Text>
            </TouchableOpacity>

          </Animated.View>
        </TouchableOpacity>
      )}
    </>
  );
};

export default Header;

const styles = StyleSheet.create({
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
    width: 50,
    height: 50,
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
    fontSize: 11,
    fontWeight: "400",
    letterSpacing: 0.5,
  },

  /* Avatar button */
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
    backgroundColor: "#fff",
    marginBottom: 2,
  },
  personBody: {
    width: 16,
    height: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: "#fff",
  },
  chevron: {
    color: "#fff",
    fontSize: 9,
  },

  /* Dropdown overlay */
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
    top: 96,
    right: 16,
    backgroundColor: "#fff",
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
    color: "#fff",
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
});