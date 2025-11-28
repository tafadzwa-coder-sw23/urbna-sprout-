import React, { useState, useEffect, useCallback } from 'react';
import { 
  GameState, 
  GridSlot as GridSlotType, 
  PlantType, 
  LogEntry 
} from './types';
import { GRID_SIZE, PLANT_DB, INITIAL_MONEY, INITIAL_WATER, WATER_REFILL_COST, WATER_REFILL_AMOUNT } from './constants';
import { generateDailyEvent, analyzePlantSelection } from './services/geminiService';
import GridSlot from './components/GridSlot';
import Advisor from './components/Advisor';
import { 
  Sun, CloudRain, Cloud, Wind, Droplet, DollarSign, Calendar, 
  ShoppingBag, Shovel, RefreshCw, Activity, ArrowRight
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

const App: React.FC = () => {
  // --- STATE ---
  const [gameState, setGameState] = useState<GameState>({
    day: 1,
    money: INITIAL_MONEY,
    waterSupply: INITIAL_WATER,
    slots: Array.from({ length: GRID_SIZE }, (_, i) => ({
      id: i,
      plant: PlantType.EMPTY,
      growthStage: 0,
      waterLevel: 0,
      health: 100,
      plantedDay: 0
    })),
    logs: [{ day: 1, message: "Welcome to Urban Sprout! Start by planting seeds.", type: 'info' }],
    weather: 'Sunny'
  });

  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'shop' | 'stats' | 'advisor'>('shop');
  
  // Historical data for charts
  const [history, setHistory] = useState<{day: number, money: number, water: number}[]>([
    { day: 1, money: INITIAL_MONEY, water: INITIAL_WATER }
  ]);

  // --- ACTIONS ---

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setGameState(prev => ({
      ...prev,
      logs: [{ day: prev.day, message, type }, ...prev.logs]
    }));
  };

  const handleNextDay = useCallback(async () => {
    setIsProcessing(true);
    
    // 1. Process Growth & Water Consumption
    setGameState(prev => {
      let newMoney = prev.money;
      const newSlots = prev.slots.map(slot => {
        if (slot.plant === PlantType.EMPTY) return slot;

        const config = PLANT_DB[slot.plant];
        
        // Water Logic
        let waterConsumption = config.waterNeeds;
        if (prev.weather === 'Heatwave') waterConsumption *= 1.5;
        if (prev.weather === 'Rainy') waterConsumption *= 0.1; // Rain helps
        
        let newWaterLevel = slot.waterLevel - waterConsumption;
        // Rain refills plots naturally
        if (prev.weather === 'Rainy') newWaterLevel += 30;
        
        // Cap water
        newWaterLevel = Math.max(0, Math.min(100, newWaterLevel));

        // Health Logic
        let healthChange = 0;
        if (newWaterLevel <= 0) healthChange -= 20; // Drying out
        if (newWaterLevel > 90 && prev.weather !== 'Rainy') healthChange -= 5; // Overwatering (unless rain)
        
        let newHealth = Math.max(0, Math.min(100, slot.health + healthChange));

        // Growth Logic
        let growthAmount = 0;
        if (newHealth > 50) {
          growthAmount = (100 / config.daysToMaturity);
          // Bonus for good conditions
          if (newHealth > 90) growthAmount *= 1.2;
        }
        
        let newGrowth = Math.min(100, slot.growthStage + growthAmount);

        return {
          ...slot,
          waterLevel: newWaterLevel,
          health: newHealth,
          growthStage: newGrowth
        };
      });

      return {
        ...prev,
        slots: newSlots,
        day: prev.day + 1
      };
    });

    // 2. AI Event Generation (Async)
    const event = await generateDailyEvent(gameState.day + 1);
    
    setGameState(prev => {
      let newState = { ...prev };
      
      if (event) {
        // Use a direct update for logs here to avoid stale state issues if we used addLog
        const newLog: LogEntry = { day: newState.day, message: `Event: ${event.title} - ${event.description}`, type: 'event' };
        newState.logs = [newLog, ...newState.logs];
        
        if (event.weatherChange) newState.weather = event.weatherChange;
        
        if (event.effectType === 'money') newState.money += event.effectValue;
        if (event.effectType === 'water') newState.waterSupply += event.effectValue;
        
        // Apply global effects to plants if needed
        if (event.effectType === 'health' || event.effectType === 'growth') {
          newState.slots = newState.slots.map(s => {
             if (s.plant === PlantType.EMPTY) return s;
             if (event.effectType === 'health') return { ...s, health: Math.max(0, Math.min(100, s.health + event.effectValue))};
             if (event.effectType === 'growth') return { ...s, growthStage: Math.max(0, Math.min(100, s.growthStage + event.effectValue))};
             return s;
          });
        }
      } else {
        // Fallback simple weather cycle if AI fails
        const weathers: GameState['weather'][] = ['Sunny', 'Cloudy', 'Rainy', 'Sunny', 'Heatwave'];
        newState.weather = weathers[Math.floor(Math.random() * weathers.length)];
      }

      // Update history for charts
      setHistory(h => [...h, { day: newState.day, money: newState.money, water: newState.waterSupply }]);

      return newState;
    });

    setIsProcessing(false);
  }, [gameState.day, gameState.weather]);

  const buyWater = () => {
    setGameState(prev => {
      if (prev.money >= WATER_REFILL_COST) {
        return {
          ...prev,
          money: prev.money - WATER_REFILL_COST,
          waterSupply: prev.waterSupply + WATER_REFILL_AMOUNT,
          logs: [{ day: prev.day, message: `Bought ${WATER_REFILL_AMOUNT}L of water.`, type: 'info' }, ...prev.logs]
        };
      } else {
        return {
          ...prev,
          logs: [{ day: prev.day, message: "Not enough money!", type: 'warning' }, ...prev.logs]
        };
      }
    });
  };

  const handleSlotAction = (action: 'water' | 'harvest' | 'remove') => {
    if (selectedSlotId === null) return;

    setGameState(prev => {
      const newSlots = [...prev.slots];
      const slotIndex = newSlots.findIndex(s => s.id === selectedSlotId);
      if (slotIndex === -1) return prev;

      const slot = { ...newSlots[slotIndex] }; // Create a copy of the slot
      let newMoney = prev.money;
      let newWaterSupply = prev.waterSupply;
      let newLogs = [...prev.logs];
      const currentDay = prev.day;

      if (action === 'water') {
        const WATER_COST = 20;
        if (newWaterSupply >= WATER_COST) {
           newWaterSupply -= WATER_COST;
           slot.waterLevel = Math.min(100, slot.waterLevel + 40);
           newSlots[slotIndex] = slot;
           newLogs = [{ day: currentDay, message: "Watered plant.", type: 'success' }, ...newLogs];
        } else {
          newLogs = [{ day: currentDay, message: "Not enough water in tank!", type: 'warning' }, ...newLogs];
          // We return here but with the updated logs so the user sees the warning
          return { ...prev, logs: newLogs };
        }
      } else if (action === 'harvest') {
        if (slot.growthStage >= 100) {
          const config = PLANT_DB[slot.plant];
          const qualityMultiplier = slot.health / 100;
          const earnings = Math.floor(config.value * qualityMultiplier);
          newMoney += earnings;
          // Reset slot
          newSlots[slotIndex] = { ...slot, plant: PlantType.EMPTY, growthStage: 0, waterLevel: 0, health: 100 };
          newLogs = [{ day: currentDay, message: `Harvested ${config.type} for $${earnings}!`, type: 'success' }, ...newLogs];
        } else {
           newLogs = [{ day: currentDay, message: "Not ready for harvest yet.", type: 'warning' }, ...newLogs];
           return { ...prev, logs: newLogs };
        }
      } else if (action === 'remove') {
         newSlots[slotIndex] = { ...slot, plant: PlantType.EMPTY, growthStage: 0, waterLevel: 0, health: 100 };
         newLogs = [{ day: currentDay, message: "Cleared plot.", type: 'info' }, ...newLogs];
      }

      return {
        ...prev,
        slots: newSlots,
        money: newMoney,
        waterSupply: newWaterSupply,
        logs: newLogs
      };
    });
  };

  const plantSeed = async (type: PlantType) => {
    if (selectedSlotId === null) return;
    const config = PLANT_DB[type];

    if (gameState.money < config.cost) {
      addLog("Not enough money for seeds.", 'warning');
      return;
    }

    // AI Check
    addLog(`Consulting AI regarding ${type}...`, 'info');
    const tip = await analyzePlantSelection(type);
    addLog(`AI Tip: ${tip}`, 'info');

    setGameState(prev => {
      // Re-check money inside the setter to be safe against race conditions (though less likely here)
      if (prev.money < config.cost) return prev; 
      
      const newSlots = [...prev.slots];
      const slotIndex = newSlots.findIndex(s => s.id === selectedSlotId);
      newSlots[slotIndex] = {
        ...newSlots[slotIndex],
        plant: type,
        growthStage: 0,
        waterLevel: 50,
        health: 100,
        plantedDay: prev.day
      };
      
      return {
        ...prev,
        money: prev.money - config.cost,
        slots: newSlots,
        logs: [{ day: prev.day, message: `Planted ${type}.`, type: 'success' }, ...prev.logs]
      };
    });
  };

  // --- RENDER HELPERS ---
  const selectedSlot = selectedSlotId !== null ? gameState.slots.find(s => s.id === selectedSlotId) : null;

  return (
    <div className="min-h-screen bg-emerald-50 text-slate-800 flex flex-col md:flex-row max-w-[1600px] mx-auto shadow-2xl my-0 md:my-4 md:rounded-2xl overflow-hidden">
      
      {/* LEFT PANEL: FARM VIEW */}
      <div className="flex-1 p-6 flex flex-col gap-6 bg-white/50 backdrop-blur-sm">
        
        {/* Header Stats */}
        <div className="flex flex-wrap justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <div className="bg-amber-100 p-2 rounded-full text-amber-600"><DollarSign size={20} /></div>
              <div>
                <div className="text-xs text-slate-500 uppercase font-bold">Money</div>
                <div className="font-mono font-bold text-lg">${gameState.money}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-blue-100 p-2 rounded-full text-blue-600"><Droplet size={20} /></div>
              <div>
                <div className="text-xs text-slate-500 uppercase font-bold">Water</div>
                <div className="font-mono font-bold text-lg">{gameState.waterSupply}L</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg">
                {gameState.weather === 'Sunny' && <Sun className="text-amber-500" />}
                {gameState.weather === 'Rainy' && <CloudRain className="text-blue-500" />}
                {gameState.weather === 'Cloudy' && <Cloud className="text-slate-500" />}
                {gameState.weather === 'Heatwave' && <Sun className="text-red-500 animate-pulse" />}
                <span className="font-medium">{gameState.weather}</span>
             </div>
             <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg shadow-lg">
                <Calendar size={18} />
                <span className="font-bold">Day {gameState.day}</span>
             </div>
          </div>
        </div>

        {/* Farm Grid */}
        <div className="flex-1 flex items-center justify-center bg-emerald-900/5 rounded-2xl border-2 border-dashed border-emerald-900/10 p-4 md:p-8">
          <div className="grid grid-cols-3 gap-3 md:gap-4 max-w-md w-full">
            {gameState.slots.map(slot => (
              <GridSlot 
                key={slot.id} 
                slot={slot} 
                selected={selectedSlotId === slot.id}
                onClick={() => setSelectedSlotId(slot.id)}
              />
            ))}
          </div>
        </div>

        {/* Action Bar (Global) */}
        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <button 
             onClick={buyWater}
             className="flex items-center gap-2 px-4 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors font-medium"
          >
            <RefreshCw size={18} /> Buy Water (-${WATER_REFILL_COST})
          </button>

          <button 
            onClick={handleNextDay}
            disabled={isProcessing}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50 shadow-lg transform active:scale-95 transition-all font-bold"
          >
            {isProcessing ? 'Thinking...' : 'End Day'} <ArrowRight size={20} />
          </button>
        </div>
      </div>

      {/* RIGHT PANEL: DASHBOARD & CONTROLS */}
      <div className="w-full md:w-[450px] bg-white border-l border-slate-200 flex flex-col h-screen md:h-auto">
        
        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          <button 
            onClick={() => setActiveTab('shop')}
            className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'shop' ? 'text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <ShoppingBag size={16} /> Actions
          </button>
          <button 
            onClick={() => setActiveTab('stats')}
            className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'stats' ? 'text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Activity size={16} /> Data
          </button>
          <button 
             onClick={() => setActiveTab('advisor')}
             className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'advisor' ? 'text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
          >
             <div className="bg-emerald-100 text-emerald-600 p-1 rounded-full"><Sun size={12} /></div> Advisor
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          
          {activeTab === 'shop' && (
            <div className="space-y-6">
              {/* Contextual Actions based on selection */}
              {selectedSlot ? (
                <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm space-y-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    Plot #{selectedSlot.id + 1} Selected
                    {selectedSlot.plant !== PlantType.EMPTY && <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">{selectedSlot.plant}</span>}
                  </h3>
                  
                  {selectedSlot.plant === PlantType.EMPTY ? (
                    <div className="space-y-3">
                      <p className="text-sm text-slate-500">Select seeds to plant:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.values(PLANT_DB).filter(p => p.type !== PlantType.EMPTY).map(plant => (
                          <button 
                            key={plant.type}
                            onClick={() => plantSeed(plant.type)}
                            disabled={gameState.money < plant.cost}
                            className="flex flex-col items-start p-3 border border-slate-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all disabled:opacity-50 text-left"
                          >
                             <div className="flex justify-between w-full mb-1">
                               <span className="font-semibold text-sm">{plant.type}</span>
                               <span className="text-xs font-bold text-amber-600">${plant.cost}</span>
                             </div>
                             <div className="text-[10px] text-slate-500 leading-tight">{plant.description}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                         <div className="p-2 bg-slate-50 rounded">Health: <span className="font-bold">{selectedSlot.health}%</span></div>
                         <div className="p-2 bg-slate-50 rounded">Water: <span className="font-bold">{selectedSlot.waterLevel}%</span></div>
                         <div className="p-2 bg-slate-50 rounded">Growth: <span className="font-bold">{selectedSlot.growthStage.toFixed(0)}%</span></div>
                         <div className="p-2 bg-slate-50 rounded">Value: <span className="font-bold text-emerald-600">${Math.floor(PLANT_DB[selectedSlot.plant].value * (selectedSlot.health/100))}</span></div>
                      </div>

                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleSlotAction('water')}
                          className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2 transition-colors"
                        >
                          <Droplet size={16} /> Water (-20L)
                        </button>
                        {selectedSlot.growthStage >= 100 ? (
                           <button 
                             onClick={() => handleSlotAction('harvest')}
                             className="flex-1 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 flex items-center justify-center gap-2 font-bold shadow-sm"
                           >
                             <DollarSign size={16} /> Harvest
                           </button>
                        ) : (
                          <button 
                             onClick={() => handleSlotAction('remove')}
                             className="flex-1 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 flex items-center justify-center gap-2"
                          >
                             <Shovel size={16} /> Remove
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center p-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                  <Shovel className="mx-auto mb-2 opacity-50" size={32} />
                  <p>Select a plot on the grid to perform actions.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-6">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <h4 className="font-semibold mb-4 text-sm text-slate-500 uppercase">Farm Performance</h4>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Line type="monotone" dataKey="money" stroke="#059669" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="water" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-2">
                 <h4 className="font-semibold text-sm text-slate-500 uppercase">Recent Logs</h4>
                 <div className="bg-white rounded-xl border border-slate-200 overflow-hidden max-h-60 overflow-y-auto">
                    {gameState.logs.map((log, i) => (
                      <div key={i} className={`p-3 border-b border-slate-50 text-sm ${log.type === 'event' ? 'bg-indigo-50 text-indigo-700' : ''}`}>
                         <span className="font-mono text-xs text-slate-400 mr-2">Day {log.day}</span>
                         {log.message}
                      </div>
                    ))}
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'advisor' && (
            <div className="h-full">
               <Advisor gameState={gameState} />
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default App;