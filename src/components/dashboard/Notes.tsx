import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions
} from "react-native";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthFetch, AuthPost } from "../../auth/auth";
import { formatDateTime } from "../../utils/dateTime";
import { Edit2Icon, Trash2Icon, PlusIcon, XIcon } from "../../utils/SvgIcons";

interface Task {
  id: number;
  task: string;
  status: string;
  addedon?: string;
  colour?: string;
}

const Notes: React.FC = () => {
  const user = useSelector((s: RootState) => s.currentUser);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [newTaskContent, setNewTaskContent] = useState("");
  const [status, setStatus] = useState("pending");
  const [selectColor, setSelectedColor] = useState("#E1C6F4");
  const [loading, setLoading] = useState(false);

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      const response = await AuthFetch("admintasks/getadminalltasks", token);
      
      if (response?.status === "success" && Array.isArray(response?.data?.alerts)) {
        setTasks(response?.data?.alerts || []);
      } else {
        setTasks([]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to fetch notes");
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.token) {
      fetchTasks();
    }
  }, [user?.token]);

  const openModal = (task: Task | null = null) => {
    setCurrentTask(task);
    setNewTaskContent(task ? task.task : "");
    setStatus(task ? task.status : "pending");
    setSelectedColor(task ? task.colour || "#E1C6F4" : "#E1C6F4");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setNewTaskContent("");
    setStatus("pending");
    setSelectedColor("#E1C6F4");
    setCurrentTask(null);
  };

const addTaskToDB = async (content: string, status: string): Promise<void> => {
  try {
    const body = { 
      userID: user?.id, 
      task: content, 
      status: status 
    };
        
    const response = await AuthPost("admintasks/addnewAdmintask", body, user?.token);
      if (response?.status === "success" || response?.message === "success") {
      const newTask = { 
        id: response.data?.id || Date.now(), 
        task: content, 
        status,
        createdAt: new Date().toISOString()
      };
      setTasks(prevTasks => [...prevTasks, newTask]);
      Alert.alert("Success", "Note added successfully!");
    } else {
      Alert.alert("Error", response?.message || "Failed to add note");
    }
  } catch (error) {
    Alert.alert("Error", "Failed to add note. Please try again.");
  }
};

const editTaskInDB = async (taskId: number, content: string, status: string): Promise<void> => {
  try {
    const body = { task: content, status };
    
    const response = await AuthPost(`admintasks/editAdmintask/${taskId}`, body, user?.token);
      if (response?.status === "success" || response?.message === "success") {
      setTasks(prevTasks =>
        prevTasks?.map?.((task) =>
          task.id === taskId ? { ...task, task: content, status, updatedAt: new Date().toISOString() } : task
        ) || []
      );
      Alert.alert("Success", "Note updated successfully!");
    } else {
      Alert.alert("Error", response?.message || "Failed to update note");
    }
  } catch (error) {
    Alert.alert("Error", "Failed to update note. Please try again.");
  }
};

  const deleteTaskFromDB = async (taskId: number) => {
    try {
      const token = user?.token ?? (await AsyncStorage.getItem("token"));
      const response = await AuthPost(`admintasks/deleteAdmintask/${taskId}`, {}, token);
      if (response?.message === "success") {
        setTasks(tasks?.filter?.((task) => task.id !== taskId) || []);
        Alert.alert("Success", "Note deleted successfully");
      } else {
        Alert.alert("Error", response?.message || "Failed to delete note");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to delete note");
    }
  };

  const saveTask = async () => {
    if (!newTaskContent?.trim?.()) {
      Alert.alert("Error", "Please enter note content");
      return;
    }

    try {
      if (currentTask?.id) {
        await editTaskInDB(currentTask.id, newTaskContent, status);
      } else {
        await addTaskToDB(newTaskContent, status);
      }
      closeModal();
    } catch (error) {
      Alert.alert("Error", "Failed to save note");
    }
  };

  const handleDelete = (taskId: number) => {
    Alert.alert(
      "Delete Note",
      "Are you sure you want to delete this note? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => deleteTaskFromDB(taskId)
        },
      ]
    );
  };

  const truncateText = (text: string): string => {
    const maxLength = 80;
    return text?.length > maxLength ? text?.slice?.(0, maxLength) + "..." : text || "";
  };

  const getTitle = (task: string) => {
    return task?.split?.("\n")?.[0] || "Untitled Note";
  };

  const getContent = (task: string) => {
    const lines = task?.split?.("\n") || [];
    return lines?.length > 1 ? lines?.slice?.(1)?.join?.("\n") : "No description available";
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Lab Notes</Text>
          <TouchableOpacity style={styles.addButton} disabled>
            <PlusIcon size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#1977f3" />
          <Text style={styles.loadingText}>Loading notes...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { minHeight: screenHeight * 0.7 }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Lab Notes</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => openModal(null)}>
          <PlusIcon size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Notes List */}
      {tasks?.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No notes available</Text>
          <Text style={styles.emptySubtext}>Tap + to add your first note</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.list} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {tasks?.map?.((task) => (
            <View key={task.id} style={styles.noteCard}>
              <View style={styles.noteHeader}>
                <Text style={styles.noteTitle}>
                  {truncateText(getTitle(task.task))}
                </Text>
                <View style={styles.actions}>
                  <TouchableOpacity 
                    onPress={() => openModal(task)}
                    style={styles.actionButton}
                  >
                    <Edit2Icon size={16} color="#64748b" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => handleDelete(task.id)}
                    style={styles.actionButton}
                  >
                    <Trash2Icon size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.noteContent}>
                {truncateText(getContent(task.task))}
              </Text>
              {task.addedon && (
                <Text style={styles.noteDate}>
                  {formatDateTime(task.addedon)}
                </Text>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add/Edit Note Modal */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: screenHeight * 0.8 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {currentTask ? "Edit Lab Note" : "Add New Lab Note"}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <XIcon size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Create a new note for laboratory operations, reminders, or important information.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Note Title"
              value={getTitle(newTaskContent)}
              onChangeText={(text) => {
                const content = getContent(newTaskContent);
                setNewTaskContent(text + "\n" + content);
              }}
              placeholderTextColor="#94a3b8"
            />

            <TextInput
              style={[styles.input, styles.textArea, { minHeight: screenHeight * 0.2 }]}
              placeholder="Note Content"
              multiline
              numberOfLines={6}
              value={getContent(newTaskContent)}
              onChangeText={(text) => {
                const title = getTitle(newTaskContent);
                setNewTaskContent(title + "\n" + text);
              }}
              placeholderTextColor="#94a3b8"
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={saveTask}>
                <Text style={styles.saveButtonText}>
                  {currentTask ? "Save Note" : "Add Note"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#0f172a",
  },
  addButton: {
    backgroundColor: "#1977f3",
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  noteCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  noteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
    flex: 1,
    marginRight: 12,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  noteContent: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
    marginBottom: 8,
  },
  noteDate: {
    fontSize: 12,
    color: "#6b7280",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#9ca3af",
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#d1d5db",
    textAlign: "center",
    marginTop: 4,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: "#64748b",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#0f172a",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 20,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: "#f8fafc",
  },
  textArea: {
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#f8fafc",
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#374151",
    fontWeight: "500",
  },
  saveButton: {
    backgroundColor: "#1977f3",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
  },
});

export default Notes;