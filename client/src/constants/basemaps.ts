import { BasemapType } from '../types/map';

const cartoApiKey =
  typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_CARTO_API_KEY
    ? (import.meta.env.VITE_CARTO_API_KEY as string)
    : '';

export const BASEMAP_CONFIGS: Record<
  BasemapType,
  { name: string; url: string; attribution: string; maxZoom: number; subdomains?: string[] }
> = {
  osm: {
    name: 'OpenStreetMap Standard',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> kontributor',
    maxZoom: 19,
  },
  satellite: {
    name: 'Citra Satelit ESRI',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, GIS User Community',
    maxZoom: 18,
  },
  topo: {
    name: 'Topografi (OpenTopoMap)',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Peta: &copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>, SRTM | Gaya: &copy; OpenTopoMap (CC-BY-SA)',
    maxZoom: 17,
    subdomains: ['a', 'b', 'c'],
  },
  dark: {
    name: 'Dark Gray Canvas (ESRI)',
    url: cartoApiKey
      ? `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${cartoApiKey}`
      : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: cartoApiKey
      ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
      : 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors, GIS Community',
    maxZoom: 19,
    subdomains: cartoApiKey ? ['a', 'b', 'c', 'd'] : undefined,
  },
};
