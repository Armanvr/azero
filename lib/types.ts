export type ItemRarity = "common" | "uncommon" | "rare" | "epic" | "legendary" | "purple";

export type Difficulty =
  | "LFR"
  | "Normal"
  | "Heroïque"
  | "Mythique"
  | "M+"
  | "Craft"
  | "Réputation"
  | "Quête";

export type EquipmentSlot =
  | "head"
  | "neck"
  | "shoulders"
  | "back"
  | "chest"
  | "wrist"
  | "tabard"
  | "hands"
  | "gloves"
  | "belt"
  | "legs"
  | "boots"
  | "ring1"
  | "ring2"
  | "trinket1"
  | "trinket2"
  | "mainhand"
  | "offhand";

export type WowClass =
  | "Paladin"
  | "Mage"
  | "Chasseur"
  | "Guerrier"
  | "Prêtre"
  | "Démoniste"
  | "Chaman"
  | "Druide"
  | "Voleur"
  | "Moine"
  | "Chasseur de démons"
  | "Chevalier de la mort"
  | "Evocateur";

export interface ItemSource {
  boss: string;
  instance: string;
  difficulty: Difficulty;
  ilvlRange: string;
  dropRate: string;
}

export interface ItemDetails {
  type: string;
  slot: string;
  stats: string[];
  sources: ItemSource[];
}

export interface EquippedItem {
  id: string;
  label: string;
  item: string;
  ilvl: number;
  enchant: string | null;
  rarity: ItemRarity;
}

export interface ObtainableItemData {
  name: string;
  rarity: ItemRarity;
  isSet: boolean;
  count: number;
  ilvl: number;
}

export interface ObtainableCategory {
  id: string;
  label: string;
  items: ObtainableItemData[];
}

export interface Character {
  id: number;
  name: string;
  title: string;
  race: string;
  class: WowClass;
  spec: string;
  ilvl: number;
  realm: string;
  guild: string;
  faction: "horde" | "alliance";
  score: number;
  gold: number;
  color: string;
  slotsLeft: EquippedItem[];
  slotsRight: EquippedItem[];
}

export interface User {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  createdAt: string;
}

export interface SessionPayload {
  userId: string;
  email: string;
  username: string;
  [key: string]: unknown;
}

export interface SelectedItem {
  name: string;
  ilvl: number;
  rarity: ItemRarity;
  enchant?: string | null;
  slot?: string;
  isSet?: boolean;
}
