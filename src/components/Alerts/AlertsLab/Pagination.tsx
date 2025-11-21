import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS } from "../../../utils/colour";
import { SPACING, FONT_SIZE } from "../../../utils/responsive";

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
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    
    let startPage = Math.max(0, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages - 1, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(0, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  return (
    <View style={styles.container}>
      <View style={styles.paginationInfo}>
        <Text style={styles.infoText}>
          Showing {currentItemsCount} of {totalItems} entries
        </Text>
      </View>
      
      <View style={styles.paginationControls}>
        <TouchableOpacity
          style={[styles.pageButton, currentPage === 0 && styles.disabledButton]}
          onPress={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 0}
        >
          <Text style={[styles.pageButtonText, currentPage === 0 && styles.disabledText]}>
            Previous
          </Text>
        </TouchableOpacity>

        <View style={styles.pageNumbers}>
          {getPageNumbers()?.map((page) => (
            <TouchableOpacity
              key={page}
              style={[
                styles.pageNumber,
                currentPage === page && styles.activePageNumber,
              ]}
              onPress={() => onPageChange(page)}
            >
              <Text
                style={[
                  styles.pageNumberText,
                  currentPage === page && styles.activePageNumberText,
                ]}
              >
                {page + 1}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.pageButton, currentPage === totalPages - 1 && styles.disabledButton]}
          onPress={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages - 1}
        >
          <Text style={[styles.pageButtonText, currentPage === totalPages - 1 && styles.disabledText]}>
            Next
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.sm,
  },
  paginationInfo: {
    flex: 1,
  },
  infoText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.sub,
  },
  paginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  pageButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderRadius: 6,
    backgroundColor: COLORS.pill,
  },
  disabledButton: {
    backgroundColor: COLORS.card,
  },
  pageButtonText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '500',
    color: COLORS.brand,
  },
  disabledText: {
    color: COLORS.placeholder,
  },
  pageNumbers: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  pageNumber: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.pill,
  },
  activePageNumber: {
    backgroundColor: COLORS.brand,
  },
  pageNumberText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '500',
    color: COLORS.sub,
  },
  activePageNumberText: {
    color: COLORS.buttonText,
  },
});

export default Pagination;