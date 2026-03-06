import axios from 'axios';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE_URL } from '../config/api';

const CurrentStock = ({ navigation }) => {
  const [chemicalId, setChemicalId] = useState('');
  const [chemical, setChemical] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!chemicalId.trim()) {
      Alert.alert('Missing Input', 'Please enter a Chemical ID.');
      return;
    }

    setLoading(true);
    setChemical(null);

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
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>📦 Current Stock</Text>

        {/* Search Box */}
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
            style={[styles.searchBtn, loading && { opacity: 0.6 }]}
            onPress={handleSearch}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.searchBtnText}>SEARCH</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Result Card */}
        {chemical && (
          <View style={styles.card}>
            <Text style={styles.chemName}>{chemical.chemical_name || 'N/A'}</Text>
            <Text style={styles.chemId}>ID: {chemical.chemical_id}</Text>

            <View style={styles.divider} />

            <View style={styles.stockRow}>
              <Text style={styles.stockLabel}>CURRENT STOCK</Text>
              <Text style={styles.stockValue}>{chemical.stock ?? 'N/A'}</Text>
            </View>

            <View style={styles.stockRow}>
              <Text style={styles.label}>Unit</Text>
              <Text style={styles.value}>{chemical.unit_measure || 'N/A'}</Text>
            </View>

            <View style={styles.stockRow}>
              <Text style={styles.label}>Type</Text>
              <Text style={styles.value}>{chemical.type || 'N/A'}</Text>
            </View>

            <View style={styles.stockRow}>
              <Text style={styles.label}>Location</Text>
              <Text style={styles.value}>{chemical.location || 'N/A'}</Text>
            </View>
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

export default CurrentStock;

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
  divider: { height: 1, backgroundColor: '#00000033', marginVertical: 10 },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#17121266',
  },
  stockLabel: { fontWeight: 'bold', fontSize: 16, color: '#000' },
  stockValue: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a' },
  label: { fontWeight: 'bold', color: '#000', fontSize: 13, textTransform: 'uppercase' },
  value: { color: '#000', fontSize: 14, textAlign: 'right', flex: 1, marginLeft: 10 },
  backBtn: { marginTop: 30, alignItems: 'center' },
  backBtnText: { color: '#555', fontWeight: '600' },
});