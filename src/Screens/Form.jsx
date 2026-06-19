import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Audio } from "expo-av";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from "expo-image-picker";
import * as Print from "expo-print";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { postRequestFormData } from "../services/authservice";
import Header from "./Header";

const NAVY = "#1A3C6E";
const AMBER = "#E8A020";
const MAX_PDF_SIZE_BYTES = 500 * 1024; // ✅ 500KB — checked on final PDF only

const STATUS_OPTIONS = [
  { label: "Pending", value: 0 },
  { label: "In Process", value: 1 },
  { label: "Closed", value: 2 },
  { label: "On Hold", value: 3 },
];

const Form = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const complaint = route.params?.complaint;
  const complaintId = complaint?.complaint_id;

  const [diagnosis, setDiagnosis] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [expectedDate, setExpectedDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pdfSize, setPdfSize] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [pdfUri, setPdfUri] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [activeMic, setActiveMic] = useState(null);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  const formatDate = (date) => {
    if (!date) return "DD-MM-YYYY";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatDateForDB = (date) => {
    if (!date) return null;
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  };

  const formatSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleDateChange = (event, date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (date) {
      setExpectedDate(date);
    }
  };

  const handleCamera = async () => {
    Alert.alert(
      "Add Photo",
      "",
      [
        {
          text: "Take Photo",
          onPress: async () => {
            let permission = cameraPermission;
            if (!permission?.granted) {
              permission = await requestCameraPermission();
            }
            if (!permission.granted) {
              Alert.alert("Permission Required", "Camera permission is required.");
              return;
            }
            setShowCamera(true);
          },
        },
        {
          text: "upload from Gallery",
          onPress: handleGalleryPick,
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  };

  // ✅ generatePdf checks final PDF size and returns true/false
  const generatePdf = async (photoList) => {
    setGeneratingPdf(true);
    try {
      const imagePages = await Promise.all(
        photoList.map(async (photo, index) => {
          const compressed = await ImageManipulator.manipulateAsync(
            photo.uri,
            [{ resize: { width: 1000 } }],
            { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
          );
          const base64 = await FileSystem.readAsStringAsync(compressed.uri, {
            encoding: "base64",
          });
          const pageBreak = index < photoList.length - 1 ? "page-break-after: always;" : "";
          return `
            <div class="page" style="${pageBreak}">
              <img src="data:image/jpeg;base64,${base64}" />
            </div>
          `;
        })
      );

      const html = `
        <!DOCTYPE html><html><head>
        <style>
          @page { margin: 0; size: A4; }
          html, body { margin: 0; padding: 0; }
          .page { width: 100%; height: 100vh; display: flex; align-items: center; justify-content: center; }
          img { max-width: 100%; max-height: 100%; object-fit: contain; }
        </style></head><body>${imagePages.join("")}</body></html>
      `;

      const result = await Print.printToFileAsync({ html });
      const pdfInfo = await FileSystem.getInfoAsync(result.uri);

      // ✅ Alert and block if PDF exceeds 500KB
      if (pdfInfo.size > MAX_PDF_SIZE_BYTES) {
        Alert.alert(
          "PDF Too Large",
          ` File Limit exceded, only 500 KB max limit allowed.`
        );
        setPdfUri(null);
        setPdfSize(null);
        return false;
      }

      setPdfUri(result.uri);
      setPdfSize(pdfInfo.size);
      return true;
    } catch (error) {
      console.log("PDF generation error:", error);
      Alert.alert("Error", "Could not create PDF.");
      return false;
    } finally {
      setGeneratingPdf(false);
    }
  };

  // ✅ No individual size check, no MAX_PHOTOS limit
  const handleGalleryPick = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Gallery permission is required.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (result.canceled) return;

    try {
      const compressed = await Promise.all(
        result.assets.map(async (asset) => {
          const comp = await ImageManipulator.manipulateAsync(
            asset.uri,
            [{ resize: { width: 1000 } }],
            { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
          );
          const fileInfo = await FileSystem.getInfoAsync(comp.uri);
          return { uri: comp.uri, size: fileInfo.size };
        })
      );

      const newPhotos = [...photos, ...compressed];
      setPdfUri(null);
      setPhotos(newPhotos);

      if (newPhotos.length > 1) {
        await generatePdf(newPhotos);
      }
    } catch (error) {
      console.log("Gallery pick error:", error);
      Alert.alert("Error", "Could not process selected images.");
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;

    try {
      const captured = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        shutterSound: false,
      });

      const fileInfo = await FileSystem.getInfoAsync(captured.uri);

      setPdfUri(null);
      setPhotos((previous) => [
        ...previous,
        { uri: captured.uri, size: fileInfo.size },
      ]);
    } catch (error) {
      console.log("Photo capture error:", error);
      Alert.alert("Error", "Could not capture photo.");
    }
  };

    const removePhoto = (index) => {
      const updated = photos.filter((_, photoIndex) => photoIndex !== index);
      setPhotos(updated);
      setPdfUri(null);
      setPdfSize(null);

      if (updated.length > 1) {
        generatePdf(updated); // no await, no async on removePhoto
      }
    };

  const closeCameraAndDiscard = () => {
    setShowCamera(false);
    setPhotos([]);
    setPdfUri(null);
  };

  const clearPhotos = () => {
    setPhotos([]);
    setPdfUri(null);
    setPdfSize(null);
  };

  // ✅ Fixed: generates PDF once, closes camera, no duplicate block
  const finishPhotos = async () => {
    if (photos.length === 0) {
      setShowCamera(false);
      return;
    }

    if (photos.length === 1) {
      setPdfUri(null);
      setShowCamera(false);
      return;
    }

    await generatePdf(photos);
    setShowCamera(false);
  };

  // ✅ Fixed: handleSubmit is now properly outside finishPhotos
  const handleSubmit = async () => {
    if (!complaintId) {
      Alert.alert("Error", "Complaint details are missing.");
      return;
    }

    if (!diagnosis.trim()) {
      Alert.alert("Missing Field", "Enter a diagnosis.");
      return;
    }

    if (!actionTaken.trim()) {
      Alert.alert("Missing Field", "Enter action taken.");
      return;
    }

    if (selectedStatus === null) {
      Alert.alert("Missing Field", "Select a complaint status.");
      return;
    }

    // ✅ Block submit if single photo exceeds 500KB
    if (photos.length === 1 && photos[0].size > MAX_PDF_SIZE_BYTES) {
      Alert.alert(
        "Photo Too Large",
        `The photo is ${formatSize(photos[0].size)}, which exceeds the 500 KB limit. Please choose a smaller photo.`
      );
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append("complaint_id", String(complaintId));
      formData.append("diagnosis", diagnosis.trim());
      formData.append("action_taken", actionTaken.trim());
      formData.append("expected_completion_date", formatDateForDB(expectedDate));
      formData.append("status", String(selectedStatus));

      if (photos.length === 1) {
        formData.append("file", {
          uri: photos[0].uri,
          type: "image/jpeg",
          name: `upload.jpg`,
        });
      } else if (photos.length > 1 && pdfUri) {
        formData.append("file", {
          uri: pdfUri,
          type: "application/pdf",
          name: `upload.pdf`,
        });
      }

      const response = await postRequestFormData("/complaints/action", formData);

      if (response.data.success) {
        Alert.alert("Success", "Action submitted successfully.", [
          { text: "OK", onPress: () => navigation.navigate("Troubleshooting", { highlightId: complaintId }) },
        ]);
      } else {
        Alert.alert("Error", response.data.message || "Something went wrong.");
      }
    } catch (error) {
      console.log("Form submit error:", error?.response?.data || error);
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Failed to submit. Please try again.";
      Alert.alert("Error", message);
    } finally {
      setSubmitting(false);
    }
  };

  const startRecording = async (field) => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission Required", "Microphone permission is needed.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
      setActiveMic(field);
    } catch (error) {
      console.log("Recording start error:", error);
      Alert.alert("Error", "Could not start recording.");
    }
  };

  const stopRecordingAndTranscribe = async () => {
    try {
      if (!recording) return;

      setIsRecording(false);
      setTranscribing(true);

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      const formData = new FormData();
      formData.append("audio", {
        uri,
        type: "audio/wav",
        name: "recording.wav",
      });

      const response = await postRequestFormData("/complaints/transcribe", formData);
      const data = response.data;

      if (data.success) {
        if (activeMic === "diagnosis") {
          setDiagnosis((previous) => (previous + " " + data.transcript).trim());
        } else {
          setActionTaken((previous) => (previous + " " + data.transcript).trim());
        }
      } else {
        Alert.alert("Error", data.message || "Transcription failed.");
      }
    } catch (error) {
      console.log("Transcription error:", error);
      Alert.alert("Error", "Could not transcribe audio.");
    } finally {
      setTranscribing(false);
      setActiveMic(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header showProfile={true} />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>Form</Text>
            <Text style={styles.subtitle}># {complaintId} </Text>
          </View>
        </View>

        <View style={styles.fieldBlock}>
          <View style={styles.fieldHeader}>
            <Text style={styles.label}>
              Diagnosis
              <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={[styles.micBtn, activeMic === "diagnosis" && { backgroundColor: "red" }]}
              onPress={() => isRecording ? stopRecordingAndTranscribe() : startRecording("diagnosis")}
              disabled={transcribing || (isRecording && activeMic !== "diagnosis")}
            >
              {transcribing && activeMic === "diagnosis" ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons
                  name={isRecording && activeMic === "diagnosis" ? "stop" : "mic"}
                  size={16}
                  color="#fff"
                />
              )}
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.textArea}
            placeholder="Describe the diagnosis...."
            placeholderTextColor="#aaa"
            multiline
            maxLength={800}
            value={diagnosis}
            onChangeText={setDiagnosis}
            onBlur={() => {
              if (diagnosis.trim().length > 0 && diagnosis.trim().length < 100) {
                Alert.alert("Too Short", `Diagnosis should be atleast 100 characters. `);
              }
            }}
          />
          <Text style={styles.charCount}>{diagnosis.length}/800</Text>
          {diagnosis.length > 0 && diagnosis.length < 100 && (
            <Text style={styles.hintText}>Minimum 100 characters required</Text>
          )}
        </View>

        <View style={styles.fieldBlock}>
          <View style={styles.fieldHeader}>
            <Text style={styles.label}>
              Action Taken
              <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={[styles.micBtn, activeMic === "action" && { backgroundColor: "red" }]}
              onPress={() => isRecording ? stopRecordingAndTranscribe() : startRecording("action")}
              disabled={transcribing || (isRecording && activeMic !== "action")}
            >
              {transcribing && activeMic === "action" ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons
                  name={isRecording && activeMic === "action" ? "stop" : "mic"}
                  size={16}
                  color="#fff"
                />
              )}
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.textArea}
            placeholder="Describe the action taken..."
            placeholderTextColor="#aaa"
            multiline
            maxLength={800}
            value={actionTaken}
            onChangeText={setActionTaken}
            onBlur={() => {
              if (actionTaken.trim().length > 0 && actionTaken.trim().length < 100) {
                Alert.alert("Too Short", `Action taken should be atleast 100 characters.`);
              }
            }}
          />
          <Text style={styles.charCount}>{actionTaken.length}/800</Text>
          {actionTaken.length > 0 && actionTaken.length < 100 && (
            <Text style={styles.hintText}>Minimum 100 characters required</Text>
          )}

          <TouchableOpacity style={styles.cameraBtn} onPress={handleCamera}>
            <Ionicons name="camera" size={20} color={NAVY} />
          </TouchableOpacity>

          {photos.length > 0 && !showCamera && (
            <View style={styles.uploadReadyBox}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ maxHeight: 70, marginBottom: 8 }}
              >
                {photos.map((photo, index) => (
                  <View
                    key={`${photo.uri}-${index}`}
                    style={{ marginRight: 8, position: "relative" }}
                  >
                    <TouchableOpacity
                      onPress={() => { setPreviewIndex(index); setPreviewVisible(true); }}
                    >
                      <Image
                        source={{ uri: photo.uri }}
                        style={{ width: 55, height: 55, borderRadius: 6, borderWidth: 1.5, borderColor: NAVY }}
                      />
                    </TouchableOpacity>
                    <View style={{
                      position: "absolute", bottom: 2, left: 2,
                      backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 4, paddingHorizontal: 3,
                    }}>
                      <Text style={{ color: "#fff", fontSize: 9 }}>{index + 1}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => removePhoto(index)}
                      style={{
                        position: "absolute", top: -6, right: -6,
                        backgroundColor: "#c0392b", borderRadius: 10,
                        width: 18, height: 18, alignItems: "center", justifyContent: "center", zIndex: 10,
                      }}
                    >
                      <Ionicons name="close" size={11} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>

              <View style={{ flexDirection: "row", alignItems: "center", width: "100%" }}>
                {generatingPdf ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <ActivityIndicator size="small" color={NAVY} />
                    <Text style={{ fontSize: 12, color: NAVY }}>Generating PDF...</Text>
                  </View>
                ) : (
                  <Text style={styles.uploadReadyText}>
                    {photos.length === 1
                      ? `📎 ${formatSize(photos[0].size)}`
                      : pdfUri
                        ? `📄 PDF · ${photos.length} pages · ${formatSize(pdfSize)}`
                        : `${photos.length} photos selected`}
                  </Text>
                )}
                <TouchableOpacity
                  style={[styles.removePhoto, { marginLeft: "auto" }]}
                  onPress={clearPhotos}
                >
                  <Text style={styles.removePhotoText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <View style={styles.fieldBlock}>
          <Text style={styles.label}>
            Expected Completion Date 
          </Text>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
            <Text style={[styles.dateBtnText, !expectedDate && styles.placeholderText]}>
              {formatDate(expectedDate)}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={expectedDate || new Date()}
              mode="date"
              display="default"
              minimumDate={new Date()}
              onChange={handleDateChange}
            />
          )}
        </View>

        <View style={styles.fieldBlock}>
          <Text style={styles.label}>
            Complaint Status <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={styles.dropdownBtn}
            onPress={() => setDropdownOpen((open) => !open)}
          >
            <Text style={styles.dropdownBtnText}>
              {selectedStatus !== null
                ? STATUS_OPTIONS.find((option) => option.value === selectedStatus)?.label
                : "Select Status..."}
            </Text>
            <Text style={styles.dropdownArrow}>{dropdownOpen ? "▲" : "▼"}</Text>
          </TouchableOpacity>

          {dropdownOpen && (
            <View style={styles.dropdownList}>
              {STATUS_OPTIONS.map((option, index) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.dropdownOption,
                    selectedStatus === option.value && styles.dropdownOptionActive,
                  ]}
                  onPress={() => {
                    setSelectedStatus(option.value);
                    setDropdownOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownOptionText,
                      selectedStatus === option.value && styles.dropdownOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Submit</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← GO BACK</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpace} />
      </ScrollView>

      {showCamera && (
        <View style={StyleSheet.absoluteFillObject}>
          <CameraView style={styles.cameraView} ref={cameraRef} facing="back" mute={true} />

          {photos.length > 0 && (
            <ScrollView
              horizontal
              style={styles.thumbnailStrip}
              showsHorizontalScrollIndicator={false}
            >
              {photos.map((photo, index) => (
                <View key={`${photo.uri}-${index}`} style={styles.thumbnailWrapper}>
                  <TouchableOpacity onPress={() => { setPreviewIndex(index); setPreviewVisible(true); }}>
                    <Image source={{ uri: photo.uri }} style={styles.thumbnail} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.thumbnailRemove} onPress={() => removePhoto(index)}>
                    <Ionicons name="close" size={10} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          <View style={styles.cameraControls}>
            <TouchableOpacity onPress={closeCameraAndDiscard} style={styles.cameraBtnCancel}>
              <Ionicons name="close" size={26} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity onPress={takePicture} style={styles.cameraBtnCapture}>
              <View style={styles.shutterInner} />
            </TouchableOpacity>

            {photos.length > 0 && (
              <TouchableOpacity
                onPress={finishPhotos}
                style={styles.cameraBtnDone}
                disabled={generatingPdf}
              >
                {generatingPdf ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons name="checkmark" size={26} color="#fff" />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <Modal
        visible={previewVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewVisible(false)}
      >
        <View style={styles.previewOverlay}>
          <TouchableOpacity style={styles.previewClose} onPress={() => setPreviewVisible(false)}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.previewCounter}>
            {previewIndex + 1} / {photos.length}
          </Text>

          <Image
            source={{ uri: photos[previewIndex]?.uri }}
            style={styles.previewImage}
            resizeMode="contain"
          />

          {photos.length > 1 && (
            <View style={styles.previewNavRow}>
              <TouchableOpacity
                style={[styles.previewNavBtn, previewIndex === 0 && { opacity: 0.3 }]}
                onPress={() => setPreviewIndex((i) => Math.max(0, i - 1))}
                disabled={previewIndex === 0}
              >
                <Ionicons name="chevron-back" size={28} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.previewNavBtn, previewIndex === photos.length - 1 && { opacity: 0.3 }]}
                onPress={() => setPreviewIndex((i) => Math.min(photos.length - 1, i + 1))}
                disabled={previewIndex === photos.length - 1}
              >
                <Ionicons name="chevron-forward" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Form;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f2f5fa" },
  scroll: { flex: 1 },
  titleRow: {
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  title: { fontSize: 22, fontWeight: "800", color: NAVY },
  subtitle: { fontSize: 15, color: NAVY, marginTop: 2, fontWeight: "700" },
  hintText: { fontSize: 11, color: "#c0392b", marginTop: 3 },
  fieldBlock: {
    marginHorizontal: 16, marginBottom: 16, backgroundColor: "#fff",
    borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: "#e0e6f0", elevation: 1,
  },
  fieldHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8,
  },
  label: {
    fontSize: 12, fontWeight: "700", color: "#555",
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8,
  },
  required: { color: "#c0392b" },
  textArea: { fontSize: 14, color: "#333", minHeight: 90, textAlignVertical: "top", lineHeight: 20 },
  charCount: { fontSize: 11, color: "#999", textAlign: "right", marginTop: 4 },
  featureNote: { color: "#999", fontSize: 11, marginTop: 6 },
  micBtn: { backgroundColor: NAVY, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  previewOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", alignItems: "center", justifyContent: "center" },
  previewClose: {
    position: "absolute", top: 50, right: 20, zIndex: 10,
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 20, padding: 8,
  },
  previewCounter: { position: "absolute", top: 58, alignSelf: "center", color: "#fff", fontWeight: "700", fontSize: 15, zIndex: 10 },
  previewImage: { width: "100%", height: "80%" },
  previewNavRow: { position: "absolute", bottom: 60, flexDirection: "row", gap: 40 },
  previewNavBtn: { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 30, padding: 12 },
  disabledButton: { opacity: 0.6 },
  cameraBtn: { marginTop: 12, backgroundColor: "#EEF2FB", borderRadius: 8, padding: 10, alignSelf: "flex-start" },
  cameraBtnText: { color: NAVY, fontSize: 13, fontWeight: "700" },
  uploadReadyBox: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  uploadReadyText: { fontSize: 12, color: "#27ae60", fontWeight: "600" },
  removePhoto: { backgroundColor: "#fdecea", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, marginLeft: "auto" },
  removePhotoText: { color: "#c0392b", fontSize: 12, fontWeight: "600" },
  dateBtn: { backgroundColor: "#EEF2FB", borderRadius: 8, paddingVertical: 12, paddingHorizontal: 14 },
  dateBtnText: { fontSize: 14, color: NAVY, fontWeight: "600" },
  placeholderText: { color: "#aaa" },
  dropdownBtn: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#EEF2FB", borderRadius: 8, paddingVertical: 12, paddingHorizontal: 14,
    borderWidth: 1, borderColor: "#d0d8ea",
  },
  dropdownBtnText: { fontSize: 14, color: NAVY, fontWeight: "600" },
  dropdownArrow: { fontSize: 12, color: NAVY },
  dropdownList: { marginTop: 6, borderRadius: 8, borderWidth: 1, borderColor: "#d0d8ea", overflow: "hidden" },
  dropdownOption: {
    paddingVertical: 12, paddingHorizontal: 14,
    backgroundColor: "#fff", borderBottomWidth: 0.5, borderBottomColor: "#e0e6f0",
  },
  dropdownOptionActive: { backgroundColor: NAVY },
  dropdownOptionText: { fontSize: 14, color: "#333", fontWeight: "500" },
  dropdownOptionTextActive: { color: AMBER, fontWeight: "700" },
  submitBtn: {
    backgroundColor: NAVY, marginHorizontal: 16, borderRadius: 10,
    paddingVertical: 14, alignItems: "center", marginBottom: 12,
  },
  submitBtnText: { color: AMBER, fontWeight: "700", fontSize: 16 },
  backBtn: { alignItems: "center", marginBottom: 10 },
  backBtnText: { color: NAVY, fontWeight: "600", fontSize: 14 },
  bottomSpace: { height: 40 },
  cameraView: { flex: 1 },
  thumbnailStrip: { position: "absolute", bottom: 130, left: 0, right: 0, paddingHorizontal: 10 },
  thumbnailWrapper: { position: "relative", marginRight: 10 },
  thumbnail: { width: 62, height: 62, borderRadius: 6, borderWidth: 2, borderColor: AMBER },
  thumbnailRemove: {
    position: "absolute", top: -6, right: -6, backgroundColor: "#c0392b",
    borderRadius: 10, width: 18, height: 18, alignItems: "center", justifyContent: "center",
  },
  cameraControls: {
    position: "absolute", bottom: 0, width: "100%", height: 120,
    flexDirection: "row", justifyContent: "space-around", alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.55)", paddingBottom: 20,
  },
  cameraBtnCancel: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center", borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)", marginHorizontal: 30,
  },
  cameraBtnCapture: {
    width: 76, height: 76, borderRadius: 38, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: "rgba(255,255,255,0.5)",
  },
  shutterInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: "#fff", borderWidth: 2, borderColor: "#ddd" },
  cameraBtnDone: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: "#27ae60",
    alignItems: "center", justifyContent: "center", marginHorizontal: 30,
  },
});



