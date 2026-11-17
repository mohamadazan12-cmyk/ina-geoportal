import React from 'react';
import { WMSTileLayer, GeoJSON, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MapLayer } from '../../types/map';
import { useMapStore } from '../../store/useMapStore';
import { getFeatureStyle, getPointMarkerOptions } from '../../utils/symbology';
import { ErrorBoundary } from '../common/ErrorBoundary';

interface LayerStackControllerProps {
  layers: MapLayer[];
}

export const LayerStackController: React.FC<LayerStackControllerProps> = ({ layers }) => {
  const setSelectedFeature = useMapStore((s) => s.setSelectedFeature);

  // Global Map Click Handler for GetFeatureInfo or coordinate inspection
  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;

      // Check if any active visible WMS layer exists
      const activeWms = layers.filter((l) => l.visible && l.type === 'wms' && l.url && l.wmsLayer);
      if (activeWms.length > 0) {
        const topLayer = activeWms[activeWms.length - 1];
        // Attempt GetFeatureInfo construction compliant with WMS 1.1.1 / 1.3.0
        try {
          const map = e.target as L.Map;
          const size = map.getSize();
          const bounds = map.getBounds();
          const sw = bounds.getSouthWest();
          const ne = bounds.getNorthEast();
          const point = map.latLngToContainerPoint(e.latlng);

          const bboxStr = `${sw.lng},${sw.lat},${ne.lng},${ne.lat}`;
          const gfiUrl = `${topLayer.url}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo&LAYERS=${encodeURIComponent(
            topLayer.wmsLayer!
          )}&QUERY_LAYERS=${encodeURIComponent(
            topLayer.wmsLayer!
          )}&BBOX=${bboxStr}&WIDTH=${size.x}&HEIGHT=${size.y}&INFO_FORMAT=application/json&X=${Math.round(
            point.x
          )}&Y=${Math.round(point.y)}`;

          // We attempt fetch, but if external service is CORS restricted or down, we inform user
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3500);
          const res = await fetch(gfiUrl, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (res.ok) {
            const data = await res.json();
            if (data.features && data.features.length > 0) {
              setSelectedFeature({
                coordinates: [lat, lng],
                layerName: topLayer.name,
                properties: data.features[0].properties,
              });
              return;
            }
          }
        } catch {
          // If live GetFeatureInfo fails due to CORS or offline, fallback to coordinate inspection
        }

        setSelectedFeature({
          coordinates: [lat, lng],
          layerName: topLayer.name,
          properties: {
            'Koordinat Klik': `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            'Layer WMS': topLayer.wmsLayer,
            'Status Query': 'GetFeatureInfo terkirim (Tidak ada objek pada titik klik atau respons layanan eksternal terbatas).',
          },
        });
      }
    },
  });

  return (
    <>
      {layers.map((layer) => {
        if (!layer.visible) return null;

        return (
          <ErrorBoundary key={`layer-guard-${layer.id}`} silent>
            {layer.type === 'wms' && layer.url && layer.wmsLayer ? (
              <WMSTileLayer
                key={`wms-${layer.id}-${layer.zIndex}-${layer.opacity}`}
                url={layer.url}
                layers={layer.wmsLayer}
                format="image/png"
                transparent={true}
                opacity={layer.opacity}
                zIndex={layer.zIndex}
                version="1.1.1"
                eventHandlers={{
                  tileerror: () => {
                    // Gracefully suppress external WMS tile failures
                  },
                }}
              />
            ) : layer.geojsonData ? (
              <GeoJSON
                key={`geojson-${layer.id}-${layer.zIndex}-${layer.opacity}`}
                data={layer.geojsonData}
                style={(feature) => getFeatureStyle(layer.id, feature, layer.opacity)}
                pointToLayer={(feature, latlng) => {
                  const markerOpts = getPointMarkerOptions(layer.id, feature, layer.opacity);
                  return L.circleMarker(latlng, markerOpts);
                }}
                onEachFeature={(feature, leafletLayer) => {
                  // Interactive click listener on feature
                  leafletLayer.on({
                    click: (e) => {
                      L.DomEvent.stopPropagation(e);
                      const latlng = e.latlng || (e.target.getLatLng ? e.target.getLatLng() : undefined);
                      setSelectedFeature({
                        coordinates: latlng ? [latlng.lat, latlng.lng] : undefined,
                        layerName: layer.name,
                        properties: feature.properties || {},
                      });
                    },
                  });

                  // Bind tooltip/popup
                  if (feature.properties) {
                    const firstPropKey = Object.keys(feature.properties)[0];
                    const label =
                      feature.properties.NAMOBJ ||
                      feature.properties.WADMKK ||
                      feature.properties.NAMA_RUAS ||
                      feature.properties.KAB_KOTA ||
                      feature.properties.NAMA_FASKES ||
                      feature.properties.KLASIFIKASI ||
                      feature.properties.ZONA_BAHAYA ||
                      feature.properties.DESKRIPSI ||
                      feature.properties.name ||
                      (firstPropKey ? `${firstPropKey}: ${feature.properties[firstPropKey]}` : layer.name);

                    leafletLayer.bindTooltip(String(label), { sticky: true });
                  }
                }}
              />
            ) : null}
          </ErrorBoundary>
        );
      })}
    </>
  );
};
