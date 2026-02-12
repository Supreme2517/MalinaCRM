import React, { useEffect, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, FlatList, Alert } from "react-native";
import { useRouter } from "expo-router";
import { getUsers } from "../../src/db";
import { useAuth } from "../../src/auth-context";

export default function AdminUsers() {
  const router = useRouter();
  const { user } = useAuth();

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (user && !isAdmin) {
      Alert.alert("Нет доступа", "Только админ может открывать этот раздел.", [
        { text: "Ок", onPress: () => router.back() },
      ]);
    }
  }, [user, isAdmin, router]);

  if (!isAdmin) {
    return <View style={{ flex: 1, backgroundColor: "#F5F7FB" }} />;
  }

  const users = useMemo(() => getUsers(), []);

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Пользователи</Text>

      <FlatList
        data={users}
        keyExtractor={(u) => String(u.id)}
        contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
            onPress={() =>
              router.push({
                pathname: "/admin/user",
                params: { id: String(item.id) },
              })
            }
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{item.login}</Text>
              <Text style={styles.sub}>Роль: {item.role}</Text>
            </View>
            <Text style={styles.chev}>›</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#F5F7FB", gap: 12 },
  h1: { fontSize: 20, fontWeight: "900", color: "#111" },
  row: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
    alignItems: "center",
  },
  title: { fontSize: 16, fontWeight: "900", color: "#111" },
  sub: { color: "#666", marginTop: 4 },
  chev: { fontSize: 24, color: "#111", fontWeight: "900" },
});
