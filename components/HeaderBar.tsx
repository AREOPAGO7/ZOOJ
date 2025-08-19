import { MaterialCommunityIcons } from "@expo/vector-icons"
import { Image } from "expo-image"
import React from "react"
import { Pressable, Text, View } from "react-native"

type HeaderBarProps =
  | { variant: "logo"; tagline?: string; taglineColor?: string }
  | { variant: "title"; title: string; onBack: () => void }

export default function HeaderBar(props: HeaderBarProps) {
  if (props.variant === "logo") {
    const tagline = props.tagline ?? "L’amour se construit chaque jour"
    const taglineColor = props.taglineColor ?? "#6C6C6C"
    return (
      <View style={{ alignItems: "center", marginTop: 20 }}>
        <Image
          source={require("@/assets/images/pics/image.png")}
          style={{ width: 220, height: 180 }}
          contentFit="contain"
        />
        <Text
          style={{
            marginTop: 20,
            color: taglineColor,
            fontSize: 20,
            textAlign: "center",
          }}
        >
          {tagline}
        </Text>
      </View>
    )
  }

  return (
    <View style={{ width: "100%" }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, paddingHorizontal: 20 }}>
        <Pressable onPress={props.onBack} accessibilityRole="button">
          <MaterialCommunityIcons name="chevron-left" size={24} color="#1a1a1a" />
        </Pressable>
        <Text style={{ marginLeft: 8, fontSize: 18, fontWeight: "700", color: "#2D2D2D" }}>{props.title}</Text>
      </View>
      <View style={{ height: 1, backgroundColor: "#EFEFEF", marginBottom: 8 }} />
    </View>
  )
}


