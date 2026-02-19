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
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getOrderById, updateOrder, getUsers, updateOrderLocation, Order } from "../../src/db";
import { useAuth } from "../../src/auth-context";
import { can } from "../../src/db";

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

function dateFromISO(iso: string) {
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d : new Date();
}

export default function OrderDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const orderId = Number(params.id);

  const { user } = useAuth();
  const canAssign = can(user, "canAssignParticipants");

  const allUsers = useMemo(() => getUsers(), []);
  const [participantsModalOpen, setParticipantsModalOpen] = useState(false);

  const [loaded, setLoaded] = useState(false);
  const [order, setOrderState] = useState<Order | null>(null);

  // Поля формы
  const [title, setTitle] = useState("");
  const [orderDate, setOrderDate] = useState<Date>(new Date());
  const [orderTime, setOrderTime] = useState<Date>(new Date());
  const [departTime, setDepartTime] = useState<Date | null>(null);
  const [officeArriveTime, setOfficeArriveTime] = useState<Date | null>(null);

  const [kidsCount, setKidsCount] = useState("");
  const [kidsAge, setKidsAge] = useState("");
  const [birthdayName, setBirthdayName] = useState("");
  const [address, setAddress] = useState("");
  const [priceTotal, setPriceTotal] = useState("");
  const [prepayment, setPrepayment] = useState("");

  const [description, setDescription] = useState("");

  // Участники
  const [participants, setParticipants] = useState<number[]>([]);
  const toggleParticipant = (id: number) => {
    setParticipants((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  // Picker
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>("orderDate");
  const [pickerMode, setPickerMode] = useState<"date" | "time">("date");

  const [showAndroidPicker, setShowAndroidPicker] = useState(false);
  const [iosModalVisible, setIosModalVisible] = useState(false);
  const [iosTempValue, setIosTempValue] = useState<Date>(new Date());

  // ✅ модалка добавления координат
  const [coordsModalOpen, setCoordsModalOpen] = useState(false);
  const [latText, setLatText] = useState("");
  const [lngText, setLngText] = useState("");

  const reloadOrder = () => {
    const o = getOrderById(orderId);
    if (o) setOrderState(o);
  };

  useEffect(() => {
    if (!Number.isFinite(orderId)) {
      Alert.alert("Ошибка", "Некорректный ID заказа.");
      router.back();
      return;
    }

    const o = getOrderById(orderId);
    if (!o) {
      Alert.alert("Не найдено", "Заказ не найден.");
      router.back();
      return;
    }

    setOrderState(o);

    const start = dateFromISO(o.startAtISO);

    setTitle(o.title);
    setOrderDate(start);
    setOrderTime(start);

    setDepartTime(o.departAtISO ? dateFromISO(o.departAtISO) : null);
    setOfficeArriveTime(o.officeArriveAtISO ? dateFromISO(o.officeArriveAtISO) : null);

    setKidsCount(o.kidsCount == null ? "" : String(o.kidsCount));
    setKidsAge(o.kidsAge ?? "");
    setBirthdayName(o.birthdayName ?? "");
    setAddress(o.address ?? "");
    setPriceTotal(o.priceTotal == null ? "" : String(o.priceTotal));
    setPrepayment(o.prepayment == null ? "" : String(o.prepayment));

    setDescription(o.description ?? "");
    setParticipants(o.participants ?? []);

    setLoaded(true);
  }, [orderId, router]);

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

  const buildStartAtISO = () => {
    const d = new Date(orderDate);
    d.setHours(orderTime.getHours(), orderTime.getMinutes(), 0, 0);
    return d.toISOString();
  };

  const buildSameDayISO = (t: Date) => {
    const d = new Date(orderDate);
    d.setHours(t.getHours(), t.getMinutes(), 0, 0);
    return d.toISOString();
  };

  const onSave = () => {
    if (!loaded) return;

    const t = title.trim();
    if (!t) {
      Alert.alert("Ошибка", "Название заказа не может быть пустым.");
      return;
    }

    updateOrder(orderId, {
      title: t,
      startAtISO: buildStartAtISO(),
      departAtISO: departTime ? buildSameDayISO(departTime) : null,
      officeArriveAtISO: officeArriveTime ? buildSameDayISO(officeArriveTime) : null,

      kidsCount: toNumberOrNull(kidsCount),
      kidsAge: kidsAge.trim() || null,
      birthdayName: birthdayName.trim() || null,
      address: address.trim() || null,

      priceTotal: toNumberOrNull(priceTotal),
      prepayment: toNumberOrNull(prepayment),

      description: description.trim() || null,

      participants: canAssign ? participants : undefined,
    });

    Alert.alert("Сохранено", "Изменения применены.");
    reloadOrder();
    router.back();
  };

  const handleShowOnMap = () => {
    const lat = order?.lat ?? null;
    const lng = order?.lng ?? null;

    if (lat == null || lng == null) {
      Alert.alert("Нет координат", "У заказа не заполнены координаты.", [
        { text: "ОК", style: "cancel" },
        {
          text: "Добавить координаты?",
          onPress: () => {
            setLatText("");
            setLngText("");
            setCoordsModalOpen(true);
          },
        },
      ]);
      return;
    }

    router.push({
      pathname: "/(tabs)/map",
      params: { focusId: String(orderId) },
    });
  };

  const saveCoords = () => {
    const lat = toNumberOrNull(latText);
    const lng = toNumberOrNull(lngText);

    if (lat == null || lng == null) {
      Alert.alert("Ошибка", "Координаты должны быть числами (lat и lng).");
      return;
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      Alert.alert("Ошибка", "Координаты вне диапазона. lat: -90..90, lng: -180..180");
      return;
    }

    updateOrderLocation(orderId, lat, lng);
    setCoordsModalOpen(false);
    reloadOrder();
    Alert.alert("Готово", "Координаты сохранены.");
  };

  const selectedUsers = participants
    .map((id) => allUsers.find((u) => u.id === id))
    .filter(Boolean);

  return (
    <>
      <Stack.Screen options={{ title: "Заказ" }} />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <Text style={styles.h1}>Карточка заказа</Text>

            {/* Основное */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Основное</Text>

              <Text style={styles.label}>Название заказа</Text>
              <TextInput value={title} onChangeText={setTitle} placeholder="Название" style={styles.input} />

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
                <Pressable
                  style={[styles.pickerBtn, { flex: 1 }]}
                  onPress={() => openPicker("officeArriveTime", "time")}
                >
                  <Text style={styles.pickerBtnText}>
                    {officeArriveTime ? toHM(officeArriveTime) : "Выбрать время"}
                  </Text>
                </Pressable>
                <Pressable style={styles.clearBtn} onPress={() => setOfficeArriveTime(null)}>
                  <Text style={styles.clearBtnText}>Очистить</Text>
                </Pressable>
              </View>

              {/* Участники */}
              <Text style={styles.label}>Участники</Text>
              <View style={styles.chipsRow}>
                {participants.length === 0 ? (
                  <Text style={{ color: "#666" }}>—</Text>
                ) : (
                  selectedUsers.map((u) => (
                    <View key={u!.id} style={styles.chip}>
                      <Text style={styles.chipText}>{u!.login}</Text>
                      {canAssign && (
                        <Pressable onPress={() => toggleParticipant(u!.id)}>
                          <Ionicons name="close" size={16} color="#111" />
                        </Pressable>
                      )}
                    </View>
                  ))
                )}
              </View>

              {canAssign ? (
                <Pressable style={styles.pickBtn} onPress={() => setParticipantsModalOpen(true)}>
                  <Ionicons name="people-outline" size={18} color="#111" />
                  <Text style={styles.pickBtnText}>Изменить участников</Text>
                </Pressable>
              ) : (
                <Text style={{ color: "#666" }}>Изменение участников доступно только админу.</Text>
              )}
            </View>

            {/* Дети и адрес */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Дети и адрес</Text>

              <Text style={styles.label}>Кол-во и возраст</Text>
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
              <TextInput
                value={birthdayName}
                onChangeText={setBirthdayName}
                placeholder="Например: Миша"
                style={styles.input}
              />

              <Text style={styles.label}>Адрес</Text>
              <TextInput value={address} onChangeText={setAddress} placeholder="Город, улица, дом" style={styles.input} />
            </View>

            {/* ✅ Показать на карте */}
            <Pressable style={styles.secondaryBtn} onPress={handleShowOnMap}>
              <Text style={styles.secondaryText}>Показать на карте</Text>
            </Pressable>

            {/* Финансы */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Финансы</Text>

              <Text style={styles.label}>Стоимость</Text>
              <TextInput
                value={priceTotal}
                onChangeText={setPriceTotal}
                placeholder="Например: 25000"
                keyboardType="numeric"
                style={styles.input}
              />

              <Text style={styles.label}>Предоплата</Text>
              <TextInput
                value={prepayment}
                onChangeText={setPrepayment}
                placeholder="Например: 5000"
                keyboardType="numeric"
                style={styles.input}
              />

              <Text style={styles.hint}>
                Остаток:{" "}
                {(() => {
                  const total = toNumberOrNull(priceTotal) ?? 0;
                  const pre = toNumberOrNull(prepayment) ?? 0;
                  return Math.max(0, total - pre);
                })()}
              </Text>
            </View>

            {/* Описание */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Описание</Text>
              <Text style={styles.label}>Комментарий / детали заказа</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Например: тема Холодное сердце, 2 аниматора, вынос торта..."
                style={[styles.input, styles.textArea]}
                multiline
                textAlignVertical="top"
              />
            </View>

            {/* Кнопки */}
            <View style={styles.actionsRow}>
              <Pressable style={styles.secondaryBtn} onPress={() => router.back()}>
                <Text style={styles.secondaryText}>Назад</Text>
              </Pressable>
              <Pressable style={styles.primaryBtn} onPress={onSave}>
                <Text style={styles.primaryText}>Сохранить</Text>
              </Pressable>
            </View>

            {/* ANDROID picker */}
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

            {/* ✅ Modal: добавить координаты (в карточке не видно, только по кнопке) */}
            <Modal visible={coordsModalOpen} transparent animationType="fade" onRequestClose={() => setCoordsModalOpen(false)}>
              <Pressable style={styles.coordsBackdrop} onPress={() => setCoordsModalOpen(false)} />
              <View style={styles.coordsModal}>
                <Text style={styles.coordsTitle}>Добавить координаты</Text>

                <TextInput
                  value={latText}
                  onChangeText={setLatText}
                  placeholder="lat (например 55.7539)"
                  keyboardType="numeric"
                  style={styles.input}
                />
                <TextInput
                  value={lngText}
                  onChangeText={setLngText}
                  placeholder="lng (например 37.6208)"
                  keyboardType="numeric"
                  style={styles.input}
                />

                <View style={{ flexDirection: "row", gap: 10 }}>
                  <Pressable style={styles.secondaryBtn} onPress={() => setCoordsModalOpen(false)}>
                    <Text style={styles.secondaryText}>Отмена</Text>
                  </Pressable>
                  <Pressable style={styles.primaryBtn} onPress={saveCoords}>
                    <Text style={styles.primaryText}>Сохранить</Text>
                  </Pressable>
                </View>
              </View>
            </Modal>

          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 24 },
  h1: { fontSize: 20, fontWeight: "900", color: "#111" },

  card: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
    gap: 10,
  },

  sectionTitle: { fontSize: 14, fontWeight: "900", color: "#111" },
  label: { fontSize: 12, color: "#666", marginTop: 6, marginBottom: 6 },
  hint: { color: "#666", marginTop: 6 },

  input: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fafafa",
    color: "#111",
    marginBottom: 8,
  },
  textArea: { minHeight: 110 },

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

  actionsRow: { flexDirection: "row", gap: 10, marginTop: 2 },
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

  coordsBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.25)" },
  coordsModal: {
    position: "absolute",
    left: 16,
    right: 16,
    top: "35%",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#eee",
  },
  coordsTitle: { fontSize: 16, fontWeight: "900", color: "#111", marginBottom: 10 },
});
