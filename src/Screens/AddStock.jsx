import axios from 'axios';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE_URL } from '../config/api';

const AddStock = ({ navigation }) => {
  const [chemicalId, setChemicalId] = useState('');
  const [amount, setAmount] = useState('');
  const [chemical, setChemical] = useState(null);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingUpdate, setLoadingUpdate] = useState(false);

  // Step 1: Lookup chemical by ID
  const handleSearch = async () => {
    if (!chemicalId.trim()) {
      Alert.alert('Missing Input', 'Please enter a Chemical ID.');
      return;
    }

    setLoadingSearch(true);
    setChemical(null);
    setAmount('');

    try {
      const res = await axios.get(`${API_BASE_URL}/chemical/${chemicalId.trim()}`);
      if (res.data.success) {
        setChemical(res.data.data);
      } else {
        Alert.alert('Not Found', 'No chemical found with that ID.');
      }
    } catch (error) {
      console.error('Search Error:', error.message);
      Alert.alert('Error', 'Could not connect to the server.');
    } finally {
      setLoadingSearch(false);
    }
  };

  // Step 2: Add stock
  const handleAddStock = async () => {
    if (!amount || parseInt(amount) <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid quantity to add.');
      return;
    }

    setLoadingUpdate(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/add-stock`, {
        chemical_id: chemical.chemical_id,
        amount_to_add: parseInt(amount),
      });

      if (response.data.success) {
        Alert.alert('Success', `Added ${amount} to stock for ${chemical.chemical_name}`);
        // Update displayed stock locally
        setChemical(prev => ({ ...prev, stock: (prev.stock || 0) + parseInt(amount) }));
        setAmount('');
      } else {
        Alert.alert('Failed', response.data.message || 'Could not update stock.');
      }
    } catch (error) {
      console.error('Add Stock Error:', error.message);
      Alert.alert('Error', 'Could not connect to the server.');
    } finally {
      setLoadingUpdate(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>➕ Add Stock</Text>

        {/* Step 1: Search */}
        <View style={styles.searchBox}>
          <TextInput
            style={styles.input}
            placeholder="Enter Chemical ID"
            placeholderTextColor="#999"
            value={chemicalId}
            onChangeText={setChemicalId}
            keyboardType="numeric"
          />
          <TouchableOpacity
            style={[styles.searchBtn, loadingSearch && { opacity: 0.6 }]}
            onPress={handleSearch}
            disabled={loadingSearch}
          >
            {loadingSearch
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.searchBtnText}>FIND</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Step 2: Show chemical + add stock */}
        {chemical && (
          <View style={styles.card}>
            <Text style={styles.chemName}>{chemical.chemical_name || 'N/A'}</Text>
            <Text style={styles.chemId}>ID: {chemical.chemical_id}</Text>

            <View style={styles.divider} />

            <View style={styles.stockRow}>
              <Text style={styles.stockLabel}>CURRENT STOCK</Text>
              <Text style={styles.stockValue}>{chemical.stock ?? 'N/A'}</Text>
            </View>

            <View style={styles.divider} />

            {/* Add amount */}
            <Text style={styles.addTitle}>Add Quantity</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="Enter amount to add"
              placeholderTextColor="#999"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />
            <TouchableOpacity
              style={[styles.addBtn, loadingUpdate && { opacity: 0.6 }]}
              onPress={handleAddStock}
              disabled={loadingUpdate}
            >
              {loadingUpdate
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.addBtnText}>+ ADD TO STOCK</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.navigate('Dashboard')}
        >
          <Text style={styles.backBtnText}>BACK TO DASHBOARD</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AddStock;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#d9d6c3' },
  content: { padding: 20 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  searchBox: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  searchBtn: {
    backgroundColor: '#333',
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnText: { color: '#fff', fontWeight: 'bold' },
  card: {
    backgroundColor: '#F2A65A',
    borderRadius: 12,
    padding: 20,
    elevation: 4,
  },
  chemName: { fontSize: 20, fontWeight: 'bold', color: '#000' },
  chemId: { fontSize: 13, color: '#333', marginBottom: 10 },
  divider: { height: 1, backgroundColor: '#00000033', marginVertical: 12 },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockLabel: { fontWeight: 'bold', fontSize: 16, color: '#000' },
  stockValue: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a' },
  addTitle: { fontWeight: 'bold', fontSize: 15, marginBottom: 8, color: '#000' },
  amountInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  addBtn: {
    backgroundColor: '#333',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: 'bold' },
  backBtn: { marginTop: 30, alignItems: 'center' },
  backBtnText: { color: '#555', fontWeight: '600' },
});