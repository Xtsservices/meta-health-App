import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  StyleSheet,
  Dimensions
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../store/store";
import { AuthFetch, AuthPost } from "../../auth/auth";
import { formatDateTime } from "../../utils/dateTime";
import { Edit2Icon, Trash2Icon, PlusIcon, XIcon } from "../../utils/SvgIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { showError, showSuccess } from "../../store/toast.slice";

interface Task {
  id: number;
  task: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

const MyTasks: React.FC = () => {
  const user = useSelector((state: RootState) => state.currentUser);
  const dispatch = useDispatch();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [newTaskContent, setNewTaskContent] = useState<string>("");
  const [status, setStatus] = useState<string>("pending");
  const [loading, setLoading] = useState<boolean>(false);

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

    const fetchTasks = useCallback(async () => {
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          dispatch(showError("Authentication token not found"));
          setTasks([]);
          return;
        }

        const response = await AuthFetch("admintasks/getadminalltasks", token);

        if (response?.status === "success") {
          const tasksData = response?.data?.alerts;
          setTasks(Array.isArray(tasksData) ? tasksData : []);
        } else {
          dispatch(showError(response?.message || "Failed to fetch tasks"));
          setTasks([]);
        }
      } catch (error) {
        dispatch(showError("Failed to fetch tasks. Please try again."));
        setTasks([]);
      } finally {
        setLoading(false);
      }
    }, []);

    useFocusEffect(
      useCallback(() => {
      fetchTasks();
      }, [fetchTasks])
    );

  const openEditModal = (task: Task): void => {
    setCurrentTask(task);
    setNewTaskContent(task.task || "");
    setStatus(task.status || "pending");
    setIsEditModalOpen(true);
  };

  const closeEditModal = (): void => {
    setIsEditModalOpen(false);
    setCurrentTask(null);
    setNewTaskContent("");
    setStatus("pending");
  };

  const openAddModal = (): void => {
    setCurrentTask(null);
    setNewTaskContent("");
    setStatus("pending");
    setIsAddModalOpen(true);
  };

  const closeAddModal = (): void => {
    setIsAddModalOpen(false);
  };

  const addTaskToDB = async (content: string, status: string): Promise<void> => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        dispatch(showError("Authentication token not found"));
        return;
      }

      const body = {
        userID: user?.id,
        task: content,
        status: status
      };

      const response = await AuthPost("admintasks/addnewAdmintask", body, token);

      if (response?.status === "success") {
        const newTask = {
          id: response.data?.id || Date.now(),
          task: content,
          status,
          createdAt: new Date().toISOString()
        };
        setTasks(prevTasks => [...prevTasks, newTask]);
        dispatch(showSuccess("Note added successfully!"));
      } else {
        dispatch(showError(response?.message || "Failed to add note"));
      }
    } catch (error) {
      dispatch(showError("Failed to add note. Please try again."));
    }
  };

  const editTaskInDB = async (taskId: number, content: string, status: string): Promise<void> => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        dispatch(showError("Authentication token not found"));
        return;
      }

      const body = { task: content, status };

      const response = await AuthPost(`admintasks/editAdmintask/${taskId}`, body, token);

      if (response?.status === "success") {
        setTasks(prevTasks =>
          prevTasks?.map((task) =>
            task.id === taskId ? { ...task, task: content, status, updatedAt: new Date().toISOString() } : task
          ) || []
        );
        dispatch(showSuccess("Note updated successfully!"));
      } else {
        dispatch(showError(response?.message || "Failed to update note"));
      }
    } catch (error) {
      dispatch(showError("Failed to update note. Please try again."));
    }
  };

  const deleteTaskFromDB = async (taskId: number): Promise<void> => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        dispatch(showError("Authentication token not found"));
        return;
      }

      const response = await AuthPost(`admintasks/deleteAdmintask/${taskId}`, {}, token);

      if (response?.status === "success") {
        setTasks(prevTasks => prevTasks.filter((task) => task.id !== taskId));
        dispatch(showSuccess("Note deleted successfully!"));
      } else {
        dispatch(showError(response?.message || "Failed to delete note"));
      }
    } catch (error) {
      dispatch(showError("Failed to delete note. Please try again."));
    }
  };

  const saveTask = async (): Promise<void> => {
    if (!newTaskContent?.trim?.()) {
      dispatch(showError("Please enter note content"));
      return;
    }

    try {
      if (currentTask?.id) {
        await editTaskInDB(currentTask.id, newTaskContent, status);
      } else {
        await addTaskToDB(newTaskContent, status);
      }
      closeEditModal();
      closeAddModal();
    } catch (error) {
      dispatch(showError("Failed to save note. Please try again."));
    }
  };

  const deleteTask = async (taskId: number): Promise<void> => {
    Alert.alert(
      "Delete Note",
      "Are you sure you want to delete this note?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteTaskFromDB(taskId) }
      ]
    );
  };

  const truncateText = (text: string): string => {
    const maxLength = 150;
    return text?.length > maxLength ? text?.slice?.(0, maxLength) + "..." : text || "";
  };

  const getTaskColor = (index: number): string => {
    const colors = [
      "#B2DFFC",
      "#F9B2B2",
      "#FFD7A3",
      "#C4F2C0",
      "#FFFACD",
      "#E1C6F4",
      "#A7E3E6",
      "#FFECB3",
      "#D3D3D3",
      "#FFCCF9",
    ];
    return colors[index % colors.length] || "#B2DFFC";
  };

  const getTaskDate = (task: Task): string => {
    const dateString = task?.updatedAt || task?.createdAt;
    return formatDateTime(dateString || new Date());
  };
  
  const containerPadding = Math.max(16, screenWidth * 0.04); 
  const gap = Math.max(12, screenWidth * 0.03);
  const cardWidth = (screenWidth - containerPadding - gap) / 2;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading notes...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { minHeight: screenHeight * 0.7 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>My Notes</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <PlusIcon size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {tasks?.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyMessage}>Please Add Notes!!</Text>
          <TouchableOpacity style={styles.addFirstButton} onPress={openAddModal}>
            <Text style={styles.addFirstButtonText}>Add Your First Note</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.tasksContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.tasksGrid}>
            {tasks?.map?.((task, index) => (
              <View
                key={task.id}
                style={[
                  styles.taskCard,
                  {
                    backgroundColor: getTaskColor(index),
                    minHeight: screenHeight * 0.2
                  }
                ]}
              >
                {/* <View style={styles.pin} /> */}

                <View style={styles.taskHeader}>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => openEditModal(task)}
                    >
                      <Edit2Icon size={16} color="#475569" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => deleteTask(task.id)}
                    >
                      <Trash2Icon size={16} color="#475569" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Content area */}
                <View style={styles.taskContent}>
                  <Text style={styles.taskText}>
                    {truncateText(task.task)}
                  </Text>
                </View>

                {/* Date moved to bottom */}
                <View style={styles.taskFooter}>
                  <Text style={styles.taskTime}>
                    {getTaskDate(task)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Add Note Modal */}
      <Modal
        visible={isAddModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={closeAddModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { maxHeight: screenHeight * 0.8 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Note</Text>
              <TouchableOpacity onPress={closeAddModal} style={styles.closeButton}>
                <XIcon size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.textarea, { minHeight: screenHeight * 0.3 }]}
              multiline
              numberOfLines={8}
              value={newTaskContent}
              onChangeText={setNewTaskContent}
              placeholder="Enter your note here..."
              placeholderTextColor="#94a3b8"
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={closeAddModal}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={saveTask}>
                <Text style={styles.saveButtonText}>Save Note</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Note Modal */}
      <Modal
        visible={isEditModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { maxHeight: screenHeight * 0.8 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Note</Text>
              <TouchableOpacity onPress={closeEditModal} style={styles.closeButton}>
                <XIcon size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.textarea, { minHeight: screenHeight * 0.3 }]}
              multiline
              numberOfLines={8}
              value={newTaskContent}
              onChangeText={setNewTaskContent}
              placeholder="Enter your note here..."
              placeholderTextColor="#94a3b8"
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={closeEditModal}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={saveTask}>
                <Text style={styles.saveButtonText}>Update Note</Text>
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
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 15,
    padding: 16,
    marginTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#64748b",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
    taskFooter: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.1)",
    alignItems: "center", // Center the date
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
  },
  addButton: {
    backgroundColor: "#14b8a6",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
  },
  emptyMessage: {
    fontSize: 18,
    color: "#64748b",
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 20,
  },
  addFirstButton: {
    backgroundColor: "#14b8a6",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addFirstButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  tasksContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  tasksGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingBottom: 16,
  },
  taskCard: {
    width: "48%",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.08)",
    position: "relative",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
        justifyContent: "space-between", 
  },
  pin: {
    position: "absolute",
    top: 12,
    right: 16,
    width: 8,
    height: 8,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 4,
  },
  taskHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  taskTime: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "500",
    flex: 1,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 6,
  },
  iconButton: {
    padding: 6,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  taskContent: {
    flex: 1,
    justifyContent: "center",
    marginBottom: 8,
  },
  taskText: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 20,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "90%",
    maxWidth: 500,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#0f172a",
  },
  closeButton: {
    padding: 4,
  },
  textarea: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    textAlignVertical: "top",
    marginBottom: 24,
    backgroundColor: "#f8fafc",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cancelButtonText: {
    color: "#475569",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    flex: 2,
    backgroundColor: "#14b8a6",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default MyTasks;