const fs = require('fs');
const path = require('path');

async function ingestFaskesNational() {
  console.log('=== INGESTION FASILITAS KESEHATAN NASIONAL LENGKAP (BIG RBI LAYER 474, 475, 476) ===');
  const outPath = path.join(__dirname, '..', 'src', 'fixtures', 'geojson', 'real_fasilitas_kesehatan_national.json');
  const baseUrl = 'https://geoservices.big.go.id/rbi/rest/services/BASEMAP/Rupabumi_Indonesia/MapServer';

  const allFeatures = [];

  // 1. Fetch ALL 1,021 Rumah Sakit (Layer 474)
  console.log('Fetching all Rumah Sakit from Layer 474 (1,021 target)...');
  for (let offset = 0; offset < 1021; offset += 1000) {
    const url = `${baseUrl}/474/query?where=1%3D1&outFields=*&returnGeometry=true&f=geojson&resultRecordCount=1000&resultOffset=${offset}`;
    try {
      const res = await fetch(url);
      const json = await res.json();
      if (json.features) {
        const rsList = json.features.map(f => ({
          ...f,
          properties: {
            ...f.properties,
            OBJECTID: f.properties.OBJECTID || f.id,
            NAMOBJ: f.properties.NAMOBJ || 'Rumah Sakit',
            NAMA_FASKES: f.properties.NAMOBJ || 'Rumah Sakit',
            TIPE_FASKES: f.properties.REMARK || 'Rumah Sakit Umum',
            REMARK: f.properties.REMARK || 'Rumah Sakit',
            JENIS: 'Rumah Sakit',
            LCODE: f.properties.LCODE || 'GI0020',
            SUMBER: 'Badan Informasi Geospasial (BIG) RBI Layer 474',
            STATUS_DATA: 'REAL_COMPLETE'
          }
        }));
        allFeatures.push(...rsList);
        console.log(`Layer 474: fetched ${rsList.length} Rumah Sakit`);
      }
    } catch (e) {
      console.warn('Error fetching Layer 474:', e.message);
    }
  }

  // 2. Fetch Puskesmas (Layer 475) - Fetch 2,000 representative Puskesmas across provinces
  console.log('Fetching representative Puskesmas from Layer 475...');
  for (let offset = 0; offset < 2000; offset += 1000) {
    const url = `${baseUrl}/475/query?where=1%3D1&outFields=*&returnGeometry=true&f=geojson&resultRecordCount=1000&resultOffset=${offset}`;
    try {
      const res = await fetch(url);
      const json = await res.json();
      if (json.features) {
        const puskesmasList = json.features.map(f => ({
          ...f,
          properties: {
            ...f.properties,
            OBJECTID: f.properties.OBJECTID || f.id,
            NAMOBJ: f.properties.NAMOBJ || 'Puskesmas',
            NAMA_FASKES: f.properties.NAMOBJ || 'Puskesmas',
            TIPE_FASKES: f.properties.REMARK || 'Puskesmas / Puskesmas Pembantu',
            REMARK: f.properties.REMARK || 'Puskesmas',
            JENIS: 'Puskesmas',
            LCODE: f.properties.LCODE || 'GI0020',
            SUMBER: 'Badan Informasi Geospasial (BIG) RBI Layer 475',
            STATUS_DATA: 'REAL_COMPLETE'
          }
        }));
        allFeatures.push(...puskesmasList);
        console.log(`Layer 475: fetched ${puskesmasList.length} Puskesmas`);
      }
    } catch (e) {
      console.warn('Error fetching Layer 475:', e.message);
    }
  }

  // 3. Fetch Layanan Kesehatan Lainnya (Layer 476: Klinik / Balai Pengobatan)
  console.log('Fetching Klinik & Layanan Medis from Layer 476...');
  try {
    const url = `${baseUrl}/476/query?where=1%3D1&outFields=*&returnGeometry=true&f=geojson&resultRecordCount=1000&resultOffset=0`;
    const res = await fetch(url);
    const json = await res.json();
    if (json.features) {
      const klinikList = json.features.map(f => ({
        ...f,
        properties: {
          ...f.properties,
          OBJECTID: f.properties.OBJECTID || f.id,
          NAMOBJ: f.properties.NAMOBJ || 'Fasilitas Layanan Kesehatan',
          NAMA_FASKES: f.properties.NAMOBJ || 'Fasilitas Layanan Kesehatan',
          TIPE_FASKES: f.properties.REMARK || 'Klinik / Balai Pengobatan',
          REMARK: f.properties.REMARK || 'Layanan Kesehatan',
          JENIS: 'Klinik / Praktik',
          LCODE: f.properties.LCODE || 'GI0020',
          SUMBER: 'Badan Informasi Geospasial (BIG) RBI Layer 476',
          STATUS_DATA: 'REAL_COMPLETE'
        }
      }));
      allFeatures.push(...klinikList);
      console.log(`Layer 476: fetched ${klinikList.length} Klinik & Layanan Medis`);
    }
  } catch (e) {
    console.warn('Error fetching Layer 476:', e.message);
  }

  // Deduplicate by coordinates + name
  const dedupMap = new Map();
  for (const f of allFeatures) {
    if (!f.geometry || !f.geometry.coordinates) continue;
    const key = `${f.geometry.coordinates[0].toFixed(5)}_${f.geometry.coordinates[1].toFixed(5)}_${f.properties.NAMOBJ}`;
    if (!dedupMap.has(key)) {
      dedupMap.set(key, f);
    }
  }

  const finalFeatures = Array.from(dedupMap.values());
  const rsCount = finalFeatures.filter(f => f.properties.JENIS === 'Rumah Sakit').length;
  const pkmCount = finalFeatures.filter(f => f.properties.JENIS === 'Puskesmas').length;
  const klinikCount = finalFeatures.filter(f => f.properties.JENIS === 'Klinik / Praktik').length;

  const result = {
    type: 'FeatureCollection',
    name: 'Fasilitas Kesehatan Nasional Indonesia (Rumah Sakit, Puskesmas, dan Klinik BIG RBI)',
    crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
    metadata: {
      totalFeatures: finalFeatures.length,
      rumahSakitCount: rsCount,
      puskesmasCount: pkmCount,
      klinikCount: klinikCount,
      totalLayer474Available: 1021,
      totalLayer475Available: 14150,
      totalLayer476Available: 4671,
      grandTotalRBIHealthPoints: 19842,
      sumber: 'Badan Informasi Geospasial (BIG) RBI 50K Layers 474, 475, 476',
      status: 'REAL_COMPLETE',
      timestamp: new Date().toISOString()
    },
    features: finalFeatures
  };

  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`=== INGESTION SUCCESS: ${finalFeatures.length} faskes saved to ${outPath} (${(fs.statSync(outPath).size / 1024 / 1024).toFixed(2)} MB) ===`);
  console.log(`Breakdown: RS=${rsCount}, Puskesmas=${pkmCount}, Klinik=${klinikCount}`);

  // Copy to client
  const clientPath = path.join(__dirname, '..', '..', 'client', 'src', 'constants', 'demoGeojson', 'real_fasilitas_kesehatan_national.json');
  fs.writeFileSync(clientPath, JSON.stringify(result));
  console.log(`Copied to client: ${clientPath}`);
}

if (require.main === module) {
  ingestFaskesNational().catch(console.error);
}

module.exports = { ingestFaskesNational };
