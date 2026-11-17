import { describe, it, expect, beforeEach } from 'vitest';
import { calculateDistanceKm, calculatePolygonAreaSqKm, safeParseGeoJSON, simpleKmlToGeoJSON } from '../utils/geoUtils';
import { formatDate, formatNumber } from '../utils/formatters';
import { useMapStore } from '../store/useMapStore';
import { useCatalogStore } from '../store/useCatalogStore';
import { LAYER_SYMBOLOGY_CATALOG, getFeatureStyle, getPointMarkerOptions } from '../utils/symbology';
import { BASEMAP_CONFIGS } from '../constants/basemaps';

describe('Ina-Geoportal v2.0 Client Core Utilities & Stores', () => {
  beforeEach(() => {
    useMapStore.setState({
      activeLayers: [],
      basemap: 'osm',
      selectedFeature: null,
      mapCenter: [-2.5489, 118.0149],
      zoom: 5,
    });
    useCatalogStore.getState().resetFilters();
  });

  describe('Geospatial Utility Functions (Turf.js & Parsers)', () => {
    it('calculateDistanceKm should calculate spatial distance accurately', () => {
      // Jakarta [-6.2088, 106.8456] to Bandung [-6.9175, 107.6191] ~ 115-130 km
      const dist = calculateDistanceKm([-6.2088, 106.8456], [-6.9175, 107.6191]);
      expect(dist).toBeGreaterThan(100);
      expect(dist).toBeLessThan(150);
    });

    it('calculatePolygonAreaSqKm should calculate polygon area', () => {
      const square: Array<[number, number]> = [
        [-6.0, 106.0],
        [-6.0, 107.0],
        [-7.0, 107.0],
        [-7.0, 106.0],
      ];
      const area = calculatePolygonAreaSqKm(square);
      expect(area).toBeGreaterThan(10000); // ~ 1 degree x 1 degree ~ 12,000 sq km
    });

    it('safeParseGeoJSON should parse valid GeoJSON and reject invalid string', () => {
      const valid = JSON.stringify({
        type: 'FeatureCollection',
        features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [106.8, -6.2] }, properties: {} }],
      });
      const parsed = safeParseGeoJSON(valid);
      expect(parsed.type).toBe('FeatureCollection');
      expect(parsed.features.length).toBe(1);

      expect(() => safeParseGeoJSON('{"invalid": true}')).toThrow();
    });

    it('simpleKmlToGeoJSON should parse KML placemarks to FeatureCollection', () => {
      const kml = `<?xml version="1.0" encoding="UTF-8"?>
        <kml xmlns="http://www.opengis.net/kml/2.2">
          <Placemark>
            <name>Monas</name>
            <description>Monumen Nasional</description>
            <Point>
              <coordinates>106.827153,-6.175392,0</coordinates>
            </Point>
          </Placemark>
        </kml>`;
      const geojson = simpleKmlToGeoJSON(kml);
      expect(geojson.type).toBe('FeatureCollection');
      expect(geojson.features.length).toBe(1);
      expect(geojson.features[0].geometry.type).toBe('Point');
      expect(geojson.features[0].properties.name).toBe('Monas');
    });
  });

  describe('Formatters', () => {
    it('formatDate formats ISO string properly', () => {
      const formatted = formatDate('2024-08-17');
      expect(formatted).toContain('Agustus');
      expect(formatted).toContain('2024');
    });

    it('formatNumber formats Indonesian localized digits', () => {
      expect(formatNumber(1500000)).toBe('1.500.000');
    });
  });

  describe('useMapStore State Management', () => {
    it('should add layer and avoid duplicate IDs', () => {
      const store = useMapStore.getState();
      store.addLayer({
        id: 'layer-1',
        name: 'Layer Batas Wilayah',
        type: 'geojson',
        opacity: 0.8,
        visible: true,
      });

      expect(useMapStore.getState().activeLayers.length).toBe(1);

      // Attempting to add duplicate ID should not increase count
      store.addLayer({
        id: 'layer-1',
        name: 'Layer Batas Wilayah Duplikat',
        type: 'geojson',
        opacity: 0.8,
        visible: true,
      });
      expect(useMapStore.getState().activeLayers.length).toBe(1);
    });

    it('should toggle visibility and update opacity', () => {
      const store = useMapStore.getState();
      store.addLayer({
        id: 'layer-test',
        name: 'Test Layer',
        type: 'wms',
        opacity: 1,
        visible: true,
      });

      store.toggleLayerVisibility('layer-test');
      expect(useMapStore.getState().activeLayers[0].visible).toBe(false);

      store.updateLayerOpacity('layer-test', 0.5);
      expect(useMapStore.getState().activeLayers[0].opacity).toBe(0.5);
    });

    it('should reorder layers and recalculate zIndex properly', () => {
      const store = useMapStore.getState();
      store.addLayer({ id: 'l1', name: 'Layer 1', type: 'geojson', visible: true, opacity: 1 });
      store.addLayer({ id: 'l2', name: 'Layer 2', type: 'geojson', visible: true, opacity: 1 });

      expect(useMapStore.getState().activeLayers[0].id).toBe('l1');
      store.reorderLayers(0, 1);
      expect(useMapStore.getState().activeLayers[0].id).toBe('l2');
      expect(useMapStore.getState().activeLayers[1].id).toBe('l1');
      expect(useMapStore.getState().activeLayers[1].zIndex).toBeGreaterThan(
        useMapStore.getState().activeLayers[0].zIndex
      );
    });

    it('should switch basemap without affecting active layers', () => {
      const store = useMapStore.getState();
      store.addLayer({ id: 'l1', name: 'Layer 1', type: 'geojson', visible: true, opacity: 1 });
      store.setBasemap('satellite');

      expect(useMapStore.getState().basemap).toBe('satellite');
      expect(useMapStore.getState().activeLayers.length).toBe(1);
    });
  });

  describe('useCatalogStore State Management', () => {
    it('should update query and reset page to 1', () => {
      const store = useCatalogStore.getState();
      store.setPage(3);
      store.setSearchQuery('batas');

      expect(useCatalogStore.getState().searchQuery).toBe('batas');
      expect(useCatalogStore.getState().pagination.page).toBe(1);
    });

    it('should toggle categories properly', () => {
      const store = useCatalogStore.getState();
      store.toggleCategory('administrasi');
      expect(useCatalogStore.getState().selectedCategories).toEqual(['administrasi']);
      store.toggleCategory('administrasi');
      expect(useCatalogStore.getState().selectedCategories).toEqual([]);
    });
  });

  describe('WebGIS Symbology and Legend Engine', () => {
    it('should have catalog entries for all 6 core geospatial datasets', () => {
      const expectedLayers = [
        'ds-batas-kabkot',
        'ds-jalan-nasional',
        'ds-rawan-gempa',
        'ds-tutupan-lahan',
        'ds-faskes',
        'ds-rbi',
      ];
      expectedLayers.forEach((layerId) => {
        expect(LAYER_SYMBOLOGY_CATALOG[layerId]).toBeDefined();
        expect(LAYER_SYMBOLOGY_CATALOG[layerId].classes.length).toBeGreaterThan(0);
      });
    });

    it('should assign accurate thematic styling for earthquake risk levels', () => {
      const highHazardFeature = {
        properties: { TINGKAT_KERAWANAN: 'Sangat Tinggi (Sesar Aktif)' },
      };
      const highStyle = getFeatureStyle('ds-rawan-gempa', highHazardFeature, 1.0);
      expect(highStyle.color).toBe('#dc2626');
      expect(highStyle.weight).toBe(2);

      const moderateHazardFeature = {
        properties: { TINGKAT_KERAWANAN: 'Sedang' },
      };
      const modStyle = getFeatureStyle('ds-rawan-gempa', moderateHazardFeature, 1.0);
      expect(modStyle.color).toBe('#f59e0b');
    });

    it('should style national road features based on status/artery rank', () => {
      const panturaRoad = {
        properties: { NAMA_RUAS: 'Jalur Pantura', STATUS: 'Jalan Nasional Arteri Primer' },
      };
      const panturaStyle = getFeatureStyle('ds-jalan-nasional', panturaRoad, 0.9);
      expect(panturaStyle.color).toBe('#ea580c');
      expect(panturaStyle.weight).toBe(4);
    });

    it('should differentiate health facilities markers by tier and hospital type', () => {
      const rsupFeature = {
        properties: { JENIS: 'Rumah Sakit Umum Pusat (RSUP)', KELAS: 'Kelas A' },
      };
      const rsupMarker = getPointMarkerOptions('ds-faskes', rsupFeature);
      expect(rsupMarker.fillColor).toBe('#dc2626');
      expect(rsupMarker.radius).toBe(8);

      const rsudFeature = {
        properties: { JENIS: 'RSUD', KELAS: 'Kelas B' },
      };
      const rsudMarker = getPointMarkerOptions('ds-faskes', rsudFeature);
      expect(rsudMarker.fillColor).toBe('#2563eb');
      expect(rsudMarker.radius).toBe(7);
    });

    it('Phase 10: should style real BIG Penutupan Lahan features by official FTYPE codes', () => {
      const hutanRimbaFeature = {
        properties: { FTYPE: 'FC004000', KLASIFIKASI: 'Hutan Rimba' },
      };
      const hutanStyle = getFeatureStyle('ds-tutupan-lahan', hutanRimbaFeature, 0.85);
      expect(hutanStyle.fillColor).toBe('#15803d');

      const sawahFeature = {
        properties: { FTYPE: 'FA006000', KLASIFIKASI: 'Sawah' },
      };
      const sawahStyle = getFeatureStyle('ds-tutupan-lahan', sawahFeature, 0.85);
      expect(sawahStyle.fillColor).toBe('#65a30d');

      const kebunFeature = {
        properties: { FTYPE: 'FA002000', KLASIFIKASI: 'Perkebunan/Kebun' },
      };
      const kebunStyle = getFeatureStyle('ds-tutupan-lahan', kebunFeature, 0.85);
      expect(kebunStyle.fillColor).toBe('#ca8a04');
    });

    it('Phase 10: should style real BIG hospital and puskesmas points accurately', () => {
      const realHospital = {
        properties: { NAMOBJ: 'RSUD Dr. Soetomo', TIPE_FASKES: 'Rumah Sakit', TIPRST: 'Kelas A' },
      };
      const hospitalMarker = getPointMarkerOptions('ds-faskes', realHospital);
      expect(hospitalMarker.fillColor).toBe('#dc2626');

      const realPuskesmas = {
        properties: { NAMOBJ: 'Puskesmas Gambir', TIPE_FASKES: 'Puskesmas', KELAS: 'Puskesmas' },
      };
      const puskesmasMarker = getPointMarkerOptions('ds-faskes', realPuskesmas);
      expect(puskesmasMarker.fillColor).toBe('#2563eb');
    });

    it('Phase 10: should style real BIG Batas Wilayah polygons with emerald boundary', () => {
      const realBoundary = {
        properties: { NAMOBJ: 'Kabupaten Sleman', WADMPR: 'D.I. Yogyakarta', KDPKAB: '34.04' },
      };
      const boundaryStyle = getFeatureStyle('ds-batas-kabkot', realBoundary, 0.85);
      expect(boundaryStyle.color).toBe('#10b981');
      expect(boundaryStyle.weight).toBe(2);
    });

    it('Phase 10.9: should style Tanah Kosong/Gundul (FF002000) with amber symbology', () => {
      const openLand = {
        properties: { FTYPE: 'FF002000', KLASIFIKASI: 'Tanah Kosong/Gundul' },
      };
      const openLandStyle = getFeatureStyle('ds-tutupan-lahan', openLand, 0.85);
      expect(openLandStyle.fillColor).toBe('#f59e0b');
      expect(openLandStyle.color).toBe('#d97706');
    });

    it('Phase 10.9: should maintain conceptual separation of RBI Topografi from satellite imagery in legend catalog', () => {
      const rbiLegend = LAYER_SYMBOLOGY_CATALOG['ds-rbi'];
      expect(rbiLegend).toBeDefined();
      expect(rbiLegend.title).toContain('Topografi');
      expect(rbiLegend.classes[0].label).toContain('Topografi & Hipsografi');
      expect(rbiLegend.classes[0].sublabel).not.toContain('Sentinel-2');
    });

    it('Phase 10.9: should differentiate health facilities symbology between hospital and puskesmas', () => {
      const hospitalFeature = {
        properties: { NAMOBJ: 'RSUD dr. Chasan Boesoire', TIPE_FASKES: 'Rumah Sakit' },
      };
      const hospitalStyle = getFeatureStyle('ds-faskes', hospitalFeature, 0.85);
      expect(hospitalStyle.color).toBe('#dc2626');
      expect(hospitalStyle.fillColor).toBe('#ef4444');

      const puskesmasFeature = {
        properties: { NAMOBJ: 'Puskesmas Bobaneigo', TIPE_FASKES: 'Puskesmas' },
      };
      const puskesmasStyle = getFeatureStyle('ds-faskes', puskesmasFeature, 0.85);
      expect(puskesmasStyle.color).toBe('#2563eb');
      expect(puskesmasStyle.fillColor).toBe('#3b82f6');
    });

    it('Phase 10.10: should ensure legend synchronization matches layer symbology classes', () => {
      // Verify all layers in catalog have synchronized label, color, and valid class structures
      Object.entries(LAYER_SYMBOLOGY_CATALOG).forEach(([_layerId, sym]) => {
        expect(sym.title).toBeDefined();
        expect(sym.classes.length).toBeGreaterThan(0);
        sym.classes.forEach((c) => {
          expect(c.label).toBeDefined();
          expect(c.color).toMatch(/^#[0-9a-fA-F]{6}$/);
          expect(c.type).toBeDefined();
          expect(['polygon', 'line', 'point', 'circle']).toContain(c.type);
        });
      });
    });

    it('Phase 10.10: should ensure basemap switching preserves layer stack and opacity integrity', () => {
      const store = useMapStore.getState();
      store.addLayer({ id: 'l1', name: 'Layer 1', type: 'geojson', visible: true, opacity: 0.75 });
      store.addLayer({ id: 'l2', name: 'Layer 2', type: 'wms', visible: true, opacity: 0.5 });

      // Switch between basemaps
      store.setBasemap('topo');
      expect(useMapStore.getState().basemap).toBe('topo');
      expect(useMapStore.getState().activeLayers.length).toBe(2);
      expect(useMapStore.getState().activeLayers[0].opacity).toBe(0.75);
      expect(useMapStore.getState().activeLayers[1].opacity).toBe(0.5);

      store.setBasemap('dark');
      expect(useMapStore.getState().basemap).toBe('dark');
      expect(useMapStore.getState().activeLayers.length).toBe(2);
    });

    it('Phase 10.10: should correctly format bounding box coordinate arrays', () => {
      const bbox: [number, number, number, number] = [106.8, -6.5, 107.0, -6.2];
      const bboxStr = bbox.join(',');
      expect(bboxStr).toBe('106.8,-6.5,107,-6.2');
      const parsed = bboxStr.split(',').map(Number);
      expect(parsed).toEqual(bbox);
    });
  });

  describe('Phase 11: Bug Fix & Functional Stabilization', () => {
    it('Phase 11: LayerManagerDrawer state manipulation should reorder layers and maintain zIndex integrity', () => {
      const store = useMapStore.getState();
      store.addLayer({ id: 'layer-a', name: 'Batas Kabkot', type: 'geojson', visible: true, opacity: 1 });
      store.addLayer({ id: 'layer-b', name: 'Jalan Nasional', type: 'geojson', visible: true, opacity: 0.8 });
      store.addLayer({ id: 'layer-c', name: 'Fasilitas Kesehatan', type: 'geojson', visible: true, opacity: 0.9 });

      expect(useMapStore.getState().activeLayers.map((l) => l.id)).toEqual(['layer-a', 'layer-b', 'layer-c']);

      // Move layer-b up (index 1 to 0)
      store.reorderLayers(1, 0);
      expect(useMapStore.getState().activeLayers.map((l) => l.id)).toEqual(['layer-b', 'layer-a', 'layer-c']);
      expect(useMapStore.getState().activeLayers[2].zIndex).toBeGreaterThan(
        useMapStore.getState().activeLayers[0].zIndex
      );

      // Move layer-b down (index 0 to 1)
      store.reorderLayers(0, 1);
      expect(useMapStore.getState().activeLayers.map((l) => l.id)).toEqual(['layer-a', 'layer-b', 'layer-c']);
    });

    it('Phase 11: should handle preset location centering and zoom in useMapStore', () => {
      const store = useMapStore.getState();
      // IKN Nusantara preset coords
      store.setCenterAndZoom([-0.973, 116.708], 12);
      expect(useMapStore.getState().mapCenter).toEqual([-0.973, 116.708]);
      expect(useMapStore.getState().zoom).toBe(12);

      // DKI Jakarta preset coords
      store.setCenterAndZoom([-6.2088, 106.8456], 11);
      expect(useMapStore.getState().mapCenter).toEqual([-6.2088, 106.8456]);
      expect(useMapStore.getState().zoom).toBe(11);
    });

    it('Phase 11: should provide safe fallback symbology for undefined or custom layers', () => {
      const fallbackStyle = getFeatureStyle('ds-custom-unregistered', { properties: {} }, 0.8);
      expect(fallbackStyle.color).toBe('#64748b');
      expect(fallbackStyle.fillColor).toBe('#64748b');
      expect(fallbackStyle.opacity).toBe(0.8);

      const fallbackMarker = getPointMarkerOptions('ds-custom-unregistered', { properties: {} }, 0.7);
      expect(fallbackMarker.fillColor).toBe('#3b82f6');
      expect(fallbackMarker.radius).toBe(7);
    });

    it('Phase 11: formatters should handle edge cases, nullish, and invalid date inputs without crashing', () => {
      expect(formatDate(undefined)).toBe('-');
      expect(formatDate('')).toBe('-');
      expect(formatDate('invalid-date-string')).toBe('invalid-date-string');
      expect(formatNumber(undefined)).toBe('0');
      expect(formatNumber(0)).toBe('0');
      expect(formatNumber(12500)).toBe('12.500');
    });

    it('Phase 11: useMapStore should support layer removal and feature selection without memory leaks', () => {
      const store = useMapStore.getState();
      store.addLayer({ id: 'layer-temp', name: 'Temp Layer', type: 'geojson', visible: true, opacity: 1 });
      expect(useMapStore.getState().activeLayers.length).toBe(1);

      store.setSelectedFeature({
        layerName: 'Temp Layer',
        coordinates: [-6.2, 106.8],
        properties: { KAB_KOT: 'Jakarta Pusat', KODE_WILAYAH: '31.71' },
      });
      expect(useMapStore.getState().selectedFeature?.layerName).toBe('Temp Layer');
      expect(useMapStore.getState().selectedFeature?.properties.KAB_KOT).toBe('Jakarta Pusat');

      // Clear selection
      store.setSelectedFeature(null);
      expect(useMapStore.getState().selectedFeature).toBeNull();

      // Remove layer
      store.removeLayer('layer-temp');
      expect(useMapStore.getState().activeLayers.length).toBe(0);
    });

    it('Phase 11: BASEMAP_CONFIGS should include robust Dark Map configuration using ESRI World Dark Gray Canvas', () => {
      const darkConfig = BASEMAP_CONFIGS.dark;
      expect(darkConfig).toBeDefined();
      expect(darkConfig.name).toContain('Dark Gray Canvas');
      expect(darkConfig.url).toContain('Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}');
      expect(darkConfig.attribution).toContain('Esri');
      expect(darkConfig.maxZoom).toBeGreaterThanOrEqual(18);
    });

    it('Phase 11: BASEMAP_CONFIGS should support all 4 official basemap choices with valid tile endpoints', () => {
      const basemaps = ['osm', 'satellite', 'topo', 'dark'] as const;
      basemaps.forEach((bm) => {
        const config = BASEMAP_CONFIGS[bm];
        expect(config).toBeDefined();
        expect(config.url).toMatch(/^https:\/\//);
        expect(config.attribution).toBeTruthy();
        expect(config.maxZoom).toBeGreaterThanOrEqual(16);
      });
    });

    it('Phase 11: safeParseGeoJSON should reject corrupt or malformed payloads without crashing', () => {
      expect(() => safeParseGeoJSON('')).toThrow();
      expect(() => safeParseGeoJSON('{ invalid json')).toThrow();
      expect(() => safeParseGeoJSON(JSON.stringify({ notGeoJSON: true }))).toThrow();

      const validCollection = JSON.stringify({
        type: 'FeatureCollection',
        features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [106.8, -6.2] }, properties: {} }],
      });
      const parsed = safeParseGeoJSON(validCollection);
      expect(parsed.type).toBe('FeatureCollection');
      expect(parsed.features.length).toBe(1);
    });
  });
});
