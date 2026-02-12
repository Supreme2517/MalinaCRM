import React, { useEffect, useMemo, useState } from "react";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import { createOrder, getUsers } from "../src/db";
import { useAuth } from "../src/auth-context";
import { can } from "../src/db";

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toYMD(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function toHM(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function toNumberOrNull(s: string) {
  const t = s.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

type PickerTarget = "orderDate" | "orderTime" | "departTime" | "officeArriveTime";

export default function OrdersAdd() {
  const router = useRouter();
  const { user } = useAuth();

  const canAssign = can(user, "canAssignParticipants");
  const canCreate = can(user, "canCreateOrders");

  // Если нет пользователя — на логин
  if (!user) return <Redirect href="/auth/login" />;

  // Нельзя создавать — показываем алерт ОДИН раз и уходим назад
  useEffect(() => {
    if (!canCreate) {
      Alert.alert("Нет прав", "У тебя нет права создавать заказы.", [
        { text: "Ок", onPress: () => router.back() },
      ]);
    }
  }, [canCreate, router]);

  // Рендерим заглушку, пока уходим назад
  if (!canCreate) return <View style={{ flex: 1, backgroundColor: "#F5F7FB" }} />;

  const allUsers = useMemo(() => getUsers(), []);

  const [title, setTitle] = useState("");

  const [orderDate, setOrderDate] = useState<Date>(new Date());
  const [orderTime, setOrderTime] = useState<Date>(new Date());
  const [departTime, setDepartTime] = useState<Date | null>(null);
  const [officeArriveTime, setOfficeArriveTime] = useState<Date | null>(null);

  const [kidsCount, setKidsCount] = useState("");
  const [kidsAge, setKidsAge] = useState("");
  const [birthdayName, setBirthdayName] = useState("");
  const [costume, setCostume] = useState("");
  const [address, setAddress] = useState("");
  const [priceTotal, setPriceTotal] = useState("");
  const [prepayment, setPrepayment] = useState("");

  // участники
  const [participants, setParticipants] = useState<number[]>([]);
  const [participantsModalOpen, setParticipantsModalOpen] = useState(false);

  // Picker state
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>("orderDate");
  const [pickerMode, setPickerMode] = useState<"date" | "time">("date");

  // Android
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);

  // iOS modal
  const [iosModalVisible, setIosModalVisible] = useState(false);
  const [iosTempValue, setIosTempValue] = useState<Date>(new Date());

  const currentValue = useMemo(() => {
    if (pickerTarget === "orderDate") return orderDate;
    if (pickerTarget === "orderTime") return orderTime;
    if (pickerTarget === "departTime") return departTime ?? new Date();
    return officeArriveTime ?? new Date();
  }, [pickerTarget, orderDate, orderTime, departTime, officeArriveTime]);

  const applyValue = (selected: Date) => {
    if (pickerTarget === "orderDate") setOrderDate(selected);
    if (pickerTarget === "orderTime") setOrderTime(selected);
    if (pickerTarget === "departTime") setDepartTime(selected);
    if (pickerTarget === "officeArriveTime") setOfficeArriveTime(selected);
  };

  const openPicker = (target: PickerTarget, mode: "date" | "time") => {
    setPickerTarget(target);
    setPickerMode(mode);

    if (Platform.OS === "ios") {
      const initial =
        target === "orderDate"
          ? orderDate
          : target === "orderTime"
          ? orderTime
          : target === "departTime"
          ? departTime ?? new Date()
          : officeArriveTime ?? new Date();

      setIosTempValue(initial);
      setIosModalVisible(true);
      return;
    }
    setShowAndroidPicker(true);
  };

  const onAndroidChange = (_event: DateTimePickerEvent, selected?: Date) => {
    setShowAndroidPicker(false);
    if (!selected) return;
    applyValue(selected);
  };

  const onIosChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (!selected) return;
    setIosTempValue(selected);
  };

  const iosCancel = () => setIosModalVisible(false);
  const iosDone = () => {
    applyValue(iosTempValue);
    setIosModalVisible(false);
  };

  const toggleParticipant = (id: number) => {
    setParticipants((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const save = () => {
    const t = title.trim();
    if (!t) return Alert.alert("Ошибка", "Заполни название заказа.");

    createOrder({
      title: t,
      dateYMD: toYMD(orderDate),
      timeHM: toHM(orderTime),
      departTimeHM: departTime ? toHM(departTime) : undefined,
      officeArriveTimeHM: officeArriveTime ? toHM(officeArriveTime) : undefined,

      kidsCount: toNumberOrNull(kidsCount),
      kidsAge: kidsAge.trim() || null,
      birthdayName: birthdayName.trim() || null,
      costume: costume.trim() || null,
      address: address.trim() || null,

      priceTotal: toNumberOrNull(priceTotal),
      prepayment: toNumberOrNull(prepayment),

      participants: canAssign ? participants : [], // только админ/разрешённые назначают
    });

    Alert.alert("Готово", "Заказ добавлен.");
    router.back();
  };

  const selectedUsers = participants
    .map((id) => allUsers.find((u) => u.id === id))
    .filter(Boolean);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.h1}>Добавить заказ</Text>

          <View style={styles.form}>
            <Text style={styles.label}>Название заказа</Text>
            <TextInput value={title} onChangeText={setTitle} placeholder="Например: День Рождения" style={styles.input} />

            <Text style={styles.label}>Дата заказа</Text>
            <Pressable style={styles.pickerBtn} onPress={() => openPicker("orderDate", "date")}>
              <Text style={styles.pickerBtnText}>{toYMD(orderDate)}</Text>
            </Pressable>

            <Text style={styles.label}>Время заказа</Text>
            <Pressable style={styles.pickerBtn} onPress={() => openPicker("orderTime", "time")}>
              <Text style={styles.pickerBtnText}>{toHM(orderTime)}</Text>
            </Pressable>

            <Text style={styles.label}>Время выезда</Text>
            <View style={styles.pickerRow}>
              <Pressable style={[styles.pickerBtn, { flex: 1 }]} onPress={() => openPicker("departTime", "time")}>
                <Text style={styles.pickerBtnText}>{departTime ? toHM(departTime) : "Выбрать время"}</Text>
              </Pressable>
              <Pressable style={styles.clearBtn} onPress={() => setDepartTime(null)}>
                <Text style={styles.clearBtnText}>Очистить</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>Время прихода в офис</Text>
            <View style={styles.pickerRow}>
              <Pressable style={[styles.pickerBtn, { flex: 1 }]} onPress={() => openPicker("officeArriveTime", "time")}>
                <Text style={styles.pickerBtnText}>
                  {officeArriveTime ? toHM(officeArriveTime) : "Выбрать время"}
                </Text>
              </Pressable>
              <Pressable style={styles.clearBtn} onPress={() => setOfficeArriveTime(null)}>
                <Text style={styles.clearBtnText}>Очистить</Text>
              </Pressable>
            </View>

            {/* УЧАСТНИКИ */}
            <Text style={styles.label}>Участники</Text>

            {canAssign ? (
              <>
                <View style={styles.chipsRow}>
                  {participants.length === 0 ? (
                    <Text style={{ color: "#666" }}>Не выбрано</Text>
                  ) : (
                    selectedUsers.map((u) => (
                      <View key={u!.id} style={styles.chip}>
                        <Text style={styles.chipText}>{u!.login}</Text>
                        <Pressable onPress={() => toggleParticipant(u!.id)}>
                          <Ionicons name="close" size={16} color="#111" />
                        </Pressable>
                      </View>
                    ))
                  )}
                </View>

                <Pressable style={styles.pickBtn} onPress={() => setParticipantsModalOpen(true)}>
                  <Ionicons name="people-outline" size={18} color="#111" />
                  <Text style={styles.pickBtnText}>Выбрать участников</Text>
                </Pressable>
              </>
            ) : (
              <Text style={{ color: "#666" }}>Назначение участников доступно только админу.</Text>
            )}

            <Text style={styles.label}>Кол-во и возраст деток</Text>
            <View style={styles.row2}>
              <TextInput
                value={kidsCount}
                onChangeText={setKidsCount}
                placeholder="Кол-во"
                keyboardType="numeric"
                style={[styles.input, { flex: 1 }]}
              />
              <TextInput
                value={kidsAge}
                onChangeText={setKidsAge}
                placeholder="Возраст (например 7-8)"
                style={[styles.input, { flex: 1 }]}
              />
            </View>

            <Text style={styles.label}>Имя именинника</Text>
            <TextInput value={birthdayName} onChangeText={setBirthdayName} placeholder="Например: Миша" style={styles.input} />

            <Text style={styles.label}>Костюм</Text>
            <TextInput value={costume} onChangeText={setCostume} placeholder="Например: Человек-паук" style={styles.input} />

            <Text style={styles.label}>Адрес</Text>
            <TextInput value={address} onChangeText={setAddress} placeholder="Город, улица, дом" style={styles.input} />

            <Text style={styles.label}>Стоимость заказа</Text>
            <TextInput value={priceTotal} onChangeText={setPriceTotal} placeholder="Например: 25000" keyboardType="numeric" style={styles.input} />

            <Text style={styles.label}>Предоплата</Text>
            <TextInput value={prepayment} onChangeText={setPrepayment} placeholder="Например: 5000" keyboardType="numeric" style={styles.input} />

            <View style={styles.actionsRow}>
              <Pressable style={styles.secondaryBtn} onPress={() => router.back()}>
                <Text style={styles.secondaryText}>Отмена</Text>
              </Pressable>
              <Pressable style={styles.primaryBtn} onPress={save}>
                <Text style={styles.primaryText}>Сохранить</Text>
              </Pressable>
            </View>
          </View>

          {/* Android picker */}
          {showAndroidPicker && Platform.OS !== "ios" && (
            <DateTimePicker value={currentValue} mode={pickerMode} display="default" onChange={onAndroidChange} />
          )}

          {/* iOS date/time modal */}
          {Platform.OS === "ios" && (
            <Modal visible={iosModalVisible} transparent animationType="slide" onRequestClose={iosCancel}>
              <Pressable style={styles.modalBackdrop} onPress={iosCancel} />
              <View style={styles.modalSheet}>
                <View style={styles.modalHeader}>
                  <Pressable onPress={iosCancel} style={styles.modalHeaderBtn}>
                    <Text style={styles.modalHeaderText}>Отмена</Text>
                  </Pressable>
                  <Text style={styles.modalTitle}>{pickerMode === "date" ? "Выберите дату" : "Выберите время"}</Text>
                  <Pressable onPress={iosDone} style={styles.modalHeaderBtn}>
                    <Text style={[styles.modalHeaderText, { fontWeight: "800" }]}>Готово</Text>
                  </Pressable>
                </View>
                <DateTimePicker value={iosTempValue} mode={pickerMode} display="spinner" onChange={onIosChange} />
              </View>
            </Modal>
          )}

          {/* Participants bottom sheet */}
          <Modal
            visible={participantsModalOpen}
            transparent
            animationType="slide"
            onRequestClose={() => setParticipantsModalOpen(false)}
          >
            <Pressable style={styles.sheetBackdrop} onPress={() => setParticipantsModalOpen(false)} />
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>Участники</Text>

              <ScrollView contentContainerStyle={{ paddingBottom: 10 }}>
                {allUsers.map((u) => {
                  const active = participants.includes(u.id);
                  return (
                    <Pressable
                      key={u.id}
                      onPress={() => toggleParticipant(u.id)}
                      style={[styles.userRow, active && styles.userRowActive]}
                    >
                      <Text style={{ fontWeight: "800", color: "#111" }}>{u.login}</Text>
                      <Ionicons name={active ? "checkbox" : "square-outline"} size={22} color="#111" />
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Pressable style={styles.sheetDone} onPress={() => setParticipantsModalOpen(false)}>
                <Text style={styles.sheetDoneText}>Готово</Text>
              </Pressable>
            </View>
          </Modal>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 24 },
  h1: { fontSize: 20, fontWeight: "900", color: "#111" },

  form: {
    gap: 10,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
  },

  label: { fontSize: 12, color: "#666", marginTop: 6, marginBottom: 6 },

  input: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fafafa",
    color: "#111",
  },

  pickerBtn: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fafafa",
  },
  pickerBtnText: { fontSize: 14, color: "#111", fontWeight: "700" },

  pickerRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
  },
  clearBtnText: { fontWeight: "900", color: "#111" },

  row2: { flexDirection: "row", gap: 10 },

  // Chips
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#ECFEFF",
    borderWidth: 1,
    borderColor: "#BFEAF0",
  },
  chipText: { fontWeight: "800", color: "#111" },

  pickBtn: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    backgroundColor: "#fff",
  },
  pickBtnText: { fontWeight: "900", color: "#111" },

  actionsRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  primaryBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#111",
  },
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

  // iOS date/time modal styles
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.25)" },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalHeaderBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  modalHeaderText: { fontSize: 16, color: "#111" },
  modalTitle: { fontSize: 14, color: "#666", fontWeight: "800" },

  // Participants sheet
  sheetBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.25)" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    maxHeight: "70%",
  },
  sheetTitle: { fontSize: 16, fontWeight: "900", marginBottom: 10, color: "#111" },

  userRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fafafa",
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userRowActive: { backgroundColor: "#ECFEFF", borderColor: "#111" },

  sheetDone: {
    marginTop: 8,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#111",
  },
  sheetDoneText: { color: "#fff", fontWeight: "900" },
});
