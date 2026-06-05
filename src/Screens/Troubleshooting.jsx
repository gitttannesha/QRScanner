import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { getRequest } from "../services/authservice";
import Header from "./Header";

const NAVY = "#1A3C6E";
const AMBER = "#E8A020";
const BLUE = "#2f5081";

const STATUS_MAP = {
  0: "Pending",
  1: "In Process",
  2: "Closed",
  3: "On Hold",
};

const STATUS_COLOR = {
  0: { bg: "#FFF3CD", text: "#856404" },
  1: { bg: "#CCE5FF", text: "#004085" },
  2: { bg: "#D4EDDA", text: "#155724" },
  3: { bg: "#F8D7DA", text: "#721C24" },
};

const TYPE_MAP = {
  1: "Equipment",
  2: "Facility",
  3: "Safety",
  4: "Process",
  5: "HR",
  6: "IT",
  7: "Purchase",
  8: "Training",
  9: "Inventory",
  10: "Admin",
};

const MACHINE_MAP = {
  5: {
    1: "Appointment Related",
    2: "Leave Related",
    3: "Salary Related",
    4: "Miscellaneous",
    5: "FOC Agenda",
  },
  6: {
    1: "Hardware Related",
    2: "Software Related",
    3: "Miscellaneous",
    4: "FOC Agenda",
  },
  7: {
    1: "Tracking",
    2: "Purchase Return",
    3: "Shipment",
    4: "Miscellaneous",
    5: "FOC Agenda",
  },
  8: {
    1: "New Training",
    2: "Training Pending",
    3: "Miscellaneous",
    4: "FOC Agenda",
  },
  9: {
    1: "Issue of Material",
    2: "New Material",
    3: "Miscellaneous",
    4: "FOC Agenda",
  },
  10: {
    1: "IITBNF",
    2: "Faculty Projects",
    3: "Main Building/Institutes",
  },
};



const formatDateTime = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const formattedDate = date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const formattedTime = date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return `${formattedDate}  ${formattedTime}`;
};


const ComplaintCard = ({ item }) => {
  const navigation = useNavigation();

  const statusStyle = STATUS_COLOR[Number(item.status)] || {
    bg: "#eee",
    text: "#333",
  };

  const type = TYPE_MAP[Number(item.type)] || item.type;
  const machine =
    MACHINE_MAP[Number(item.type)]?.[Number(item.machine_id)] ||
    String(item.machine_id || "-");

  return (
    <View style={styles.card}>
      <View style={styles.chipsRow}>
        <View style={styles.idCircle}>
          <Text style={styles.circleValue}>{item.complaint_id}</Text>
        </View>

        <View style={styles.chip}>
          <Text style={styles.rectValue}>
            {formatDateTime(item.time_of_complaint)}
          </Text>
        </View>

        <View style={styles.chip}>
          <Text style={styles.rectValue}>{type}</Text>
        </View>

        <View style={styles.chip}>
          <Text style={styles.chipLabel}>Tool/Category</Text>
          <Text style={styles.chipValue}>{machine}</Text>
        </View>

        <View style={styles.chip}>
          <Text style={styles.chipLabel}>Raised By</Text>
          <Text style={styles.chipValue}>
            {item.complaint_by_name || `Member #${item.member_id}`}
          </Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.statusText, { color: statusStyle.text }]}>
            {STATUS_MAP[Number(item.status)] || "Unknown"}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <Text style={styles.descLabel}>Description</Text>
      <Text style={styles.descText}>
        {item.complaint_description || "No description provided."}
      </Text>

      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate("Form", { complaint: item })}
        >
          <Text style={styles.actionBtnText}>Action Taken</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const Troubleshooting = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  
  const onRefresh = async () => {
  setRefreshing(true);
  try {
    await loadComplaints();
  } catch (error) {
    console.error("Refresh error:", error);
  } finally {
    setRefreshing(false);
  }
};

  const loadComplaints = useCallback(async () => {
    setLoading(true);

    try {
      const profileResponse = await getRequest("/profile");

      if (profileResponse.data.success) {
        setUser(profileResponse.data.user);
      }
    } catch (error) {
      console.log("Troubleshooting profile error:", error);
    }

    try {
      const complaintResponse = await getRequest("/complaints");

      if (complaintResponse.data.success) {
        const assignedComplaints = complaintResponse.data.complaints.filter((complaint) =>
          [0, 1, 3].includes(Number(complaint.status))
        );

        setComplaints(assignedComplaints);
      } else {
        setComplaints([]);
      }
    } catch (error) {
      console.log("Troubleshooting complaints error:", error);
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadComplaints();
    }, [loadComplaints])
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BLUE} />
      </View>
    );
  }

  const initials = user
    ? `${user.fname?.charAt(0) || ""}${user.lname?.charAt(0) || ""}`.toUpperCase()
    : "?";

  const fullName = user
    ? `${user.fname || ""} ${user.lname || ""}`.trim()
    : "";

  const filteredComplaints = complaints.filter((complaint) =>
    (complaint.complaint_by_name || "")
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
    );
  return (
    <View style={styles.safe}>
      <Header showProfile={true} />
      
  

      <FlatList
        data={filteredComplaints}
        refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={["#1A3C6E"]}
          tintColor="#1A3C6E"
        />
        }
        keyExtractor={(item) => String(item.complaint_id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {user && (
              <View style={styles.userCard}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>

                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{fullName}</Text>
                  <Text style={styles.userRole}>{user.position || ""}</Text>
                  <Text style={styles.userEmail}>{user.email || ""}</Text>
                </View>
              </View>
            )}

            <View style={styles.countRow}>
              <Text style={styles.countNumber}>{complaints.length}</Text>
              <Text style={styles.countLabel}>COMPLAINTS/TASKS ASSIGNED</Text>
            </View>

            <View style={styles.searchBox}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search complaints by raised by whom..."
                placeholderTextColor="#aaa"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Text style={styles.clearBtn}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        }
        renderItem={({ item }) => <ComplaintCard item={item} />}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No complaints assigned to you.</Text>
          </View>
        }
        ListFooterComponent={
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.navigate("Dashboard")}
          >
            <Text style={styles.backBtnText}>← GO BACK </Text>
          </TouchableOpacity>
        }
      />
      
    </View>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f2f5fa",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#f2f5fa",
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingBottom: 70,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#CECBF6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#3C3489",
  },
  avatarText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#3C3489",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#3C3489",
    marginBottom: 2,
  },
  userRole: {
    fontSize: 12,
    color: "#3C3489",
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 11,
    color: "#3C3489",
  },
  countRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  countNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: BLUE,
  },
  countLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 24,
    borderWidth: 0.5,
    borderColor: "#e0e6f0",
    elevation: 2,
    padding: 16,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  idCircle: {
    width: 42,
    height: 42,
    borderRadius: 22,
    backgroundColor: "#EEF2FB",
    alignItems: "center",
    justifyContent: "center",
  },
  circleValue: {
    fontSize: 12,
    color: NAVY,
    fontWeight: "700",
  },
  chip: {
    backgroundColor: "#EEF2FB",
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignItems: "center",
    minWidth: 70,
  },
  chipLabel: {
    fontSize: 10,
    color: "#888",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  chipValue: {
    fontSize: 12,
    color: NAVY,
    fontWeight: "700",
    marginTop: 2,
  },
  rectValue: {
    fontSize: 12,
    color: NAVY,
    fontWeight: "700",
    paddingVertical: 5,
  },
  statusBadge: {
    borderRadius: 28,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: "#E8EDF5",
    marginBottom: 12,
  },
  descLabel: {
    fontSize: 11,
    color: "#888",
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  descText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
    marginBottom: 16,
  },
  actionContainer: {
    alignItems: "center",
  },
  actionBtn: {
    backgroundColor: NAVY,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 22,
    alignItems: "center",
  },
  actionBtnText: {
    color: AMBER,
    fontWeight: "700",
    fontSize: 14,
  },
  emptyBox: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    color: "#aaa",
    fontSize: 15,
  },
  backBtn: {
    marginTop: 8,
    marginBottom: 10,
    alignItems: "center",
  },
  backBtnText: {
    color: NAVY,
    fontWeight: "600",
    fontSize: 14,
  },
  searchBox: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#fff",
  marginHorizontal: 16,
  marginBottom: 12,
  borderRadius: 25,
  paddingHorizontal: 14,
  paddingVertical: 4,
  borderWidth: 0.5,
  borderColor: "#e0e6f0",
  elevation: 1,
},
searchInput: {
  flex: 1,
  fontSize: 14,
  color: "#333",
},
clearBtn: {
  fontSize: 16,
  color: "#aaa",
  paddingLeft: 8,
},
});

export default Troubleshooting;