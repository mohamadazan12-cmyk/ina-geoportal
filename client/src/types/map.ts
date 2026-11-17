export type LayerType = 'wms' | 'wfs' | 'geojson' | 'kml';
export type BasemapType = 'osm' | 'satellite' | 'topo' | 'dark';

export interface MapLayer {
  id: string;
  name: string;
  description?: string;
  url?: string | null;
  type: LayerType;
  opacity: number; // 0 to 1
  visible: boolean;
  zIndex: number;
  legendUrl?: string | null;
  attribution?: string;
  source?: string;
  format?: string;
  wmsLayer?: string;
  geojsonData?: any; // parsed GeoJSON for local or fetched vector layers
  isLocalUpload?: boolean;
}

export interface SelectedFeature {
  coordinates?: [number, number];
  layerName?: string;
  properties: Record<string, any>;
}

export type MeasurementMode = 'none' | 'distance' | 'area';
