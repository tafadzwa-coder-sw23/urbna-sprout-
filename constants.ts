import { PlantType, PlantConfig } from './types';

export const GRID_SIZE = 9; // 3x3 grid

export const PLANT_DB: Record<PlantType, PlantConfig> = {
  [PlantType.TOMATO]: {
    type: PlantType.TOMATO,
    daysToMaturity: 10,
    waterNeeds: 15,
    value: 50,
    cost: 15,
    description: "Requires consistent watering and support. High yield value."
  },
  [PlantType.BASIL]: {
    type: PlantType.BASIL,
    daysToMaturity: 5,
    waterNeeds: 10,
    value: 25,
    cost: 5,
    description: "Fast growing herb. Great for beginners."
  },
  [PlantType.LETTUCE]: {
    type: PlantType.LETTUCE,
    daysToMaturity: 6,
    waterNeeds: 20,
    value: 30,
    cost: 8,
    description: "Needs plenty of water but grows quickly."
  },
  [PlantType.CARROT]: {
    type: PlantType.CARROT,
    daysToMaturity: 12,
    waterNeeds: 10,
    value: 45,
    cost: 12,
    description: "Root vegetable. Low maintenance but slow."
  },
  [PlantType.STRAWBERRY]: {
    type: PlantType.STRAWBERRY,
    daysToMaturity: 15,
    waterNeeds: 25,
    value: 80,
    cost: 30,
    description: "High value fruit. Sensitive to water changes."
  },
  [PlantType.EMPTY]: {
    type: PlantType.EMPTY,
    daysToMaturity: 0,
    waterNeeds: 0,
    value: 0,
    cost: 0,
    description: "Empty plot."
  }
};

export const INITIAL_MONEY = 100;
export const INITIAL_WATER = 200;
export const WATER_REFILL_COST = 5; // Cost per 50 units
export const WATER_REFILL_AMOUNT = 50;
