import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapContainer, useMap } from 'react-leaflet';
import { BasemapController } from './BasemapController';
import { LayerStackController } from './LayerStackController';
import { LayerManagerDrawer } from './LayerManagerDrawer';
import { BasemapSwitcher } from './BasemapSwitcher';
import { SpatialTools } from './SpatialTools';
import { FeatureInfoDrawer } from './FeatureInfoDrawer';
import { LegendDrawer } from './LegendDrawer';
import { AddLayerModal } from './AddLayerModal';
import { FigmaMapOverlay } from './FigmaMapOverlay';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { useMapStore } from '../../store/useMapStore';
import { datasetService } from '../../services/datasetService';

// Controller to sync map center & zoom from Zustand store and trigger invalidateSize
const MapStateSync: React.FC = () => {
  const map = useMap();
  const { mapCenter, zoom } = useMapStore();

  useEffect(() => {
    map.setView(mapCenter, zoom);
  }, [mapCenter, zoom, map]);

  useEffect(() => {
    // Invalidate map size on mount and after layout transitions
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [map]);

  return null;
};

export const WebmapViewer: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [addLayerModalOpen, setAddLayerModalOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [layerManagerOpen, setLayerManagerOpen] = useState(false);
  const [basemapOpen, setBasemapOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  const { basemap, activeLayers, addLayer } = useMapStore();

  // Deep linking: ?addLayer=datasetId OR ?layerId=datasetId
  const layerParam = searchParams.get('addLayer') || searchParams.get('layerId');

  useEffect(() => {
    if (!layerParam) return;

    const autoAddLayer = async () => {
      try {
        const ds = await datasetService.getDatasetById(layerParam);
        let geojsonData: any = null;
        let layerType: 'geojson' | 'wms' = 'geojson';

        try {
          geojsonData = await datasetService.getDatasetGeoJSON(ds.id);
          layerType = 'geojson';
        } catch {
          if (ds.wmsUrl && ds.wmsLayer) {
            layerType = 'wms';
          }
        }

        addLayer({
          id: ds.id,
          name: ds.title,
          description: ds.abstract,
          type: layerType,
          url: ds.wmsUrl,
          wmsLayer: ds.wmsLayer || undefined,
          geojsonData,
          opacity: 0.85,
          visible: true,
          source: ds.node?.name || 'Ina-Geoportal',
          format: ds.formatList,
        });

        // Open layer manager to show newly added layer
        setLayerManagerOpen(true);
      } catch (err) {
        console.warn('Failed to auto-load deep linked layer:', err);
      }
    };

    autoAddLayer();
  }, [layerParam, addLayer]);

  return (
    <div className="relative w-full h-[calc(100vh-144px)] min-h-[580px] overflow-hidden bg-slate-900">
      {/* Leaflet Map Canvas */}
      <MapContainer
        center={[-2.5489, 118.0149]}
        zoom={5}
        zoomControl={false}
        className="w-full h-full z-10"
        minZoom={4}
        maxZoom={19}
      >
        <MapStateSync />

        {/* Active Basemap */}
        <BasemapController basemap={basemap} />

        {/* Active Layers Stack */}
        <ErrorBoundary
          fallbackTitle="Kendala Layer Spasial"
          fallbackMessage="Gagal merender salah satu layer spasial. Silakan kelola kembali layer melalui panel manajemen layer."
        >
          <LayerStackController layers={activeLayers} />
        </ErrorBoundary>

        {/* Figma High-Fidelity Floating Search & Right-Hand Map Controls */}
        <FigmaMapOverlay
          onToggleLayerManager={() => {
            const next = !layerManagerOpen;
            setLayerManagerOpen(next);
            if (next) {
              setBasemapOpen(false);
              setToolsOpen(false);
              setLegendOpen(false);
            }
          }}
          onToggleBasemap={() => {
            const next = !basemapOpen;
            setBasemapOpen(next);
            if (next) {
              setLayerManagerOpen(false);
              setToolsOpen(false);
              setLegendOpen(false);
            }
          }}
          onToggleTools={() => {
            const next = !toolsOpen;
            setToolsOpen(next);
            if (next) {
              setLayerManagerOpen(false);
              setBasemapOpen(false);
              setLegendOpen(false);
            }
          }}
          onToggleLegend={() => {
            const next = !legendOpen;
            setLegendOpen(next);
            if (next) {
              setLayerManagerOpen(false);
              setBasemapOpen(false);
              setToolsOpen(false);
            }
          }}
          isLayerManagerOpen={layerManagerOpen}
          isBasemapOpen={basemapOpen}
          isToolsOpen={toolsOpen}
          isLegendOpen={legendOpen}
        />

        {/* Spatial Measurement Tools Overlay */}
        <SpatialTools
          isOpenControlled={toolsOpen}
          onCloseControlled={() => setToolsOpen(false)}
        />
      </MapContainer>

      {/* Layer Manager Drawer */}
      <LayerManagerDrawer
        isOpenControlled={layerManagerOpen}
        onCloseControlled={() => setLayerManagerOpen(false)}
        onOpenAddLayerModal={() => setAddLayerModalOpen(true)}
        onOpenLegend={() => {
          setLegendOpen(true);
          setLayerManagerOpen(false);
        }}
      />

      {/* Basemap Switcher Drawer */}
      <BasemapSwitcher
        isOpenControlled={basemapOpen}
        onCloseControlled={() => setBasemapOpen(false)}
      />

      {/* Feature Info Drawer on Map Click */}
      <FeatureInfoDrawer />

      {/* Legend Drawer */}
      <LegendDrawer
        isOpen={legendOpen}
        onClose={() => setLegendOpen(false)}
        onOpenLayerManager={() => {
          setLegendOpen(false);
          setLayerManagerOpen(true);
        }}
      />

      {/* Add Layer Catalog Modal */}
      <AddLayerModal
        isOpen={addLayerModalOpen}
        onClose={() => setAddLayerModalOpen(false)}
      />
    </div>
  );
};
