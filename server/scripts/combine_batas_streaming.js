const fs = require('fs');
const path = require('path');

function roundCoords(coords) {
  if (typeof coords === 'number') {
    return Math.round(coords * 1e6) / 1e6;
  }
  if (Array.isArray(coords)) {
    return coords.map(roundCoords);
  }
  return coords;
}

async function combineStreaming() {
  console.log('=== STREAMING COMBINER UNTUK BATAS 548 FITUR ===');
  const chunksDir = path.join(__dirname, '..', 'src', 'fixtures', 'geojson', 'chunks_batas');
  const outPath = path.join(__dirname, '..', 'src', 'fixtures', 'geojson', 'real_batas_kabupaten_548.json');

  const chunkFiles = fs.readdirSync(chunksDir).filter(f => f.startsWith('chunk_') && f.endsWith('.json'));
  console.log(`Menemukan ${chunkFiles.length} file chunk di ${chunksDir}`);

  const allFeatures = [];
  for (const cf of chunkFiles) {
    const list = JSON.parse(fs.readFileSync(path.join(chunksDir, cf), 'utf8'));
    allFeatures.push(...list);
  }

  // Deduplicate by OBJECTID
  const map = new Map();
  for (const f of allFeatures) {
    const id = f.properties.objectid || f.properties.OBJECTID;
    if (!map.has(id)) {
      map.set(id, f);
    }
  }

  const deduped = Array.from(map.values()).sort((a, b) => {
    const idA = a.properties.objectid || a.properties.OBJECTID || 0;
    const idB = b.properties.objectid || b.properties.OBJECTID || 0;
    return idA - idB;
  });

  console.log(`Total unik: ${deduped.length} fitur. Memulai streaming ke ${outPath}...`);

  const writeStream = fs.createWriteStream(outPath, { encoding: 'utf8' });

  writeStream.write('{\n"type": "FeatureCollection",\n');
  writeStream.write('"name": "Batas Wilayah Administrasi Kabupaten/Kota Indonesia (548 Fitur Lengkap BIG KSP Layer 2)",\n');
  writeStream.write('"crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } },\n');
  writeStream.write(`"metadata": ${JSON.stringify({
    totalFeatures: deduped.length,
    withKdpkabCount: deduped.filter(f => f.properties.kdpkab && String(f.properties.kdpkab).trim() !== '').length,
    withoutKdpkabCount: deduped.filter(f => !f.properties.kdpkab || String(f.properties.kdpkab).trim() === '').length,
    uniqueProvinces: Array.from(new Set(deduped.map(f => f.properties.wadmpr).filter(Boolean))),
    sumber: 'Badan Informasi Geospasial (BIG Satu Peta KSP Layer 2)',
    status: 'REAL_COMPLETE',
    timestamp: new Date().toISOString()
  })},\n`);
  writeStream.write('"features": [\n');

  for (let i = 0; i < deduped.length; i++) {
    const f = deduped[i];
    const p = f.properties;
    
    // Round coordinates to 6 decimal places (~10cm accuracy, eliminates float bloat)
    const cleanGeom = f.geometry ? {
      type: f.geometry.type,
      coordinates: roundCoords(f.geometry.coordinates)
    } : null;

    const normalizedFeature = {
      type: 'Feature',
      geometry: cleanGeom,
      properties: {
        ...p,
        OBJECTID: p.objectid || p.OBJECTID,
        NAMOBJ: p.namobj || p.NAMOBJ || 'Wilayah Administrasi',
        WADMKK: p.wadmkk || p.WADMKK || p.namobj || 'Wilayah Administrasi',
        WADMPR: p.wadmpr || p.WADMPR || 'Wilayah Khusus/Maritim',
        KDPKAB: p.kdpkab || p.KDPKAB || '',
        KDBBPS: p.kdbbps || p.KDBBPS || '',
        LUASWH: p.luaswh || p.LUASWH || 0,
        REMARK: p.remark || p.REMARK || '',
        STATUS_DATA: 'REAL_COMPLETE',
        SUMBER: 'Badan Informasi Geospasial (BIG) Satu Peta KSP'
      }
    };

    const isLast = i === deduped.length - 1;
    writeStream.write(JSON.stringify(normalizedFeature) + (isLast ? '\n' : ',\n'));
  }

  writeStream.write(']\n}\n');
  writeStream.end();

  await new Promise((resolve) => writeStream.on('finish', resolve));

  const stats = fs.statSync(outPath);
  console.log(`=== BERHASIL! File tersimpan: ${outPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB, total: ${deduped.length} fitur) ===`);

  // Copy to client
  const clientPath = path.join(__dirname, '..', '..', 'client', 'src', 'constants', 'demoGeojson', 'real_batas_kabupaten_548.json');
  fs.copyFileSync(outPath, clientPath);
  console.log(`Tersalin ke client: ${clientPath}`);
}

if (require.main === module) {
  combineStreaming().catch(console.error);
}

module.exports = { combineStreaming };
