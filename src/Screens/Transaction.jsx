import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { getRequest } from "../services/authservice";
import Header from './Header';
const BLUE = "#2f5081";
const DARK_BLUE = "#1e3557";

const txIcon = (type) => {
  switch (type) {
    case "issue":  return { icon: "↑", color: "#a32d2d", bg: "#fdecea" };
    case "return": return { icon: "↩", color: "#BA7517", bg: "#fff8ec" };
    case "add":    return { icon: "+", color: "#1a6b3a", bg: "#eaf6ee" };
    case "update":  return { icon: "✎", color: "#8B008B", bg: "#fce4fc" };
    default:       return { icon: "•",  color: "#888",    bg: "#f0f0f0" };
  }
};

const TransactionsScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userName , setUserName] = useState("User");

  useEffect(() => {
    const load = async () => {
      try {
        const data = (await getRequest("/profile")).data;
        if (data.success) {
          setUser(data.user);
          setTransactions(data.transactions);
          setUserName(`${data.user.fname || ""} ${data.user.lname || ""}`.trim() || "User");
        }
      } catch (e) {
        console.log("Transactions fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={BLUE} />
      </SafeAreaView>
    );
  }

  const initials = user
    ? `${user.fname?.charAt(0) ?? ""}${user.lname?.charAt(0) ?? ""}`.toUpperCase()
    : "?";
  const fullName = user ? `${user.fname} ${user.lname}` : "";
  const sessionExpiry = user?.sessionExpiry
    ? new Date(user.sessionExpiry).toLocaleString()
    : null;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={DARK_BLUE} />
     <Header showProfile={true} userName={userName}/>



      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── User Card ── */}
        {user && (
          <View style={styles.userCard}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{fullName}</Text>
              <Text style={styles.userRole}>{user.position}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
              {sessionExpiry && (
                <View style={styles.sessionBadge}>
                  <Text style={styles.sessionIcon}>⏱</Text>
                  <Text style={styles.sessionText}>Session expires: {sessionExpiry}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── Transactions List ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionCount}>{transactions.length}</Text>
            <Text style={styles.sectionTitle}>RECENT TRANSACTIONS</Text>
          </View>

          {transactions.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No transactions found.</Text>
            </View>
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
                  <View style={[styles.txIconCircle, { backgroundColor: tx.bg }]}>
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

        <View style={{ height: 32 }} />
        <TouchableOpacity
          style={[styles.backBtn , { marginBottom: 70}]}
          onPress={() => navigation.navigate("Dashboard")}>
          <Text style={styles.backBtnText}>← GO BACK </Text>
        </TouchableOpacity>

      
      </ScrollView>
    </SafeAreaView>
  );
};

export default TransactionsScreen;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f2f5fa" },
  scroll: { flex: 1 },

  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: DARK_BLUE, paddingHorizontal: 16, paddingVertical: 12 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoBox: { backgroundColor: "#CECBF6", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  logoText: { fontSize: 10, fontWeight: "800", color: DARK_BLUE },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#FFD166" },
  headerSub: { fontSize: 10, color: "#a0b8d8" },
  userCard: { backgroundColor: '', flexDirection: "row", alignItems: "center",
    gap: 16, paddingHorizontal: 20, paddingVertical: 20 },
  avatarCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#CECBF6",
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#3C3489" },
  avatarText: { fontSize: 22, fontWeight: "700", color: "#3C3489" },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: "700", color: "#3C3489", marginBottom: 2 },
  userRole: { fontSize: 12, color: "#3C3489", marginBottom: 2 },
  userEmail: { fontSize: 11, color: "#3C3489", marginBottom: 8 },
  sessionBadge: { flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" },
  sessionIcon: { fontSize: 11, color: "#FFD166" },
  sessionText: { fontSize: 10, color: "#e8eef8" },

  section: { backgroundColor: "#fff", margin: 16, borderRadius: 14,
    borderWidth: 0.5, borderColor: "#e0e6f0", elevation: 2, overflow: "hidden" },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: "#f0f0f0" },
  sectionCount: { fontSize: 20, fontWeight: "800", color: BLUE },
  sectionTitle: { fontSize: 11, fontWeight: "700", color: "#999",
    textTransform: "uppercase", letterSpacing: 1 },
  backBtn:     { marginTop: 20, marginBottom: 10, alignItems: 'center' },
  backBtnText: { color: '#1A3C6E', fontWeight: '600', fontSize: 14 },

  listRow: { flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: 0.5, borderBottomColor: "#f0f0f0" },
  listLeft: { flex: 1 },
  listName: { fontSize: 14, fontWeight: "500", color: "#1a1a2e" },
  listSub: { fontSize: 12, color: "#888", marginTop: 2 },
  txIconCircle: { width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center" },
  txIconText: { fontSize: 16, fontWeight: "600" },
  emptyBox: { padding: 24, alignItems: "center" },
  emptyText: { color: "#aaa", fontSize: 14 },
});
