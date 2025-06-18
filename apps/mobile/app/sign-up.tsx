import React from "react";
import { View, StyleSheet } from "react-native";
// @ts-expect-error clerk expo types
import { SignUp } from "@clerk/clerk-expo";

export default function SignUpScreen() {
  return (
    <View style={styles.container}>
      <SignUp redirectUrl="/search" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f3ef",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
});
