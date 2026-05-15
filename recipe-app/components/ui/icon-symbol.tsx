import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  // Navigation
  "house.fill": "home",
  "magnifyingglass": "search",
  "calendar": "calendar-today",
  "cart": "shopping-cart",
  "person.fill": "person",
  // Recipe
  "fork.knife": "restaurant",
  "clock": "schedule",
  "flame.fill": "local-fire-department",
  "star.fill": "star",
  "star": "star-outline",
  "heart.fill": "favorite",
  "heart": "favorite-border",
  "bookmark.fill": "bookmark",
  "bookmark": "bookmark-border",
  "play.fill": "play-arrow",
  "pause.fill": "pause",
  "checkmark.circle.fill": "check-circle",
  "checkmark.circle": "radio-button-unchecked",
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  "chevron.down": "expand-more",
  "chevron.up": "expand-less",
  "xmark": "close",
  "xmark.circle.fill": "cancel",
  "plus": "add",
  "minus": "remove",
  "plus.circle.fill": "add-circle",
  // Cooking
  "timer": "timer",
  "bell.fill": "notifications",
  "arrow.right": "arrow-forward",
  "arrow.left": "arrow-back",
  "slider.horizontal.3": "tune",
  "list.bullet": "list",
  "square.grid.2x2": "grid-view",
  "info.circle": "info",
  "crown.fill": "workspace-premium",
  "lock.fill": "lock",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "gearshape.fill": "settings",
  "moon.fill": "dark-mode",
  "sun.max.fill": "light-mode",
  "trash.fill": "delete",
  "square.and.arrow.up": "share",
  "chart.bar.fill": "bar-chart",
  "leaf.fill": "eco",
  "bolt.fill": "bolt",
  "drop.fill": "water-drop",
  "scalemass.fill": "scale",
  "bag.fill": "shopping-bag",
  "link": "link",
  "arrow.down.circle.fill": "download",
  "doc.text.fill": "description",
  "photo.fill": "image",
  "video.fill": "videocam",
} as IconMapping;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
