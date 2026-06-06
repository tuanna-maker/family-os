import React, { Component, type ReactNode } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, padding: 24, justifyContent: "center", backgroundColor: "#fff" }}>
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#111", marginBottom: 8 }}>
            Ứng dụng gặp lỗi
          </Text>
          <ScrollView style={{ maxHeight: 240, marginBottom: 16 }}>
            <Text style={{ fontSize: 13, color: "#666" }}>{this.state.error.message}</Text>
          </ScrollView>
          <TouchableOpacity
            onPress={() => this.setState({ error: null })}
            style={{ backgroundColor: "#2563eb", padding: 14, borderRadius: 12, alignItems: "center" }}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}
