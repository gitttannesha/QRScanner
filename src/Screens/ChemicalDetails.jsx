import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE_URL } from '../config/api';

const ChemicalDetails = ({ route, navigation }) => {
  const { chemical } = route.params;
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [currentStock, setCurrentStock] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [memberId, setMemberId] = useState(null);

  // Fetch member_id from AsyncStorage and current stock on load
  useEffect(() => {
    const init = async () => {
      try {
        const userData = await AsyncStorage.getItem("userData");
        if (userData) {
          const parsed = JSON.parse(userData);
          setMemberId(parsed.memberid);
        }
        fetchCurrentStock();
      } catch (e) {
        console.error("Init error:", e);
      }
    };
    init();
  }, []);
   
 const checkPermission = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/check-permission/${memberId}/${chemical.chemical_id}`);
    return response.data.hasPermission;
  } catch (error) {
    console.error("Permission check error:", error.message);
    return false;
  }
};


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
     const allowed = await checkPermission();
  if (!allowed) {
    Alert.alert("Access Denied", "You don't have permission to update this chemical's stock.");
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

      const allowed = await checkPermission();
  if (!allowed) {
    Alert.alert("Access Denied", "You don't have permission to update this chemical's stock.");
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
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>🧪 CHEMICAL INFO</Text>
        <View style={styles.card}>
        
  {[
    { key: "chemical_id",       label: "Chemical ID" },
    { key: "chemical_name",     label: "Chemical Name" },
    { key: "unit_measure",      label: "Unit Measure" },
    { key: "type",              label: "Type" },
    { key: "location",          label: "Location" },
    { key: "purity",            label: "Purity" },
    { key: "supplier_int",      label: "Supplier International Address" },
    { key: "supplier_local",    label: "Supplier Local Address" },
    { key: "chemical_in_name",  label: "Chemical Incharge Name" },
    { key: "chemical_in_mailid",label: "Chemical Incharge Email" },
  ].map(({ key, label }) => (
    <View key={key} style={styles.detailRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{chemical[key] ? String(chemical[key]) : "N/A"}</Text>
    </View>
  ))}

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



  {/* MSDS - Clickable Link */}
  <View style={styles.detailRow }>
    <Text style={styles.label}>MSDS</Text>
    {chemical.msds ? (
    
      <TouchableOpacity onPress={() => Linking.openURL(chemical.msds)}>
      <Text style={[styles.value, { color: "blue", textDecorationLine: "underline" , textAlign: 'left' }]}>
        view msds
      </Text>
    </TouchableOpacity>
  ) : (
    <Text style={styles.value}>N/A</Text>
  )}

  </View>

  {/* Manual - Download Button */}
  <View style={styles.detailRow}>
    <Text style={styles.label}>Manual</Text>
    {chemical.manual ? (
     
          <TouchableOpacity onPress={() => Linking.openURL(chemical.manual)}>
      <Text style={[styles.value, { color: "green", textDecorationLine: "underline" }]}>
        ⬇ Download Manual
      </Text>
    </TouchableOpacity>
    ) : (
      <Text style={styles.value}>N/A</Text>
    )}
  </View>

</View>

      

        {/* Current Stock Display */}
        <View style={styles.stockDisplay}>
          <Text style={styles.stockLabel}>📦 Present Stock</Text>
          <Text style={styles.stockValue}>
            {currentStock !== null ? currentStock : "Loading..."}
          </Text>
        </View>

        {/* Inventory Management Section */}
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

          {/* Two Buttons */}
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

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.navigate("Dashboard")}>
          <Text style={styles.backBtnText}>BACK TO DASHBOARD</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ChemicalDetails;

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#d9d6c3' 
  },
  content: { 
    padding: 20 
  },
  header: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 20, 
    textAlign: 'center' 
  },
  card: { 
    backgroundColor: '#F2A65A', 
    borderRadius: 12, 
    padding: 15, 
    elevation: 4 
  },
  detailRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingVertical: 10, 
    borderBottomWidth: 0.5, 
    borderBottomColor: '#171212', 
    alignItems: 'flex-start' 
  },
  label: { 
    fontWeight: 'bold', 
    color: '#000', 
    fontSize: 12, 
    flex: 1
  },
  value: { 
    color: '#000', 
    fontSize: 14, 
    textAlign: 'right', 
    flexWrap: 'wrap', 
    flex: 1.5 
  },
  stockDisplay: { 
    marginTop: 20, backgroundColor: '#333', borderRadius: 12, padding: 20, alignItems: 'center' },
  stockLabel: { color: '#fff', fontSize: 14, marginBottom: 5 },
  stockValue: { color: '#F2A65A', fontSize: 32, fontWeight: 'bold' },
  stockBox: { marginTop: 20, backgroundColor: '#F2A65A', padding: 20, borderRadius: 12 },
  stockTitle: { fontWeight: 'bold', marginBottom: 10, fontSize: 16 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 10 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  addBtn: { flex: 1, backgroundColor: '#333', padding: 15, borderRadius: 8, alignItems: 'center' },
  updateBtn: { flex: 1, backgroundColor: '#7a4f2d', padding: 15, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  backBtn: { marginTop: 20, alignItems: 'center' },
  backBtnText: { color: '#555' }
});