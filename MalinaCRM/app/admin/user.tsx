import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, Alert, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { addUserCoins, getUserById, updateUserPermissions, updateUserRole, updateUserProfile, UserRole } from "../../src/db";
import { useAuth } from "../../src/auth-context";

function ToggleRow(props: { title: string; value: boolean; onToggle: () => void }) {
  return (
    <Pressable onPress={props.onToggle} style={styles.toggleRow}>
      <Text style={styles.toggleTitle}>{props.title}</Text>
      <Text style={styles.toggleVal}>{props.value ? "ON" : "OFF"}</Text>
    </Pressable>
  );
}

export default function AdminUserEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user: me } = useAuth();

  const userId = Number(id);
  const [u, setU] = useState<any>(null);

  useEffect(() => {
    if (me?.role !== "admin") {
      Alert.alert("Нет доступа", "Только админ.");
      router.back();
      return;
    }
    const found = getUserById(userId);
    if (!found) {
      Alert.alert("Не найдено", "Пользователь не найден.");
      router.back();
      return;
    }
    setU(found);
  }, [userId, me, router]);

  if (!u) return <View style={{ flex: 1, backgroundColor: "#F5F7FB" }} />;

  const setRole = (role: UserRole) => {
    updateUserRole(u.id, role);
    setU(getUserById(u.id));
  };

  const togglePerm = (key: string) => {
    updateUserPermissions(u.id, { [key]: !(u[key] === 1) } as any);
    setU(getUserById(u.id));
  };

  const topUp = (delta: number) => {
    addUserCoins(u.id, delta);
    setU(getUserById(u.id));
    Alert.alert("Готово", `Начислено: ${delta}`);
  };

  const changeRank = (rank: string | null) => {
    updateUserProfile(u.id, { rank });
    setU(getUserById(u.id));
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.h1}>{u.login}</Text>

      <View style={styles.card}>
        <Text style={styles.section}>Роль</Text>

        <View style={styles.roleRow}>
          {(["admin", "manager", "accountant", "user"] as UserRole[]).map((r) => (
            <Pressable
              key={r}
              onPress={() => setRole(r)}
              style={[styles.roleBtn, u.role === r && styles.roleBtnActive]}
            >
              <Text style={[styles.roleText, u.role === r && styles.roleTextActive]}>{r}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Права</Text>

        <ToggleRow
          title="Назначать участников на заказы"
          value={u.canAssignParticipants === 1}
          onToggle={() => togglePerm("canAssignParticipants")}
        />
        <ToggleRow
          title="Менять звания"
          value={u.canEditRanks === 1}
          onToggle={() => togglePerm("canEditRanks")}
        />
        <ToggleRow
          title="Создавать заказы"
          value={u.canCreateOrders === 1}
          onToggle={() => togglePerm("canCreateOrders")}
        />
        <ToggleRow
          title="Управлять финансами"
          value={u.canManageFinance === 1}
          onToggle={() => togglePerm("canManageFinance")}
        />
        <ToggleRow
          title="Пополнять MalinaCoins"
          value={u.canTopUpCoins === 1}
          onToggle={() => togglePerm("canTopUpCoins")}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Звание</Text>

        <View style={styles.actionRow}>
          <Pressable style={styles.smallBtn} onPress={() => changeRank("Капитан анимации")}>
            <Text style={styles.smallBtnText}>Капитан</Text>
          </Pressable>
          <Pressable style={styles.smallBtn} onPress={() => changeRank("Старший аниматор")}>
            <Text style={styles.smallBtnText}>Старший</Text>
          </Pressable>
          <Pressable style={styles.smallBtn} onPress={() => changeRank(null)}>
            <Text style={styles.smallBtnText}>Сброс</Text>
          </Pressable>
        </View>

        <Text style={{ color: "#666", marginTop: 8 }}>Текущее: {u.rank ?? "—"}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>MalinaCoins</Text>
        <Text style={{ color: "#666", marginBottom: 10 }}>Баланс: {u.coins ?? 0}</Text>

        <View style={styles.actionRow}>
          <Pressable style={styles.smallBtn} onPress={() => topUp(100)}>
            <Text style={styles.smallBtnText}>+100</Text>
          </Pressable>
          <Pressable style={styles.smallBtn} onPress={() => topUp(500)}>
            <Text style={styles.smallBtnText}>+500</Text>
          </Pressable>
          <Pressable style={styles.smallBtn} onPress={() => topUp(-100)}>
            <Text style={styles.smallBtnText}>-100</Text>
          </Pressable>
        </View>
      </View>

      <Pressable style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backText}>Назад</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 24, backgroundColor: "#F5F7FB" },
  h1: { fontSize: 20, fontWeight: "900", color: "#111" },
  card: { padding: 16, borderRadius: 18, backgroundColor: "#fff", borderWidth: 1, borderColor: "#eee", gap: 10 },
  section: { fontSize: 14, fontWeight: "900", color: "#111" },

  roleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  roleBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: "#eee", backgroundColor: "#fafafa" },
  roleBtnActive: { backgroundColor: "#111", borderColor: "#111" },
  roleText: { fontWeight: "900", color: "#111" },
  roleTextActive: { color: "#fff" },

  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#f0f0f0" },
  toggleTitle: { fontWeight: "800", color: "#111", flex: 1, paddingRight: 10 },
  toggleVal: { fontWeight: "900", color: "#111" },

  actionRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  smallBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: "#eee", backgroundColor: "#fafafa" },
  smallBtnText: { fontWeight: "900", color: "#111" },

  backBtn: { paddingVertical: 14, borderRadius: 16, alignItems: "center", backgroundColor: "#111" },
  backText: { color: "#fff", fontWeight: "900" },
});
