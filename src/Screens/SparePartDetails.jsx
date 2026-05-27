import { useEffect, useRef, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Modal, Platform,
  RefreshControl,
  ScrollView,
  StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiCall from '../services/authservice';
import { getUser } from '../utilis/storage';
import Header from './Header';

const SparePartDetails = ({ route, navigation }) => {
  const { sparePart } = route.params;

  // ── State ──
  const [showMore, setShowMore]                   = useState(false);
  const [currentStock, setCurrentStock]           = useState(null);
  const [memberId, setMemberId]                   = useState(null);
  const [hasPermission, setHasPermission]         = useState(false);
  const [permissionLoading, setPermissionLoading] = useState(true);
  const [activeTab, setActiveTab]                 = useState(sparePart.type_of_spare === "bulk-spare-part" ? "addstock" : "status");
  const [isUpdating, setIsUpdating]               = useState(false);
  const insets = useSafeAreaInsets();
  const [userName, setUserName] = useState("User"); 

  // ── Add Stock ──
  const [addAmount, setAddAmount]   = useState("");
  const [addComment, setAddComment] = useState("");


  // ── Issue ──
  const [issueAmount, setIssueAmount]             = useState("");
  const [issueComment, setIssueComment]           = useState("");
  const [issuedTo, setIssuedTo]                   = useState(null);
  const [showIssuedToModal, setShowIssuedToModal] = useState(false);

  // ── Update Status ──
  const [statusList, setStatusList]           = useState([]);
  const [selectedStatus, setSelectedStatus]   = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusComment, setStatusComment]     = useState("");
  const [loadingStatus, setLoadingStatus]     = useState(false);
  const [refreshing, setRefreshing]           = useState(false);

  // ── Members ──
  const [members, setMembers]               = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberSearch, setMemberSearch]     = useState("");
  const searchTimeout                       = useRef(null);

  // ── Get memberId from AsyncStorage ──
  useEffect(() => {
    const getMember = async () => {
      try {
	const parsed = await getUser();
	if (parsed) {
	setMemberId(parsed.memberid);
	}        

      } catch (e) {
        console.error("AsyncStorage error:", e);
      }
    };
    getMember();
  }, []);

  // ── Check permission based on classification ──
  useEffect(() => {
    if (!memberId) return;
    const checkPerm = async () => {
      try {
        const response = await apiCall('GET',
          `/sparepart-permission/${sparePart.classification}`
        );
        if (response.data.success) setHasPermission(response.data.hasPermission);
      } catch (error) {
        console.error("Permission check error:", error.message);
      } finally {
        setPermissionLoading(false);
      }
    };
    checkPerm();
  }, [memberId]);

  // ── Fetch current stock from spare_part.quantity ──
  useEffect(() => {
    fetchCurrentStock();
  }, []);

  // ── Fetch status list ──
  useEffect(() => {
    const fetchStatus = async () => {
      setLoadingStatus(true);
      try {
        const response = await apiCall('GET' , `/sparepart-status`);
        if (response.data.success) setStatusList(response.data.data);
      } catch (error) {
        console.error("Fetch status error:", error.message);
      } finally {
        setLoadingStatus(false);
      }
    };
    fetchStatus();
  }, []);

  // ── Member search ──
  const handleMemberSearch = (text) => {
    setMemberSearch(text);
    clearTimeout(searchTimeout.current);
    if (text.trim().length < 2) { setMembers([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setLoadingMembers(true);
      try {
        const response = await apiCall('GET',
          `/consumable-members?search=${text.trim()}`
        );
        if (response.data.success) setMembers(response.data.data);
      } catch (error) {
        console.error("Search members error:", error.message);
      } finally {
        setLoadingMembers(false);
      }
    }, 400);
  };

  // ── Reset form ──
  const resetForm = () => {
    setAddAmount(""); setAddComment("");
    setIssueAmount(""); setIssueComment(""); setIssuedTo(null);
    setSelectedStatus(null); setStatusComment("");
    setMemberSearch(""); setMembers([]);
  };

  // ── Validate Amount — accepts the amount as a parameter ──
  const validateAmount = (amount) => {
    if (!amount || parseInt(amount) <= 0) {
      Alert.alert("Invalid Input", "Please enter a valid quantity.");
      return false;
    }
    if (amount.includes('.')) {
      Alert.alert("Invalid Input", "Please enter whole numbers only.");
      return false;
    }
    return true;
  };

  // ── Amount change handlers ──
  const handleAddAmountChange = (text) => {
    if (text.includes('.')) {
      Alert.alert("Invalid Input", "Please enter whole numbers only.");
      return;
    }
    setAddAmount(text);
  };

  const handleIssueAmountChange = (text) => {
    if (text.includes('.')) {
      Alert.alert("Invalid Input", "Please enter whole numbers only.");
      return;
    }
    setIssueAmount(text);
  };


  const fetchCurrentStock = async () => {
  try {
    const response = await apiCall('GET', `/sparepart/${sparePart.id}`);

    if (response.data.success) {
      setCurrentStock(response.data.data.quantity);
    }
  } catch (error) {
    console.error("Fetch stock error:", error.message);
  }
};

  // ── Pull to Refresh ──
  const onRefresh = async () => {
  setRefreshing(true);
  try {
    await fetchCurrentStock();
  } catch (error) {
    console.error("Refresh error:", error);
  } finally {
    setRefreshing(false);
  }
};

  // ── Add Stock ──
  const handleAddStock = async () => {
    if (!validateAmount(addAmount)) return;
    setIsUpdating(true);
    try {
      const response = await apiCall('POST' ,`/sparepart-add-stock`, {
        sparepart_id: sparePart.id,
        amount_to_add: parseInt(addAmount),
        comment: addComment.trim()
      });
      if (response.data.success) {
        Alert.alert("Success", `Stock updated! New stock: ${response.data.new_stock}`);
        setCurrentStock(response.data.new_stock);
        resetForm();
      } else {
        Alert.alert("Failed", response.data.message || "Could not update stock.");
      }
    } catch (error) {
      console.error("Add stock error:", error.message);
      Alert.alert("Error", "Could not connect to the database.");
    } finally {
      setIsUpdating(false);
    }
  };

  // ── Issue ──
  const handleIssue = async () => {
    if (!validateAmount(issueAmount)) return;
    if (!issuedTo) { Alert.alert("Required", "Please select who this is issued to."); return; }
    setIsUpdating(true);
    try {
      const response = await apiCall('POST', `/sparepart-issue`, {
        sparepart_id: sparePart.id,
        amount_to_issue: parseInt(issueAmount),
        issued_to: issuedTo.memberid,
        comment: issueComment.trim()
      });
      if (response.data.success) {
        Alert.alert("Issued", `Remaining stock: ${response.data.new_stock}`);
        setCurrentStock(response.data.new_stock);
        resetForm();
      } else {
        Alert.alert("Failed", response.data.message);
      }
    } catch (error) {
      console.error("Issue error:", error.message);
      Alert.alert("Error", "Could not connect to the database.");
    } finally {
      setIsUpdating(false);
    }
  };

  // ── Update Status ──
  const handleUpdateStatus = async () => {
    if (!selectedStatus) { Alert.alert("Required", "Please select a status."); return; }
    setIsUpdating(true);
    try {
      const response = await apiCall('POST',`/sparepart-update-status`, {
        sparepart_id: sparePart.id,
        status: selectedStatus.status,
        comment: statusComment.trim()
      });
      if (response.data.success) {
        Alert.alert("Success", "Status updated successfully!");
        resetForm();
      } else {
        Alert.alert("Failed", response.data.message || "Could not update status.");
      }
    } catch (error) {
      const message = error.response?.data?.message || "Could not connect to the database.";
      Alert.alert("Failed", message);
    } finally {
      setIsUpdating(false);
    }
  };






const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";

  const date = new Date(dateStr);

  if (isNaN(date.getTime()) || date.getFullYear() < 1900) {
    return "N/A";
  }

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();

  return `${dd}/${mm}/${yyyy}`;
};


  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="light-content" backgroundColor="#1A3C6E" />
      <Header showProfile={true}  userName={userName}/>

     <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#1A3C6E"]}
            tintColor="#1A3C6E"
          />
        }
      >
        <Text style={styles.pageTitle}>🔩 {sparePart.type_of_spare === 'spare-part' ? 'Spare Parts' : 'Bulk Spare Parts'}</Text>

        {/* ── Info Card ── */}
        <View style={styles.card}>
          {[
            { key: "id",             label: "Item ID"        },
            { key: "name",           label: "Name"           },
            { key: "type_of_spare",  label: "Type of Spare"  },
            { key: "classification", label: "Classification" },
            { key: "location",       label: "Location"       },
          ].map(({ key, label }) => (
            <View key={key} style={styles.detailRow}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.value}>{sparePart[key] ? String(sparePart[key]) : "N/A"}</Text>
            </View>
          ))}

          <TouchableOpacity onPress={() => setShowMore(!showMore)} style={styles.viewMoreBtn}>
            <Text style={styles.viewMoreText}>{showMore ? "▲ View Less" : "▼ View More"}</Text>
          </TouchableOpacity>

          {showMore && (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Associated Tools</Text>
                <Text style={styles.value}>{sparePart.associated_tools ? String(sparePart.associated_tools) : "N/A"}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Serial No</Text>
                <Text style={styles.value}>{sparePart.serial_no || "N/A"}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Manufacturer Part No</Text>
                <Text style={styles.value}>{sparePart.manufacturer_part_no || "N/A"}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Date of Procurement</Text>
                <Text style={styles.value}>{formatDate(sparePart.date_procurement)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Manual</Text>
                <Text style={styles.value}>{sparePart.manual || "N/A"}</Text>
              </View>
            </>
          )}
        </View>

        {/* ── Present Stock ── */}
        <View style={styles.stockDisplay}>
          <Text style={styles.stockLabel}>📦 Present Stock </Text>
          <Text style={styles.stockValue}>
            {currentStock !== null ? String(Math.floor(currentStock)) : "Loading..."}
          </Text>
        </View>

        {/* ── Inventory Management Box — only if permitted ── */}
        {!permissionLoading && hasPermission && (
          <View style={styles.stockBox}>
            <Text style={styles.stockTitle}>Inventory Management</Text>

            {/* ── Toggle ── */}
            <View style={styles.toggleRow}>
              {sparePart.type_of_spare === "bulk-spare-part" && (
               <>
                 <TouchableOpacity
                   style={[styles.toggleBtn, activeTab === "addstock" && styles.toggleBtnActive]}
                   onPress={() => { setActiveTab("addstock"); resetForm(); }}
                 >
                  <Text style={[styles.toggleText, activeTab === "addstock" && styles.toggleTextActive]}>
                Add Stock
                 </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.toggleBtn, activeTab === "issue" && styles.toggleBtnActive]}
                onPress={() => { setActiveTab("issue"); resetForm(); }}
               >
              <Text style={[styles.toggleText, activeTab === "issue" && styles.toggleTextActive]}>
                Issue
             </Text>
           </TouchableOpacity>
          </>
        )}

       
            </View>

            {/* ── Add Stock Tab ── */}
            {sparePart.type_of_spare === "bulk-spare-part" && activeTab === "addstock" && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Enter quantity"
                  placeholderTextColor="#000"
                  keyboardType="numeric"
                  value={addAmount}
                  onChangeText={handleAddAmountChange}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Comment (optional)"
                  placeholderTextColor="#000"
                  value={addComment}
                  onChangeText={setAddComment}
                />
                <TouchableOpacity
                  style={[styles.addBtn, isUpdating && { opacity: 0.5 }]}
                  onPress={handleAddStock}
                  disabled={isUpdating}
                >
                  <Text style={styles.btnText}>{isUpdating ? "..." : "+ ADD STOCK"}</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── Issue Tab ── */}
            { sparePart.type_of_spare === "bulk-spare-part" &&  activeTab === "issue" && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Enter quantity"
                  placeholderTextColor="#000"
                  keyboardType="numeric"
                  value={issueAmount}
                  onChangeText={handleIssueAmountChange}
                />
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowIssuedToModal(true)}
                >
                  <Text style={issuedTo ? styles.dropdownSelected : styles.dropdownPlaceholder}>
                    {issuedTo ? `${issuedTo.fname} ${issuedTo.lname}` : "Issued to (select member)"}
                  </Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.input}
                  placeholder="Comment (optional)"
                  placeholderTextColor="#000"
                  value={issueComment}
                  onChangeText={setIssueComment}
                />
                <TouchableOpacity
                  style={[styles.issueBtn, isUpdating && { opacity: 0.5 }]}
                  onPress={handleIssue}
                  disabled={isUpdating}
                >
                  <Text style={styles.btnText}>{isUpdating ? "..." : "↗ ISSUE"}</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── Update Status Tab ── */}
            {sparePart.type_of_spare !== "bulk-spare-part" && (
              <>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowStatusModal(true)}
                >
                  <Text style={selectedStatus ? styles.dropdownSelected : styles.dropdownPlaceholder}>
                    {loadingStatus
                      ? "Loading statuses..."
                      : selectedStatus
                        ? selectedStatus.desc
                        : "Select status"}
                  </Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.input}
                  placeholder="Comment (optional)"
                  placeholderTextColor="#000"
                  value={statusComment}
                  onChangeText={setStatusComment}
                />
                <TouchableOpacity
                  style={[styles.statusBtn, isUpdating && { opacity: 0.5 }]}
                  onPress={handleUpdateStatus}
                  disabled={isUpdating}
                >
                  <Text style={styles.btnText}>{isUpdating ? "..." : "🔄 UPDATE STATUS"}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[styles.backBtn , { marginBottom: insets.bottom + 10 }]}
          onPress={() => navigation.navigate("Dashboard")}
        >
          <Text style={styles.backBtnText}>← GO BACK </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Issued To — Member Search Modal ── */}
      <Modal
        visible={showIssuedToModal}
        transparent
        animationType="slide"
        onRequestClose={() => { setShowIssuedToModal(false); handleMemberSearch(""); }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => { setShowIssuedToModal(false); handleMemberSearch(""); }}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Issued To</Text>
              <TouchableOpacity onPress={() => { setShowIssuedToModal(false); handleMemberSearch(""); }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.searchBox}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name..."
                placeholderTextColor="#000"
                value={memberSearch}
                onChangeText={handleMemberSearch}
                autoFocus
              />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {loadingMembers ? (
                <Text style={styles.modalEmptyText}>Loading members...</Text>
              ) : members.length === 0 ? (
                <Text style={styles.modalEmptyText}>
                  {memberSearch.length < 2 ? "Type at least 2 characters..." : "No members found"}
                </Text>
              ) : (
                members.map((m) => (
                  <TouchableOpacity
                    key={m.memberid}
                    style={[
                      styles.modalOption,
                      issuedTo?.memberid === m.memberid && styles.modalOptionSelected
                    ]}
                    onPress={() => {
                      setIssuedTo(m);
                      setShowIssuedToModal(false);
                      handleMemberSearch("");
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[
                        styles.modalOptionText,
                        issuedTo?.memberid === m.memberid && styles.modalOptionTextSelected
                      ]}>
                        {m.fname} {m.lname}
                      </Text>
                      <Text style={styles.modalOptionSub}>{m.position} · {m.department}</Text>
                    </View>
                    {issuedTo?.memberid === m.memberid && (
                      <Text style={styles.modalOptionCheck}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Status Modal ── */}
      <Modal
        visible={showStatusModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowStatusModal(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Status</Text>
              <TouchableOpacity onPress={() => setShowStatusModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {loadingStatus ? (
                <Text style={styles.modalEmptyText}>Loading statuses...</Text>
              ) : statusList.length === 0 ? (
                <Text style={styles.modalEmptyText}>No statuses found</Text>
              ) : (
                statusList.map((s) => (
                  <TouchableOpacity
                    key={s.status}
                    style={[
                      styles.modalOption,
                      selectedStatus?.status === s.status && styles.modalOptionSelected
                    ]}
                    onPress={() => {
                      setSelectedStatus(s);
                      setShowStatusModal(false);
                    }}
                  >
                    <Text style={[
                      styles.modalOptionText,
                      selectedStatus?.status === s.status && styles.modalOptionTextSelected
                    ]}>
                      {s.desc}
                    </Text>
                    {selectedStatus?.status === s.status && (
                      <Text style={styles.modalOptionCheck}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

    </KeyboardAvoidingView>
  );
};

export default SparePartDetails;

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F5F0E8' },
  content:      { padding: 20, paddingBottom: 40 },
  pageTitle:    { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#1A3C6E' },

  // Info card
  card:         { backgroundColor: '#FFD786', borderRadius: 12, padding: 15, elevation: 4 },
  detailRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#171212', alignItems: 'flex-start' },
  label:        { fontWeight: 'bold', color: '#000', fontSize: 12, flex: 1 },
  value:        { color: '#000', fontSize: 14, textAlign: 'right', flexWrap: 'wrap', flex: 1.5 },
  viewMoreBtn:  { alignItems: 'center', paddingVertical: 10 },
  viewMoreText: { color: '#555', fontWeight: 'bold', fontSize: 13 },

  // Stock display
  stockDisplay: { marginTop: 20, backgroundColor: '#332828', borderRadius: 12, padding: 20, alignItems: 'center' },
  stockLabel:   { color: '#fff', fontSize: 14, marginBottom: 5 },
  stockValue:   { color: '#FFD786', fontSize: 32, fontWeight: 'bold' },

  // Inventory box
  stockBox:     { marginTop: 20, backgroundColor: '#FFD786', padding: 20, borderRadius: 12, elevation: 4 },
  stockTitle:   { fontWeight: 'bold', marginBottom: 12, fontSize: 16, color: '#332828' },
  input:        { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 10, fontSize: 14 },

  // Toggle
  toggleRow:        { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 8, marginBottom: 14, overflow: 'hidden' },
  toggleBtn:        { flex: 1, paddingVertical: 10, alignItems: 'center' },
  toggleBtnActive:  { backgroundColor: '#332828' },
  toggleText:       { fontSize: 13, fontWeight: '600', color: '#332828' },
  toggleTextActive: { color: '#FFD786' },

  // Dropdown
  dropdown:            { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownPlaceholder: { color: '#000', fontSize: 14 },
  dropdownSelected:    { color: '#000', fontSize: 14, flex: 1, marginRight: 8 },
  dropdownArrow:       { color: '#000', fontSize: 12 },

  // Buttons
  addBtn:    { backgroundColor: '#332828', padding: 15, borderRadius: 8, alignItems: 'center' },
  issueBtn:  { backgroundColor: '#E8A020', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  statusBtn: { backgroundColor: '#1A3C6E', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  btnText:   { color: '#fff', fontWeight: 'bold', fontSize: 13, textAlign: 'center' },

  // Back
  backBtn:     { marginTop: 20, marginBottom: 10, alignItems: 'center' },
  backBtnText: { color: '#1A3C6E', fontWeight: '600', fontSize: 14 },

  // Modal
  modalOverlay:            { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet:              { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '70%', paddingBottom: 30 },
  modalHeader:             { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle:              { fontSize: 16, fontWeight: 'bold', color: '#1A3C6E' },
  modalClose:              { fontSize: 16, color: '#555', padding: 4 },
  modalOption:             { paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 0.5, borderBottomColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalOptionSelected:     { backgroundColor: '#e8f0fb' },
  modalOptionText:         { fontSize: 14, color: '#333' },
  modalOptionTextSelected: { color: '#1A3C6E', fontWeight: '600' },
  modalOptionSub:          { fontSize: 11, color: '#999', marginTop: 2 },
  modalOptionCheck:        { color: '#1A3C6E', fontWeight: 'bold', fontSize: 16 },
  modalEmptyText:          { textAlign: 'center', padding: 20, color: '#999' },

  // Search in modal
  searchBox:   { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  searchInput: { backgroundColor: '#f5f5f5', borderRadius: 8, padding: 10, fontSize: 14 },
});

