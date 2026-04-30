import type {
  Character,
  EquippedItem,
  ItemDetails,
  ObtainableCategory
} from "./types";

const KRATOS_LEFT: EquippedItem[] = [
  { id: "head",      label: "Tête",     item: "Regard du verdict effulgent",        ilvl: 289, enchant: "Enchantement de casque",    rarity: "epic" },
  { id: "neck",      label: "Cou",      item: "Amulette sin'dorei ouvragée",        ilvl: 285, enchant: null,                        rarity: "epic" },
  { id: "shoulders", label: "Épaules",  item: "Garde providentielle du verdict",    ilvl: 276, enchant: "Enchantement d'épaulières", rarity: "epic" },
  { id: "back",      label: "Dos",      item: "Voile d'adhésion en soie",           ilvl: 285, enchant: null,                        rarity: "rare" },
  { id: "chest",     label: "Torse",    item: "Harnois de guerre divin du verdict", ilvl: 289, enchant: "Enchantement de plastron",  rarity: "epic" },
  { id: "wrist",     label: "Poignets", item: "Ruban de Bijou",                     ilvl: 1,   enchant: null,                        rarity: "common" },
  { id: "tabard",    label: "Tabard",   item: "Tabard du porteur de Lumière",       ilvl: 14,  enchant: null,                        rarity: "rare" },
  { id: "hands",     label: "Mains",    item: "Protège-bras de l'espoir perdu",     ilvl: 276, enchant: null,                        rarity: "epic" }
];

const KRATOS_RIGHT: EquippedItem[] = [
  { id: "gloves",   label: "Gants",      item: "Gantelets du verdict effulgent", ilvl: 289, enchant: null,                   rarity: "epic" },
  { id: "belt",     label: "Ceinture",   item: "Défenseur crochéventre",         ilvl: 276, enchant: null,                   rarity: "rare" },
  { id: "legs",     label: "Jambes",     item: "Grèves du verdict effulgent",    ilvl: 282, enchant: "+41 à l'intelligence", rarity: "epic" },
  { id: "boots",    label: "Bottes",     item: "Marche de brise-sort",           ilvl: 285, enchant: "Enchant. de bottes",   rarity: "epic" },
  { id: "ring1",    label: "Anneau 1",   item: "Œil de minuit",                  ilvl: 276, enchant: "Fureur de la nature",  rarity: "epic" },
  { id: "ring2",    label: "Anneau 2",   item: "Occlusion du Vide",              ilvl: 276, enchant: "Hâte thalassienne",    rarity: "epic" },
  { id: "trinket1", label: "Breloque 1", item: "Cœur du vent",                   ilvl: 276, enchant: null,                   rarity: "epic" },
  { id: "trinket2", label: "Breloque 2", item: "Plume de braisaille",            ilvl: 276, enchant: null,                   rarity: "rare" }
];

export const CHARACTERS: Character[] = [
  {
    id: 1,
    name: "Kratós",
    title: "le Porteur de Lumière",
    race: "Elfe de sang",
    class: "Paladin",
    spec: "Sacré",
    ilvl: 281,
    realm: "Hyjal",
    guild: "Emberfall",
    faction: "horde",
    score: 3040,
    gold: 31880,
    color: "#f0b429",
    slotsLeft: KRATOS_LEFT,
    slotsRight: KRATOS_RIGHT
  },
  {
    id: 2,
    name: "Vaelindra",
    title: "Archimage Suprême",
    race: "Humaine",
    class: "Mage",
    spec: "Givre",
    ilvl: 278,
    realm: "Hyjal",
    guild: "Emberfall",
    faction: "alliance",
    score: 2810,
    gold: 18420,
    color: "#38bdf8",
    slotsLeft: KRATOS_LEFT,
    slotsRight: KRATOS_RIGHT
  },
  {
    id: 3,
    name: "Zrak'tor",
    title: "Ombre de la Horde",
    race: "Orc",
    class: "Chasseur",
    spec: "Marksmanship",
    ilvl: 275,
    realm: "Dalaran",
    guild: "Iron Wolves",
    faction: "horde",
    score: 2540,
    gold: 9200,
    color: "#4ade80",
    slotsLeft: KRATOS_LEFT,
    slotsRight: KRATOS_RIGHT
  }
];

export const OBTAINABLE_CATEGORIES: ObtainableCategory[] = [
  {
    id: "head",
    label: "TÊTE",
    items: [
      { name: "Regard impassible du verdict effulgent", rarity: "epic",     isSet: true,  count: 47, ilvl: 289 },
      { name: "Couronne du Tyran fracturé",             rarity: "purple",   isSet: false, count: 1,  ilvl: 284 },
      { name: "Visière fanée de Fletcher",              rarity: "rare",     isSet: false, count: 1,  ilvl: 278 },
      { name: "Couvre-chef du brise-sort",              rarity: "uncommon", isSet: false, count: 1,  ilvl: 272 }
    ]
  },
  {
    id: "shoulders",
    label: "ÉPAULES",
    items: [
      { name: "Épaulières du verdict effulgent", rarity: "epic",   isSet: true,  count: 31, ilvl: 289 },
      { name: "Manteau de l'archimage déchu",    rarity: "purple", isSet: false, count: 3,  ilvl: 281 },
      { name: "Épaulettes d'ossements brisés",   rarity: "rare",   isSet: false, count: 2,  ilvl: 275 }
    ]
  },
  {
    id: "chest",
    label: "TORSE",
    items: [
      { name: "Harnois de guerre du verdict",       rarity: "epic",   isSet: true,  count: 52, ilvl: 289 },
      { name: "Cuirasse de l'éclaireur fantôme",    rarity: "purple", isSet: false, count: 4,  ilvl: 284 },
      { name: "Plastron des profondeurs abyssales", rarity: "rare",   isSet: false, count: 1,  ilvl: 278 }
    ]
  },
  {
    id: "legs",
    label: "JAMBES",
    items: [
      { name: "Grèves du verdict effulgent",     rarity: "epic",   isSet: true,  count: 28, ilvl: 289 },
      { name: "Jambières de l'ombre éternelle",  rarity: "purple", isSet: false, count: 2,  ilvl: 282 },
      { name: "Chausses en cuir de drake",       rarity: "rare",   isSet: false, count: 1,  ilvl: 275 }
    ]
  }
];

export const ITEM_SOURCES: Record<string, ItemDetails> = {
  "Regard du verdict effulgent": {
    type: "Armure",
    slot: "Tête",
    stats: ["Endurance +842", "Intellect +1421", "Hâte +612", "Maîtrise +508"],
    sources: [
      { boss: "Sikran, Capitaine des Rosgard", instance: "Le Palais en Cristal",  difficulty: "Mythique", ilvlRange: "489–502", dropRate: "12%" },
      { boss: "Sikran, Capitaine des Rosgard", instance: "Le Palais en Cristal",  difficulty: "Heroïque", ilvlRange: "476–489", dropRate: "15%" },
      { boss: "Vault Crafter",                 instance: "Le Vault des Incarnés", difficulty: "M+",       ilvlRange: "441–470", dropRate: "~8%" }
    ]
  },
  "Amulette sin'dorei ouvragée": {
    type: "Bijou",
    slot: "Cou",
    stats: ["Endurance +612", "Intellect +980", "Hâte +420", "Critique +310"],
    sources: [
      { boss: "Grand Artisan Raszageth", instance: "Amirdrassil", difficulty: "Heroïque", ilvlRange: "441–457", dropRate: "10%" },
      { boss: "Fyrakk l'Embrasé",        instance: "Amirdrassil", difficulty: "Mythique", ilvlRange: "457–470", dropRate: "8%" },
      { boss: "Création via Bijouterie", instance: "–",           difficulty: "Craft",    ilvlRange: "418–447", dropRate: "–" }
    ]
  },
  "Garde providentielle du verdict": {
    type: "Armure de plaques",
    slot: "Épaules",
    stats: ["Endurance +720", "Intellect +1100", "Polyvalence +380"],
    sources: [
      { boss: "Tindral Sageswift", instance: "Amirdrassil", difficulty: "Heroïque", ilvlRange: "441–457", dropRate: "14%" },
      { boss: "Tindral Sageswift", instance: "Amirdrassil", difficulty: "Mythique", ilvlRange: "457–470", dropRate: "10%" }
    ]
  },
  "Voile d'adhésion en soie": {
    type: "Tissu",
    slot: "Dos",
    stats: ["Endurance +510", "Intellect +820", "Hâte +290"],
    sources: [
      { boss: "Mythique + (Saison 3)", instance: "Divers donjons",       difficulty: "M+",       ilvlRange: "437–470", dropRate: "Coffre hebdo" },
      { boss: "Vexamus",               instance: "Académie d'Algeth'ar", difficulty: "Mythique", ilvlRange: "437–454", dropRate: "18%" }
    ]
  },
  "Harnois de guerre divin du verdict": {
    type: "Armure de plaques",
    slot: "Torse",
    stats: ["Endurance +950", "Intellect +1520", "Hâte +640", "Critique +480"],
    sources: [
      { boss: "Fyrakk l'Embrasé", instance: "Amirdrassil", difficulty: "Mythique", ilvlRange: "457–470", dropRate: "9%" },
      { boss: "Fyrakk l'Embrasé", instance: "Amirdrassil", difficulty: "Heroïque", ilvlRange: "441–457", dropRate: "12%" }
    ]
  },
  "Ruban de Bijou": {
    type: "Divers",
    slot: "Poignets",
    stats: ["–"],
    sources: [
      { boss: "Achat marchand", instance: "–", difficulty: "Réputation", ilvlRange: "1", dropRate: "–" }
    ]
  },
  "Tabard du porteur de Lumière": {
    type: "Tabard",
    slot: "Tabard",
    stats: ["–"],
    sources: [
      { boss: "Récompense de guilde", instance: "–", difficulty: "Réputation", ilvlRange: "14", dropRate: "–" }
    ]
  },
  "Protège-bras de l'espoir perdu": {
    type: "Armure de plaques",
    slot: "Mains",
    stats: ["Endurance +680", "Intellect +1050", "Polyvalence +340"],
    sources: [
      { boss: "Nymue",     instance: "Amirdrassil",     difficulty: "Heroïque", ilvlRange: "441–457", dropRate: "16%" },
      { boss: "Larodar",   instance: "Amirdrassil",     difficulty: "Normal",   ilvlRange: "428–441", dropRate: "20%" },
      { boss: "Coffre M+", instance: "Divers donjons",  difficulty: "M+",       ilvlRange: "437–470", dropRate: "Coffre hebdo" }
    ]
  },
  "Gantelets du verdict effulgent": {
    type: "Armure de plaques",
    slot: "Gants",
    stats: ["Endurance +850", "Intellect +1380", "Hâte +590", "Maîtrise +440"],
    sources: [
      { boss: "Smolderon", instance: "Amirdrassil", difficulty: "Mythique", ilvlRange: "457–470", dropRate: "11%" },
      { boss: "Smolderon", instance: "Amirdrassil", difficulty: "Heroïque", ilvlRange: "441–457", dropRate: "14%" }
    ]
  },
  "Défenseur crochéventre": {
    type: "Armure de plaques",
    slot: "Ceinture",
    stats: ["Endurance +610", "Intellect +920", "Critique +310"],
    sources: [
      { boss: "Gnarlroot", instance: "Amirdrassil", difficulty: "Heroïque", ilvlRange: "441–457", dropRate: "22%" },
      { boss: "Gnarlroot", instance: "Amirdrassil", difficulty: "Normal",   ilvlRange: "428–441", dropRate: "25%" }
    ]
  },
  "Grèves du verdict effulgent": {
    type: "Armure de plaques",
    slot: "Jambes",
    stats: ["Endurance +820", "Intellect +1310", "Hâte +560", "Critique +440"],
    sources: [
      { boss: "Igira la Cruelle",        instance: "Amirdrassil",          difficulty: "Mythique", ilvlRange: "457–470", dropRate: "12%" },
      { boss: "Igira la Cruelle",        instance: "Amirdrassil",          difficulty: "Heroïque", ilvlRange: "441–457", dropRate: "15%" },
      { boss: "Nexus-Princess Ky'veza",  instance: "Le Palais en Cristal", difficulty: "Mythique", ilvlRange: "489–502", dropRate: "10%" }
    ]
  },
  "Marche de brise-sort": {
    type: "Armure de plaques",
    slot: "Bottes",
    stats: ["Endurance +720", "Intellect +1100", "Hâte +400", "Critique +320"],
    sources: [
      { boss: "Volcoross",              instance: "Amirdrassil",    difficulty: "Heroïque", ilvlRange: "441–457", dropRate: "17%" },
      { boss: "Coffre M+ (Clé ≥15)",    instance: "Divers donjons", difficulty: "M+",       ilvlRange: "454–470", dropRate: "Coffre hebdo" }
    ]
  },
  "Œil de minuit": {
    type: "Anneau",
    slot: "Anneau",
    stats: ["Endurance +560", "Intellect +890", "Hâte +330", "Fureur de la nature"],
    sources: [
      { boss: "Écho d'Iridikron", instance: "Le Vault des Incarnés", difficulty: "Heroïque", ilvlRange: "441–457", dropRate: "13%" },
      { boss: "Écho d'Iridikron", instance: "Le Vault des Incarnés", difficulty: "Mythique", ilvlRange: "457–470", dropRate: "9%" }
    ]
  },
  "Occlusion du Vide": {
    type: "Anneau",
    slot: "Anneau",
    stats: ["Endurance +560", "Intellect +880", "Hâte +350", "Hâte thalassienne"],
    sources: [
      { boss: "Qalashi Defender", instance: "Le Vault des Incarnés", difficulty: "Normal",   ilvlRange: "428–441", dropRate: "20%" },
      { boss: "Qalashi Defender", instance: "Le Vault des Incarnés", difficulty: "Heroïque", ilvlRange: "441–457", dropRate: "16%" }
    ]
  },
  "Cœur du vent": {
    type: "Breloque",
    slot: "Breloque",
    stats: ["Intellect +1200", "Proc : Rafale de vent (+820 Hâte, 15s)"],
    sources: [
      { boss: "Fyrakk l'Embrasé",                instance: "Amirdrassil", difficulty: "Mythique", ilvlRange: "457–470", dropRate: "8%" },
      { boss: "Fyrakk l'Embrasé",                instance: "Amirdrassil", difficulty: "Heroïque", ilvlRange: "441–457", dropRate: "11%" },
      { boss: "Échange de points Valorisation",  instance: "–",           difficulty: "M+",       ilvlRange: "441",     dropRate: "2500 pts" }
    ]
  },
  "Plume de braisaille": {
    type: "Breloque",
    slot: "Breloque",
    stats: ["Intellect +950", "Proc : Plume enflammée (+680 Critique, 12s)"],
    sources: [
      { boss: "Council of Dreams", instance: "Amirdrassil", difficulty: "Heroïque", ilvlRange: "441–457", dropRate: "15%" },
      { boss: "Council of Dreams", instance: "Amirdrassil", difficulty: "Normal",   ilvlRange: "428–441", dropRate: "18%" }
    ]
  },
  "Regard impassible du verdict effulgent": {
    type: "Armure de plaques",
    slot: "Tête",
    stats: ["Endurance +842", "Intellect +1421", "Hâte +612", "Maîtrise +508"],
    sources: [
      { boss: "Sikran, Capitaine des Rosgard", instance: "Le Palais en Cristal", difficulty: "Mythique", ilvlRange: "489–502", dropRate: "12%" },
      { boss: "Sikran, Capitaine des Rosgard", instance: "Le Palais en Cristal", difficulty: "Heroïque", ilvlRange: "476–489", dropRate: "15%" },
      { boss: "Sikran, Capitaine des Rosgard", instance: "Le Palais en Cristal", difficulty: "Normal",   ilvlRange: "463–476", dropRate: "18%" },
      { boss: "Coffre M+ Hebdo",               instance: "Divers donjons",       difficulty: "M+",       ilvlRange: "470–489", dropRate: "Coffre" }
    ]
  },
  "Couronne du Tyran fracturé": {
    type: "Armure de plaques",
    slot: "Tête",
    stats: ["Endurance +780", "Intellect +1250", "Critique +540", "Polyvalence +390"],
    sources: [
      { boss: "Rashok l'Ancien", instance: "Aberrus, l'Ombre Fumante", difficulty: "Mythique", ilvlRange: "457–470", dropRate: "10%" },
      { boss: "Rashok l'Ancien", instance: "Aberrus, l'Ombre Fumante", difficulty: "Heroïque", ilvlRange: "441–457", dropRate: "13%" }
    ]
  },
  "Visière fanée de Fletcher": {
    type: "Cuir",
    slot: "Tête",
    stats: ["Endurance +680", "Agilité +1050", "Hâte +380"],
    sources: [
      { boss: "Défis M+ (Toutes clés)", instance: "Divers donjons",         difficulty: "M+",       ilvlRange: "437–470", dropRate: "Coffre" },
      { boss: "Xavius",                 instance: "Le Cauchemar d'Émeraude", difficulty: "Mythique", ilvlRange: "441–454", dropRate: "20%" }
    ]
  },
  "Couvre-chef du brise-sort": {
    type: "Tissu",
    slot: "Tête",
    stats: ["Endurance +560", "Intellect +890", "Hâte +310"],
    sources: [
      { boss: "Craft via Couture",        instance: "–", difficulty: "Craft", ilvlRange: "418–434", dropRate: "–" },
      { boss: "Marchand de Valorisation", instance: "–", difficulty: "M+",    ilvlRange: "437",     dropRate: "1750 pts" }
    ]
  },
  "Épaulières du verdict effulgent": {
    type: "Armure de plaques",
    slot: "Épaules",
    stats: ["Endurance +800", "Intellect +1280", "Hâte +550", "Critique +420"],
    sources: [
      { boss: "Ulgrax le Dévoreur", instance: "Le Palais en Cristal", difficulty: "Mythique", ilvlRange: "489–502", dropRate: "13%" },
      { boss: "Ulgrax le Dévoreur", instance: "Le Palais en Cristal", difficulty: "Heroïque", ilvlRange: "476–489", dropRate: "16%" }
    ]
  },
  "Manteau de l'archimage déchu": {
    type: "Tissu",
    slot: "Épaules",
    stats: ["Endurance +640", "Intellect +1020", "Intellect +450", "Maîtrise +360"],
    sources: [
      { boss: "Magmorax",   instance: "Aberrus, l'Ombre Fumante", difficulty: "Heroïque", ilvlRange: "441–457", dropRate: "14%" },
      { boss: "Coffre M+",  instance: "Divers donjons",            difficulty: "M+",       ilvlRange: "437–470", dropRate: "Coffre" }
    ]
  },
  "Épaulettes d'ossements brisés": {
    type: "Mailles",
    slot: "Épaules",
    stats: ["Endurance +720", "Agilité +1080", "Critique +410"],
    sources: [
      { boss: "Kazzara l'Écartelé", instance: "Aberrus, l'Ombre Fumante", difficulty: "Normal",   ilvlRange: "428–441", dropRate: "22%" },
      { boss: "Kazzara l'Écartelé", instance: "Aberrus, l'Ombre Fumante", difficulty: "Heroïque", ilvlRange: "441–457", dropRate: "18%" }
    ]
  },
  "Harnois de guerre du verdict": {
    type: "Armure de plaques",
    slot: "Torse",
    stats: ["Endurance +950", "Intellect +1520", "Hâte +640", "Critique +480"],
    sources: [
      { boss: "Broodtwister Ovi'nax", instance: "Le Palais en Cristal", difficulty: "Mythique", ilvlRange: "489–502", dropRate: "11%" },
      { boss: "Broodtwister Ovi'nax", instance: "Le Palais en Cristal", difficulty: "Heroïque", ilvlRange: "476–489", dropRate: "14%" },
      { boss: "Broodtwister Ovi'nax", instance: "Le Palais en Cristal", difficulty: "Normal",   ilvlRange: "463–476", dropRate: "17%" }
    ]
  },
  "Cuirasse de l'éclaireur fantôme": {
    type: "Cuir",
    slot: "Torse",
    stats: ["Endurance +840", "Agilité +1340", "Hâte +570", "Polyvalence +430"],
    sources: [
      { boss: "Loken, Geôlier de Norgannon", instance: "Halls of Lightning", difficulty: "M+",       ilvlRange: "441–470", dropRate: "15%" },
      { boss: "Tindral Sageswift",           instance: "Amirdrassil",        difficulty: "Heroïque", ilvlRange: "441–457", dropRate: "13%" }
    ]
  },
  "Plastron des profondeurs abyssales": {
    type: "Mailles",
    slot: "Torse",
    stats: ["Endurance +720", "Agilité +1100", "Critique +390", "Maîtrise +310"],
    sources: [
      { boss: "Forgotten Experiments", instance: "Aberrus, l'Ombre Fumante", difficulty: "Normal", ilvlRange: "428–441", dropRate: "21%" }
    ]
  },
  "Jambières de l'ombre éternelle": {
    type: "Tissu",
    slot: "Jambes",
    stats: ["Endurance +740", "Intellect +1180", "Hâte +510", "Polyvalence +380"],
    sources: [
      { boss: "Echo of Neltharion", instance: "Aberrus, l'Ombre Fumante", difficulty: "Mythique", ilvlRange: "457–470", dropRate: "9%" },
      { boss: "Echo of Neltharion", instance: "Aberrus, l'Ombre Fumante", difficulty: "Heroïque", ilvlRange: "441–457", dropRate: "12%" }
    ]
  },
  "Chausses en cuir de drake": {
    type: "Cuir",
    slot: "Jambes",
    stats: ["Endurance +640", "Agilité +980", "Critique +360"],
    sources: [
      { boss: "Craft via Maroquinerie",  instance: "–",                  difficulty: "Craft", ilvlRange: "418–440", dropRate: "–" },
      { boss: "Razageth the Storm-Eater", instance: "Vault des Incarnés", difficulty: "LFR",   ilvlRange: "415–428", dropRate: "19%" }
    ]
  }
};
