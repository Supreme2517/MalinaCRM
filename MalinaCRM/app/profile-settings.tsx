import React, { useEffect, useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable, Alert, ScrollView } from "react-native";
import { useAuth } from "../src/auth-context";
import { updateUserProfile } from "../src/db";
import { useRouter } from "expo-router";

function toNumberOrNull(s: string) {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export default function ProfileSettings() {
  const { user, refresh } = useAuth();
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [telegram, setTelegram] = useState("");

  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");
    setAge(user.age == null ? "" : String(user.age));
    setPhone(user.phone ?? "");
    setEmail(user.email ?? "");
    setTelegram(user.telegram ?? "");
  }, [user]);

  const onSave = () => {
    if (!user) return;

    updateUserProfile(user.id, {
      firstName: firstName.trim() || null,
      lastName: lastName.trim() || null,
      age: toNumberOrNull(age),
      phone: phone.trim() || null,
      email: email.trim() || null,
      telegram: telegram.trim() || null,
    });

    refresh();
    Alert.alert("Сохранено", "Профиль обновлён.");
    router.back();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.h1}>Настройки профиля</Text>

      <View style={styles.card}>
        <Field label="Имя" value={firstName} onChangeText={setFirstName} />
        <Field label="Фамилия" value={lastName} onChangeText={setLastName} />
        <Field label="Возраст" value={age} onChangeText={setAge} keyboardType="numeric" />
        <Field label="Телефон" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Field label="Почта" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <Field label="Тэг Telegram" value={telegram} onChangeText={setTelegram} />

        <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
          <Pressable style={styles.secondaryBtn} onPress={() => router.back()}>
            <Text style={styles.secondaryText}>Назад</Text>
          </Pressable>
          <Pressable style={styles.primaryBtn} onPress={onSave}>
            <Text style={styles.primaryText}>Сохранить</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: any;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        style={styles.input}
        keyboardType={props.keyboardType}
        placeholder={props.label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 24 },
  h1: { fontSize: 20, fontWeight: "900", color: "#111" },
  card: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
    gap: 10,
  },
  label: { fontSize: 12, color: "#666", marginTop: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fafafa",
    color: "#111",
  },
  primaryBtn: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: "center", backgroundColor: "#111" },
  primaryText: { color: "#fff", fontWeight: "900" },
  secondaryBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
  },
  secondaryText: { color: "#111", fontWeight: "900" },
});
