import React, { useMemo, useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, Alert } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { deleteOrder, listOrdersByMonth, Order, usersByIds } from "../../src/db";
import { useAuth } from "../../src/auth-context";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatRuDateTime(iso: string) {
  const d = new Date(iso);
  const dd = pad(d.getDate());
  const mm = pad(d.getMonth() + 1);
  const yyyy = d.getFullYear();
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
}

function monthTitleRu(year: number, month0: number) {
  const m = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
  return `${m[month0]} ${year}`;
}

export default function OrdersTab() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mine?: string }>();
  const { user } = useAuth();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month0, setMonth0] = useState(now.getMonth());
  const [orders, setOrders] = useState<Order[]>([]);

  const title = useMemo(() => monthTitleRu(year, month0), [year, month0]);
  const mine = params.mine === "1";

  const load = useCallback(() => {
    const all = listOrdersByMonth(year, month0);

    // ✅ если mine=1 — показываем только заказы, где участник текущий user
    if (mine && user) {
      setOrders(all.filter((o) => o.participants?.includes(user.id)));
      return;
    }

    // ✅ иначе — всегда ВСЕ заказы
    setOrders(all);
  }, [year, month0, mine, user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const prevMonth = () => {
    const d = new Date(year, month0 - 1, 1);
    setYear(d.getFullYear());
    setMonth0(d.getMonth());
  };

  const nextMonth = () => {
    const d = new Date(year, month0 + 1, 1);
    setYear(d.getFullYear());
    setMonth0(d.getMonth());
  };

  const onDelete = (id: number) => {
    Alert.alert("Удалить заказ?", "Это действие нельзя отменить.", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: () => {
          deleteOrder(id);
          load();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.monthRow}>
        <Pressable onPress={prevMonth} style={styles.monthBtn}>
          <Ionicons name="chevron-back" size={20} color="#111" />
        </Pressable>

        <Text style={styles.monthTitle}>{title}</Text>

        <Pressable onPress={nextMonth} style={styles.monthBtn}>
          <Ionicons name="chevron-forward" size={20} color="#111" />
        </Pressable>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ gap: 10, paddingBottom: 90 }}
        ListEmptyComponent={
          <Text style={styles.muted}>
            {mine ? "У тебя нет заказов в этом месяце." : "В этом месяце заказов нет. Нажми “+”, чтобы добавить."}
          </Text>
        }
        renderItem={({ item }) => {
          const names = usersByIds(item.participants ?? []).map((u) => u.login);
          const participantsLabel = names.length ? names.join(", ") : "—";

          return (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/orders/[id]",
                  params: { id: String(item.id) },
                })
              }
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
            >
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.cardTitle}>{item.title}</Text>

                <Text style={styles.meta}>Дата и время: {formatRuDateTime(item.startAtISO)}</Text>
                <Text style={styles.meta}>Участники: {participantsLabel}</Text>

                {(item.priceTotal ?? null) !== null && (
                  <Text style={styles.meta}>
                    Стоимость: {item.priceTotal} • Предоплата: {item.prepayment ?? 0}
                  </Text>
                )}
              </View>

              <Pressable onPress={() => onDelete(item.id)} style={styles.delBtn}>
                <Text style={styles.delText}>✕</Text>
              </Pressable>
            </Pressable>
          );
        }}
      />

      <Pressable onPress={() => router.push("/orders-add")} style={styles.fab} accessibilityLabel="Добавить заказ">
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  monthBtn: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#eee", backgroundColor: "#fafafa" },
  monthTitle: { fontSize: 16, fontWeight: "700" },
  card: { flexDirection: "row", gap: 12, padding: 14, borderRadius: 16, backgroundColor: "#fff", borderWidth: 1, borderColor: "#eee", alignItems: "flex-start" },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#111" },
  meta: { color: "#666", lineHeight: 18 },
  muted: { color: "#666", lineHeight: 18 },
  delBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, borderColor: "#eee", alignItems: "center", justifyContent: "center", backgroundColor: "#fafafa" },
  delText: { fontSize: 16, color: "#111" },
  fab: { position: "absolute", right: 18, bottom: 18, width: 58, height: 58, borderRadius: 29, backgroundColor: "#111", alignItems: "center", justifyContent: "center", elevation: 6 },
});
