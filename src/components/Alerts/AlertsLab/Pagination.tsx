import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
  currentItemsCount: number;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  currentItemsCount,
}) => {
  const pageNumbers = [];
  const maxPagesToShow = 5;
  
  let startPage = Math.max(0, currentPage - Math.floor(maxPagesToShow / 2));
  let endPage = Math.min(totalPages - 1, startPage + maxPagesToShow - 1);

  if (endPage - startPage + 1 < maxPagesToShow) {
    startPage = Math.max(0, endPage - maxPagesToShow + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  const showLeftEllipsis = startPage > 0;
  const showRightEllipsis = endPage < totalPages - 1;

  return (
    <View style={styles.container}>
      <Text style={styles.infoText}>
        Showing {currentItemsCount === 0 ? 0 : (currentPage * itemsPerPage) + 1} to{" "}
        {Math.min((currentPage + 1) * itemsPerPage, totalItems)} of {totalItems} entries
      </Text>
      
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.navButton, currentPage === 0 && styles.disabledButton]}
          onPress={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 0}
        >
          <ChevronLeft size={20} color={currentPage === 0 ? "#9ca3af" : "#374151"} />
        </TouchableOpacity>

        <View style={styles.pageNumbers}>
          {showLeftEllipsis && <Text style={styles.ellipsis}>...</Text>}
          
          {pageNumbers.map((pageNum) => (
            <TouchableOpacity
              key={pageNum}
              style={[styles.pageButton, currentPage === pageNum && styles.activePageButton]}
              onPress={() => onPageChange(pageNum)}
            >
              <Text style={[styles.pageText, currentPage === pageNum && styles.activePageText]}>
                {pageNum + 1}
              </Text>
            </TouchableOpacity>
          ))}
          
          {showRightEllipsis && <Text style={styles.ellipsis}>...</Text>}
        </View>

        <TouchableOpacity
          style={[styles.navButton, currentPage >= totalPages - 1 && styles.disabledButton]}
          onPress={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages - 1}
        >
          <ChevronRight size={20} color={currentPage >= totalPages - 1 ? "#9ca3af" : "#374151"} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginVertical: 16,
    gap: 12,
  },
  infoText: {
    fontSize: 14,
    color: "#6b7280",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  navButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: "#f3f4f6",
  },
  disabledButton: {
    opacity: 0.5,
  },
  pageNumbers: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  pageButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "#f3f4f6",
  },
  activePageButton: {
    backgroundColor: "#14b8a6",
  },
  pageText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  activePageText: {
    color: "#ffffff",
  },
  ellipsis: {
    fontSize: 14,
    color: "#6b7280",
    paddingHorizontal: 8,
  },
});

export default Pagination;