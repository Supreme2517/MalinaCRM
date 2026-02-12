import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/auth-context";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = () => {
  const ok = login(loginValue.trim(), password.trim());
  if (!ok) {
    Alert.alert("Ошибка", "Неверный логин или пароль");
    return;
  }
  router.replace("/(tabs)"); // ✅ строго в Профиль
};

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Malina CRM</Text>

      <TextInput
        placeholder="Логин"
        value={loginValue}
        onChangeText={setLoginValue}
        style={styles.input}
        autoCapitalize="none"
      />

      <TextInput
        placeholder="Пароль"
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        secureTextEntry
      />

      <Pressable style={styles.btn} onPress={onSubmit}>
        <Text style={styles.btnText}>Войти</Text>
      </Pressable>

      <Text style={styles.hint}>Тестовые данные: Malina / 0000</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center", gap: 14, backgroundColor: "#F5F7FB" },
  title: { fontSize: 26, fontWeight: "900", textAlign: "center", marginBottom: 16 },
  input: { backgroundColor: "#fff", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: "#eee" },
  btn: { marginTop: 10, backgroundColor: "#111", paddingVertical: 14, borderRadius: 16, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "900", fontSize: 16 },
  hint: { marginTop: 14, textAlign: "center", color: "#666" },
});
