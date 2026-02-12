import React from "react";
import { View, Text, StyleSheet, Pressable, useWindowDimensions, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/auth-context";

export default function ProfileScreen() {
  const { logout } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();

  // Адаптивные размеры
  const isSmall = width < 380;
  const actionSize = isSmall ? 54 : 60; // кнопки поверх картинки
  const settingsSize = isSmall ? 40 : 42;

  // Отступы под iPhone/Android в рамках адаптивности
  const sideInset = Math.max(12, Math.min(18, Math.round(width * 0.04))); // левый отступ кнопок
  const gap = isSmall ? 12 : 14;

  const user = {
    fullName: "Имя Фамилия",
    rank: "Капитан Анимации",
    balance: 0,
  };

  return (
    <View style={styles.screen}>
      {/* Верхняя карточка */}
      <View style={styles.topCard}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={26} color="#0B1220" />
        </View>

        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.name} numberOfLines={1}>
            {user.fullName}
          </Text>

          <Text style={styles.sub} numberOfLines={1}>
            Звание: <Text style={styles.subStrong}>{user.rank}</Text>
          </Text>

          <View style={styles.balanceRow}>
            <View style={styles.pill}>
              <Ionicons name="sparkles" size={16} color="#0B1220" />
              <Text style={styles.pillText}>Баланс: {user.balance}</Text>
            </View>
          </View>
        </View>

        {/* Кнопка настроек справа */}
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

      {/* Область персонажа на всю ширину */}
      <View style={styles.characterSection}>
        {/* Картинка персонажа */}
        <View style={styles.characterImage}>
          <Image
            source={require("../../assets/avatars/character.png")}
            style={styles.characterAvatar}
            resizeMode="contain"
          />
        </View>

        {/* Кнопки поверх картинки, по левому краю, центрированы по вертикали */}
        <View
          pointerEvents="box-none"
          style={[
            styles.overlayLeft,
            {
              left: sideInset,
              gap,
            },
          ]}
        >
          <IconCircle
            size={actionSize}
            icon="bag-handle-outline"
            onPress={() => {
              // router.push("/shop");
            }}
            label="Магазин"
          />

          <IconCircle
            size={actionSize}
            icon="stats-chart-outline"
            onPress={() => {
              // router.push("/stats");
            }}
            label="Статистика"
          />

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
  screen: {
    flex: 1,
    padding: 16,
    gap: 14,
    backgroundColor: "#F5F7FB",
  },

  // Top card
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
  name: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0B1220",
  },
  sub: {
    color: "rgba(11, 18, 32, 0.7)",
    fontWeight: "600",
  },
  subStrong: {
    color: "#0B1220",
    fontWeight: "800",
  },
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
  pillText: {
    fontWeight: "800",
    color: "#0B1220",
  },
  topIconBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },

  // Character full-width area
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
  characterImage: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  characterAvatar: {
    width: "100%",
    height: "100%",
  },

  // Overlay buttons
  overlayLeft: {
    position: "absolute",
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },

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
