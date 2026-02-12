import { View, Text, StyleSheet } from "react-native";

export default function FutureScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Скоро</Text>

      <View style={styles.card}>
        <Text style={styles.value}>Эта вкладка пока не работает.</Text>
        <Text style={styles.muted}>
          Потом сюда добавим: календарь, команду, статусы, аналитику, уведомления и т.д.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  h1: { fontSize: 20, fontWeight: "700" },

  card: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
    gap: 8,
  },
  value: { fontSize: 16, fontWeight: "600", color: "#111" },
  muted: { color: "#666", lineHeight: 18 },
});
