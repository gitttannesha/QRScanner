import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getRequest } from "../services/authservice";
import { clearStorage } from "../utilis/storage";

const txIcon = (type) => {
  switch (type) {
    case "issue":  return { icon: "↑", color: "#a32d2d" };
    case "return": return { icon: "↩", color: "#BA7517" };
    default:       return { icon: "•", color: "#888" };
  }
};

const BLUE = "#2f5081";

const Profilescreen = () => {
  const navigation = useNavigation();
  const [user, setUser]               = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats]             = useState({ totalIssued: 0, active: 0, transactions: 0 });
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = (await getRequest("/profile")).data;
        if (data.success) {
          setUser(data.user);
          setTransactions(data.transactions);
          setStats(data.stats);
        }
      } catch (e) {
        console.log("Profile fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleLogout = async () => {
    try {
      await clearStorage();
      navigation.replace("Login");
    } catch (e) {
      console.log("Logout error:", e);
    }
  };

  // ── Loading state ──
  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={BLUE} />
      </SafeAreaView>
    );
  }

  // ── Null guard ──
  if (!user) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: "#888" }}>Failed to load profile.</Text>
      </SafeAreaView>
    );
  }

  const initials = `${user.fname?.charAt(0) ?? ""}${user.lname?.charAt(0) ?? ""}`.toUpperCase();
  const fullName = `${user.fname} ${user.lname}`;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />

      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>My Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile card ── */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.profileName}>{fullName}</Text>
          <Text style={styles.profileRole}>{user.position}</Text>
          <Text style={styles.profileEmail}>{user.email}</Text>
        </View>

        {/* ── Quick stats ── */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{stats.totalIssued}</Text>
            <Text style={styles.statLabel}>Items Issued</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{stats.active}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{stats.transactions}</Text>
            <Text style={styles.statLabel}>Transactions</Text>
          </View>
        </View>

        {/* ── Recent Transactions ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {transactions.length === 0 ? (
            <Text style={{ color: "#aaa", paddingBottom: 12 }}>No transactions found.</Text>
          ) : (
            transactions.map((t, i) => {
              const tx = txIcon(t.type);
              return (
                <View
                  key={i}
                  style={[
                    styles.listRow,
                    i === transactions.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View style={[styles.txIconCircle, { backgroundColor: tx.color + "18" }]}>
                    <Text style={[styles.txIconText, { color: tx.color }]}>{tx.icon}</Text>
                  </View>
                  <View style={styles.listLeft}>
                    <Text style={styles.listName}>{t.action} — {t.item_name}</Text>
                    <Text style={styles.listSub}>
                      Qty: {t.quantity}  •  {new Date(t.timestamp).toLocaleString()}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* ── Logout ── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default Profilescreen;

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: "#f2f5fa" },
  scroll:        { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  topBar:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                   backgroundColor: BLUE, paddingHorizontal: 16, paddingVertical: 14 },
  backBtn:       { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  backArrow:     { color: "#fff", fontSize: 22 },
  topBarTitle:   { color: "#fff", fontSize: 17, fontWeight: "600" },
  profileCard:   { backgroundColor: BLUE, alignItems: "center",
                   paddingTop: 28, paddingBottom: 32, paddingHorizontal: 24 },
  avatarCircle:  { width: 76, height: 76, borderRadius: 38, backgroundColor: "#CECBF6",
                   alignItems: "center", justifyContent: "center", marginBottom: 14,
                   borderWidth: 3, borderColor: "#fff" },
  avatarText:    { fontSize: 28, fontWeight: "700", color: "#3C3489" },
  profileName:   { fontSize: 20, fontWeight: "700", color: "#fff", marginBottom: 4 },
  profileRole:   { fontSize: 13, color: "#c5d5ec", marginBottom: 4 },
  profileEmail:  { fontSize: 12, color: "#a0b8d8", marginBottom: 14 },
  statsRow:      { flexDirection: "row", gap: 10, marginHorizontal: 16,
                   marginTop: 16, marginBottom: 16 },
  statCard:      { flex: 1, backgroundColor: "#fff", borderRadius: 12, alignItems: "center",
                   paddingVertical: 14, borderWidth: 0.5, borderColor: "#e0e6f0", elevation: 2 },
  statNum:       { fontSize: 22, fontWeight: "700", color: BLUE },
  statLabel:     { fontSize: 11, color: "#888", marginTop: 3 },
  section:       { backgroundColor: "#fff", marginHorizontal: 16, marginBottom: 16,
                   borderRadius: 14, borderWidth: 0.5, borderColor: "#e0e6f0",
                   paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4, elevation: 2 },
  sectionTitle:  { fontSize: 11, fontWeight: "700", color: "#999",
                   textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 },
  listRow:       { flexDirection: "row", alignItems: "center", gap: 12,
                   paddingVertical: 11, borderBottomWidth: 0.5, borderBottomColor: "#f0f0f0" },
  listLeft:      { flex: 1 },
  listName:      { fontSize: 14, fontWeight: "500", color: "#1a1a2e" },
  listSub:       { fontSize: 12, color: "#888", marginTop: 2 },
  txIconCircle:  { width: 36, height: 36, borderRadius: 18,
                   alignItems: "center", justifyContent: "center" },
  txIconText:    { fontSize: 16, fontWeight: "600" },
  logoutBtn:     { marginHorizontal: 16, marginTop: 4, backgroundColor: "#fff",
                   borderRadius: 12, borderWidth: 1, borderColor: "#fdecea",
                   paddingVertical: 14, alignItems: "center", elevation: 2 },
  logoutText:    { fontSize: 15, fontWeight: "600", color: "#a32d2d" },
});
