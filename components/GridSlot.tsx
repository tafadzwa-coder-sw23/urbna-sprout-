import React from 'react';
import { PlantType, GridSlot as GridSlotType } from '../types';
import { PLANT_DB } from '../constants';
import { Droplet, Sprout, AlertCircle, CheckCircle, Leaf } from 'lucide-react';

interface Props {
  slot: GridSlotType;
  selected: boolean;
  onClick: () => void;
}

const GridSlot: React.FC<Props> = ({ slot, selected, onClick }) => {
  const isOccupied = slot.plant !== PlantType.EMPTY;

  // Visual health indicators
  const healthColor = slot.health > 70 ? 'text-green-500' : slot.health > 30 ? 'text-yellow-500' : 'text-red-500';
  const waterColor = slot.waterLevel > 50 ? 'bg-blue-500' : slot.waterLevel > 20 ? 'bg-blue-300' : 'bg-red-400';

  // Helper to render distinct icons based on growth stage
  const renderPlantStage = () => {
    // Stage 1: Seedling (0-30%)
    if (slot.growthStage < 30) {
      return (
        <div className="text-emerald-400 flex flex-col items-center gap-1 animate-pulse">
           <Sprout size={28} />
           <span className="text-[10px] font-semibold text-emerald-600/60 uppercase tracking-wider">Seedling</span>
        </div>
      );
    }
    // Stage 2: Vegetative Growth (30-70%)
    if (slot.growthStage < 70) {
      return (
        <div className="text-emerald-600 flex flex-col items-center gap-1">
           <Leaf size={36} />
           <span className="text-[10px] font-semibold text-emerald-600/60 uppercase tracking-wider">Growing</span>
        </div>
      );
    }
    // Stage 3: Fruiting/Mature (70-100%)
    let emoji = '🌱';
    switch (slot.plant) {
      case PlantType.TOMATO: emoji = '🍅'; break;
      case PlantType.BASIL: emoji = '🌿'; break;
      case PlantType.LETTUCE: emoji = '🥬'; break;
      case PlantType.CARROT: emoji = '🥕'; break;
      case PlantType.STRAWBERRY: emoji = '🍓'; break;
    }
    
    // Scale slightly based on progress within the mature stage
    const matureProgress = (slot.growthStage - 70) / 30; // 0 to 1
    const scale = 1.0 + (matureProgress * 0.2); // 1.0 to 1.2
    
    return (
      <div 
        className="flex flex-col items-center gap-1 transition-transform duration-500"
        style={{ transform: `scale(${scale})` }}
      >
        <div className="text-4xl filter drop-shadow-sm">{emoji}</div>
        {slot.growthStage >= 100 && (
           <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full shadow-sm">READY</span>
        )}
      </div>
    );
  };

  return (
    <div 
      onClick={onClick}
      className={`
        relative aspect-square rounded-xl border-2 cursor-pointer transition-all duration-200 overflow-hidden shadow-sm group select-none
        ${selected ? 'border-emerald-500 ring-2 ring-emerald-200 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300 bg-white'}
        ${isOccupied ? '' : 'hover:bg-slate-50'}
      `}
    >
       {/* Soil Texture */}
       <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '8px 8px' }}></div>

       {isOccupied ? (
         <div className="flex flex-col items-center justify-center h-full w-full p-2 relative z-10">
            
            {/* Plant Icon */}
            <div className="flex-1 flex items-center justify-center pb-4 w-full">
              {renderPlantStage()}
            </div>

            {/* Bars Overlay */}
            <div className="w-full absolute bottom-3 px-3 flex flex-col gap-1.5">
               {/* Water */}
               <div className="flex items-center gap-1.5">
                  <Droplet size={12} className="text-blue-400" />
                  <div className="flex-1 h-1.5 bg-white/60 rounded-full overflow-hidden border border-black/5 shadow-inner">
                     <div className={`h-full ${waterColor} transition-all duration-500`} style={{ width: `${slot.waterLevel}%` }}></div>
                  </div>
               </div>
               {/* Growth */}
               <div className="flex items-center gap-1.5">
                  <Sprout size={12} className="text-emerald-500" />
                  <div className="flex-1 h-1.5 bg-white/60 rounded-full overflow-hidden border border-black/5 shadow-inner">
                     <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${slot.growthStage}%` }}></div>
                  </div>
               </div>
            </div>

            {/* Status Indicators */}
            <div className="absolute top-2 right-2 flex flex-col gap-1">
               {slot.health < 40 && (
                 <div className="text-red-500 bg-white rounded-full p-1 shadow-sm animate-bounce border border-red-100">
                   <AlertCircle size={14} />
                 </div>
               )}
               {slot.growthStage >= 100 && (
                 <div className="text-emerald-600 bg-white rounded-full p-1 shadow-sm border border-emerald-100">
                   <CheckCircle size={14} />
                 </div>
               )}
            </div>

         </div>
       ) : (
         <div className="flex items-center justify-center h-full text-slate-300 group-hover:text-emerald-400 transition-colors">
            <div className="bg-slate-50 p-4 rounded-full group-hover:bg-emerald-50 transition-colors">
               <Sprout size={24} />
            </div>
         </div>
       )}
    </div>
  );
};

export default GridSlot;