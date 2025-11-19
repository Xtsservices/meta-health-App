// PaymentScreen.tsx - NEW SCREEN
import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import PaymentMethodDialog from "./PaymentMethodDialog";

const { width: W } = Dimensions.get("window");

const PaymentScreen = ({ route, navigation }: any) => {
  const {
    amount,
    selectedTests,
    formData,
    files,
    discount,
    discountReason,
    discountReasonID,
    department,
    user
  } = route.params;

  const handlePaymentSubmit = (paymentDetails: any) => {
    console.log("Payment submitted:", paymentDetails);
    // Payment is already handled in the dialog component
  };

  const handleClose = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <PaymentMethodDialog
        visible={true}
        onClose={handleClose}
        onSubmit={handlePaymentSubmit}
        amount={amount}
        selectedTests={selectedTests}
        formData={formData}
        files={files}
        discount={discount}
        discountReason={discountReason}
        discountReasonID={discountReasonID}
        department={department}
        user={user}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
});

export default PaymentScreen;