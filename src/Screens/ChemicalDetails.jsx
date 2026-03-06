import axios from 'axios';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE_URL } from '../config/api';
// Remove this if you have it: import { AsyncStorage } from 'react-native';
// Add this:
const ChemicalDetails = ({ route, navigation }) => {
const { chemical } = route.params; 
const [amount, setAmount] = useState("");
const [isUpdating, setIsUpdating] = useState(false);
const handleAddStock = async () => {
  // 1. Validation: Don't send if amount is empty or 0
  if (!amount || parseInt(amount) <= 0) {
    Alert.alert("Invalid Input", "Please enter a quantity to add.");
    return;
  }

  setIsUpdating(true); // Start loading

  try {
    const response = await axios.post(`${API_BASE_URL}/api/add-stock`, {
      chemical_id: chemical.chemical_id, // Match your DB column name
      amount_to_add: parseInt(amount) 
    });

    if (response.data.success) {
      Alert.alert("Success", `Added ${amount} to stock for ${chemical.chemical_name}`);
      setAmount(""); 
    }
  } catch (error) {
    console.error("Connection Error:", error.message);
    Alert.alert("Error", "Could not connect to the chemical database.");
  } finally {
    setIsUpdating(false); // Stop loading regardless of success/fail
  }
};

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>🧪 Chemical Info</Text>

        {/* The Detail Card */}
        <View style={styles.card}>
          {Object.entries(chemical).map(([key, value]) => (
            <View key={key} style={styles.detailRow}>
              {/* <Text style={styles.label}>{key.toUpperCase()}</Text>
              <Text style={styles.value}>{value || "N/A"}</Text> */}
              <Text style={styles.label}>{key.replace(/_/g, ' ')}</Text>
              <Text style={styles.value}>{String(value ?? "N/A")}</Text>
            </View>
          ))}
        </View>

        {/* Add Stock Section */}
        <View style={styles.stockBox}>
          <Text style={styles.stockTitle}>Inventory Management</Text>
          <TextInput 
            style={styles.input}
            placeholder="Qty to add"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
          <TouchableOpacity 
            style={[styles.addBtn ,isUpdating && { opacity: 0.5 }]} 
            onPress={handleAddStock}
            disabled={isUpdating}>
            <Text style={styles.addBtnText}>{isUpdating ? "Adding..." : "+ ADD TO STOCK"}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.backBtn} 
          onPress={() => navigation.navigate("Dashboard")}
        >
          <Text style={styles.backBtnText}>BACK TO DASHBOARD</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ChemicalDetails;

const styles = StyleSheet.create({
  container: { flex: 1, 
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
    borderBottomColor: '#171212' ,
    alignItems: 'flex-start'
},
  label: { 
    fontWeight: 'bold', 
    color: '#000', 
    fontSize: 12 ,
    flex: 1,           
    textTransform: 'uppercase',
},
  value: { 
    color: '#000', 
    fontSize: 14 ,
    textAlign: 'right', // Standard for mobile info screens
    flexWrap: 'wrap',
    flex: 1.5
},
  stockBox: { 
    marginTop: 25, 
    backgroundColor: '#F2A65A', 
    padding: 20, 
    borderRadius: 12 
},
  stockTitle: { 
    fontWeight: 'bold', 
    marginBottom: 10 
},
  input: { 
    backgroundColor: '#fff', 
    borderRadius: 8, 
    padding: 12, 
    marginBottom: 10 
},
  addBtn: { 
    backgroundColor: '#333', 
    padding: 15, 
    borderRadius: 8, 
    alignItems: 'center' 
},
  addBtnText: { 
    color: '#fff', 
    fontWeight: 'bold' 
},
  backBtn: { 
    marginTop: 20, 
    alignItems: 'center' 
},
  backBtnText: { 
    color: '#555' 
}
});