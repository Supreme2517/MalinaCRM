import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabLayout() {
  const router = useRouter();

  return (
    <Tabs
      initialRouteName="index" // ✅ стартуем с Профиля
      screenOptions={({ route }) => ({
        headerTitleAlign: "center",
        headerStyle: { height: 44 },
        headerTitleStyle: { fontSize: 16, fontWeight: "600" },
        headerShadowVisible: false,

        tabBarActiveTintColor: "#111",
        tabBarInactiveTintColor: "#777",
        tabBarStyle: { height: 52, paddingTop: 0, paddingBottom: 6 },
        tabBarSafeAreaInsets: { bottom: 4 },
        tabBarLabelStyle: { fontSize: 12, marginTop: 0 },
        tabBarIconStyle: { marginTop: 0 },

        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any = "ellipse-outline";

          if (route.name === "orders")
            iconName = focused ? "list" : "list-outline";

          if (route.name === "index")
            iconName = focused
              ? "person-circle"
              : "person-circle-outline";

          if (route.name === "future")
            iconName = focused
              ? "sparkles"
              : "sparkles-outline";

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen
        name="orders"
        options={{ title: "Заказы", headerTitle: "Заказы" }}
        listeners={{
          tabPress: (e) => {
            // ✅ таб "Заказы" ВСЕГДА открывает все заказы (без mine)
            e.preventDefault();
            router.replace("/(tabs)/orders");
          },
        }}
      />

      <Tabs.Screen
        name="index"
        options={{ title: "Профиль", headerTitle: "Профиль" }}
      />

      <Tabs.Screen
        name="map"
        options={{ title: "Карта", headerTitle: "Карта" }}
      />
    </Tabs>
  );
}
