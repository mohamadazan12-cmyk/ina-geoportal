/**
 * INA-GEOPORTAL v2.0 — Administrative Regions Search Index Generator
 *
 * Extracts all 38 provinces and 520+ official kabupaten/kota from the integrated
 * administrative boundaries GeoJSON, computing centroids, bounding boxes, and
 * standard aliases for ultra-fast, zero-network client-side location search.
 */
const fs = require('fs');
const path = require('path');

const SOURCE_PATH = path.join(__dirname, '../client/src/constants/demoGeojson/real_batas_kabupaten.json');
const DEST_PATH = path.join(__dirname, '../client/src/constants/administrativeRegions.json');

if (!fs.existsSync(SOURCE_PATH)) {
  console.error('Source GeoJSON not found:', SOURCE_PATH);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(SOURCE_PATH, 'utf8'));

function computeBbox(geometry) {
  let minLng = Infinity, maxLng = -Infinity;
  let minLat = Infinity, maxLat = -Infinity;
  let sumLat = 0, sumLng = 0, count = 0;

  function traverse(coords) {
    if (typeof coords[0] === 'number') {
      const lng = coords[0];
      const lat = coords[1];
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      sumLat += lat;
      sumLng += lng;
      count++;
    } else {
      for (const sub of coords) traverse(sub);
    }
  }
  traverse(geometry.coordinates);

  const centerLat = count > 0 ? +(sumLat / count).toFixed(4) : +( (minLat + maxLat)/2 ).toFixed(4);
  const centerLng = count > 0 ? +(sumLng / count).toFixed(4) : +( (minLng + maxLng)/2 ).toFixed(4);

  return {
    bbox: [[+minLat.toFixed(4), +minLng.toFixed(4)], [+maxLat.toFixed(4), +maxLng.toFixed(4)]],
    center: [centerLat, centerLng]
  };
}

const PROVINCE_ALIASES = {
  'Daerah Khusus Ibukota Jakarta': ['DKI Jakarta', 'Jakarta', 'DKI'],
  'DKI Jakarta': ['Jakarta', 'DKI'],
  'Daerah Istimewa Yogyakarta': ['DI Yogyakarta', 'DIY', 'Yogyakarta', 'Jogja'],
  'Jawa Barat': ['Jabar'],
  'Jawa Tengah': ['Jateng'],
  'Jawa Timur': ['Jatim'],
  'Sumatera Utara': ['Sumut'],
  'Sumatera Barat': ['Sumbar'],
  'Sumatera Selatan': ['Sumsel'],
  'Kepulauan Bangka Belitung': ['Bangka Belitung', 'Babel'],
  'Kepulauan Riau': ['Kepri'],
  'Nusa Tenggara Barat': ['NTB'],
  'Nusa Tenggara Timur': ['NTT'],
  'Kalimantan Barat': ['Kalbar'],
  'Kalimantan Tengah': ['Kalteng'],
  'Kalimantan Selatan': ['Kalsel'],
  'Kalimantan Timur': ['Kaltim'],
  'Kalimantan Utara': ['Kaltara'],
  'Sulawesi Utara': ['Sulut'],
  'Sulawesi Tengah': ['Sulteng'],
  'Sulawesi Selatan': ['Sulsel'],
  'Sulawesi Tenggara': ['Sultra'],
  'Sulawesi Barat': ['Sulbar'],
  'Maluku Utara': ['Malut']
};

const regions = [];
const provBboxes = {};

// 1. IKN Nusantara
regions.push({
  id: 'ikn-nusantara',
  name: 'IKN Nusantara',
  rawName: 'IKN Nusantara',
  type: 'khusus',
  province: 'Kalimantan Timur',
  center: [-0.973, 116.708],
  bbox: [[-1.15, 116.55], [-0.80, 116.85]],
  zoom: 12,
  aliases: ['Ibu Kota Nusantara', 'IKN', 'Penajam Paser Utara', 'Sepaku']
});

// 2. All official kabupaten/kota
data.features.forEach((f, idx) => {
  const p = f.properties;
  const kdpkab = (p.KDPKAB || p.KODE_DAGRI || '').trim();
  const rawName = (p.KAB_KOTA || p.NAMOBJ || '').trim();
  let prov = (p.PROVINSI || p.WADMPR || '').trim();
  if (prov === 'Daerah Khusus Ibukota Jakarta') prov = 'DKI Jakarta';

  if (!kdpkab || !rawName || rawName === 'Indonesia' || rawName === prov) {
    return;
  }

  const isKota = rawName.toLowerCase().startsWith('kota ') || rawName.toLowerCase().includes('administrasi jakarta');
  const type = isKota ? 'kota' : 'kabupaten';

  let displayName = rawName;
  if (type === 'kabupaten') {
    if (!displayName.toLowerCase().startsWith('kabupaten ') && !displayName.toLowerCase().startsWith('adm. kep')) {
      displayName = 'Kabupaten ' + displayName;
    }
  } else if (type === 'kota') {
    if (!displayName.toLowerCase().startsWith('kota ') && !displayName.toLowerCase().startsWith('kota adm')) {
      displayName = 'Kota ' + displayName;
    }
  }

  const { bbox, center } = computeBbox(f.geometry);

  if (!provBboxes[prov]) {
    provBboxes[prov] = {
      minLat: Infinity, minLng: Infinity, maxLat: -Infinity, maxLng: -Infinity, count: 0
    };
  }
  const pb = provBboxes[prov];
  pb.minLat = Math.min(pb.minLat, bbox[0][0]);
  pb.minLng = Math.min(pb.minLng, bbox[0][1]);
  pb.maxLat = Math.max(pb.maxLat, bbox[1][0]);
  pb.maxLng = Math.max(pb.maxLng, bbox[1][1]);
  pb.count++;

  const aliases = [];
  const stripped = rawName.replace(/^(Kota Administrasi|Kota Adm\.|Kota|Kabupaten|Kab\.)\s+/i, '').trim();
  if (stripped && stripped.toLowerCase() !== displayName.toLowerCase()) {
    aliases.push(stripped);
  }

  if (prov === 'DKI Jakarta') {
    if (rawName.includes('Jakarta Pusat')) aliases.push('Jakarta Pusat', 'Jakpus');
    if (rawName.includes('Jakarta Selatan')) aliases.push('Jakarta Selatan', 'Jaksel');
    if (rawName.includes('Jakarta Barat')) aliases.push('Jakarta Barat', 'Jakbar');
    if (rawName.includes('Jakarta Timur')) aliases.push('Jakarta Timur', 'Jaktim');
    if (rawName.includes('Jakarta Utara')) aliases.push('Jakarta Utara', 'Jakut');
    if (rawName.includes('Kepulauan Seribu')) aliases.push('Kepulauan Seribu', 'Pulau Seribu');
  }

  regions.push({
    id: 'reg-' + kdpkab,
    name: displayName,
    rawName,
    type,
    province: prov,
    center,
    bbox,
    zoom: isKota ? 12 : 11,
    aliases
  });
});

// 3. All 38 Provinces
for (const [prov, pb] of Object.entries(provBboxes)) {
  const centerLat = +( (pb.minLat + pb.maxLat)/2 ).toFixed(4);
  const centerLng = +( (pb.minLng + pb.maxLng)/2 ).toFixed(4);
  const aliases = PROVINCE_ALIASES[prov] || [];

  regions.push({
    id: 'prov-' + prov.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name: prov,
    rawName: prov,
    type: 'provinsi',
    province: 'Indonesia',
    center: [centerLat, centerLng],
    bbox: [[+pb.minLat.toFixed(4), +pb.minLng.toFixed(4)], [+pb.maxLat.toFixed(4), +pb.maxLng.toFixed(4)]],
    zoom: 8,
    aliases
  });
}

fs.writeFileSync(DEST_PATH, JSON.stringify(regions, null, 2), 'utf8');
console.log('[regions-index] Generated', regions.length, 'entries into', DEST_PATH);
