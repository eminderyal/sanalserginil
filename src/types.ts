export type DisplayFrameStyle = 'stone_pedestal' | 'glass_vitrine' | 'bronze_stela' | 'obsidian_monolith';

export type TimeOfDay = 'day' | 'golden_hour' | 'sunset' | 'night';

export type CameraMode = 'first_person' | 'orbit' | 'tour';

export interface Exhibit {
  id: string;
  title: string;
  subtitle?: string;
  era: string;
  provenance: string;
  material: string;
  dimensions?: string;
  description: string;
  curatorNotes?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  frameStyle: DisplayFrameStyle;
  position: [number, number, number]; // [x, y, z] in 3D world
  rotationY?: number; // radians or degrees
  scale?: number;
  tags: string[];
  createdAt: number;
  highlightColor?: string;
  audioGuideText?: string;
}

export interface PlayerState {
  x: number;
  z: number;
  rotationY: number;
}

export interface SiteZone {
  id: string;
  name: string;
  center: [number, number];
  radius: number;
  description: string;
}
