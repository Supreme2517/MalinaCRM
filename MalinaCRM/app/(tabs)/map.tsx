import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import { Picker } from "@react-native-picker/picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { listAllOrders, Order } from "../../src/db";

type FilterKey = "all" | "today" | "tomorrow" | "thisWeek" | "thisMonth";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function inRange(iso: string, a: Date, b: Date) {
  const t = new Date(iso).getTime();
  return t >= a.getTime() && t < b.getTime();
}

export default function MapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ focusId?: string }>();
  const focusId = params.focusId ? Number(params.focusId) : null;

  const [filter, setFilter] = useState<FilterKey>("all");
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    setOrders(listAllOrders());
  }, []);

  const ordersWithCoords = useMemo(() => {
    return orders.filter((o) => o.lat != null && o.lng != null);
  }, [orders]);

  const filtered = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);

    if (filter === "all") return ordersWithCoords;

    if (filter === "today") {
      return ordersWithCoords.filter((o) => inRange(o.startAtISO, today, addDays(today, 1)));
    }

    if (filter === "tomorrow") {
      const t = addDays(today, 1);
      return ordersWithCoords.filter((o) => inRange(o.startAtISO, t, addDays(t, 1)));
    }

    if (filter === "thisWeek") {
      // понедельник текущей недели
      const day = today.getDay(); // 0=вс
      const diff = (day === 0 ? 6 : day - 1);
      const monday = addDays(today, -diff);
      const nextMonday = addDays(monday, 7);
      return ordersWithCoords.filter((o) => inRange(o.startAtISO, monday, nextMonday));
    }

    // thisMonth
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    return ordersWithCoords.filter((o) => inRange(o.startAtISO, start, end));
  }, [ordersWithCoords, filter]);

  const initialRegion: Region = useMemo(() => {
    // если есть фокус — центрируемся на нём
    if (focusId) {
      const o = ordersWithCoords.find((x) => x.id === focusId);
      if (o?.lat != null && o?.lng != null) {
        return { latitude: o.lat, longitude: o.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 };
      }
    }

    // иначе — на первый заказ, либо дефолт
    const first = filtered[0] ?? ordersWithCoords[0];
    if (first?.lat != null && first?.lng != null) {
      return { latitude: first.lat, longitude: first.lng, latitudeDelta: 0.2, longitudeDelta: 0.2 };
    }

    // Москва по умолчанию
    return { latitude: 55.751244, longitude: 37.618423, latitudeDelta: 0.5, longitudeDelta: 0.5 };
  }, [focusId, ordersWithCoords, filtered]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Карта заказов</Text>

      <View style={styles.pickerWrap}>
        <Picker selectedValue={filter} onValueChange={(v) => setFilter(v)} style={styles.picker}>
          <Picker.Item label="Все" value="all" />
          <Picker.Item label="Сегодня" value="today" />
          <Picker.Item label="Завтра" value="tomorrow" />
          <Picker.Item label="Эта неделя" value="thisWeek" />
          <Picker.Item label="Этот месяц" value="thisMonth" />
        </Picker>
      </View>

      <MapView style={styles.map} initialRegion={initialRegion}>
        {filtered.map((o) => (
          <Marker
            key={o.id}
            coordinate={{ latitude: o.lat!, longitude: o.lng! }}
            title={o.title}
            description={o.address ?? ""}
            onCalloutPress={() => router.push({ pathname: "/orders/[id]", params: { id: String(o.id) } })}
          />
        ))}
      </MapView>

      {filtered.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Нет заказов с координатами под выбранный фильтр.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 10, backgroundColor: "#F5F7FB" },
  title: { fontSize: 20, fontWeight: "900", color: "#111" },

  pickerWrap: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  picker: { height: 44 },

  map: { flex: 1, borderRadius: 18, overflow: "hidden" },

  empty: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
  },
  emptyText: { color: "#666", fontWeight: "700" },
});
