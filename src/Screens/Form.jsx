import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Audio } from "expo-av";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from 'expo-image-manipulator';
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
const MAX_PHOTO_SIZE_MB = 5;
const MAX_PHOTO_SIZE_BYTES = MAX_PHOTO_SIZE_MB * 1024 * 1024;
const MAX_PHOTOS = 10;

const STATUS_OPTIONS = [
  { label: "Pending", value: 0 },
  { label: "In Process", value: 1 },
  { label: "Closed", value: 2 },
  { label: "On Hold", value: 3 },
];

const PLACEHOLDERS = {
  en: {
    diagnosis: "Describe the diagnosis...",
    action: "Describe the action taken...",
    expectedDate: "Expected Completion Date",
    complaintStatus: "Complaint Status",
    selectStatus: "Select Status...",
    statusOptions: ["Pending", "In Process", "Closed", "On Hold"],
    
  },
  mr: {
    diagnosis: "निदान वर्णन करा...",
    action: "केलेली कारवाई वर्णन करा...",
   
  },
  hi: {
    diagnosis: "निदान का वर्णन करें...",
    action: "की गई कार्रवाई का वर्णन करें...",
   
  },
};

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
  const [selectedLanguage, setSelectedLanguage] = useState("en");
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
    let permission = cameraPermission;

    if (!permission?.granted) {
      permission = await requestCameraPermission();
    }

    if (!permission.granted) {
      Alert.alert(
        "Permission Required",
        "Camera permission is required to take photos."
      );
      return;
    }

    setShowCamera(true);
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;

    if (photos.length >= MAX_PHOTOS) {
      Alert.alert("Limit Reached", `Maximum ${MAX_PHOTOS} photos allowed.`);
      return;
    }

    try {
      const captured = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        shutterSound: false,
      });

      const fileInfo = await FileSystem.getInfoAsync(captured.uri);

      if (fileInfo.size > MAX_PHOTO_SIZE_BYTES) {
        const sizeMB = (fileInfo.size / (1024 * 1024)).toFixed(2);

        Alert.alert(
          "Photo Too Large",
          `${sizeMB} MB - maximum allowed size is ${MAX_PHOTO_SIZE_MB} MB.`
        );
        return;
      }

      setPdfUri(null);
      setPhotos((previous) => [
        ...previous,
        {
          uri: captured.uri,
          size: fileInfo.size,
        },
      ]);
    } catch (error) {
      console.log("Photo capture error:", error);
      Alert.alert("Error", "Could not capture photo.");
    }
  };

  const removePhoto = (index) => {
    setPdfUri(null);
    setPhotos((previous) =>
      previous.filter((_, photoIndex) => photoIndex !== index)
    );
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

  setGeneratingPdf(true);

  try {
    const imagePages = await Promise.all(
      photos.map(async (photo, index) => {

        // ✅ Compress before embedding
        const compressed = await ImageManipulator.manipulateAsync(
          photo.uri,
          [{ resize: { width: 1000 } }],
          { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
        );

        const base64 = await FileSystem.readAsStringAsync(compressed.uri, {
          encoding: "base64",
        });

        const pageBreak =
          index < photos.length - 1 ? "page-break-after: always;" : "";

        return `
          <div class="page" style="${pageBreak}">
            <img src="data:image/jpeg;base64,${base64}" />
          </div>
        `;
      })
    );

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
              @page {
                margin: 0;
                size: A4;
              }

              html, body {
                margin: 0;
                padding: 0;
              }

              .page {
                width: 100%;
                height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
              }

              img {
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
              }
            </style>
          </head>
          <body>
            ${imagePages.join("")}
          </body>
        </html>
      `;

      const result = await Print.printToFileAsync({ html });

//Get PDF file size
const pdfInfo = await FileSystem.getInfoAsync(result.uri);

setPdfUri(result.uri);
setPdfSize(pdfInfo.size); //store the size
setShowCamera(false);

Alert.alert("Done", `${photos.length} images saved as PDF (${formatSize(pdfInfo.size)})`);
} catch (error) {
  console.log("PDF generation error:", error);
  Alert.alert("Error", "Could not create PDF from the selected photos.");
} finally {
  setGeneratingPdf(false);
}
};

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

  
    if (!expectedDate) {
      Alert.alert("Missing Field", "Select an expected completion date.");
      return;
    }

    if (selectedStatus === null) {
      Alert.alert("Missing Field", "Select a complaint status.");
      return;
    }

    if (photos.length > 1 && !pdfUri) {
      Alert.alert(
        "Photos Not Ready",
        "Open the camera and tap Done to create the PDF before submitting."
      );
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();

      formData.append("complaint_id", String(complaintId));
      formData.append("diagnosis", diagnosis.trim());
      formData.append("action_taken", actionTaken.trim());
      formData.append(
        "expected_completion_date",
        formatDateForDB(expectedDate)
      );
      formData.append("status", String(selectedStatus));

      if (photos.length === 1) {
        formData.append("file", {
          uri: photos[0].uri,
          type: "image/jpeg",
          name: `${complaintId}.jpg`,
        });
      } else if (photos.length > 1 && pdfUri) {
        formData.append("file", {
          uri: pdfUri,
          type: "application/pdf",
          name: `${complaintId}.pdf`,
        });
      }

      const response = await postRequestFormData(
        "/complaints/action",
        formData
      );

      if (response.data.success) {
        Alert.alert("Success", "Action submitted successfully.", [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        Alert.alert(
          "Error",
          response.data.message || "Something went wrong."
        );
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
    // Ask for mic permission
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
    setActiveMic(field); // which field is being recorded
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

    // Send audio to YOUR backend
    const formData = new FormData();
    formData.append("audio", {
      uri,
      type: "audio/wav",
      name: "recording.wav",
    });

    const response = await postRequestFormData("/complaints/transcribe", formData);
    const data = response.data;

    

    if (data.success) {
      // Put text into the right field
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

        <View style={styles.toggleBox}>
          {[
            { label: "EN", value: "en" },
            { label: "M", value: "mr" },
            { label: "H", value: "hi" },
          ].map((language, index) => (
            <View key={language.value} style={styles.languageContainer}>
              {index > 0 && <View style={styles.toggleDivider} />}
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  selectedLanguage === language.value && styles.toggleBtnActive,
                ]}
                onPress={() => setSelectedLanguage(language.value)}
              >
                <Text
                  style={[
                    styles.toggleText,
                    selectedLanguage === language.value && styles.toggleTextActive,
                  ]}
                >
                  {language.label}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.fieldBlock}>
        <View style={styles.fieldHeader}>
          <Text style={styles.label}>
            {selectedLanguage === "mr" ? "निदान" : selectedLanguage === "hi" ? "निदान" : "Diagnosis"}
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
          placeholder={PLACEHOLDERS[selectedLanguage].diagnosis}
          placeholderTextColor="#aaa"
          multiline
          maxLength={300}
          value={diagnosis}
          onChangeText={setDiagnosis}
          onBlur={() => {
            if (diagnosis.trim().length > 0 && diagnosis.trim().length < 100) {
              Alert.alert("Too Short", `Diagnosis should be atleast 100 characters. `);
            }
          }}
        />
        <Text style={styles.charCount}>{diagnosis.length}/300</Text>
        {diagnosis.length > 0 && diagnosis.length < 100 && (
          <Text style={styles.hintText}>Minimum 100 characters required</Text>
          )}
      </View>

      <View style={styles.fieldBlock}>
        <View style={styles.fieldHeader}>
          <Text style={styles.label}>
            {selectedLanguage === "mr" ? "केलेली कारवाई" : selectedLanguage === "hi" ? "की गई कार्रवाई" : "Action Taken"}
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
          placeholder={PLACEHOLDERS[selectedLanguage].action}
          placeholderTextColor="#aaa"
          multiline
          maxLength={300}
          value={actionTaken}
          onChangeText={setActionTaken}
          onBlur={() => {
            if (actionTaken.trim().length > 0 && actionTaken.trim().length < 100) {
              Alert.alert("Too Short", `Action taken should be atleast 100 characters.`);
            }
          }}
        />
        <Text style={styles.charCount}>{actionTaken.length}/300</Text>
        {actionTaken.length > 0 && actionTaken.length < 100 && (
          <Text style={styles.hintText}>Minimum 100 characters required</Text>
        )}

        <TouchableOpacity style={styles.cameraBtn} onPress={handleCamera}>
          <Ionicons name="camera" size={20} color={NAVY} />
        </TouchableOpacity>

        {photos.length > 0 && !showCamera && (
          <View style={styles.uploadReadyBox}>
            <Text style={styles.uploadReadyText}>
              {photos.length === 1
                ? `File Size -${formatSize(photos[0].size)}`
                : pdfUri
                  ? `File Size -${formatSize(pdfSize)}`
                  : `${photos.length} photos selected`}
            </Text>
            <TouchableOpacity style={styles.removePhoto} onPress={clearPhotos}>
              <Text style={styles.removePhotoText}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.fieldBlock}>
        <Text style={styles.label}>
          Expected Completion Date <Text style={styles.required}>*</Text>
        </Text>
        <TouchableOpacity
          style={styles.dateBtn}
          onPress={() => setShowDatePicker(true)}
        >
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

        <View style={styles.cameraTopBar}>
          <View style={styles.photoCountBadge}>
            <Text style={styles.photoCountText}>
              {photos.length}/{MAX_PHOTOS}
            </Text>
          </View>
        </View>

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
                <TouchableOpacity
                  style={styles.thumbnailRemove}
                  onPress={() => removePhoto(index)}
                >
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

  {/* ── Full Screen Preview Modal ── */}
<Modal
  visible={previewVisible}
  transparent={true}
  animationType="fade"
  onRequestClose={() => setPreviewVisible(false)}
>
  <View style={styles.previewOverlay}>

    {/* Close Button */}
    <TouchableOpacity
      style={styles.previewClose}
      onPress={() => setPreviewVisible(false)}
    >
      <Ionicons name="close" size={28} color="#fff" />
    </TouchableOpacity>

    {/* Photo Counter */}
    <Text style={styles.previewCounter}>
      {previewIndex + 1} / {photos.length}
    </Text>

    {/* Main Image */}
    <Image
      source={{ uri: photos[previewIndex]?.uri }}
      style={styles.previewImage}
      resizeMode="contain"
    />

    {/* Prev / Next Arrows */}
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

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f2f5fa",
  },
  scroll: {
    flex: 1,
  },
  titleRow: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: NAVY,
  },
  subtitle: {
    fontSize: 15,
    color: NAVY,
    marginTop: 2,
    fontWeight: "700",
  },
  toggleBox: {
    flexDirection: "row",
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: NAVY,
    overflow: "hidden",
    backgroundColor: "#EEF2FB",
  },
  languageContainer: {
    flexDirection: "row",
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#EEF2FB",
  },
  toggleBtnActive: {
    backgroundColor: NAVY,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: "700",
    color: NAVY,
  },
  toggleTextActive: {
    color: AMBER,
  },
  toggleDivider: {
    width: 1,
    backgroundColor: NAVY,
  },
  hintText: {
  fontSize: 11,
  color: "#c0392b",
  marginTop: 3,
},
  fieldBlock: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 0.5,
    borderColor: "#e0e6f0",
    elevation: 1,
  },
  fieldHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#555",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  required: {
    color: "#c0392b",
  },
  textArea: {
    fontSize: 14,
    color: "#333",
    minHeight: 90,
    textAlignVertical: "top",
    lineHeight: 20,
  },
  charCount: {
    fontSize: 11,
    color: "#999",
    textAlign: "right",
    marginTop: 4,
  },
  featureNote: {
    color: "#999",
    fontSize: 11,
    marginTop: 6,
  },
  micBtn: {
    backgroundColor: NAVY,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  previewOverlay: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.95)",
  alignItems: "center",
  justifyContent: "center",
},
previewClose: {
  position: "absolute",
  top: 50,
  right: 20,
  zIndex: 10,
  backgroundColor: "rgba(255,255,255,0.15)",
  borderRadius: 20,
  padding: 8,
},
previewCounter: {
  position: "absolute",
  top: 58,
  alignSelf: "center",
  color: "#fff",
  fontWeight: "700",
  fontSize: 15,
  zIndex: 10,
},
previewImage: {
  width: "100%",
  height: "80%",
},
previewNavRow: {
  position: "absolute",
  bottom: 60,
  flexDirection: "row",
  gap: 40,
},
previewNavBtn: {
  backgroundColor: "rgba(255,255,255,0.2)",
  borderRadius: 30,
  padding: 12,
},
  micText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.6,
  },
  cameraTopBar: {
  position: "absolute",
  top: 50,
  width: "100%",
  alignItems: "center",
  },
  cameraBtn: {
    marginTop: 12,
    backgroundColor: "#EEF2FB",
    borderRadius: 8,
    padding: 10,
    alignSelf: "flex-start",
  },
  cameraBtnText: {
    color: NAVY,
    fontSize: 13,
    fontWeight: "700",
  },
  uploadReadyBox: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  uploadReadyText: {
    fontSize: 12,
    color: "#27ae60",
    fontWeight: "600",
  },
  removePhoto: {
    backgroundColor: "#fdecea",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginLeft: "auto",
  },
  removePhotoText: {
    color: "#c0392b",
    fontSize: 12,
    fontWeight: "600",
  },
  dateBtn: {
    backgroundColor: "#EEF2FB",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  dateBtnText: {
    fontSize: 14,
    color: NAVY,
    fontWeight: "600",
  },
  placeholderText: {
    color: "#aaa",
  },
  dropdownBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#EEF2FB",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#d0d8ea",
  },
  dropdownBtnText: {
    fontSize: 14,
    color: NAVY,
    fontWeight: "600",
  },
  dropdownArrow: {
    fontSize: 12,
    color: NAVY,
  },
  dropdownList: {
    marginTop: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d0d8ea",
    overflow: "hidden",
  },
  dropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e0e6f0",
  },
  dropdownOptionActive: {
    backgroundColor: NAVY,
  },
  dropdownOptionText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  dropdownOptionTextActive: {
    color: AMBER,
    fontWeight: "700",
  },
  submitBtn: {
    backgroundColor: NAVY,
    marginHorizontal: 16,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  submitBtnText: {
    color: AMBER,
    fontWeight: "700",
    fontSize: 16,
  },
  backBtn: {
    alignItems: "center",
    marginBottom: 10,
  },
  backBtnText: {
    color: NAVY,
    fontWeight: "600",
    fontSize: 14,
  },
  bottomSpace: {
    height: 40,
  },
  cameraView: {
    flex: 1,
  },
  photoCountBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  photoCountText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  thumbnailStrip: {
    position: "absolute",
    bottom: 130,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
  },
  thumbnailWrapper: {
    position: "relative",
    marginRight: 10,
  },
  thumbnail: {
    width: 62,
    height: 62,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: AMBER,
  },
  thumbnailRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#c0392b",
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
 
  cameraControls: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 120,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingBottom: 20,
  },
  cameraBtnCancel: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: "rgba(255,255,255,0.15)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.3)",
      marginHorizontal: 30,
  },
  cameraBtnCapture: {
     width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: "#fff",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 4,
      borderColor: "rgba(255,255,255,0.5)",
  },
   shutterInner: {
      width: 62,
      height: 62,
      borderRadius: 31,
      backgroundColor: "#fff",
      borderWidth: 2,
      borderColor: "#ddd",
    },
  cameraBtnDone: {
     width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: "#27ae60",
      alignItems: "center",
      justifyContent: "center",
      marginHorizontal: 30,
  },
  
 
});
export default Form;