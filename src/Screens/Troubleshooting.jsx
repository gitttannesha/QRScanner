import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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


const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return "Not visited yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not visited yet";
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



const ComplaintCard = ({ item, highlightId,typeMap, machineMap }) => {
  const navigation = useNavigation();
    const glowAnim = useRef(new Animated.Value(0)).current;
    const isHighlighted = String(item.complaint_id) === String(highlightId);

    useEffect(() => {
      if (isHighlighted) {
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 400, useNativeDriver: false }),
          Animated.delay(1200),
          Animated.timing(glowAnim, { toValue: 0, duration: 800, useNativeDriver: false }),
        ]).start();
      }
    }, [isHighlighted]);

    const borderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#e0e6f0", AMBER],
  });

  const backgroundColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#ffffff", "#fffbf0"],
  });

  const statusStyle = STATUS_COLOR[Number(item.status)] || {
    bg: "#eee",
    text: "#333",
  };

const type = typeMap[String(item.type)] || `N/A (${item.type})`;
const machine =
  machineMap[String(item.type)]?.[String(item.machine_id)] ||
  (item.machine_id ? `N/A (${item.machine_id})` : "-");


  return (
    <Animated.View style={[styles.card, {borderColor , backgroundColor}]}>
      <View style={styles.chipsRow}>
        <View style={styles.idCircle}>
          <Text style={styles.circleValue}>{item.complaint_id}</Text>
        </View>

        <View style={styles.chip}>
          <Text style={styles.rectValue}>
            {formatDate(item.time_of_complaint)}
          </Text>
        </View>

        <View style={styles.chip}>
          <Text style={styles.rectValue}>{type}</Text>
        </View>

        <View style={styles.chip}>
          {/* <Text style={styles.chipLabel}>Tool/Category</Text> */}
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
<View style={styles.cardBottom}>
  <View style={styles.lastVisitedBox}>
    <Text style={styles.lastVisitedLabel}>Last Visited</Text>
    <Text style={styles.lastVisitedValue}>{formatDateTime(item.last_visited)}</Text>
  </View>

  <TouchableOpacity
    style={styles.actionBtn}
    onPress={() => navigation.navigate("Form", { complaint: item })}
  >
    <Text style={styles.actionBtnText}>Action Taken</Text>
  </TouchableOpacity>
</View>
    </Animated.View>
  );
};

const Troubleshooting = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("complaint"); 
  const [typeMap, setTypeMap] = useState({});
  const [machineMap, setMachineMap] = useState({});
  const flatListRef = useRef(null);

  const route = useRoute();
  const highlightId = route?.params?.highlightId;

  useEffect(() => {
  if (!highlightId || complaints.length === 0) return;

  const index = filteredComplaints.findIndex(
    (c) => String(c.complaint_id) === String(highlightId)
  );

  if (index !== -1) {
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.3 });
    }, 400); // small delay lets FlatList render first
  }
}, [highlightId, complaints]);
  

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

const loadMaps = useCallback(async () => {
  try {
    const response = await getRequest("/complaint-maps");
    if (response.data.success) {
      setTypeMap(response.data.maps.TYPE_MAP);
      setMachineMap(response.data.maps.MACHINE_MAP);
    }
  } catch (error) {
    console.log("Maps fetch error:", error);
  }
}, []);


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
      loadMaps();
    }, [loadComplaints,loadMaps])
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


  const tabFiltered = complaints.filter((c) =>
  activeTab === "scheduler"
    ? Number(c.scheduler) === 1
    : Number(c.scheduler) === 0
   );

  const filteredComplaints = tabFiltered.filter((c) =>
    (c.complaint_by_name || "")
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
    );

  const schedulerCount = complaints.filter((c) => Number(c.scheduler) === 1).length;
  const complaintCount = complaints.filter((c) => Number(c.scheduler) === 0).length;

  return (
    <View style={styles.safe}>
      <Header showProfile={true} />
      
  

      <FlatList
      ref={flatListRef}                        
      onScrollToIndexFailed={(info) => {       
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
        }, 500);
      }} 
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

           
             <View style={styles.toggleWrapper}>
  <TouchableOpacity
    style={[styles.toggleBtn, activeTab === "complaint" && styles.toggleBtnActive]}
    onPress={() => { setActiveTab("complaint"); setSearchQuery(""); }}
  >
    <Text style={[styles.toggleBtnText, activeTab === "complaint" && styles.toggleBtnTextActive]}>
      Complaint  {complaintCount}
    </Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={[styles.toggleBtn, activeTab === "scheduler" && styles.toggleBtnActive]}
    onPress={() => { setActiveTab("scheduler"); setSearchQuery(""); }}
  >
    <Text style={[styles.toggleBtnText, activeTab === "scheduler" && styles.toggleBtnTextActive]}>
      Scheduler  {schedulerCount}
    </Text>
  </TouchableOpacity>
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
        renderItem={({ item }) => <ComplaintCard item={item}  highlightId={highlightId} typeMap={typeMap} machineMap={machineMap} />}
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
  highlightedCard: {
  borderColor: AMBER,
  borderWidth: 2,
  backgroundColor: "#fffbf0",
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

toggleWrapper: {
  flexDirection: "row",
  marginHorizontal: 16,
  marginBottom: 14,
  backgroundColor: "#E8EDF5",
  borderRadius: 25,
  padding: 3,
},
toggleBtn: {
  flex: 1,
  paddingVertical: 9,
  borderRadius: 22,
  alignItems: "center",
},
toggleBtnActive: {
  backgroundColor: NAVY,
  elevation: 2,
},
toggleBtnText: {
  fontSize: 13,
  fontWeight: "600",
  color: "#888",
},
toggleBtnTextActive: {
  color: AMBER,
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
cardBottom: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginTop: 4,
},
lastVisitedBox: {
  flex: 1,
  marginRight: 12,
},
lastVisitedLabel: {
  fontSize: 10,
  color: "#888",
  fontWeight: "600",
  textTransform: "uppercase",
  letterSpacing: 0.5,
  marginBottom: 2,
},
lastVisitedValue: {
  fontSize: 12,
  color: NAVY,
  fontWeight: "600",
},
clearBtn: {
  fontSize: 16,
  color: "#aaa",
  paddingLeft: 8,
},

});

export default Troubleshooting;
