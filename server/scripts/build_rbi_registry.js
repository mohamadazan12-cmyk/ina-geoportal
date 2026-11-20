const fs = require('fs');
const path = require('path');

async function buildRbiRegistry() {
  console.log('=== MEMBANGUN REGISTRY 890 LAYER RUPABUMI INDONESIA (BIG BASEMAP) ===');
  const url = 'https://geoservices.big.go.id/rbi/rest/services/BASEMAP/Rupabumi_Indonesia/MapServer?f=json';
  const outPath = path.join(__dirname, '..', 'src', 'fixtures', 'geojson', 'rbi_layers_registry.json');

  const res = await fetch(url);
  const json = await res.json();
  const rawLayers = json.layers || [];
  console.log(`Menerima ${rawLayers.length} layers dari BIG MapServer...`);

  const categoryMap = new Map();
  // Index parent categories
  for (const l of rawLayers) {
    if (l.subLayerIds && l.subLayerIds.length > 0) {
      categoryMap.set(l.id, l.name);
    }
  }

  const registeredLayers = rawLayers.map(l => {
    let category = 'Unsur Rupabumi';
    if (l.parentLayerId !== -1 && categoryMap.has(l.parentLayerId)) {
      category = categoryMap.get(l.parentLayerId);
    }

    let scaleGroup = 'Nasional';
    if (l.name.includes('5K') || category.includes('5K')) scaleGroup = '1:5.000';
    else if (l.name.includes('10K') || category.includes('10K')) scaleGroup = '1:10.000';
    else if (l.name.includes('25K') || category.includes('25K')) scaleGroup = '1:25.000';
    else if (l.name.includes('50K') || category.includes('50K')) scaleGroup = '1:50.000';
    else if (l.name.includes('100K') || category.includes('100K')) scaleGroup = '1:100.000';
    else if (l.name.includes('250K') || category.includes('250K')) scaleGroup = '1:250.000';
    else if (l.name.includes('500K') || category.includes('500K')) scaleGroup = '1:500.000';
    else if (l.name.includes('1M') || category.includes('1M')) scaleGroup = '1:1.000.000';

    return {
      layerId: l.id,
      name: l.name,
      parentLayerId: l.parentLayerId,
      isGroupLayer: Array.isArray(l.subLayerIds) && l.subLayerIds.length > 0,
      subLayerCount: Array.isArray(l.subLayerIds) ? l.subLayerIds.length : 0,
      category,
      scaleGroup,
      minScale: l.minScale,
      maxScale: l.maxScale,
      defaultVisibility: l.defaultVisibility,
      crs: 'EPSG:3857 / EPSG:4326',
      serviceType: 'MapServer / WMS',
      exportUrl: `https://geoservices.big.go.id/rbi/rest/services/BASEMAP/Rupabumi_Indonesia/MapServer/export?layers=show:${l.id}&f=image`,
      metadataUrl: `https://geoservices.big.go.id/rbi/rest/services/BASEMAP/Rupabumi_Indonesia/MapServer/${l.id}?f=json`,
      attribution: 'Badan Informasi Geospasial (BIG) - Peta Rupabumi Indonesia'
    };
  });

  const registry = {
    serviceName: 'Rupabumi Indonesia 2019 Basemap (BIG)',
    serviceUrl: 'https://geoservices.big.go.id/rbi/rest/services/BASEMAP/Rupabumi_Indonesia/MapServer',
    totalLayers: registeredLayers.length,
    leafLayerCount: registeredLayers.filter(l => !l.isGroupLayer).length,
    groupLayerCount: registeredLayers.filter(l => l.isGroupLayer).length,
    scaleGroups: ['1:5.000', '1:10.000', '1:25.000', '1:50.000', '1:100.000', '1:250.000', '1:500.000', '1:1.000.000', 'Nasional'],
    updatedAt: new Date().toISOString(),
    layers: registeredLayers
  };

  fs.writeFileSync(outPath, JSON.stringify(registry, null, 2));
  console.log(`=== REGISTRY BERHASIL DIBUAT: ${registeredLayers.length} layers disimpan ke ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB) ===`);
}

if (require.main === module) {
  buildRbiRegistry().catch(console.error);
}

module.exports = { buildRbiRegistry };
