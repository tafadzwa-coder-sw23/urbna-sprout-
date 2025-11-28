import { GoogleGenAI, Type } from "@google/genai";
import { GameState, PlantType } from "../types";

const apiKey = process.env.API_KEY || '';
// Initialize properly with named parameter
const ai = new GoogleGenAI({ apiKey });

export const getFarmingAdvice = async (query: string, context: GameState) => {
  try {
    const model = ai.models;
    const prompt = `
      You are an expert urban farming agronomist AI named "Sprout".
      Current Game Context: Day ${context.day}, Weather: ${context.weather}, Money: $${context.money}, Water: ${context.waterSupply}.
      
      User Query: "${query}"
      
      Provide a helpful, concise, and encouraging response (max 2 sentences) tailored to the simulation context.
    `;

    const response = await model.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "I'm having trouble connecting to the satellite. Try again later!";
  }
};

export const generateDailyEvent = async (day: number) => {
  try {
    const model = ai.models;
    const prompt = `
      Generate a random daily event for an urban farming simulator game on Day ${day}.
      The event should be realistic for a city rooftop garden (e.g., pests, weather change, market crash, neighbor gift).
      
      Return JSON format:
      {
        "title": "Short Title",
        "description": "One sentence description.",
        "effectType": "water" | "money" | "health" | "growth" | "none",
        "effectValue": number (positive or negative integer),
        "weatherChange": "Sunny" | "Rainy" | "Cloudy" | "Heatwave" | null
      }
    `;

    const response = await model.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            effectType: { type: Type.STRING, enum: ["water", "money", "health", "growth", "none"] },
            effectValue: { type: Type.INTEGER },
            weatherChange: { type: Type.STRING, nullable: true, enum: ["Sunny", "Rainy", "Cloudy", "Heatwave"] }
          }
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Event Error:", error);
    return null;
  }
};

export const analyzePlantSelection = async (plant: PlantType) => {
  try {
    const model = ai.models;
    const prompt = `
      Give a quick tip for growing ${plant} in an urban environment.
      Keep it under 20 words.
    `;
    const response = await model.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    return `Great choice! ${plant} is fun to grow.`;
  }
};
