import React, { useMemo } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, Image, Alert } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useAuth } from "../src/auth-context";
import { buyAvatarIfPossible, getOwnedAvatars } from "../src/db";

const AVATARS = [
  { key: "default1", title: "Обычный", price: 0, source: require("../assets/avatars/shop/avatar1.png") },
  { key: "default2", title: "Обычный", price: 0, source: require("../assets/avatars/shop/avatar2.png") },
  { key: "default3", title: "Обычный", price: 0, source: require("../assets/avatars/shop/avatar3.png") },
  { key: "default4", title: "Обычный", price: 0, source: require("../assets/avatars/shop/avatar4.png") },
  { key: "rare_1", title: "Редкий", price: 150, source: require("../assets/avatars/shop/avatar5.png") },
  { key: "rare_2", title: "Редкий", price: 150, source: require("../assets/avatars/shop/avatar6.png") },
  { key: "rare_3", title: "Редкий", price: 150, source: require("../assets/avatars/shop/avatar7.png") },
  { key: "rare_4", title: "Редкий", price: 150, source: require("../assets/avatars/shop/avatar8.png") },
  { key: "myth_1", title: "Мифический", price: 400, source: require("../assets/avatars/shop/avatar9.png") },
  { key: "myth_2", title: "Мифический", price: 400, source: require("../assets/avatars/shop/avatar10.png") },
  { key: "myth_3", title: "Мифический", price: 400, source: require("../assets/avatars/shop/avatar11.png") },
  { key: "myth_4", title: "Мифический", price: 400, source: require("../assets/avatars/shop/avatar12.png") },
  { key: "legend_1", title: "Легендарный", price: 900, source: require("../assets/avatars/shop/avatar13.png") },
  { key: "legend_2", title: "Легендарный", price: 900, source: require("../assets/avatars/shop/avatar14.png") },
  { key: "legend_3", title: "Легендарный", price: 900, source: require("../assets/avatars/shop/avatar15.png") },
  { key: "legend_4", title: "Легендарный", price: 900, source: require("../assets/avatars/shop/avatar16.png") },
];

export default function ShopScreen() {
  const router = useRouter();
  const { user, refresh } = useAuth();

  const owned = useMemo(() => {
    if (!user) return [];
    return getOwnedAvatars(user.id);
  }, [user?.id, user?.ownedAvatars]);

  const activeKey = user?.avatarKey || "default";
  const balance = Math.round((user?.coins ?? 0) * 100) / 100;

  const onPressCard = (avatarKey: string, price: number) => {
    if (!user) return;

    const res = buyAvatarIfPossible(user.id, avatarKey, price);

    if (!res.ok) {
      if (res.reason === "not_enough") {
        Alert.alert("Недостаточно монет", `Нужно ${price}, на балансе ${balance}.`);
        return;
      }
      Alert.alert("Ошибка", "Не удалось выполнить операцию.");
      return;
    }

    refresh();

    if (res.reason === "already_owned") {
      Alert.alert("Готово", "Аватар выбран.");
      return;
    }

    if (price > 0) Alert.alert("Покупка успешна", `Списано: ${price}`);
    else Alert.alert("Готово", "Аватар выбран.");
  };

  return (
    <>
      <Stack.Screen options={{ title: "Магазин аватаров" }} />

      <View style={styles.container}>
        <View style={styles.top}>
          <Text style={styles.h1}>Магазин</Text>
          <Text style={styles.balance}>Баланс: {balance}</Text>
        </View>

        <FlatList
          data={AVATARS}
          keyExtractor={(i) => i.key}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
          renderItem={({ item }) => {
            const isOwned = owned.includes(item.key) || item.key === "default";
            const isActive = activeKey === item.key;

            return (
              <Pressable
                onPress={() => onPressCard(item.key, item.price)}
                style={({ pressed }) => [
                  styles.card,
                  pressed && { opacity: 0.75 },
                  isOwned && styles.cardOwned,
                  isActive && styles.cardActive,
                ]}
              >
                <Image source={item.source} style={styles.img} resizeMode="contain" />
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>

                <Text style={styles.price}>
                  {isActive ? "Выбран" : isOwned ? "Куплено" : `${item.price} монет`}
                </Text>
              </Pressable>
            );
          }}
        />

        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>Назад</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#F5F7FB", gap: 12 },
  top: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  h1: { fontSize: 20, fontWeight: "900", color: "#111" },
  balance: { color: "#111", fontWeight: "900" },

  card: {
    flex: 1,
    minHeight: 190,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
    padding: 12,
    gap: 8,
  },
  cardOwned: { borderColor: "#111" },
  cardActive: { borderColor: "#111", borderWidth: 2 },

  img: { width: "100%", height: 110, borderRadius: 12, backgroundColor: "#fafafa" },
  title: { fontWeight: "900", color: "#111" },
  price: { color: "#666", fontWeight: "800" },

  backBtn: { marginTop: 6, paddingVertical: 14, borderRadius: 16, alignItems: "center", backgroundColor: "#111" },
  backText: { color: "#fff", fontWeight: "900" },
});
