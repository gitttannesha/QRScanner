
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Modal, Platform, ScrollView,
  StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View
} from "react-native";
import { API_BASE_URL } from '../config/api';
import Header from './Header';

const ConsumableDetails = ({ route, navigation }) => {
  const { consumable } = route.params;
  const table = consumable.table;

  // ── Derive type flags ──
  const isReusable = table === "reusables_master_new";
  const pageTitle  = isReusable ? "♻️ REUSABLE CONSUMABLE" : "🔧 ONE TIME CONSUMABLE";
  const role       = isReusable ? "consumables-reusable" : "consumables-one-time";

  // ── State ──
  const [amount, setAmount]                       = useState("");
  const [comment, setComment]                     = useState("");
  const [showMore, setShowMore]                   = useState(false);
  const [selectedLocation, setSelectedLocation]   = useState(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [currentStock, setCurrentStock]           = useState(null);
  const [memberId, setMemberId]                   = useState(null);
  const [isUpdating, setIsUpdating]               = useState(false);
  const [labLocations, setLabLocations]           = useState([]);
  const [loadingLabs, setLoadingLabs]             = useState(true);
  const [hasPermission, setHasPermission]         = useState(false);
  const [permissionLoading, setPermissionLoading] = useState(true);
  const [activeTab, setActiveTab]                 = useState("addstock");

  // ── Issued To (members) ──
  const [members, setMembers]                     = useState([]);
  const [loadingMembers, setLoadingMembers]       = useState(false);
  const [selectedMember, setSelectedMember]       = useState(null);
  const [showMemberModal, setShowMemberModal]     = useState(false);
  const [memberSearch, setMemberSearch]           = useState("");
  const [pendingStock, setPendingStock]   = useState(null);
const [loadingPending, setLoadingPending] = useState(false);
  const searchTimeout = useRef(null); 

  // ── Get memberId from AsyncStorage ──
  useEffect(() => {
    const getMember = async () => {
      try {
        const userData = await AsyncStorage.getItem("userData");
        if (userData) {
          const parsed = JSON.parse(userData);
          setMemberId(parsed.memberid);
        }
      } catch (e) {
        console.error("AsyncStorage error:", e);
      }
    };
    getMember();
  }, []);

  // ── Check permission once memberId is ready ──
  useEffect(() => {
    if (!memberId) return;
    const checkPerm = async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/check-consumable-permission/${memberId}/${role}`
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

  // ── Fetch current stock ──
  useEffect(() => {
    const fetchStock = async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/consumable-stock/${consumable.id}?table=${table}`
        );
        if (response.data.success) setCurrentStock(response.data.stock);
      } catch (error) {
        console.error("Fetch stock error:", error.message);
      }
    };
    fetchStock();
  }, []);

  // ── Fetch lab locations ──
  useEffect(() => {
    const fetchLabs = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/lab-locations`);
        if (response.data.success) {
          setLabLocations(
            response.data.data.map(lab => ({ label: lab.location, id: lab.locationid }))
          );
        }
      } catch (error) {
        console.error("Fetch labs error:", error.message);
      } finally {
        setLoadingLabs(false);
      }
    };
    fetchLabs();
  }, []);

  // ── Fetch members (non-faculty) for "Issued To" dropdown ──
  // ── Search members on type ──
const handleMemberSearch = (text) => {
  setMemberSearch(text);
  clearTimeout(searchTimeout.current);

  if (text.trim().length < 2) {
    setMembers([]);
    return;
  }

  searchTimeout.current = setTimeout(async () => {
    setLoadingMembers(true);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/consumable-members?search=${text.trim()}`
      );
      if (response.data.success) setMembers(response.data.data);
    } catch (error) {
      console.error("Search members error:", error.message);
    } finally {
      setLoadingMembers(false);
    }
  }, 400);
};

// ── filtered members = search results from backend ──
const filteredMembers = members;


// ── Fetch pending stock for selected member ──
const fetchPendingStock = async (member) => {
  if (!member) { setPendingStock(null); return; }
  setLoadingPending(true);
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/pending-stock/${consumable.id}?table=${table}&member_id=${member.memberid}`
    );
    if (response.data.success) setPendingStock(response.data.pending);
  } catch (error) {
    console.error("Fetch pending error:", error.message);
  } finally {
    setLoadingPending(false);
  }
};


  // ── Helpers ──
  const resetForm = () => {
    setAmount("");
    setComment("");
    setSelectedLocation(null);
    setSelectedMember(null);
    handleMemberSearch("");
    setPendingStock(null);
  };

  const validateAmount = () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert("Invalid Input", "Please enter a valid quantity.");
      return false;
    }
    return true;
  };

  const validateLocation = () => {
    if (!selectedLocation) {
      Alert.alert("Required", "Please select a lab location.");
      return false;
    }
    return true;
  };

  const validateMember = () => {
    if (!selectedMember) {
      Alert.alert("Required", "Please select who this is issued to.");
      return false;
    }
    return true;
  };

  // ── Add Stock ──
  const handleAddStock = async () => {
    if (!validateAmount()) return;
    setIsUpdating(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/add-consumable-stock`, {
        consumable_id: consumable.id,
        table,
        amount_to_add: parseFloat(amount),
        member_id: memberId,
        comment: comment.trim()
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

  // ── Issue (flag = 0) ──
  const handleIssue = async () => {
    if (!validateAmount()) return;
    if (!validateLocation()) return;
    if (!validateMember()) return;
    setIsUpdating(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/issue-consumable`, {
        consumable_id: consumable.id,
        table,
        amount_to_issue: parseFloat(amount),
        issued_to: selectedMember.memberid,   // userid = person it's issued to
        lab_location_id: selectedLocation.id,
        comment: comment.trim(),
        flag: 0
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

  // ── Return — reusables only (flag = 1) ──
 const handleReturn = async () => {
  if (!validateAmount()) return;
  if (!validateLocation()) return;
  if (!validateMember()) return;
  if (pendingStock !== null && parseFloat(amount) > pendingStock) {
    Alert.alert("Cannot Return", `Only ${pendingStock} units pending. Cannot return ${amount}.`);
    return;
  }
    try {
      const response = await axios.post(`${API_BASE_URL}/api/return-consumable`, {
        consumable_id: consumable.id,
        table,
        amount_to_return: parseFloat(amount),
        issued_to: selectedMember.memberid,
        lab_location_id: selectedLocation.id,
        comment: comment.trim(),
        flag: 1
      });
      if (response.data.success) {
        Alert.alert("Returned", `Updated stock: ${response.data.new_stock}`);
        setCurrentStock(response.data.new_stock);
        resetForm();
      } else {
        Alert.alert("Failed", response.data.message);
      }
    } catch (error) {
      console.error("Return error:", error.message);
      Alert.alert("Error", "Could not connect to the database.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="light-content" backgroundColor="#1A3C6E" />
      <Header showProfile={false} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.pageTitle}>{pageTitle}</Text>

        {/* ── Info Card ── */}
        <View style={styles.card}>
          {[
            { key: "id",        label: "Item ID"   },
            { key: "name",      label: "Name"      },
            { key: "category",  label: "Category"  },
            { key: "equipment", label: "Equipment" },
            { key: "location",  label: "Location"  },
          ].map(({ key, label }) => (
            <View key={key} style={styles.detailRow}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.value}>{consumable[key] ? String(consumable[key]) : "N/A"}</Text>
            </View>
          ))}

          <TouchableOpacity onPress={() => setShowMore(!showMore)} style={styles.viewMoreBtn}>
            <Text style={styles.viewMoreText}>{showMore ? "▲ View Less" : "▼ View More"}</Text>
          </TouchableOpacity>

          {showMore && (
            <>
              <View style={styles.fullRow}>
                <Text style={styles.label}>Specs</Text>
                <Text style={styles.fullValue}>{consumable.specs || "N/A"}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Added By</Text>
                <Text style={styles.value}>{consumable.added_by ? String(consumable.added_by) : "N/A"}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Added On</Text>
                <Text style={styles.value}>{consumable.timestamp || "N/A"}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Last Updated</Text>
                <Text style={styles.value}>{consumable.last_updated_timestamp || "N/A"}</Text>
              </View>
            </>
          )}
        </View>

        {/* ── Present Stock ── */}
        <View style={styles.stockDisplay}>
          <Text style={styles.stockLabel}>📦 Present Stock </Text>
          <Text style={styles.stockValue}>
            {currentStock !== null ? String(currentStock) : "Loading..."}
          </Text>
        </View>

        {/* ── Inventory Management Box — only if permitted ── */}
        {!permissionLoading && hasPermission && (
          <View style={styles.stockBox}>
            <Text style={styles.stockTitle}>Inventory Management</Text>

            {/* ── Toggle ── */}
           <View style={styles.toggleRow}>
<TouchableOpacity
    style={[styles.toggleBtn, activeTab === "addstock" && styles.toggleBtnActive]}
    onPress={() => { setActiveTab("addstock"); resetForm(); }}
  >
    <Text style={[styles.toggleText, activeTab === "addstock" && styles.toggleTextActive]}>
      + Add Stock
    </Text>
  </TouchableOpacity>
  <TouchableOpacity
    style={[styles.toggleBtn, activeTab === "issue" && styles.toggleBtnActive]}
    onPress={() => { setActiveTab("issue"); resetForm(); }}
  >
    <Text style={[styles.toggleText, activeTab === "issue" && styles.toggleTextActive]}>
      ↗ Issue
    </Text>
  </TouchableOpacity>
  {isReusable && (
    <TouchableOpacity
      style={[styles.toggleBtn, activeTab === "return" && styles.toggleBtnActive]}
      onPress={() => { setActiveTab("return"); resetForm(); }}
    >
      <Text style={[styles.toggleText, activeTab === "return" && styles.toggleTextActive]}>
        ↩ Return
      </Text>
    </TouchableOpacity>
  )}
</View>



            {/* ── Add Stock Tab ── */}
            {activeTab === "addstock" && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Enter quantity"
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Comment"
                  value={comment}
                  onChangeText={setComment}
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

            {/* ── Issue / Action Tab ── */}
           {activeTab === "issue" && (
  <>
    <TextInput
      style={styles.input}
      placeholder="Enter quantity"
      keyboardType="numeric"
      value={amount}
      onChangeText={setAmount}
    />
    <TouchableOpacity
      style={styles.dropdown}
      onPress={() => setShowMemberModal(true)}
    >
      <Text style={selectedMember ? styles.dropdownSelected : styles.dropdownPlaceholder}>
        {selectedMember ? `${selectedMember.fname} ${selectedMember.lname}` : "Issued to (select member)"}
      </Text>
      <Text style={styles.dropdownArrow}>▼</Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={styles.dropdown}
      onPress={() => setShowLocationModal(true)}
    >
      <Text style={selectedLocation ? styles.dropdownSelected : styles.dropdownPlaceholder}>
        {loadingLabs ? "Loading labs..." : selectedLocation ? selectedLocation.label : "Select lab location"}
      </Text>
      <Text style={styles.dropdownArrow}>▼</Text>
    </TouchableOpacity>
    <TextInput
      style={styles.input}
      placeholder="Comment"
      value={comment}
      onChangeText={setComment}
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

{/* ── Return Tab — reusables only ── */}
{activeTab === "return" && isReusable && (
  <>
        {/* Pending stock display */}
    {selectedMember && (
      <View style={styles.pendingBox}>
        <Text style={styles.pendingText}>
          {loadingPending
            ? "Checking pending..."
            : pendingStock !== null
              ? `⏳ Pending stock: ${pendingStock}`
              : ""}
        </Text>
      </View>
    )}

    <TextInput
      style={styles.input}
      placeholder="Enter quantity"
      keyboardType="numeric"
      value={amount}
      onChangeText={setAmount}
    />
    <TouchableOpacity
      style={styles.dropdown}
      onPress={() => setShowMemberModal(true)}
    >
      <Text style={selectedMember ? styles.dropdownSelected : styles.dropdownPlaceholder}>
        {selectedMember ? `${selectedMember.fname} ${selectedMember.lname}` : "Returned by (select member)"}
      </Text>
      <Text style={styles.dropdownArrow}>▼</Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={styles.dropdown}
      onPress={() => setShowLocationModal(true)}
    >
      <Text style={selectedLocation ? styles.dropdownSelected : styles.dropdownPlaceholder}>
        {loadingLabs ? "Loading labs..." : selectedLocation ? selectedLocation.label : "Select lab location"}
      </Text>
      <Text style={styles.dropdownArrow}>▼</Text>
    </TouchableOpacity>
    <TextInput
      style={styles.input}
      placeholder="Comment"
      value={comment}
      onChangeText={setComment}
    />
    <TouchableOpacity
      style={[styles.returnBtn, isUpdating && { opacity: 0.5 }]}
      onPress={handleReturn}
      disabled={isUpdating}
    >
      <Text style={styles.btnText}>{isUpdating ? "..." : "↩ RETURN"}</Text>
    </TouchableOpacity>
  </>
)}
</View>
        )}

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.navigate("Dashboard")}
        >
          <Text style={styles.backBtnText}>← BACK TO DASHBOARD</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* ── Issued To — Member Search Modal ── */}
      <Modal
        visible={showMemberModal}
        transparent
        animationType="slide"
        onRequestClose={() => { setShowMemberModal(false); handleMemberSearch(""); }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => { setShowMemberModal(false); handleMemberSearch(""); }}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{activeTab === "return" ? "Returned By" : "Issued To"}</Text>
              <TouchableOpacity onPress={() => { setShowMemberModal(false); handleMemberSearch(""); }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Search input */}
            <View style={styles.searchBox}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name..."
                value={memberSearch}
                onChangeText={handleMemberSearch}
                autoFocus
              />
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              {loadingMembers ? (
                <Text style={styles.modalEmptyText}>Loading members...</Text>
              ) : filteredMembers.length === 0 ? (
                <Text style={styles.modalEmptyText}>No members found</Text>
              ) : (
                filteredMembers.map((m) => (
                  <TouchableOpacity
                    key={m.memberid}
                    style={[
                      styles.modalOption,
                      selectedMember?.memberid === m.memberid && styles.modalOptionSelected
                    ]}
                    onPress={() => {
                      setSelectedMember(m);
                      setShowMemberModal(false);
                      handleMemberSearch("");
                      if (activeTab === "return") fetchPendingStock(m);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[
                        styles.modalOptionText,
                        selectedMember?.memberid === m.memberid && styles.modalOptionTextSelected
                      ]}>
                        {m.fname} {m.lname}
                      </Text>
                      <Text style={styles.modalOptionSub}>{m.position} · {m.department}</Text>
                    </View>
                    {selectedMember?.memberid === m.memberid && (
                      <Text style={styles.modalOptionCheck}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Lab Location Bottom Sheet Modal ── */}
      <Modal
        visible={showLocationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLocationModal(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Lab Location</Text>
              <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {loadingLabs ? (
                <Text style={styles.modalEmptyText}>Loading labs...</Text>
              ) : labLocations.length === 0 ? (
                <Text style={styles.modalEmptyText}>No labs found</Text>
              ) : (
                labLocations.map((loc) => (
                  <TouchableOpacity
                    key={loc.id}
                    style={[
                      styles.modalOption,
                      selectedLocation?.id === loc.id && styles.modalOptionSelected
                    ]}
                    onPress={() => {
                      setSelectedLocation(loc);
                      setShowLocationModal(false);
                    }}
                  >
                    <Text style={[
                      styles.modalOptionText,
                      selectedLocation?.id === loc.id && styles.modalOptionTextSelected
                    ]}>
                      {loc.label}
                    </Text>
                    {selectedLocation?.id === loc.id && (
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

export default ConsumableDetails;

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F5F0E8' },
  content:      { padding: 20, paddingBottom: 40 },
  pageTitle:    { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#1A3C6E' },

  // Info card
  card:         { backgroundColor: '#FFD786', borderRadius: 12, padding: 15, elevation: 4 },
  detailRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#171212', alignItems: 'flex-start' },
  label:        { fontWeight: 'bold', color: '#000', fontSize: 12, flex: 1 },
  value:        { color: '#000', fontSize: 14, textAlign: 'right', flexWrap: 'wrap', flex: 1.5 },
  fullRow:      { paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#171212' },
  fullValue:    { color: '#000', fontSize: 14, flexWrap: 'wrap', marginTop: 4 },
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
  dropdownPlaceholder: { color: '#aaa', fontSize: 14 },
  dropdownSelected:    { color: '#000', fontSize: 14, flex: 1, marginRight: 8 },
  dropdownArrow:       { color: '#555', fontSize: 12 },

  // Buttons
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 4 },
  addBtn:    { backgroundColor: '#332828', padding: 15, borderRadius: 8, alignItems: 'center' },
  issueBtn:  { flex: 1, backgroundColor: '#E8A020', paddingVertical: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  returnBtn: { flex: 1, backgroundColor: '#1A6E3C', paddingVertical: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnText:   { color: '#fff', fontWeight: 'bold', fontSize: 11, textAlign: 'center' },

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
  pendingBox:  { backgroundColor: '#fff3cd', borderRadius: 8, padding: 10, marginBottom: 10 },
  
  pendingText: { color: '#856404', fontWeight: '600', fontSize: 15, textAlign: 'center' },
  searchBox:   { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  searchInput: { backgroundColor: '#f5f5f5', borderRadius: 8, padding: 10, fontSize: 14 },
});