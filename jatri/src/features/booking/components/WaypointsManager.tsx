"use client";

import { Plus, X, MapPin, ChevronUp, ChevronDown } from "lucide-react";

export type StopItem = {
  id: string;
  address: string;
  lat: number | null;
  lng: number | null;
  results: any[];
};

interface WaypointsManagerProps {
  stops: StopItem[];
  onAddStop: () => void;
  onRemoveStop: (id: string) => void;
  onStopChange: (id: string, value: string) => void;
  onSelectStopPlace: (stopId: string, place: any) => void;
  onMoveStopUp?: (stopIndex: number) => void;
  onMoveStopDown?: (stopIndex: number) => void;
  maxStops?: number;
  hideAddButton?: boolean;
}

export default function WaypointsManager({
  stops,
  onAddStop,
  onRemoveStop,
  onStopChange,
  onSelectStopPlace,
  onMoveStopUp,
  onMoveStopDown,
  maxStops = 2,
  hideAddButton = false,
}: WaypointsManagerProps) {
  return (
    <div className="space-y-2">
      {stops.map((stop, idx) => (
        <div key={stop.id} className="relative">
          <div className="flex items-center gap-2 bg-white dark:bg-[#1E2B23] border border-[#DED7CA] dark:border-[#34443A] rounded-[8px] px-2.5 sm:px-3.5 py-2 min-h-[60px] focus-within:border-[#123D32] dark:focus-within:border-[#90C8A8] transition-all shadow-xs">
            <div className="w-5 h-5 rounded-[6px] bg-[#123D32] dark:bg-[#28664D] text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
              {idx + 1}
            </div>
            {(onMoveStopUp || onMoveStopDown) && (
              <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => onMoveStopUp?.(idx)}
                    aria-label={idx === 0 ? "Move stop up to pickup" : `Move stop ${idx + 1} up`}
                    title={idx === 0 ? "Move up (promote to pickup)" : "Move stop up"}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-[8px] text-[#696B64] dark:text-[#929D93] hover:text-[#10251C] dark:hover:text-[#F3F1E8] transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38]"
                  >
                    <ChevronUp size={11} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveStopDown?.(idx)}
                    aria-label={idx === stops.length - 1 ? "Move stop down to destination" : `Move stop ${idx + 1} down`}
                    title={idx === stops.length - 1 ? "Move down (demote to drop)" : "Move stop down"}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-[8px] text-[#696B64] dark:text-[#929D93] hover:text-[#10251C] dark:hover:text-[#F3F1E8] transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38]"
                  >
                    <ChevronDown size={11} />
                  </button>
              </div>
            )}
            <input
              type="text"
              aria-label={`Intermediate stop ${idx + 1} address`}
              placeholder={`Stop ${idx + 1} address...`}
              value={stop.address}
              onChange={(e) => onStopChange(stop.id, e.target.value)}
              className="flex-1 min-w-0 text-sm font-semibold bg-transparent outline-none text-[#10251C] dark:text-[#F3F1E8] placeholder:text-[#696B64]/60 dark:placeholder:text-[#929D93]/60 tracking-tight"
            />
            <button
              type="button"
              onClick={() => onRemoveStop(stop.id)}
              aria-label={`Remove stop ${idx + 1}`}
              className="min-w-[44px] min-h-[44px] rounded-[8px] hover:bg-[#faebe8] dark:hover:bg-[#341814] text-[#696B64] dark:text-[#B8C2B8] hover:text-[#E34222] dark:hover:text-[#E06A50] flex items-center justify-center flex-shrink-0 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E34222]"
              title="Remove stop"
            >
              <X size={14} />
            </button>
          </div>

          {/* Autocomplete dropdown for this stop */}
          {stop.results && stop.results.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-[#17211B] border border-[#DED7CA] dark:border-[#34443A] rounded-[8px] shadow-xl overflow-hidden z-30 max-h-48 overflow-y-auto">
              {stop.results.map((p: any) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelectStopPlace(stop.id, p)}
                  className="w-full min-h-[44px] flex items-center gap-2.5 px-3 py-2.5 hover:bg-[#FAF7F0] dark:hover:bg-[#1E2B23] text-left border-b border-[#DED7CA] dark:border-[#34443A] last:border-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#046A38]"
                >
                  <MapPin size={14} className="text-zinc-400 flex-shrink-0" />
                  <div className="truncate">
                    <p className="text-xs font-bold text-[#10251C] dark:text-[#F3F1E8] truncate">{p.title || p.name}</p>
                    {p.subtitle && (
                      <p className="text-[10px] text-[#696B64] dark:text-[#929D93] truncate">{p.subtitle}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      {!hideAddButton && stops.length < maxStops && (
        <button
          type="button"
          onClick={onAddStop}
          className="min-h-[44px] flex items-center gap-1.5 text-xs font-bold text-[#10251C] dark:text-[#F3F1E8] hover:text-[#046A38] px-3 py-2 rounded-[8px] border border-dashed border-[#DED7CA] dark:border-[#34443A] hover:border-[#123D32] dark:hover:border-[#90C8A8] hover:bg-[#FAF7F0] dark:hover:bg-[#1E2B23] transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38]"
        >
          <Plus size={13} />
          <span>Add Stop (max {maxStops})</span>
        </button>
      )}
    </div>
  );
}
