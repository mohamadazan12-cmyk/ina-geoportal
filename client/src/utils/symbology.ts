// Centralized symbology configuration for WebGIS and Legend rendering
// Ensures 100% visual and semantic consistency between Map Canvas and Legend Drawer

export interface LegendItemClass {
  label: string;
  sublabel?: string;
  color: string;
  fillColor?: string;
  type: 'polygon' | 'line' | 'point';
  borderWidth?: number;
  dashArray?: string;
}

export interface LayerLegendConfig {
  layerId: string;
  title: string;
  classes: LegendItemClass[];
}

export const LAYER_SYMBOLOGY_CATALOG: Record<string, LayerLegendConfig> = {
  'ds-batas-kabkot': {
    layerId: 'ds-batas-kabkot',
    title: 'Batas Administrasi Kabupaten/Kota',
    classes: [
      {
        label: 'Batas Wilayah Kab/Kota',
        sublabel: 'Batas administrasi definitif BIG',
        color: '#10b981',
        fillColor: '#10b981',
        type: 'polygon',
      },
    ],
  },
  'ds-jalan-nasional': {
    layerId: 'ds-jalan-nasional',
    title: 'Jaringan Jalan Nasional',
    classes: [
      {
        label: 'Jalan Arteri Primer',
        sublabel: 'Jalur Pantura / Lintas Utama Pulau',
        color: '#ea580c',
        type: 'line',
        borderWidth: 4,
      },
      {
        label: 'Jalan Kolektor Primer',
        sublabel: 'Jalur Lintas Tengah & Penghubung',
        color: '#f59e0b',
        type: 'line',
        borderWidth: 3,
      },
      {
        label: 'Jalan Nasional Arteri',
        sublabel: 'Trans Sumatera & Trans Sulawesi',
        color: '#d97706',
        type: 'line',
        borderWidth: 2.5,
      },
    ],
  },
  'ds-rawan-gempa': {
    layerId: 'ds-rawan-gempa',
    title: 'Kawasan Rawan Bencana Gempa Bumi',
    classes: [
      {
        label: 'Bahaya Sangat Tinggi',
        sublabel: 'Sesar Aktif Palu-Koro (PGA > 0.5g)',
        color: '#dc2626',
        fillColor: '#dc2626',
        type: 'polygon',
      },
      {
        label: 'Bahaya Tinggi',
        sublabel: 'Sesar Lembang & Zona Megathrust',
        color: '#ef4444',
        fillColor: '#ef4444',
        type: 'polygon',
      },
      {
        label: 'Bahaya Sedang',
        sublabel: 'Buffer Patahan Sekunder',
        color: '#f59e0b',
        fillColor: '#f59e0b',
        type: 'polygon',
      },
    ],
  },
  'ds-tutupan-lahan': {
    layerId: 'ds-tutupan-lahan',
    title: 'Peta Penutupan Lahan Nasional',
    classes: [
      {
        label: 'Hutan Lahan Kering Primer',
        sublabel: 'Taman Nasional Gunung Leuser',
        color: '#15803d',
        fillColor: '#15803d',
        type: 'polygon',
      },
      {
        label: 'Hutan Rawa Gambut',
        sublabel: 'Konservasi Karbon (Katingan)',
        color: '#059669',
        fillColor: '#059669',
        type: 'polygon',
      },
      {
        label: 'Perkebunan Kelapa Sawit',
        sublabel: 'Areal Budidaya Berkelanjutan',
        color: '#ca8a04',
        fillColor: '#ca8a04',
        type: 'polygon',
      },
      {
        label: 'Tanah Kosong / Lahan Terbuka',
        sublabel: 'Areal Terbuka & Bukit Pasir (BIG 226)',
        color: '#d97706',
        fillColor: '#f59e0b',
        type: 'polygon',
      },
    ],
  },
  'ds-faskes': {
    layerId: 'ds-faskes',
    title: 'Sebaran Fasilitas Kesehatan',
    classes: [
      {
        label: 'Rumah Sakit (RS Umum & Khusus)',
        sublabel: 'RS Rujukan Regional & RS Vertikal',
        color: '#dc2626',
        fillColor: '#ef4444',
        type: 'point',
      },
      {
        label: 'Puskesmas & Fasilitas Pertama',
        sublabel: 'Puskesmas Pembantu, Poskesdes & Posyandu',
        color: '#2563eb',
        fillColor: '#3b82f6',
        type: 'point',
      },
    ],
  },
  'ds-rbi': {
    layerId: 'ds-rbi',
    title: 'Peta Rupa Bumi Indonesia (Topografi)',
    classes: [
      {
        label: 'Topografi & Hipsografi Daratan',
        sublabel: 'Relief Daratan & Kontur Ketinggian SNI',
        color: '#4f46e5',
        fillColor: '#6366f1',
        type: 'polygon',
      },
    ],
  },
};

/**
 * Returns dynamic GeoJSON feature style based on layerId and feature properties
 */
export function getFeatureStyle(layerId: string, feature: any, baseOpacity: number = 0.85) {
  const props = feature?.properties || {};

  switch (layerId) {
    case 'ds-rawan-gempa': {
      const kerawanan = String(props.TINGKAT_KERAWANAN || props.ZONA_BAHAYA || '').toLowerCase();
      if (kerawanan.includes('sangat tinggi') || kerawanan.includes('sesar aktif')) {
        return {
          color: '#dc2626',
          weight: 2,
          opacity: baseOpacity,
          fillColor: '#dc2626',
          fillOpacity: baseOpacity * 0.45,
        };
      }
      if (kerawanan.includes('tinggi') || kerawanan.includes('megathrust')) {
        return {
          color: '#ef4444',
          weight: 1.8,
          opacity: baseOpacity,
          fillColor: '#ef4444',
          fillOpacity: baseOpacity * 0.35,
        };
      }
      return {
        color: '#f59e0b',
        weight: 1.5,
        opacity: baseOpacity,
        fillColor: '#f59e0b',
        fillOpacity: baseOpacity * 0.25,
      };
    }

    case 'ds-jalan-nasional': {
      const status = String(props.STATUS || props.NAMA_RUAS || '').toLowerCase();
      if (status.includes('arteri primer') || status.includes('pantura')) {
        return {
          color: '#ea580c',
          weight: 4,
          opacity: baseOpacity,
        };
      }
      if (status.includes('kolektor') || status.includes('tengah')) {
        return {
          color: '#f59e0b',
          weight: 3,
          opacity: baseOpacity,
        };
      }
      return {
        color: '#d97706',
        weight: 2.5,
        opacity: baseOpacity,
      };
    }

    case 'ds-tutupan-lahan': {
      const kode = String(props.KODE_PENUTUPAN || props.FTYPE || '');
      const desc = String(props.KLASIFIKASI || props.DESKRIPSI || '').toLowerCase();

      if (kode === '2001' || kode === 'FC004000' || desc.includes('kering primer') || desc.includes('rimba') || desc.includes('leuser')) {
        return {
          color: '#15803d',
          weight: 1.8,
          opacity: baseOpacity,
          fillColor: '#15803d',
          fillOpacity: baseOpacity * 0.5,
        };
      }
      if (kode === '2004' || kode === 'FD002000' || kode === 'FD002002' || desc.includes('gambut') || desc.includes('mangrove') || desc.includes('katingan')) {
        return {
          color: '#059669',
          weight: 1.8,
          opacity: baseOpacity,
          fillColor: '#059669',
          fillOpacity: baseOpacity * 0.5,
        };
      }
      if (kode === '2010' || kode === 'FA002000' || desc.includes('sawit') || desc.includes('perkebunan')) {
        return {
          color: '#ca8a04',
          weight: 1.8,
          opacity: baseOpacity,
          fillColor: '#ca8a04',
          fillOpacity: baseOpacity * 0.45,
        };
      }
      if (kode === 'FA006000' || desc.includes('sawah')) {
        return {
          color: '#65a30d',
          weight: 1.8,
          opacity: baseOpacity,
          fillColor: '#65a30d',
          fillOpacity: baseOpacity * 0.45,
        };
      }
      if (kode === 'FF002000' || kode === 'FF004000' || desc.includes('tanah kosong') || desc.includes('gundul') || desc.includes('terbuka') || desc.includes('pasir')) {
        return {
          color: '#d97706',
          weight: 1.5,
          opacity: baseOpacity,
          fillColor: '#f59e0b',
          fillOpacity: baseOpacity * 0.45,
        };
      }
      return {
        color: '#047857',
        weight: 1.5,
        opacity: baseOpacity,
        fillColor: '#047857',
        fillOpacity: baseOpacity * 0.35,
      };
    }

    case 'ds-faskes': {
      const tipe = String(props.TIPE_FASKES || props.REMARK || '').toLowerCase();
      if (tipe.includes('rumah sakit')) {
        return {
          color: '#dc2626',
          weight: 2,
          opacity: baseOpacity,
          fillColor: '#ef4444',
          fillOpacity: 0.9,
        };
      }
      return {
        color: '#2563eb',
        weight: 2,
        opacity: baseOpacity,
        fillColor: '#3b82f6',
        fillOpacity: 0.85,
      };
    }

    case 'ds-batas-kabkot': {
      return {
        color: '#10b981',
        weight: 2,
        opacity: baseOpacity,
        fillColor: '#10b981',
        fillOpacity: baseOpacity * 0.18,
      };
    }

    case 'ds-rbi': {
      return {
        color: '#4f46e5',
        weight: 2,
        opacity: baseOpacity,
        fillColor: '#6366f1',
        fillOpacity: baseOpacity * 0.35,
      };
    }

    default: {
      const fallbackPalette: Record<string, string> = {
        'ds-faskes': '#3b82f6',
      };
      const col = fallbackPalette[layerId] || '#64748b';
      return {
        color: col,
        weight: 2,
        opacity: baseOpacity,
        fillColor: col,
        fillOpacity: baseOpacity * 0.25,
      };
    }
  }
}

/**
 * Returns point marker styling (CircleMarker options)
 */
export function getPointMarkerOptions(layerId: string, feature: any, baseOpacity: number = 0.85) {
  const props = feature?.properties || {};
  const jenis = String(props.TIPE_FASKES || props.JENIS || props.KELAS || props.TIPRST || '').toLowerCase();

  if (layerId === 'ds-faskes') {
    if (jenis.includes('rumah sakit') || jenis.includes('pusat') || jenis.includes('rsup') || jenis.includes('kelas a')) {
      return {
        radius: 8,
        fillColor: '#dc2626',
        color: '#ffffff',
        weight: 2,
        opacity: baseOpacity,
        fillOpacity: baseOpacity * 0.95,
      };
    }
    return {
      radius: 7,
      fillColor: '#2563eb',
      color: '#ffffff',
      weight: 2,
      opacity: baseOpacity,
      fillOpacity: baseOpacity * 0.95,
    };
  }

  return {
    radius: 7,
    fillColor: '#3b82f6',
    color: '#ffffff',
    weight: 2,
    opacity: baseOpacity,
    fillOpacity: baseOpacity * 0.9,
  };
}
