import React from "react";
import { useLocalSearchParams } from "expo-router";
import { Text, StyleSheet, Image, ScrollView } from "react-native";

export default function ProfileDetailScreen() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id } = useLocalSearchParams<{ id: string }>();

  // TODO: fetch profile data via API with auth token
  const mockProfile = {
    name: "Aisha",
    age: 26,
    city: "London",
    bio: "Love travelling and good coffee. Looking for meaningful connections.",
    image:
      "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&h=800",
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image source={{ uri: mockProfile.image }} style={styles.avatar} />
      <Text style={styles.name}>
        {mockProfile.name}, {mockProfile.age}
      </Text>
      <Text style={styles.city}>{mockProfile.city}</Text>
      <Text style={styles.bio}>{mockProfile.bio}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    padding: 24,
    backgroundColor: "#f6f3ef",
  },
  avatar: {
    width: 200,
    height: 200,
    borderRadius: 100,
    marginBottom: 24,
  },
  name: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1e1e1e",
  },
  city: {
    fontSize: 18,
    color: "#777",
    marginBottom: 16,
  },
  bio: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
  },
});
