const fs = require('fs');
const path = require('path');

async function ingestBatas548() {
  console.log('=== INGESTION BATAS ADMINISTRASI 548 FITUR LENGKAP (BIG KSP Layer 2) ===');
  const chunksDir = path.join(__dirname, '..', 'src', 'fixtures', 'geojson', 'chunks_batas');
  if (!fs.existsSync(chunksDir)) fs.mkdirSync(chunksDir, { recursive: true });

  const total = 548;
  const batchSize = 25;
  const baseUrl = 'https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/BATAS_WILAYAH/MapServer/2/query';
  const outPath = path.join(__dirname, '..', 'src', 'fixtures', 'geojson', 'real_batas_kabupaten_548.json');

  for (let offset = 0; offset < total; offset += batchSize) {
    const chunkFile = path.join(chunksDir, `chunk_${offset}.json`);
    if (fs.existsSync(chunkFile)) {
      console.log(`Chunk at offset ${offset} already exists. Skipping.`);
      continue;
    }

    const count = Math.min(batchSize, total - offset);
    const url = `${baseUrl}?where=1%3D1&outFields=objectid,namobj,wadmkk,wadmpr,kdpkab,kdbbps,luaswh,remark,fcode,tipadm&returnGeometry=true&f=geojson&resultRecordCount=${count}&resultOffset=${offset}`;

    let ok = false;
    let retries = 0;
    while (!ok && retries < 4) {
      try {
        console.log(`Fetching Batas Layer 2 offset ${offset}..${offset + count} (attempt ${retries + 1})...`);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const geojson = await res.json();
        if (geojson.features && geojson.features.length > 0) {
          fs.writeFileSync(chunkFile, JSON.stringify(geojson.features));
          console.log(`Saved chunk_${offset}.json (+${geojson.features.length} features)`);
          ok = true;
        } else {
          throw new Error('Empty features array');
        }
      } catch (err) {
        retries++;
        console.warn(`Retry ${retries} at offset ${offset}: ${err.message}`);
        await new Promise(r => setTimeout(r, 2000 * retries));
      }
    }
    if (!ok) {
      console.error(`Failed to download chunk at offset ${offset}`);
      return;
    }
  }

  // Combine all chunks
  console.log('Combining all chunks into final reconciled GeoJSON...');
  const allFeatures = [];
  const chunkFiles = fs.readdirSync(chunksDir).filter(f => f.startsWith('chunk_') && f.endsWith('.json'));
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

  const finalGeojson = {
    type: 'FeatureCollection',
    name: 'Batas Wilayah Administrasi Kabupaten/Kota Indonesia (548 Fitur Lengkap BIG KSP Layer 2)',
    crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
    metadata: {
      totalFeatures: deduped.length,
      withKdpkabCount: deduped.filter(f => f.properties.kdpkab && String(f.properties.kdpkab).trim() !== '').length,
      withoutKdpkabCount: deduped.filter(f => !f.properties.kdpkab || String(f.properties.kdpkab).trim() === '').length,
      uniqueProvinces: Array.from(new Set(deduped.map(f => f.properties.wadmpr).filter(Boolean))),
      sumber: 'Badan Informasi Geospasial (BIG Satu Peta KSP Layer 2)',
      status: 'REAL_COMPLETE',
      timestamp: new Date().toISOString()
    },
    features: deduped.map(f => {
      const p = f.properties;
      return {
        ...f,
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
    })
  };

  fs.writeFileSync(outPath, JSON.stringify(finalGeojson));
  console.log(`=== INGESTION SUCCESS: ${deduped.length} features saved to ${outPath} (${(fs.statSync(outPath).size / 1024 / 1024).toFixed(2)} MB) ===`);
  
  // Also copy to client demoGeojson if needed or update primary fixture
  const clientPath = path.join(__dirname, '..', '..', 'client', 'src', 'constants', 'demoGeojson', 'real_batas_kabupaten_548.json');
  fs.copyFileSync(outPath, clientPath);
  console.log(`Copied to client: ${clientPath}`);
}

if (require.main === module) {
  ingestBatas548().catch(console.error);
}

module.exports = { ingestBatas548 };
