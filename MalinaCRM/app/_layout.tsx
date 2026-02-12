import { Stack } from "expo-router";
import { AuthProvider } from "../src/auth-context";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="profile-settings" />
        <Stack.Screen name="shop" />
      </Stack>
    </AuthProvider>
  );
}
