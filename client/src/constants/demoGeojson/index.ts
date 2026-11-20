import batasKabupaten from './batas_kabupaten.json';
import jalanNasional from './jalan_nasional.json';
import rawanBencanaGempa from './rawan_bencana_gempa.json';
import tutupanLahan from './tutupan_lahan.json';
import fasilitasKesehatan from './fasilitas_kesehatan.json';
import rupaBumiIndonesia from './rupa_bumi_indonesia.json';
import realBatasKabupaten from './real_batas_kabupaten.json';
import realFasilitasKesehatan from './real_fasilitas_kesehatan.json';
import realTutupanLahan from './real_tutupan_lahan.json';
import realJalanNasional from './real_jalan_nasional.json';
import realRawanBencanaGempa from './real_rawan_bencana_gempa.json';

export const REAL_GEOJSON_MAP: Record<string, any> = {
  'ds-batas-kabkot': realBatasKabupaten,
  'ds-faskes': realFasilitasKesehatan,
  'ds-tutupan-lahan': realTutupanLahan,
  'ds-jalan-nasional': realJalanNasional,
  'ds-rawan-gempa': realRawanBencanaGempa,
};

export const DEMO_GEOJSON_MAP: Record<string, any> = {
  'ds-batas-kabkot': batasKabupaten,
  'ds-jalan-nasional': jalanNasional,
  'ds-rawan-gempa': rawanBencanaGempa,
  'ds-tutupan-lahan': tutupanLahan,
  'ds-faskes': fasilitasKesehatan,
  'ds-rbi': rupaBumiIndonesia,
};

export {
  batasKabupaten,
  jalanNasional,
  rawanBencanaGempa,
  tutupanLahan,
  fasilitasKesehatan,
  rupaBumiIndonesia,
  realBatasKabupaten,
  realFasilitasKesehatan,
  realTutupanLahan,
  realJalanNasional,
  realRawanBencanaGempa,
};
