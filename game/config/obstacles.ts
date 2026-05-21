import { ASSET_BASE } from "@/game/config/assets";

export type ObstacleCategory =
  | "neon-sign"
  | "hologram-ad"
  | "drone"
  | "cyber-part"
  | "consumable"
  | "umbrella"
  | "data"
  | "display"
  | "food"
  | "baton";

export interface ObstacleAsset {
  key: string;
  category: ObstacleCategory;
  path: string;
  sourceWidth: number;
  sourceHeight: number;
  displayWidth: number;
  displayHeight: number;
}

const OBSTACLE_BASE = `${ASSET_BASE}/obstacles/tokyo-cyber-debris/parts`;

export const TOKYO_CYBER_DEBRIS_OBSTACLES: ObstacleAsset[] = [
  {
    key: "obstacle-broken-neon-sign-hotel-01",
    category: "neon-sign",
    path: `${OBSTACLE_BASE}/broken_neon_sign_hotel_01.webp`,
    sourceWidth: 129,
    sourceHeight: 229,
    displayWidth: 42,
    displayHeight: 74
  },
  {
    key: "obstacle-broken-neon-sign-24h-01",
    category: "neon-sign",
    path: `${OBSTACLE_BASE}/broken_neon_sign_24h_01.webp`,
    sourceWidth: 124,
    sourceHeight: 215,
    displayWidth: 42,
    displayHeight: 72
  },
  {
    key: "obstacle-broken-neon-sign-vacancy-01",
    category: "neon-sign",
    path: `${OBSTACLE_BASE}/broken_neon_sign_vacancy_01.webp`,
    sourceWidth: 123,
    sourceHeight: 215,
    displayWidth: 42,
    displayHeight: 73
  },
  {
    key: "obstacle-broken-neon-sign-backstreet-01",
    category: "neon-sign",
    path: `${OBSTACLE_BASE}/broken_neon_sign_backstreet_01.webp`,
    sourceWidth: 119,
    sourceHeight: 222,
    displayWidth: 40,
    displayHeight: 75
  },
  {
    key: "obstacle-broken-neon-sign-diner-blue-01",
    category: "neon-sign",
    path: `${OBSTACLE_BASE}/broken_neon_sign_diner_blue_01.webp`,
    sourceWidth: 135,
    sourceHeight: 216,
    displayWidth: 45,
    displayHeight: 72
  },
  {
    key: "obstacle-broken-neon-sign-diner-pink-01",
    category: "neon-sign",
    path: `${OBSTACLE_BASE}/broken_neon_sign_diner_pink_01.webp`,
    sourceWidth: 132,
    sourceHeight: 208,
    displayWidth: 46,
    displayHeight: 72
  },
  {
    key: "obstacle-broken-neon-sign-izakaya-01",
    category: "neon-sign",
    path: `${OBSTACLE_BASE}/broken_neon_sign_izakaya_01.webp`,
    sourceWidth: 133,
    sourceHeight: 234,
    displayWidth: 41,
    displayHeight: 72
  },
  {
    key: "obstacle-broken-neon-sign-karaoke-01",
    category: "neon-sign",
    path: `${OBSTACLE_BASE}/broken_neon_sign_karaoke_01.webp`,
    sourceWidth: 110,
    sourceHeight: 213,
    displayWidth: 37,
    displayHeight: 72
  },
  {
    key: "obstacle-broken-neon-sign-future-01",
    category: "neon-sign",
    path: `${OBSTACLE_BASE}/broken_neon_sign_future_01.webp`,
    sourceWidth: 116,
    sourceHeight: 214,
    displayWidth: 39,
    displayHeight: 72
  },
  {
    key: "obstacle-hologram-ad-anime-01",
    category: "hologram-ad",
    path: `${OBSTACLE_BASE}/hologram_ad_anime_01.webp`,
    sourceWidth: 161,
    sourceHeight: 212,
    displayWidth: 58,
    displayHeight: 76
  },
  {
    key: "obstacle-hologram-ad-anime-02",
    category: "hologram-ad",
    path: `${OBSTACLE_BASE}/hologram_ad_anime_02.webp`,
    sourceWidth: 162,
    sourceHeight: 214,
    displayWidth: 58,
    displayHeight: 76
  },
  {
    key: "obstacle-hologram-ad-anime-03",
    category: "hologram-ad",
    path: `${OBSTACLE_BASE}/hologram_ad_anime_03.webp`,
    sourceWidth: 164,
    sourceHeight: 212,
    displayWidth: 59,
    displayHeight: 76
  },
  {
    key: "obstacle-hologram-ad-corporate-01",
    category: "hologram-ad",
    path: `${OBSTACLE_BASE}/hologram_ad_corporate_01.webp`,
    sourceWidth: 147,
    sourceHeight: 215,
    displayWidth: 52,
    displayHeight: 76
  },
  {
    key: "obstacle-hologram-ad-tokyo-01",
    category: "hologram-ad",
    path: `${OBSTACLE_BASE}/hologram_ad_tokyo_01.webp`,
    sourceWidth: 143,
    sourceHeight: 211,
    displayWidth: 51,
    displayHeight: 76
  },
  {
    key: "obstacle-hologram-ad-neo-01",
    category: "hologram-ad",
    path: `${OBSTACLE_BASE}/hologram_ad_neo_01.webp`,
    sourceWidth: 139,
    sourceHeight: 205,
    displayWidth: 52,
    displayHeight: 76
  },
  {
    key: "obstacle-hologram-ad-corporate-02",
    category: "hologram-ad",
    path: `${OBSTACLE_BASE}/hologram_ad_corporate_02.webp`,
    sourceWidth: 137,
    sourceHeight: 209,
    displayWidth: 50,
    displayHeight: 76
  },
  {
    key: "obstacle-hologram-ad-warning-01",
    category: "hologram-ad",
    path: `${OBSTACLE_BASE}/hologram_ad_warning_01.webp`,
    sourceWidth: 137,
    sourceHeight: 206,
    displayWidth: 51,
    displayHeight: 76
  },
  {
    key: "obstacle-delivery-drone-warning-01",
    category: "drone",
    path: `${OBSTACLE_BASE}/delivery_drone_warning_01.webp`,
    sourceWidth: 204,
    sourceHeight: 160,
    displayWidth: 82,
    displayHeight: 64
  },
  {
    key: "obstacle-delivery-drone-warning-02",
    category: "drone",
    path: `${OBSTACLE_BASE}/delivery_drone_warning_02.webp`,
    sourceWidth: 206,
    sourceHeight: 157,
    displayWidth: 84,
    displayHeight: 64
  },
  {
    key: "obstacle-electric-trap-eye-core-01",
    category: "cyber-part",
    path: `${OBSTACLE_BASE}/electric_trap_eye_core_01.webp`,
    sourceWidth: 167,
    sourceHeight: 153,
    displayWidth: 70,
    displayHeight: 64
  },
  {
    key: "obstacle-police-surveillance-camera-01",
    category: "drone",
    path: `${OBSTACLE_BASE}/police_surveillance_camera_01.webp`,
    sourceWidth: 165,
    sourceHeight: 142,
    displayWidth: 74,
    displayHeight: 64
  },
  {
    key: "obstacle-cyber-arm-hand-01",
    category: "cyber-part",
    path: `${OBSTACLE_BASE}/cyber_arm_hand_01.webp`,
    sourceWidth: 168,
    sourceHeight: 171,
    displayWidth: 63,
    displayHeight: 64
  },
  {
    key: "obstacle-cyber-arm-forearm-01",
    category: "cyber-part",
    path: `${OBSTACLE_BASE}/cyber_arm_forearm_01.webp`,
    sourceWidth: 157,
    sourceHeight: 172,
    displayWidth: 58,
    displayHeight: 64
  },
  {
    key: "obstacle-glowing-eye-blue-01",
    category: "cyber-part",
    path: `${OBSTACLE_BASE}/glowing_eye_blue_01.webp`,
    sourceWidth: 148,
    sourceHeight: 181,
    displayWidth: 52,
    displayHeight: 64
  },
  {
    key: "obstacle-glowing-eye-pink-01",
    category: "cyber-part",
    path: `${OBSTACLE_BASE}/glowing_eye_pink_01.webp`,
    sourceWidth: 130,
    sourceHeight: 126,
    displayWidth: 66,
    displayHeight: 64
  },
  {
    key: "obstacle-delivery-drone-orb-01",
    category: "drone",
    path: `${OBSTACLE_BASE}/delivery_drone_orb_01.webp`,
    sourceWidth: 157,
    sourceHeight: 139,
    displayWidth: 72,
    displayHeight: 64
  },
  {
    key: "obstacle-energy-drink-can-neo-fuel-01",
    category: "consumable",
    path: `${OBSTACLE_BASE}/energy_drink_can_neo_fuel_01.webp`,
    sourceWidth: 93,
    sourceHeight: 157,
    displayWidth: 37,
    displayHeight: 62
  },
  {
    key: "obstacle-energy-drink-can-sakura-01",
    category: "consumable",
    path: `${OBSTACLE_BASE}/energy_drink_can_sakura_01.webp`,
    sourceWidth: 107,
    sourceHeight: 155,
    displayWidth: 43,
    displayHeight: 62
  },
  {
    key: "obstacle-energy-drink-can-raijin-01",
    category: "consumable",
    path: `${OBSTACLE_BASE}/energy_drink_can_raijin_01.webp`,
    sourceWidth: 106,
    sourceHeight: 150,
    displayWidth: 44,
    displayHeight: 62
  },
  {
    key: "obstacle-led-umbrella-blue-01",
    category: "umbrella",
    path: `${OBSTACLE_BASE}/led_umbrella_blue_01.webp`,
    sourceWidth: 180,
    sourceHeight: 167,
    displayWidth: 76,
    displayHeight: 70
  },
  {
    key: "obstacle-led-umbrella-pink-01",
    category: "umbrella",
    path: `${OBSTACLE_BASE}/led_umbrella_pink_01.webp`,
    sourceWidth: 162,
    sourceHeight: 152,
    displayWidth: 75,
    displayHeight: 70
  },
  {
    key: "obstacle-memory-chip-01",
    category: "data",
    path: `${OBSTACLE_BASE}/memory_chip_01.webp`,
    sourceWidth: 133,
    sourceHeight: 129,
    displayWidth: 66,
    displayHeight: 64
  },
  {
    key: "obstacle-memory-card-01",
    category: "data",
    path: `${OBSTACLE_BASE}/memory_card_01.webp`,
    sourceWidth: 119,
    sourceHeight: 135,
    displayWidth: 56,
    displayHeight: 64
  },
  {
    key: "obstacle-floating-display-error-01",
    category: "display",
    path: `${OBSTACLE_BASE}/floating_display_error_01.webp`,
    sourceWidth: 161,
    sourceHeight: 139,
    displayWidth: 74,
    displayHeight: 64
  },
  {
    key: "obstacle-cracked-floating-display-blue-01",
    category: "display",
    path: `${OBSTACLE_BASE}/cracked_floating_display_blue_01.webp`,
    sourceWidth: 155,
    sourceHeight: 160,
    displayWidth: 66,
    displayHeight: 68
  },
  {
    key: "obstacle-cracked-floating-display-pink-01",
    category: "display",
    path: `${OBSTACLE_BASE}/cracked_floating_display_pink_01.webp`,
    sourceWidth: 155,
    sourceHeight: 164,
    displayWidth: 64,
    displayHeight: 68
  },
  {
    key: "obstacle-ramen-container-01",
    category: "food",
    path: `${OBSTACLE_BASE}/ramen_container_01.webp`,
    sourceWidth: 163,
    sourceHeight: 175,
    displayWidth: 61,
    displayHeight: 66
  },
  {
    key: "obstacle-oden-container-01",
    category: "food",
    path: `${OBSTACLE_BASE}/oden_container_01.webp`,
    sourceWidth: 182,
    sourceHeight: 178,
    displayWidth: 67,
    displayHeight: 66
  },
  {
    key: "obstacle-vending-food-container-01",
    category: "food",
    path: `${OBSTACLE_BASE}/vending_food_container_01.webp`,
    sourceWidth: 194,
    sourceHeight: 173,
    displayWidth: 74,
    displayHeight: 66
  },
  {
    key: "obstacle-vending-machine-food-container-01",
    category: "food",
    path: `${OBSTACLE_BASE}/vending_machine_food_container_01.webp`,
    sourceWidth: 173,
    sourceHeight: 194,
    displayWidth: 59,
    displayHeight: 66
  },
  {
    key: "obstacle-police-drone-01",
    category: "drone",
    path: `${OBSTACLE_BASE}/police_drone_01.webp`,
    sourceWidth: 129,
    sourceHeight: 139,
    displayWidth: 59,
    displayHeight: 64
  },
  {
    key: "obstacle-police-drone-02",
    category: "drone",
    path: `${OBSTACLE_BASE}/police_drone_02.webp`,
    sourceWidth: 155,
    sourceHeight: 131,
    displayWidth: 76,
    displayHeight: 64
  },
  {
    key: "obstacle-electric-baton-blue-01",
    category: "baton",
    path: `${OBSTACLE_BASE}/electric_baton_blue_01.webp`,
    sourceWidth: 113,
    sourceHeight: 155,
    displayWidth: 47,
    displayHeight: 64
  },
  {
    key: "obstacle-electric-baton-pink-01",
    category: "baton",
    path: `${OBSTACLE_BASE}/electric_baton_pink_01.webp`,
    sourceWidth: 114,
    sourceHeight: 156,
    displayWidth: 47,
    displayHeight: 64
  }
];
