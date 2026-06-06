import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Shield, LogIn, LogOut, MapPin, AlertTriangle, Users } from "lucide-react-native";
import { Link } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@mobile/hooks/useAuth";
import { useGuardNotifications } from "@mobile/hooks/useGuardNotifications";
import { listOpenResidentRequests } from "@guard/api/security";
import { getActiveShift } from "@guard/api/guard-shifts";
import { initialsFromName, shiftLabel, shiftTimeRange } from "@mobile/utils/guardFormat";
import { useTabScrollPadding } from "@mobile/hooks/useTabScrollPadding";
import { GuardHeaderActions } from "@mobile/components/GuardHeaderActions";

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const tabPad = useTabScrollPadding();
  const { user } = useAuth();
  const { unread } = useGuardNotifications();
  const { data: openRequests = [] } = useQuery({
    queryKey: ["guard-open-requests"],
    queryFn: () => listOpenResidentRequests(),
    refetchInterval: 60_000,
  });
  const { data: activeShift } = useQuery({
    queryKey: ["guard-active-shift"],
    queryFn: () => getActiveShift(),
    refetchInterval: 30_000,
  });

  const fullName =
    (user?.user_metadata as { full_name?: string } | null)?.full_name ?? "Nhân viên bảo vệ";
  const initials = initialsFromName(fullName);
  const onDuty = activeShift?.status === "checked_in";
  const shiftLine = activeShift
    ? `${shiftLabel(activeShift.shift_type)}: ${shiftTimeRange(activeShift.shift_type)}`
    : "Chưa có ca trực hôm nay";

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={tabPad}>
      <View
        className="px-5 pb-4 flex-row items-start justify-between bg-background"
        style={{ paddingTop: Math.max(insets.top + 12, 48) }}
      >
        <View className="flex-row items-center gap-3 flex-1 min-w-0 mr-3">
          <LinearGradient
            colors={["#22C55E", "#2563EB"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Shield size={20} color="white" />
          </LinearGradient>
          <View className="flex-1 min-w-0">
            <Text className="text-[15px] font-bold tracking-wide text-foreground">BẢO VỆ</Text>
            <Text className="text-[10px] text-muted-foreground uppercase tracking-wider">
              STOS Residence
            </Text>
          </View>
        </View>
        <GuardHeaderActions unread={unread} />
      </View>

      <View className="px-5 mt-4 mb-4">
        <View className="flex-row items-center gap-4 bg-card p-4 rounded-2xl shadow-sm border border-border/50">
          <LinearGradient
            colors={["#3B82F6", "#2563EB"]}
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text className="text-white font-bold text-base">{initials}</Text>
          </LinearGradient>
          <View className="flex-1">
            <Text className="text-xs text-muted-foreground">Xin chào,</Text>
            <Text className="text-lg font-bold text-foreground" numberOfLines={1}>
              {fullName}
            </Text>
            <Text className="text-[11px] text-muted-foreground mt-0.5">{shiftLine}</Text>
            <View className="flex-row items-center mt-1">
              <View
                className={`h-2 w-2 rounded-full mr-1.5 ${onDuty ? "bg-green-500" : "bg-gray-300"}`}
              />
              <Text
                className={`text-[11px] font-medium ${onDuty ? "text-green-600" : "text-muted-foreground"}`}
              >
                {onDuty ? "Đang làm việc" : "Chưa vào ca"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View className="px-5 mt-2 flex-row flex-wrap justify-between">
        <Link href="/check-in" asChild>
          <TouchableOpacity className="w-[48%] mb-4" activeOpacity={0.9}>
            <LinearGradient
              colors={["#22C55E", "#16A34A"]}
              style={{
                borderRadius: 24,
                padding: 16,
                alignItems: "center",
                minHeight: 130,
                justifyContent: "center",
              }}
            >
              <View className="h-12 w-12 rounded-2xl bg-white/20 items-center justify-center mb-3">
                <LogIn size={24} color="white" />
              </View>
              <Text className="text-sm font-bold text-white tracking-wide">VÀO CA</Text>
              <Text className="text-[11px] text-white/80 mt-0.5">Check-in</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Link>

        <Link href="/check-out" asChild>
          <TouchableOpacity className="w-[48%] mb-4" activeOpacity={0.9}>
            <LinearGradient
              colors={["#F43F5E", "#E11D48"]}
              style={{
                borderRadius: 24,
                padding: 16,
                alignItems: "center",
                minHeight: 130,
                justifyContent: "center",
              }}
            >
              <View className="h-12 w-12 rounded-2xl bg-white/20 items-center justify-center mb-3">
                <LogOut size={24} color="white" />
              </View>
              <Text className="text-sm font-bold text-white tracking-wide">KẾT THÚC CA</Text>
              <Text className="text-[11px] text-white/80 mt-0.5">Check-out</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Link>

        <Link href="/patrol" asChild>
          <TouchableOpacity className="w-[48%] mb-4" activeOpacity={0.9}>
            <LinearGradient
              colors={["#3B82F6", "#2563EB"]}
              style={{
                borderRadius: 24,
                padding: 16,
                alignItems: "center",
                minHeight: 130,
                justifyContent: "center",
              }}
            >
              <View className="h-12 w-12 rounded-2xl bg-white/20 items-center justify-center mb-3">
                <MapPin size={24} color="white" />
              </View>
              <Text className="text-sm font-bold text-white tracking-wide">TUẦN TRA</Text>
              <Text className="text-[11px] text-white/80 mt-0.5">Điểm danh</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Link>

        <Link href="/incident" asChild>
          <TouchableOpacity className="w-[48%] mb-4" activeOpacity={0.9}>
            <LinearGradient
              colors={["#F59E0B", "#D97706"]}
              style={{
                borderRadius: 24,
                padding: 16,
                alignItems: "center",
                minHeight: 130,
                justifyContent: "center",
              }}
            >
              <View className="h-12 w-12 rounded-2xl bg-white/20 items-center justify-center mb-3">
                <AlertTriangle size={24} color="white" />
              </View>
              <Text className="text-sm font-bold text-white tracking-wide">BÁO SỰ CỐ</Text>
              <Text className="text-[11px] text-white/80 mt-0.5">Gửi báo cáo</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Link>
      </View>

      <View className="px-5 mt-2 mb-8">
        <Link href="/requests" asChild>
          <TouchableOpacity activeOpacity={0.9}>
            <LinearGradient
              colors={["#8B5CF6", "#6D28D9"]}
              style={{ flexDirection: "row", alignItems: "center", borderRadius: 24, padding: 20 }}
            >
              <View className="h-12 w-12 rounded-2xl bg-white/20 items-center justify-center mr-4">
                <Users size={24} color="white" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-white tracking-wide">
                  YÊU CẦU CƯ DÂN
                </Text>
                <Text className="text-[12px] text-white/90 mt-0.5">
                  {openRequests.length > 0
                    ? `${openRequests.length} yêu cầu đang mở · Xem & xử lý`
                    : "Xem & xử lý"}
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Link>
      </View>
    </ScrollView>
  );
}
