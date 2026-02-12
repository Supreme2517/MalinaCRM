import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable, useWindowDimensions, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/auth-context";

const AVATAR_IMAGES: Record<string, any> = {
  default1: require("../../assets/avatars/shop/avatar1.png"),
  default2: require("../../assets/avatars/shop/avatar2.png"),
  default3: require("../../assets/avatars/shop/avatar3.png"),
  default4: require("../../assets/avatars/shop/avatar4.png"),
  rare_1: require("../../assets/avatars/shop/avatar5.png"),
  rare_2: require("../../assets/avatars/shop/avatar6.png"),
  rare_3: require("../../assets/avatars/shop/avatar7.png"),
  rare_4: require("../../assets/avatars/shop/avatar8.png"),
  myth_1: require("../../assets/avatars/shop/avatar9.png"),
  myth_2: require("../../assets/avatars/shop/avatar10.png"),
  myth_3: require("../../assets/avatars/shop/avatar11.png"),
  myth_4: require("../../assets/avatars/shop/avatar12.png"),
  legend_1: require("../../assets/avatars/shop/avatar13.png"),
  legend_2: require("../../assets/avatars/shop/avatar14.png"),
  legend_3: require("../../assets/avatars/shop/avatar15.png"),
  legend_4: require("../../assets/avatars/shop/avatar16.png"),
};

export default function ProfileScreen() {
  const { logout, user } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const isSmall = width < 380;
  const actionSize = isSmall ? 54 : 60;
  const settingsSize = isSmall ? 40 : 42;

  const sideInset = Math.max(12, Math.min(18, Math.round(width * 0.04)));
  const gap = isSmall ? 12 : 14;

  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.login || "—";
  const rank = user?.rank || "—";
  const balance = Math.round((user?.coins ?? 0) * 100) / 100;

  const activeAvatarSource = useMemo(() => {
    const key = user?.avatarKey || "default";
    return AVATAR_IMAGES[key] ?? AVATAR_IMAGES["default"];
  }, [user?.avatarKey]);

  return (
    <View style={styles.screen}>
      <View style={styles.topCard}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={26} color="#0B1220" />
        </View>

        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.name} numberOfLines={1}>{fullName}</Text>

          <Text style={styles.sub} numberOfLines={1}>
            Звание: <Text style={styles.subStrong}>{rank}</Text>
          </Text>

          <View style={styles.balanceRow}>
            <View style={styles.pill}>
              <Ionicons name="sparkles" size={16} color="#0B1220" />
              <Text style={styles.pillText}>Баланс: {balance}</Text>
            </View>
          </View>
        </View>

        <Pressable
          onPress={() => {
            logout();
            router.replace("/auth/login");
          }}
          style={({ pressed }) => [
            styles.topIconBtn,
            { width: settingsSize, height: settingsSize, borderRadius: 14 },
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="log-out-outline" size={22} color="#0B1220" />
        </Pressable>
      </View>

      {/* Быстрые кнопки */}
      <View style={styles.quickRow}>
        <Pressable style={styles.quickBtn} onPress={() => router.push("/profile-settings")}>
          <Ionicons name="create-outline" size={18} color="#111" />
          <Text style={styles.quickText}>Настройки профиля</Text>
        </Pressable>

        {user?.role === "admin" && (
          <Pressable style={styles.quickBtn} onPress={() => router.push("/admin/users")}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#111" />
            <Text style={styles.quickText}>Права и роли</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.characterSection}>
        <View style={styles.characterImage}>
          {/* ✅ тут показываем выбранный аватар */}
          <Image
            source={activeAvatarSource}
            style={styles.characterAvatar}
            resizeMode="contain"
          />
        </View>

        <View
          pointerEvents="box-none"
          style={[
            styles.overlayLeft,
            { left: sideInset, gap },
          ]}
        >
          <IconCircle
            size={actionSize}
            icon="bag-handle-outline"
            onPress={() => router.push("/shop")}
            label="Магазин"
          />

          <IconCircle size={actionSize} icon="stats-chart-outline" onPress={() => {}} label="Статистика" />

          <IconCircle
            size={actionSize}
            icon="calendar-outline"
            onPress={() => {
              router.push({ pathname: "/(tabs)/orders", params: { mine: "1" } });
            }}
            label="Мои заказы"
          />
        </View>
      </View>
    </View>
  );
}

function IconCircle(props: {
  size: number;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.circleBtn,
        { width: props.size, height: props.size, borderRadius: Math.round(props.size * 0.36) },
        pressed && styles.pressed,
      ]}
      accessibilityLabel={props.label}
    >
      <Ionicons name={props.icon} size={22} color="#0B1220" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 14, backgroundColor: "#F5F7FB" },

  topCard: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF2FF",
  },
  name: { fontSize: 16, fontWeight: "900", color: "#0B1220" },
  sub: { color: "rgba(11, 18, 32, 0.7)", fontWeight: "600" },
  subStrong: { color: "#0B1220", fontWeight: "800" },
  balanceRow: { flexDirection: "row", marginTop: 2 },
  pill: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#ECFEFF",
  },
  pillText: { fontWeight: "800", color: "#0B1220" },
  topIconBtn: { alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFC" },

  quickRow: { flexDirection: "row", gap: 10 },
  quickBtn: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
  },
  quickText: { fontWeight: "900", color: "#111" },

  characterSection: {
    flex: 1,
    position: "relative",
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  characterImage: { flex: 1, backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center" },
  characterAvatar: { width: "100%", height: "100%" },

  overlayLeft: { position: "absolute", top: 0, bottom: 0, justifyContent: "center", alignItems: "center" },

  circleBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  pressed: { opacity: 0.7 },
});
