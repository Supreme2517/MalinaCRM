import React from "react";
import { Redirect } from "expo-router";
import { useAuth } from "../src/auth-context";

export default function Index() {
  const { user } = useAuth();
  if (!user) return <Redirect href="/auth/login" />;
  return <Redirect href="/(tabs)" />;
}
