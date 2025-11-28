export enum PlantType {
  TOMATO = 'Tomato',
  BASIL = 'Basil',
  LETTUCE = 'Lettuce',
  CARROT = 'Carrot',
  STRAWBERRY = 'Strawberry',
  EMPTY = 'Empty'
}

export interface PlantConfig {
  type: PlantType;
  daysToMaturity: number;
  waterNeeds: number; // 0-100 per day
  value: number; // Selling price
  cost: number; // Seed cost
  description: string;
}

export interface GridSlot {
  id: number;
  plant: PlantType;
  growthStage: number; // 0 to 100
  waterLevel: number; // 0 to 100
  health: number; // 0 to 100
  plantedDay: number;
}

export interface LogEntry {
  day: number;
  message: string;
  type: 'info' | 'warning' | 'success' | 'event';
}

export interface GameState {
  day: number;
  money: number;
  waterSupply: number;
  slots: GridSlot[];
  logs: LogEntry[];
  weather: 'Sunny' | 'Rainy' | 'Cloudy' | 'Heatwave';
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
