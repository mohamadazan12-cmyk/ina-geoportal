import { create } from 'zustand';
import { MapLayer, BasemapType, SelectedFeature } from '../types/map';

interface MapStore {
  activeLayers: MapLayer[];
  basemap: BasemapType;
  selectedFeature: SelectedFeature | null;
  mapCenter: [number, number];
  zoom: number;

  addLayer: (layer: Omit<MapLayer, 'zIndex'> & { zIndex?: number }) => void;
  removeLayer: (id: string) => void;
  toggleLayerVisibility: (id: string) => void;
  updateLayerOpacity: (id: string, opacity: number) => void;
  reorderLayers: (startIndex: number, endIndex: number) => void;
  setBasemap: (basemap: BasemapType) => void;
  setSelectedFeature: (feature: SelectedFeature | null) => void;
  setCenterAndZoom: (center: [number, number], zoom: number) => void;
}

export const useMapStore = create<MapStore>((set, get) => ({
  activeLayers: [],
  basemap: 'osm',
  selectedFeature: null,
  mapCenter: [-2.5489, 118.0149],
  zoom: 5,

  addLayer: (layerInput) => {
    const { activeLayers } = get();
    // Prevent duplicate layer by ID
    const exists = activeLayers.some((l) => l.id === layerInput.id);
    if (exists) {
      // If already present, make sure it is visible
      set({
        activeLayers: activeLayers.map((l) => (l.id === layerInput.id ? { ...l, visible: true } : l)),
      });
      return;
    }

    const nextZIndex = activeLayers.length > 0 ? Math.max(...activeLayers.map((l) => l.zIndex)) + 1 : 10;
    const newLayer: MapLayer = {
      ...layerInput,
      zIndex: layerInput.zIndex ?? nextZIndex,
      opacity: layerInput.opacity ?? 0.85,
      visible: layerInput.visible ?? true,
    };

    set({ activeLayers: [...activeLayers, newLayer] });
  },

  removeLayer: (id: string) => {
    set((state) => ({
      activeLayers: state.activeLayers.filter((l) => l.id !== id),
    }));
  },

  toggleLayerVisibility: (id: string) => {
    set((state) => ({
      activeLayers: state.activeLayers.map((l) =>
        l.id === id ? { ...l, visible: !l.visible } : l
      ),
    }));
  },

  updateLayerOpacity: (id: string, opacity: number) => {
    set((state) => ({
      activeLayers: state.activeLayers.map((l) =>
        l.id === id ? { ...l, opacity: Math.max(0, Math.min(1, opacity)) } : l
      ),
    }));
  },

  reorderLayers: (startIndex: number, endIndex: number) => {
    set((state) => {
      const result = Array.from(state.activeLayers);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      // Re-assign zIndex to strictly match stack order
      const updated = result.map((layer, index) => ({
        ...layer,
        zIndex: 10 + index * 5,
      }));
      return { activeLayers: updated };
    });
  },

  setBasemap: (basemap: BasemapType) => {
    set({ basemap });
  },

  setSelectedFeature: (feature: SelectedFeature | null) => {
    set({ selectedFeature: feature });
  },

  setCenterAndZoom: (center: [number, number], zoom: number) => {
    set({ mapCenter: center, zoom });
  },
}));
