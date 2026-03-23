
import { CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, Animated, StyleSheet,
  Text, TouchableOpacity, View
} from "react-native";
import { API_BASE_URL } from '../config/api';

const ScannerScreen = ({ navigation }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [statusText, setStatusText] = useState("Align QR code within the frame");

  // Animated scanning line
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(scanLineAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const scanLineTranslate = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-110, 110],
  });

  // ── Loading ──
  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FFD786" />
        <Text style={styles.centerText}>Initializing Camera...</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.permBtn}>
          <Text style={styles.permBtnText}>Tap here if stuck</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Permission denied ──
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.centerText}>Camera access is required to scan QR codes.</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ data }) => {
    if (scanned) return;
    setScanned(true);
    setStatusText("Processing...");
    console.log("Scanned ID:", data);

    try {
      // ── Chemical ──
      if (data.startsWith("CH_")) {
        const chemicalId = data.replace("CH_", "");
        const res = await fetch(`${API_BASE_URL}/chemical/${chemicalId}`);
        const dataJson = await res.json();
        if (dataJson.success) {
          navigation.navigate("ChemicalDetails", { chemical: dataJson.data });
        } else {
          Alert.alert("Not Found", "This chemical ID does not exist in our database.");
          setStatusText("Align QR code within the frame");
          setScanned(false);
        }

      // ── One-Time Consumable ──
      } else if (data.startsWith("CON_OT_")) {
        const itemId = data.replace("CON_OT_", "");
        const res = await fetch(`${API_BASE_URL}/consumable/${itemId}?table=one_time_master_new`);
        const dataJson = await res.json();
        if (dataJson.success) {
          navigation.navigate("ConsumableDetails", {
            consumable: { ...dataJson.data, table: "one_time_master_new" }
          });
        } else {
          Alert.alert("Not Found", "This item does not exist in our database.");
          setStatusText("Align QR code within the frame");
          setScanned(false);
        }

      // ── Reusable ──
      } else if (data.startsWith("CON_RE_")) {
        const itemId = data.replace("CON_RE_", "");
        const res = await fetch(`${API_BASE_URL}/consumable/${itemId}?table=reusables_master_new`);
        const dataJson = await res.json();
        if (dataJson.success) {
          navigation.navigate("ConsumableDetails", {
            consumable: { ...dataJson.data, table: "reusables_master_new" }
          });
        } else {
          Alert.alert("Not Found", "This item does not exist in our database.");
          setStatusText("Align QR code within the frame");
          setScanned(false);
        }

      // ── Unknown ──
    // ── Spare Part ──
      } else if (data.startsWith("SP_")) {
        const itemId = data.replace("SP_", "");
        const res = await fetch(`${API_BASE_URL}/api/sparepart/${itemId}`);
        const dataJson = await res.json();
        if (dataJson.success) {
          navigation.navigate("SparePartDetails", { sparePart: dataJson.data });
        } else {
          Alert.alert("Not Found", "This spare part does not exist in our database.");
          setStatusText("Align QR code within the frame");
          setScanned(false);
        }

      // ── Unknown ──
      } else {
        Alert.alert("Unknown QR", "This QR code is not recognized.");
        setStatusText("Align QR code within the frame");
        setScanned(false);
      }

    } catch (err) {
      console.log("API Error:", err);
      Alert.alert("Error", "Could not connect to the server.");
      setStatusText("Align QR code within the frame");
      setScanned(false);
    }
  };

  return (
    <View style={styles.container}>

      {/* ── Full screen camera ── */}
      <CameraView
        style={StyleSheet.absoluteFill}
        enableTorch={torchOn}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      />

      {/* ── Top overlay ── */}
      <View style={styles.overlayTop}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan QR Code</Text>
          <TouchableOpacity onPress={() => setTorchOn(!torchOn)} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>{torchOn ? "🔦" : "💡"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Middle row: dark | clear frame | dark ── */}
      <View style={styles.middleRow}>
        <View style={styles.overlaySide} />

        {/* Scan Frame */}
        <View style={styles.scanFrame}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
          <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanLineTranslate }] }]} />
        </View>

        <View style={styles.overlaySide} />
      </View>

      {/* ── Bottom overlay ── */}
      <View style={styles.overlayBottom}>
        <Text style={styles.statusText}>{statusText}</Text>
        <Text style={styles.hintText}>Supports: Chemical · One-Time · Reusable . Spare Part</Text>
      </View>

    </View>
  );
};

export default ScannerScreen;

const FRAME_SIZE   = 240;
const CORNER_SIZE  = 24;
const CORNER_WIDTH = 4;
const CORNER_COLOR = "#FFD786";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // Permission screens
  center:       { flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: '#1A3C6E' },
  centerText:   { color: '#fff', textAlign: 'center', marginBottom: 20, fontSize: 15 },
  permBtn:      { backgroundColor: '#FFD786', padding: 14, borderRadius: 8, marginTop: 10 },
  permBtnText:  { color: '#1A3C6E', fontWeight: 'bold', fontSize: 14 },

  // Overlays
  overlayTop:    { backgroundColor: 'rgba(0,0,0,0.6)' },
  middleRow:     { flexDirection: 'row', alignItems: 'center' },
  overlaySide:   { flex: 1, height: FRAME_SIZE, backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', paddingTop: 30, gap: 10 },

  // Header
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 52, paddingBottom: 20 },
  headerTitle:   { color: '#fff', fontSize: 18, fontWeight: '600', letterSpacing: 0.5 },
  headerBtn:     { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerBtnText: { fontSize: 16 },

  // Scan frame
  scanFrame: { width: FRAME_SIZE, height: FRAME_SIZE, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },

  // Corner brackets
  corner:    { position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE },
  cornerTL:  { top: 0,    left: 0,  borderTopWidth: CORNER_WIDTH,    borderLeftWidth: CORNER_WIDTH,  borderColor: CORNER_COLOR, borderTopLeftRadius: 4 },
  cornerTR:  { top: 0,    right: 0, borderTopWidth: CORNER_WIDTH,    borderRightWidth: CORNER_WIDTH, borderColor: CORNER_COLOR, borderTopRightRadius: 4 },
  cornerBL:  { bottom: 0, left: 0,  borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH,  borderColor: CORNER_COLOR, borderBottomLeftRadius: 4 },
  cornerBR:  { bottom: 0, right: 0, borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH, borderColor: CORNER_COLOR, borderBottomRightRadius: 4 },

  // Animated scan line
  scanLine: { width: FRAME_SIZE - 20, height: 2, backgroundColor: CORNER_COLOR, opacity: 0.85, shadowColor: CORNER_COLOR, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 6, elevation: 5 },

  // Bottom text
  statusText: { color: '#fff', fontSize: 15, fontWeight: '500', textAlign: 'center' },
  hintText:   { color: 'rgba(255,255,255,0.45)', fontSize: 12, textAlign: 'center' },
});