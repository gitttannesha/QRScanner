
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { API_BASE_URL } from '../config/api';
import Header from './Header';

const ChemicalDetails = ({ route, navigation }) => {
  const { chemical } = route.params;
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [currentStock, setCurrentStock] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [memberId, setMemberId] = useState(null);
  const [showMore, setShowMore] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [userName, setUserName] = useState("User");

  useEffect(() => {
    const init = async () => {
      try {
        const userData = await AsyncStorage.getItem("userData");
        if (userData) {
          const parsed = JSON.parse(userData);
          setMemberId(parsed.memberid);
          setUserName(`${parsed.fname} ${parsed.lname}` || "User");
          const response = await axios.get(`${API_BASE_URL}/check-permission/${parsed.memberid}/${chemical.chemical_id}`);
          setHasPermission(response.data.hasPermission);
        }
        fetchCurrentStock();
      } catch (e) {
        console.error("Init error:", e);
        setHasPermission(false);
      }
    };
    init();
  }, []);

  const fetchCurrentStock = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/current-stock/${chemical.chemical_id}`);
      if (response.data.success) {
        setCurrentStock(response.data.stock);
      }
    } catch (error) {
      console.error("Fetch stock error:", error.message);
    }
  };

  const handleAddStock = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert("Invalid Input", "Please enter a valid quantity to add.");
      return;
    }
    setIsUpdating(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/add-stock`, {
        chemical_id: chemical.chemical_id,
        amount_to_add: parseFloat(amount),
        member_id: memberId,
        comment: comment.trim() || "new stock"
      });
      if (response.data.success) {
        Alert.alert("Success", `Stock updated! New stock: ${response.data.new_stock}`);
        setCurrentStock(response.data.new_stock);
        setAmount("");
        setComment("");
      }
    } catch (error) {
      console.error("Add stock error:", error.message);
      Alert.alert("Error", "Could not connect to the database.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateStock = async () => {
    if (!amount || parseFloat(amount) < 0) {
      Alert.alert("Invalid Input", "Please enter a valid stock value.");
      return;
    }
    setIsUpdating(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/update-stock`, {
        chemical_id: chemical.chemical_id,
        new_total: parseFloat(amount),
        member_id: memberId,
        comment: comment.trim() || "new stock"
      });
      if (response.data.success) {
        Alert.alert("Success", `Stock set to ${response.data.new_stock}`);
        setCurrentStock(response.data.new_stock);
        setAmount("");
        setComment("");
      }
    } catch (error) {
      console.error("Update stock error:", error.message);
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

      {/* ── Header (logo only, no person icon) ── */}
      <Header userName={userName} showProfile={false} />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>🧪 CHEMICAL INFO</Text>

        <View style={styles.card}>
          {[
            { key: "chemical_id",   label: "Chemical ID" },
            { key: "chemical_name", label: "Chemical Name" },
            { key: "unit_measure",  label: "Unit Measure" },
            { key: "type",          label: "Type" },
            { key: "location",      label: "Location" },
            { key: "purity",        label: "Purity" },
          ].map(({ key, label }) => (
            <View key={key} style={styles.detailRow}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.value}>{chemical[key] ? String(chemical[key]) : "N/A"}</Text>
            </View>
          ))}

          {/* View More / View Less toggle */}
          <TouchableOpacity onPress={() => setShowMore(!showMore)} style={styles.viewMoreBtn}>
            <Text style={styles.viewMoreText}>{showMore ? "▲ View Less" : "▼ View More"}</Text>
          </TouchableOpacity>

          {/* Hidden fields */}
          {showMore && (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Supplier Int. Address</Text>
                <Text style={styles.value}>{chemical.supplier_int || "N/A"}</Text>
              </View>

              <View style={styles.fullRow}>
                <Text style={styles.label}>Supplier Local Address</Text>
                <Text style={styles.fullValue}>{chemical.supplier_local || "N/A"}</Text>
              </View>

              <View style={styles.inchargeBox}>
                <Text style={styles.inchargeTitle}>Chemical Incharge</Text>
                <View style={styles.inchargeRow}>
                  <Text style={styles.inchargeLabel}>Name</Text>
                  <Text style={styles.inchargeValue}>{chemical.chemical_in_name || "N/A"}</Text>
                </View>
                <View style={styles.inchargeRow}>
                  <Text style={styles.inchargeLabel}>Email</Text>
                  {chemical.chemical_in_mailid ? (
                    <TouchableOpacity onPress={() => Linking.openURL(`mailto:${chemical.chemical_in_mailid}`)}>
                      <Text style={[styles.inchargeValue, { color: 'blue', textDecorationLine: 'underline' }]}>
                        {chemical.chemical_in_mailid}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.inchargeValue}>N/A</Text>
                  )}
                </View>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.label}>Equipment Used</Text>
                <View style={{ flex: 1 }}>
                  {chemical.equipment_names && chemical.equipment_names.length > 0 ? (
                    chemical.equipment_names.map((name, index) => (
                      <Text key={index} style={styles.value}>• {name}</Text>
                    ))
                  ) : (
                    <Text style={styles.value}>N/A</Text>
                  )}
                </View>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.label}>MSDS</Text>
                {chemical.msds ? (
                  <TouchableOpacity onPress={() => Linking.openURL(chemical.msds)}>
                    <Text style={[styles.value, { color: "blue", textDecorationLine: "underline" }]}>view msds</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.value}>N/A</Text>
                )}
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.label}>Manual</Text>
                {chemical.manual ? (
                  <TouchableOpacity onPress={() => Linking.openURL(chemical.manual)}>
                    <Text style={[styles.value, { color: "green", textDecorationLine: "underline" }]}>⬇ Download Manual</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.value}>N/A</Text>
                )}
              </View>
            </>
          )}
        </View>

        {/* Current Stock */}
        <View style={styles.stockDisplay}>
          <Text style={styles.stockLabel}>📦 Present Stock </Text>
          <Text style={styles.stockValue}>
            {currentStock !== null ? currentStock : "Loading..."}
          </Text>
        </View>

        {/* Inventory Management */}
        {hasPermission === null ? (
          <Text style={{ textAlign: 'center', marginTop: 20, color: '#555' }}>Checking permissions...</Text>
        ) : hasPermission ? (
          <View style={styles.stockBox}>
            <Text style={styles.stockTitle}>Inventory Management</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter quantity"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
            <TextInput
              style={styles.input}
              placeholder="Comment (optional)"
              value={comment}
              onChangeText={setComment}
            />
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.addBtn, isUpdating && { opacity: 0.5 }]}
                onPress={handleAddStock}
                disabled={isUpdating}>
                <Text style={styles.btnText}>{isUpdating ? "Adding..." : "+ ADD STOCK"}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.updateBtn, isUpdating && { opacity: 0.5 }]}
                onPress={handleUpdateStock}
                disabled={isUpdating}>
                <Text style={styles.btnText}>{isUpdating ? "Updating..." : "✎ CURRENT STOCK"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.navigate("Dashboard")}>
          <Text style={styles.backBtnText}>← BACK TO DASHBOARD</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ChemicalDetails;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },
  content: { padding: 20 },
  pageTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#1A3C6E' },
  card: { backgroundColor: '#FFD786', borderRadius: 12, padding: 15, elevation: 4 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#171212', alignItems: 'flex-start' },
  label: { fontWeight: 'bold', color: '#000', fontSize: 12, flex: 1 },
  value: { color: '#000', fontSize: 14, textAlign: 'right', flexWrap: 'wrap', flex: 1.5 },
  fullRow: { paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#171212' },
  fullValue: { color: '#000', fontSize: 14, flexWrap: 'wrap', marginTop: 4 },
  viewMoreBtn: { alignItems: 'center', paddingVertical: 10 },
  viewMoreText: { color: '#555', fontWeight: 'bold', fontSize: 13 },
  inchargeBox: { backgroundColor: '#FFD786', borderRadius: 8, padding: 10, marginVertical: 8 },
  inchargeTitle: { fontWeight: 'bold', fontSize: 13, marginBottom: 6, color: '#000' },
  inchargeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  inchargeLabel: { fontSize: 12, color: '#333', fontWeight: '600' },
  inchargeValue: { fontSize: 12, color: '#000', textAlign: 'right', flex: 1, marginLeft: 10 },
  stockDisplay: { marginTop: 20, backgroundColor: '#332828', borderRadius: 12, padding: 20, alignItems: 'center' },
  stockLabel: { color: '#fff', fontSize: 14, marginBottom: 5 },
  stockValue: { color: '#FFD786', fontSize: 32, fontWeight: 'bold' },
  stockBox: { marginTop: 20, backgroundColor: '#FFD786', padding: 20, borderRadius: 12 },
  stockTitle: { fontWeight: 'bold', marginBottom: 10, fontSize: 16, color: '#332828' },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 10 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  addBtn: { flex: 1, backgroundColor: '#332828', padding: 15, borderRadius: 8, alignItems: 'center' },
  updateBtn: { flex: 1, backgroundColor: '#E8A020', padding: 15, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  backBtn: { marginTop: 20, marginBottom: 10, alignItems: 'center' },
  backBtnText: { color: '#1A3C6E', fontWeight: '600', fontSize: 14 },
});