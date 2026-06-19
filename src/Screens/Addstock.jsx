import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getRequest } from "../services/authservice";
import Header from "./Header";
const BLUE = "#2f5081";
const AddStockScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = (await getRequest("/profile")).data;
        if (data.success) {
          setUser(data.user);
          setTransactions(data.transactions);
        }
      } catch (e) {
        console.log("AddStock fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <View style={[styles.safe, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={BLUE} />
      </View>
    );
  }

  const initials = user
    ? `${user.fname?.charAt(0) ?? ""}${user.lname?.charAt(0) ?? ""}`.toUpperCase()
    : "?";
  const fullName = user ? `${user.fname} ${user.lname}` : "";
  const sessionExpiry = user?.sessionExpiry
    ? new Date(user.sessionExpiry).toLocaleString()
    : null;

  const addedItems = transactions.filter((t) => t.type === "add");
  const groupedAddedItems = Object.values(
  addedItems.reduce((acc, t) => {
    if (acc[t.item_name]) {
      acc[t.item_name].quantity += parseInt(t.quantity);
    } else {
      acc[t.item_name] = { ...t, quantity: parseInt(t.quantity) };
    }
    return acc;
  }, {})
);

  return (
    <View style={styles.safe}>
      <Header showProfile={true} />

      <ScrollView
             style={styles.scroll}
             showsVerticalScrollIndicator={false}>

        {/* User Card */}
        {user && (
          <View style={styles.userCard}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{fullName}</Text>
              <Text style={styles.userRole}>{user.position}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
            </View>
          </View>
        )}

        {/* Added Stock Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionCount}>{String(groupedAddedItems.length)}</Text>
            <Text style={styles.sectionTitle}>ITEMS ADDED</Text>
            <View style={{ flex: 1 }} />
            <Text style={styles.sectionIcon}>+</Text>
          </View>

          {addedItems.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No added stock items found.</Text>
            </View>
          ) : (
                Object.values(
                    addedItems.reduce((acc, t) => {
                       if (acc[t.item_name]) {
                          acc[t.item_name].quantity +=parseInt(t.quantity);
                       } else {
                          acc[t.item_name] = { ...t , quantity:parseInt(t.quantity) };
                       }
                       return acc;
                   }, {})
              ).map((t, i, arr) => (
                 <View
                     key={i}
                     style={[
                        styles.listRow,
                        i === arr.length - 1 && { borderBottomWidth: 0 },
                     ]}
                 >
                   
                <View style={styles.listLeft}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                     <Text style={[styles.listName, { flex: 1 }]}>{t.item_name}</Text>
                     <View style={{ backgroundColor: '#2f5081', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t.quantity}</Text>
                     </View>
                 </View>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 32 }} />
        
        <TouchableOpacity
          style={[styles.backBtn , { marginBottom: 70 }]}
          onPress={() => navigation.navigate("Dashboard")}>
          <Text style={styles.backBtnText}>← GO BACK</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default AddStockScreen;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f2f5fa" },
  scroll: { flex: 1 },

  userCard: {
    backgroundColor: '',
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  avatarCircle: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: "#CECBF6",
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#3C3489",
  },
  avatarText: { fontSize: 22, fontWeight: "700", color: "#3C3489" },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: "700", color: "#3C3489", marginBottom: 2 },
  userRole: { fontSize: 12, color: "#3C3489", marginBottom: 2 },
  userEmail: { fontSize: 11, color: "#3C3489", marginBottom: 8 },
  sessionBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start",
  },
  sessionIcon: { fontSize: 11, color: "#FFD166" },
  sessionText: { fontSize: 10, color: "#e8eef8" },

  section: {
    backgroundColor: "#fff",
    marginHorizontal: 16, marginTop: 16,
    borderRadius: 14, borderWidth: 0.5,
    borderColor: "#e0e6f0", elevation: 2, overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 0.5, borderBottomColor: "#f0f0f0",
  },
  sectionCount: { fontSize: 20, fontWeight: "800", color: BLUE },
  sectionTitle: {
    fontSize: 11, fontWeight: "700", color: "#999",
    textTransform: "uppercase", letterSpacing: 1,
  },
  sectionIcon: { fontSize: 18, color: "#1a6b3a", fontWeight: "700" },

  listRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: 0.5, borderBottomColor: "#f0f0f0",
  },
  addIconCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#eaf6ee",
    alignItems: "center", justifyContent: "center",
  },

  backBtn:     { marginTop: 20, marginBottom: 10, alignItems: 'center' },
  backBtnText: { color: '#1A3C6E', fontWeight: '600', fontSize: 14 },

  addIconText: { fontSize: 20, fontWeight: "600", color: "#1a6b3a" },
  listLeft: { flex: 1 },
  listName: { fontSize: 14, fontWeight: "500", color: "#1a1a2e" },
  listSub: { fontSize: 12, color: "#888", marginTop: 2 },

  emptyBox: { padding: 24, alignItems: "center" },
  emptyText: { color: "#aaa", fontSize: 14 },
});
