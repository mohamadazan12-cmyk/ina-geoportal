import { AdministrativeRegion } from '../types/location';
import regionsData from '../constants/administrativeRegions.json';

const allRegions: AdministrativeRegion[] = regionsData as AdministrativeRegion[];

/**
 * Daftar lokasi populer Indonesia (menggunakan koordinat dan bounding box resmi dari dataset)
 */
export function getPopularLocations(): AdministrativeRegion[] {
  const popularIds = [
    'ikn-nusantara',
    'prov-dki-jakarta',
    'reg-35.78', // Kota Surabaya
    'reg-32.73', // Kota Bandung
    'reg-12.71', // Kota Medan
    'reg-73.71', // Kota Makassar
    'reg-51.71', // Kota Denpasar
    'reg-91.71', // Kota Jayapura
  ];

  const matched: AdministrativeRegion[] = [];
  for (const id of popularIds) {
    const found = allRegions.find((r) => r.id === id);
    if (found) {
      matched.push(found);
    }
  }

  // Fallback jika ada ID yang berbeda
  if (matched.length < 5) {
    return allRegions.slice(0, 8);
  }
  return matched;
}

/**
 * Normalisasi string query untuk pencarian yang toleran terhadap singkatan umum.
 */
function normalizeQuery(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/^kab\.\s+/i, 'kabupaten ')
    .replace(/^kab\s+/i, 'kabupaten ')
    .replace(/^prov\.\s+/i, 'provinsi ')
    .replace(/^prov\s+/i, 'provinsi ')
    .replace(/^kota adm\.\s+/i, 'kota administrasi ')
    .replace(/^kota adm\s+/i, 'kota administrasi ');
}

/**
 * Parsing jika input berupa pasangan koordinat "latitude, longitude".
 */
export function parseCoordinates(query: string): AdministrativeRegion | null {
  const trimmed = query.trim();
  const parts = trimmed.split(/[,;\s]+/).map((s) => parseFloat(s.trim()));

  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    const lat = parts[0];
    const lng = parts[1];

    // Validasi range Indonesia (sekitar -11 s/d 6 Lat, 95 s/d 141 Lng) atau koordinat global umum
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      const delta = 0.05;
      return {
        id: `coord-${lat.toFixed(4)}-${lng.toFixed(4)}`,
        name: `Koordinat: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        rawName: `${lat}, ${lng}`,
        type: 'koordinat',
        province: 'Titik Spasial',
        center: [lat, lng],
        bbox: [
          [lat - delta, lng - delta],
          [lat + delta, lng + delta],
        ],
        zoom: 14,
      };
    }
  }
  return null;
}

/**
 * Mencari wilayah administrasi berdasarkan kata kunci pencarian.
 *
 * Mendukung:
 * - Nama provinsi (e.g. "Jawa Barat", "Papua Barat")
 * - Nama kabupaten (e.g. "Kabupaten Bandung", "Bandung")
 * - Nama kota (e.g. "Kota Bandung", "Surabaya")
 * - Singkatan/Alias (e.g. "Jabar", "DKI", "Jogja", "Babel", "IKN")
 * - Pasangan koordinat (e.g. "-6.2088, 106.8456")
 */
export async function searchAdministrativeRegions(
  query: string,
  limit = 20
): Promise<AdministrativeRegion[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  // 1. Cek apakah query berupa koordinat
  const coordResult = parseCoordinates(trimmed);
  if (coordResult) {
    return [coordResult];
  }

  const q = normalizeQuery(trimmed);
  const qTerms = q.split(/\s+/).filter(Boolean);

  // Kata kunci tanpa prefix "kabupaten", "kota", "provinsi" untuk pencarian fleksibel
  const strippedQ = q
    .replace(/^(kabupaten|kota administrasi|kota|provinsi)\s+/i, '')
    .trim();

  const scored: { region: AdministrativeRegion; score: number }[] = [];

  for (const region of allRegions) {
    const nameLow = region.name.toLowerCase();
    const rawLow = region.rawName.toLowerCase();
    const provLow = region.province.toLowerCase();
    const aliases = (region.aliases || []).map((a) => a.toLowerCase());

    let score = 0;

    // --- A. Exact Match (Bobot Tertinggi) ---
    if (nameLow === q || rawLow === q || (strippedQ && rawLow === strippedQ)) {
      score += 120;
    } else if (aliases.includes(q) || (strippedQ && aliases.includes(strippedQ))) {
      score += 110;
    }

    // --- B. Prefix Match (Starts-with) ---
    else if (nameLow.startsWith(q) || rawLow.startsWith(q)) {
      score += 90;
    } else if (strippedQ && (rawLow.startsWith(strippedQ) || nameLow.startsWith(strippedQ))) {
      score += 85;
    } else if (aliases.some((a) => a.startsWith(q))) {
      score += 80;
    }

    // --- C. Word Boundary Match ---
    else if (
      nameLow.includes(` ${q}`) ||
      rawLow.includes(` ${q}`) ||
      (strippedQ && (nameLow.includes(` ${strippedQ}`) || rawLow.includes(` ${strippedQ}`)))
    ) {
      score += 70;
    }

    // --- D. Substring Match ---
    else if (nameLow.includes(q) || rawLow.includes(q)) {
      score += 55;
    } else if (strippedQ && (nameLow.includes(strippedQ) || rawLow.includes(strippedQ))) {
      score += 50;
    } else if (aliases.some((a) => a.includes(q))) {
      score += 45;
    }

    // --- E. Province Match (Pengguna mencari nama provinsi) ---
    else if (provLow === q || provLow === strippedQ) {
      score += 35;
    } else if (provLow.startsWith(q)) {
      score += 25;
    } else if (provLow.includes(q)) {
      score += 15;
    }

    // Pastikan semua kata kunci (jika query multi-word) cocok
    if (qTerms.length > 1 && score > 0) {
      const fullText = `${nameLow} ${rawLow} ${provLow} ${aliases.join(' ')}`;
      const allMatched = qTerms.every((term) => fullText.includes(term));
      if (!allMatched) {
        score = 0;
      }
    }

    if (score > 0) {
      // Prioritaskan entity bertipe Provinsi jika query cocok dengan nama provinsi tersebut
      if (region.type === 'provinsi' && (nameLow.includes(q) || aliases.some((a) => a.includes(q)))) {
        score += 25;
      }

      // Prioritaskan IKN jika dicari "ikn" atau "nusantara"
      if (region.type === 'khusus' && (q.includes('ikn') || q.includes('nusantara'))) {
        score += 30;
      }

      scored.push({ region, score });
    }
  }

  // Urutkan berdasarkan skor tertinggi, lalu nama abjad
  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.region.name.localeCompare(b.region.name, 'id');
  });

  return scored.slice(0, limit).map((s) => s.region);
}
