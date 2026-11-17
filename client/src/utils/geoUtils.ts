import * as turf from '@turf/turf';

export function calculateDistanceKm(coord1: [number, number], coord2: [number, number]): number {
  // turf.distance expects [lng, lat]
  const from = turf.point([coord1[1], coord1[0]]);
  const to = turf.point([coord2[1], coord2[0]]);
  const distance = turf.distance(from, to, { units: 'kilometers' });
  return Math.round(distance * 100) / 100;
}

export function calculatePolygonAreaSqKm(latLngs: Array<[number, number]>): number {
  if (latLngs.length < 3) return 0;
  // Convert [lat, lng] to [lng, lat] and close polygon ring
  const coordinates = latLngs.map((pt) => [pt[1], pt[0]]);
  if (
    coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
    coordinates[0][1] !== coordinates[coordinates.length - 1][1]
  ) {
    coordinates.push(coordinates[0]);
  }

  const polygon = turf.polygon([coordinates]);
  const areaSqMeters = turf.area(polygon);
  return Math.round((areaSqMeters / 1_000_000) * 100) / 100;
}

export function safeParseGeoJSON(text: string): any {
  try {
    const parsed = JSON.parse(text);
    if (!parsed || (parsed.type !== 'FeatureCollection' && parsed.type !== 'Feature' && !parsed.coordinates)) {
      throw new Error('Format GeoJSON tidak sesuai standar RFC 7946.');
    }
    return parsed;
  } catch (err: any) {
    throw new Error(err.message || 'Gagal mem-parsing berkas GeoJSON.');
  }
}

export function simpleKmlToGeoJSON(kmlText: string): any {
  // In browser environments where DOMParser exists
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(kmlText, 'text/xml');
    const placemarks = xmlDoc.getElementsByTagName('Placemark');

    if (placemarks.length === 0) {
      throw new Error('Tidak ditemukan elemen Placemark dalam berkas KML.');
    }

    const features: any[] = [];

    for (let i = 0; i < placemarks.length; i++) {
      const pm = placemarks[i];
      const name = pm.getElementsByTagName('name')[0]?.textContent || `Fitur KML ${i + 1}`;
      const desc = pm.getElementsByTagName('description')[0]?.textContent || '';

      // Check Point
      const point = pm.getElementsByTagName('Point')[0];
      if (point) {
        const coordsText = point.getElementsByTagName('coordinates')[0]?.textContent?.trim();
        if (coordsText) {
          const parts = coordsText.split(',').map((p) => parseFloat(p.trim()));
          if (!isNaN(parts[0]) && !isNaN(parts[1])) {
            features.push({
              type: 'Feature',
              properties: { name, description: desc },
              geometry: {
                type: 'Point',
                coordinates: [parts[0], parts[1]],
              },
            });
            continue;
          }
        }
      }

      // Check LineString
      const line = pm.getElementsByTagName('LineString')[0];
      if (line) {
        const coordsText = line.getElementsByTagName('coordinates')[0]?.textContent?.trim();
        if (coordsText) {
          const points = coordsText
            .split(/\s+/)
            .map((pair) => {
              const parts = pair.split(',').map((p) => parseFloat(p.trim()));
              return [parts[0], parts[1]];
            })
            .filter((p) => !isNaN(p[0]) && !isNaN(p[1]));

          if (points.length >= 2) {
            features.push({
              type: 'Feature',
              properties: { name, description: desc },
              geometry: {
                type: 'LineString',
                coordinates: points,
              },
            });
            continue;
          }
        }
      }

      // Check Polygon
      const poly = pm.getElementsByTagName('Polygon')[0];
      if (poly) {
        const coordsText = poly.getElementsByTagName('coordinates')[0]?.textContent?.trim();
        if (coordsText) {
          const ring = coordsText
            .split(/\s+/)
            .map((pair) => {
              const parts = pair.split(',').map((p) => parseFloat(p.trim()));
              return [parts[0], parts[1]];
            })
            .filter((p) => !isNaN(p[0]) && !isNaN(p[1]));

          if (ring.length >= 3) {
            features.push({
              type: 'Feature',
              properties: { name, description: desc },
              geometry: {
                type: 'Polygon',
                coordinates: [ring],
              },
            });
          }
        }
      }
    }

    if (features.length === 0) {
      throw new Error('Gagal mengekstrak koordinat valid dari berkas KML.');
    }

    return {
      type: 'FeatureCollection',
      features,
    };
  }

  // Node.js fallback parser for testing environments
  const placemarkRegex = /<Placemark>([\s\S]*?)<\/Placemark>/gi;
  const features: any[] = [];
  let match;

  while ((match = placemarkRegex.exec(kmlText)) !== null) {
    const pmContent = match[1];
    const nameMatch = /<name>(.*?)<\/name>/i.exec(pmContent);
    const descMatch = /<description>(.*?)<\/description>/i.exec(pmContent);
    const name = nameMatch ? nameMatch[1] : 'Fitur KML';
    const description = descMatch ? descMatch[1] : '';

    const pointMatch = /<Point>[\s\S]*?<coordinates>(.*?)<\/coordinates>[\s\S]*?<\/Point>/i.exec(pmContent);
    if (pointMatch) {
      const parts = pointMatch[1].trim().split(',').map((p) => parseFloat(p.trim()));
      if (!isNaN(parts[0]) && !isNaN(parts[1])) {
        features.push({
          type: 'Feature',
          properties: { name, description },
          geometry: {
            type: 'Point',
            coordinates: [parts[0], parts[1]],
          },
        });
      }
    }
  }

  if (features.length === 0) {
    throw new Error('Tidak ditemukan fitur valid dalam berkas KML.');
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}
