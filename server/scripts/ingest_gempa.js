const fs = require('fs');
const path = require('path');

async function ingestGempa() {
  console.log('=== INGESTION KAWASAN RAWAN BENCANA GEMPA LENGKAP (BIG KSP Layer 12) ===');
  const chunksDir = path.join(__dirname, '..', 'src', 'fixtures', 'geojson', 'chunks_gempa');
  if (!fs.existsSync(chunksDir)) fs.mkdirSync(chunksDir, { recursive: true });

  const total = 11439;
  const batchSize = 250;
  const baseUrl = 'https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/SUMBER_DAYA_ALAM_DAN_LINGKUNGAN/MapServer/12/query';
  const outPath = path.join(__dirname, '..', 'src', 'fixtures', 'geojson', 'real_rawan_gempa_full.json');

  // We can fetch in batches of 250 records
  for (let offset = 0; offset < total; offset += batchSize) {
    const chunkFile = path.join(chunksDir, `chunk_${offset}.json`);
    if (fs.existsSync(chunkFile)) {
      console.log(`Gempa chunk at offset ${offset} already exists. Skipping.`);
      continue;
    }

    const count = Math.min(batchSize, total - offset);
    const url = `${baseUrl}?where=1%3D1&outFields=objectid,namobj,krbid,kelas,lcode&returnGeometry=true&f=geojson&resultRecordCount=${count}&resultOffset=${offset}`;

    let ok = false;
    let retries = 0;
    while (!ok && retries < 4) {
      try {
        console.log(`Fetching Gempa Layer 12 offset ${offset}..${offset + count} (attempt ${retries + 1})...`);
        const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
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

  console.log('Combining Gempa chunks into final dataset...');
  const chunkFiles = fs.readdirSync(chunksDir).filter(f => f.startsWith('chunk_') && f.endsWith('.json'));
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

  const deduped = Array.from(map.values());
  const classBreakdown = {};
  for (const f of deduped) {
    const c = f.properties.kelas || f.properties.KELAS || 'Lainnya';
    classBreakdown[c] = (classBreakdown[c] || 0) + 1;
  }

  const finalGeojson = {
    type: 'FeatureCollection',
    name: 'Kawasan Rawan Bencana Gempa Bumi Indonesia (11.439 Fitur Lengkap PVMBG & BIG)',
    crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
    metadata: {
      totalFeatures: deduped.length,
      classBreakdown,
      sumber: 'Pusat Vulkanologi dan Mitigasi Bencana Geologi (PVMBG) & BIG Satu Peta KSP Layer 12',
      status: 'REAL_COMPLETE',
      disclaimer: 'Peta Kawasan Rawan Bencana Gempa Bumi tektonik (Tinggi, Menengah, Rendah, Sangat Rendah). Bukan untuk perancangan teknik sipil atau perhitungan kekuatan struktur bangunan (SNI Gempa 1726).',
      timestamp: new Date().toISOString()
    },
    features: deduped.map(f => {
      const p = f.properties;
      return {
        ...f,
        properties: {
          ...p,
          OBJECTID: p.objectid || p.OBJECTID,
          NAMOBJ: p.namobj || p.NAMOBJ || 'Kawasan Rawan Bencana Gempabumi',
          KRBID: p.krbid || p.KRBID || '',
          KELAS: p.kelas || p.KELAS || 'Kawasan Rawan Bencana Gempabumi',
          kelas: p.kelas || p.KELAS || 'Kawasan Rawan Bencana Gempabumi',
          LCODE: p.lcode || p.LCODE || '0202',
          STATUS_DATA: 'REAL_COMPLETE',
          SUMBER: 'PVMBG Badan Geologi & BIG Satu Peta KSP'
        }
      };
    })
  };

  fs.writeFileSync(outPath, JSON.stringify(finalGeojson));
  console.log(`=== INGESTION SUCCESS: ${deduped.length} hazard polygons saved to ${outPath} (${(fs.statSync(outPath).size / 1024 / 1024).toFixed(2)} MB) ===`);
}

if (require.main === module) {
  ingestGempa().catch(console.error);
}

module.exports = { ingestGempa };
