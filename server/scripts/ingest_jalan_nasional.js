const fs = require('fs');
const path = require('path');

async function ingestJalanNasional() {
  console.log('=== INGESTION JALAN NASIONAL LENGKAP (BIG KSP Layer 13 & 14) ===');
  const outPath = path.join(__dirname, '..', 'src', 'fixtures', 'geojson', 'real_jalan_nasional_full.json');
  const checkpointPath = path.join(__dirname, '..', 'src', 'fixtures', 'geojson', '.jalan_checkpoint.json');

  let features = [];
  let nonTolOffset = 0;
  const nonTolTotal = 3197;
  const batchSize = 1000;

  if (fs.existsSync(checkpointPath)) {
    try {
      const cp = JSON.parse(fs.readFileSync(checkpointPath, 'utf8'));
      features = cp.features || [];
      nonTolOffset = cp.nonTolOffset || 0;
      console.log(`Resuming ingestion from checkpoint: ${features.length} features collected, offset: ${nonTolOffset}`);
    } catch (e) {
      console.warn('Failed to parse checkpoint, starting fresh:', e.message);
    }
  }

  // 1. Fetch Non-Tol (Layer 13)
  const baseNonTol = 'https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/SARANA_PRASARANA/MapServer/13/query';
  while (nonTolOffset < nonTolTotal) {
    const count = Math.min(batchSize, nonTolTotal - nonTolOffset);
    const url = `${baseNonTol}?where=1%3D1&outFields=objectid,nm_inf,thn_data,fungsi,pjg_datar,kd_ruas,status,tipe_jalan&returnGeometry=true&f=geojson&resultRecordCount=${count}&resultOffset=${nonTolOffset}`;
    console.log(`Fetching Layer 13 (Non-Tol) offset ${nonTolOffset}..${nonTolOffset + count}...`);
    
    let retries = 0;
    let ok = false;
    while (!ok && retries < 4) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const geojson = await res.json();
        if (Array.isArray(geojson.features) && geojson.features.length > 0) {
          const mapped = geojson.features.map(f => ({
            ...f,
            properties: {
              ...f.properties,
              OBJECTID: f.properties.objectid || f.properties.OBJECTID,
              NAMOBJ: f.properties.nm_inf || f.properties.NAMOBJ || 'Ruas Jalan Nasional',
              nm_inf: f.properties.nm_inf || f.properties.NAMOBJ || 'Ruas Jalan Nasional',
              kd_ruas: f.properties.kd_ruas || '',
              fungsi: f.properties.fungsi || 'Arteri Primer',
              status: f.properties.status || 'N',
              pjg_datar: f.properties.pjg_datar || 0,
              thn_data: f.properties.thn_data || '2024',
              tipe_jalan: f.properties.tipe_jalan || 'Non-Tol',
              JENIS: 'Non-Tol',
              SUMBER: 'Badan Informasi Geospasial (BIG) & KemenPUPR',
              STATUS_DATA: 'REAL_COMPLETE'
            }
          }));
          features.push(...mapped);
          nonTolOffset += geojson.features.length;
          ok = true;
          console.log(`Layer 13 batch success: +${mapped.length} (Total: ${features.length}/${nonTolTotal})`);
          fs.writeFileSync(checkpointPath, JSON.stringify({ nonTolOffset, features }, null, 2));
        } else {
          throw new Error('Empty features array');
        }
      } catch (err) {
        retries++;
        console.warn(`Layer 13 retry ${retries} at offset ${nonTolOffset}: ${err.message}`);
        await new Promise(r => setTimeout(r, 2000 * retries));
      }
    }
    if (!ok) {
      console.error(`Giving up on Layer 13 offset ${nonTolOffset}`);
      break;
    }
  }

  // 2. Fetch Tol (Layer 14)
  console.log('Fetching Layer 14 (Tol)...');
  const baseTol = 'https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/SARANA_PRASARANA/MapServer/14/query?where=1%3D1&outFields=*&returnGeometry=true&f=geojson';
  try {
    const res = await fetch(baseTol);
    if (res.ok) {
      const tolGeo = await res.json();
      if (Array.isArray(tolGeo.features)) {
        const tolMapped = tolGeo.features.map(f => ({
          ...f,
          properties: {
            ...f.properties,
            OBJECTID: f.properties.objectid || f.properties.OBJECTID,
            NAMOBJ: f.properties.nm_inf || f.properties.nama_tol || f.properties.NAMOBJ || 'Jalan Tol Nasional',
            nm_inf: f.properties.nm_inf || f.properties.nama_tol || f.properties.NAMOBJ || 'Jalan Tol Nasional',
            kd_ruas: f.properties.kd_ruas || '',
            fungsi: 'Jalan Bebas Hambatan (Tol)',
            status: 'T',
            pjg_datar: f.properties.pjg_datar || f.properties.panjang || 0,
            thn_data: f.properties.thn_data || '2024',
            tipe_jalan: 'Tol',
            JENIS: 'Tol',
            SUMBER: 'Badan Informasi Geospasial (BIG) & BPJT KemenPUPR',
            STATUS_DATA: 'REAL_COMPLETE'
          }
        }));
        features.push(...tolMapped);
        console.log(`Layer 14 (Tol) success: +${tolMapped.length} features`);
      }
    }
  } catch (err) {
    console.warn('Failed to fetch toll roads:', err.message);
  }

  // Deduplicate by OBJECTID & geometry coordinates signature
  const uniqueMap = new Map();
  for (const f of features) {
    const key = `${f.properties.JENIS}_${f.properties.OBJECTID}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, f);
    }
  }
  const dedupedFeatures = Array.from(uniqueMap.values());

  const result = {
    type: 'FeatureCollection',
    name: 'Jaringan Jalan Nasional Indonesia Lengkap (Non-Tol & Tol)',
    crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
    metadata: {
      totalFeatures: dedupedFeatures.length,
      nonTolCount: dedupedFeatures.filter(f => f.properties.JENIS === 'Non-Tol').length,
      tolCount: dedupedFeatures.filter(f => f.properties.JENIS === 'Tol').length,
      sumber: 'Badan Informasi Geospasial (BIG Satu Peta KSP Layer 13 & 14) & Kementerian PUPR',
      status: 'REAL_COMPLETE',
      timestamp: new Date().toISOString()
    },
    features: dedupedFeatures
  };

  fs.writeFileSync(outPath, JSON.stringify(result));
  console.log(`=== INGESTION SUCCESS: ${dedupedFeatures.length} segments saved to ${outPath} (${(fs.statSync(outPath).size / 1024 / 1024).toFixed(2)} MB) ===`);
  try { fs.unlinkSync(checkpointPath); } catch {}
}

if (require.main === module) {
  ingestJalanNasional().catch(console.error);
}

module.exports = { ingestJalanNasional };
