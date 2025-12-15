import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Image,
  Alert,
  Dimensions,
  StatusBar,
  SafeAreaView,
  PermissionsAndroid,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { ArrowLeftIcon, XIcon, CameraIcon } from "../../utils/SvgIcons";
import { RootState } from "../../store/store";
import { AuthPost, UploadFiles } from "../../auth/auth";
import { launchImageLibrary, launchCamera, Asset } from "react-native-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

const MODULE_OPTIONS = [
  "Inpatient",
  "OPD",
  "OT",
  "Triage",
  "Emergency Red zone",
  "Emergency Yellow zone",
  "Emergency Green zone",
  "Labs",
  "Pharmacy",
  "Reception",
];

const ISSUE_TYPE_OPTIONS = [
  "Bug",
  "Feature request",
  "Technical issue",
  "Support query",
];

type ImageFile = {
  uri: string;
  type: string;
  name: string;
};

const NewTicketScreen: React.FC = () => {
  const navigation = useNavigation();
  const user = useSelector((state: RootState) => state.currentUser);
  
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [module, setModule] = useState("");
  const [files, setFiles] = useState<ImageFile[]>([]);
  const [loading, setLoading] = useState(false);

  const requestCameraPermissionAndroid = async (): Promise<boolean> => {
    if (Platform.OS !== "android") return true;
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: "Camera Permission",
          message: "App needs camera permission to take photos for tickets",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK",
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      return false;
    }
  };

const pickFromGallery = () => {
    if (files?.length >= 3) {
      Alert.alert("Limit Exceeded", "Cannot upload more than 3 images at a time");
      return;
    }

    const options = {
      mediaType: 'photo' as const,
      quality: 0.8 as const, // ✅ Cast to literal type
      maxWidth: 1000,
      maxHeight: 1000,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        return;
      } else if (response.errorCode) {
        Alert.alert("Error", `Image picker error: ${response.errorMessage}`);
      } else if (response.assets && response.assets?.length > 0) {
        const asset: Asset = response.assets[0];
        if (asset.uri) {
          const file: ImageFile = {
            uri: asset.uri,
            type: asset.type || 'image/jpeg',
            name: asset.fileName || `image_${Date.now()}.jpg`,
          };
        setFiles((prev) => [...prev, file]);
      }
    }
  });
};

const takePhoto = async () => {
  if (files?.length >= 3) {
    Alert.alert("Limit Exceeded", "Cannot upload more than 3 images at a time");
    return;
  }

  const hasPermission = await requestCameraPermissionAndroid();
  if (!hasPermission) {
    Alert.alert("Permission required", "Camera permission is required to take photos.");
    return;
  }

  const options = {
    mediaType: "photo" as const,
    quality: 0.8 as const, // ✅ Cast to literal type
    maxWidth: 1000,
    maxHeight: 1000,
    saveToPhotos: true,
  };

  launchCamera(options, (response) => {
    if (response.didCancel) {
      return;
    } else if (response.errorCode) {
      Alert.alert("Error", `Camera error: ${response.errorMessage}`);
    } else if (response.assets && response.assets.length > 0) {
      const asset: Asset = response.assets[0];
      if (asset.uri) {
        const file: ImageFile = {
          uri: asset.uri,
          type: asset.type || "image/jpeg",
          name: asset.fileName || `photo_${Date.now()}.jpg`,
        };
        setFiles((prev) => [...prev, file]);
        }
      }
    });
  };

  const removeImage = (indexToRemove: number) => {
    setFiles((prev) => prev?.filter?.((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async () => {
    if (!type || !description || !module) {
      Alert.alert("Validation Error", "Please fill in all required fields");
      return;
    }

    if (files?.length > 3) {
      Alert.alert("Limit Exceeded", "Cannot upload more than 3 images at a time");
      return;
    }

    setLoading(true);

    try {
      const token = await AsyncStorage.getItem("token");
      const ticketData = {
        userID: user?.id,
        type,
        subject: description,
        createdBy: user?.id,
        module,
      };

      const res = await AuthPost(
        `ticket/hospital/${user?.hospitalID}`,
        ticketData,
        token || ""
      );

      if (res?.status === 'error') {
      let errorMessage = "Failed to create ticket";
      
      if ("message" in res && res.message) {
        errorMessage = res.message;
      } else if ("data" in res && res.data?.message) {
        errorMessage = res.data.message;
      }
      
      Alert.alert("Error", errorMessage);
      setLoading(false);
      return;
    }

    let responseData: any;
    
    if ("data" in res) {
      responseData = res.data;
    } else if ("message" in res) {
      responseData = res;
    } else {
      Alert.alert("Error", "Invalid response format");
      setLoading(false);
      return;
    }

      if (!responseData) {
        Alert.alert("Error", "No response received from server");
        setLoading(false);
        return;
      }

      if (responseData?.message === "success" && responseData?.ticket) {
        // If there are files, upload them as attachments
        if (files?.length > 0 && responseData?.ticket?.id) {
          const formData = new FormData();
          
          // Append files if any
          files?.forEach?.((file, index) => {
            formData.append('files', {
              uri: file.uri,
              type: file.type || 'image/jpeg',
              name: file.name || `image_${Date.now()}.jpg`,
            } as any);
          });

          // Add additional data
          formData.append('ticketID', responseData.ticket.id.toString());
          formData.append('userID', user?.id?.toString() || '');

          try {
            const attachmentRes = await UploadFiles(
              `attachment/tickets/${user?.hospitalID}/${responseData.ticket.id}`,
              formData,
              token || ""
            );

            let attachmentData: any;
            
            if ("data" in attachmentRes) {
              attachmentData = attachmentRes.data;
            } else if ("message" in attachmentRes) {
              attachmentData = attachmentRes;
            }
            
            if (!(attachmentData && attachmentData?.message === "success")) {
              Alert.alert("Upload Warning", "Ticket created but file upload failed");
            }
          } catch (uploadError: any) {
            Alert.alert("Upload Warning", "Ticket created but file upload failed");
          }
        }

        Alert.alert("Success", "Ticket created successfully!", [
          {
            text: "OK",
            onPress: () => {
              navigation.navigate("TicketsScreen" as never);
            },
          },
        ]);
        
        // Reset form
        setType("");
        setDescription("");
        setModule("");
        setFiles([]);
      } else {
        const errorMessage = responseData?.message || "Failed to create ticket";
        Alert.alert("Error", errorMessage);
      }
    } catch (error: any) {
      const errorMessage = error?.message || "An unexpected error occurred";
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Issue Type */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Issue Type *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipContainer}>
              {ISSUE_TYPE_OPTIONS?.map?.((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.chip,
                    type === option && styles.chipSelected,
                  ]}
                  onPress={() => setType(option)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      type === option && styles.chipTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <TextInput
            style={styles.customInput}
            placeholder="Or enter custom issue type..."
            placeholderTextColor={"#a19e9eff"}
            value={type}
            onChangeText={setType}
          />
        </View>

        {/* Module Selection */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Module *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipContainer}>
              {MODULE_OPTIONS?.map?.((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.chip,
                    module === option && styles.chipSelected,
                  ]}
                  onPress={() => setModule(option)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      module === option && styles.chipTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Description */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={6}
            placeholder="Describe your issue in detail..."
            placeholderTextColor={"#a19e9eff"}
            value={description}
            onChangeText={setDescription}
            textAlignVertical="top"
          />
        </View>

        {/* File Upload */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Attachments {files?.length > 0 && `(${files?.length}/3)`}
          </Text>
          <View style={styles.uploadButtonsRow}>
          <TouchableOpacity style={styles.fileUploadButton} onPress={pickFromGallery}>
            <CameraIcon size={18} color="#666" />
            <Text style={styles.fileUploadText}>Add Images</Text>
          </TouchableOpacity>

            <TouchableOpacity style={[styles.fileUploadButton, styles.takePhotoButton]} onPress={takePhoto}>
              <CameraIcon size={18} color="#fff" />
              <Text style={[styles.fileUploadText, { color: "#fff" }]}>Take Photo</Text>
            </TouchableOpacity>
          </View>
          
          {files?.length > 0 && (
            <View style={styles.imagePreviewContainer}>
              {files?.map?.((file, index) => (
                <View key={index} style={styles.imagePreview}>
                  <Image source={{ uri: file.uri }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <XIcon size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={handleCancel}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.submitButton, loading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? "Submitting..." : "Submit"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  headerPlaceholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  chipContainer: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  chipSelected: {
    backgroundColor: "#14b8a6",
    borderColor: "#14b8a6",
  },
  chipText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  chipTextSelected: {
    color: "#fff",
  },
  customInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginTop: 8,
    backgroundColor: "#fff",
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
    backgroundColor: "#fff",
    textAlignVertical: "top",
  },
  uploadButtonsRow: {
    flexDirection: "row",
    gap: 12,
  },
  fileUploadButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: "#fafafa",
  },
  takePhotoButton: {
    backgroundColor: "#14b8a6",
    borderStyle: "solid",
    borderWidth: 0,
  },
  fileUploadText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  imagePreviewContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 12,
  },
  imagePreview: {
    position: "relative",
    width: 80,
    height: 80,
  },
  previewImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  removeImageButton: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#ef4444",
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  submitButton: {
    backgroundColor: "#14b8a6",
  },
  disabledButton: {
    opacity: 0.6,
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#6b7280",
    fontWeight: "600",
  },
  submitButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
});

export default NewTicketScreen;