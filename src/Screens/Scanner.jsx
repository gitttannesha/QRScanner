import { CameraView, useCameraPermissions } from "expo-camera";
import { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { API_BASE_URL } from '../config/api';

// Added { navigation } prop to prevent "navigation doesn't exist" error
const ScannerScreen = ({ navigation }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [chemical, setChemical] = useState(null);

  // 1. Handle Loading State (Initial phase)
  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Initializing Camera...</Text>
        <TouchableOpacity 
          onPress={requestPermission} 
          style={{ marginTop: 20, padding: 10, backgroundColor: '#ddd' }}
        >
          <Text>Tap here if stuck</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 2. Handle Denied State (User recovery)
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={{ textAlign: 'center', marginBottom: 20 }}>
          Camera access is required to scan QR codes.
        </Text>
        <TouchableOpacity 
          style={styles.button} 
          onPress={requestPermission}
        >
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ data }) => {
    if (scanned) return; 
    setScanned(true);
    
    console.log("Scanned ID:", data);

    try {
      // NOTE: Ensure your computer is still on 192.168.1.4
      const res = await fetch(`${API_BASE_URL}/chemical/${data}`);
      const dataJson = await res.json();

      if (dataJson.success) {
        // Updated to use the prop passed above
        navigation.navigate("ChemicalDetails", { chemical: dataJson.data });
      } else {
        Alert.alert("Not Found", "This chemical ID does not exist in our database.");
        setScanned(false); 
      }
    } catch (err) {
      console.log("API Error:", err);
      Alert.alert("Error", "Could not connect to the server. Check your IP and connection.");
      setScanned(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <CameraView
        style={StyleSheet.absoluteFill}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
      />

      {chemical && (
        <View style={styles.infoBox}>
          <Text style={styles.text}>{chemical.chemical_name}</Text>
          <Text style={styles.text}>Unit: {chemical.unit_measure}</Text>
          <Text style={styles.text}>Type: {chemical.type}</Text>
          <Text style={styles.text}>Supplier: {chemical.supplier_local}</Text>
          
          <TouchableOpacity 
            onPress={() => { setScanned(false); setChemical(null); }}
            style={styles.scanNextBtn}
          >
            <Text style={{color: 'white', textAlign: 'center'}}>Scan Next</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default ScannerScreen;

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },
  infoBox: {
    position: "absolute",
    bottom: 40,
    left: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.8)", // Slight transparency looks better
    padding: 15,
    borderRadius: 10,
  },
  text: {
    color: "white",
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold'
  },
  scanNextBtn: {
    marginTop: 10, 
    backgroundColor: '#444', 
    padding: 10, 
    borderRadius: 5
  }
});