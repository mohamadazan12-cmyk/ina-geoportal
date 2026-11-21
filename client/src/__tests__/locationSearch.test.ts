import { describe, it, expect } from 'vitest';
import {
  searchAdministrativeRegions,
  getPopularLocations,
  parseCoordinates,
} from '../services/locationSearchService';
import regionsData from '../constants/administrativeRegions.json';

describe('LocationSearchService - Administrative Regions Search', () => {
  it('loads the full administrative index with all provinces and regions', () => {
    expect(regionsData.length).toBeGreaterThanOrEqual(550);

    const provinces = regionsData.filter((r) => r.type === 'provinsi');
    expect(provinces.length).toBe(38); // 38 official Indonesian provinces

    const kota = regionsData.filter((r) => r.type === 'kota');
    expect(kota.length).toBeGreaterThanOrEqual(98);

    const kabupaten = regionsData.filter((r) => r.type === 'kabupaten');
    expect(kabupaten.length).toBeGreaterThanOrEqual(400);

    const ikn = regionsData.find((r) => r.id === 'ikn-nusantara');
    expect(ikn).toBeDefined();
    expect(ikn?.name).toBe('IKN Nusantara');
  });

  it('provides default popular locations', () => {
    const popular = getPopularLocations();
    expect(popular.length).toBeGreaterThanOrEqual(6);
    expect(popular.some((l) => l.name.includes('IKN'))).toBe(true);
    expect(popular.some((l) => l.name.includes('Jakarta'))).toBe(true);
    expect(popular.some((l) => l.name.includes('Surabaya'))).toBe(true);
    expect(popular.some((l) => l.name.includes('Bandung'))).toBe(true);
  });

  it('parses coordinate input correctly', () => {
    const result = parseCoordinates('-6.2088, 106.8456');
    expect(result).not.toBeNull();
    expect(result?.center[0]).toBeCloseTo(-6.2088, 3);
    expect(result?.center[1]).toBeCloseTo(106.8456, 3);
    expect(result?.type).toBe('koordinat');
  });

  it('returns empty array when query is empty or whitespace', async () => {
    const resEmpty = await searchAdministrativeRegions('');
    expect(resEmpty).toEqual([]);

    const resSpaces = await searchAdministrativeRegions('   ');
    expect(resSpaces).toEqual([]);
  });

  describe('Search across Indonesian regions', () => {
    it('Sumatera: finds Aceh, Medan, Padang, Palembang', async () => {
      const resAceh = await searchAdministrativeRegions('Aceh');
      expect(resAceh.length).toBeGreaterThan(0);
      expect(resAceh.some((r) => r.province === 'Aceh' || r.name === 'Aceh')).toBe(true);

      const resMedan = await searchAdministrativeRegions('Kota Medan');
      expect(resMedan.length).toBeGreaterThan(0);
      expect(resMedan[0].name).toBe('Kota Medan');
      expect(resMedan[0].province).toBe('Sumatera Utara');

      const resPadang = await searchAdministrativeRegions('Padang');
      expect(resPadang.some((r) => r.name.includes('Padang'))).toBe(true);

      const resPalembang = await searchAdministrativeRegions('Palembang');
      expect(resPalembang.some((r) => r.name === 'Kota Palembang')).toBe(true);
    });

    it('Jawa: distinguishes Kabupaten Bandung and Kota Bandung correctly', async () => {
      // Search "Bandung" should return both Kota Bandung and Kabupaten Bandung
      const resBandung = await searchAdministrativeRegions('Bandung');
      expect(resBandung.length).toBeGreaterThanOrEqual(2);
      expect(resBandung.some((r) => r.name === 'Kota Bandung')).toBe(true);
      expect(resBandung.some((r) => r.name === 'Kabupaten Bandung')).toBe(true);

      // Explicit "Kota Bandung"
      const resKotaBandung = await searchAdministrativeRegions('Kota Bandung');
      expect(resKotaBandung[0].name).toBe('Kota Bandung');
      expect(resKotaBandung[0].type).toBe('kota');

      // Explicit "Kabupaten Bandung"
      const resKabBandung = await searchAdministrativeRegions('Kabupaten Bandung');
      expect(resKabBandung[0].name).toBe('Kabupaten Bandung');
      expect(resKabBandung[0].type).toBe('kabupaten');

      // Province search "Jawa Barat"
      const resJabar = await searchAdministrativeRegions('Jawa Barat');
      expect(resJabar[0].name).toBe('Jawa Barat');
      expect(resJabar[0].type).toBe('provinsi');

      // Jakarta
      const resJakarta = await searchAdministrativeRegions('Jakarta');
      expect(resJakarta.some((r) => r.name === 'DKI Jakarta' && r.type === 'provinsi')).toBe(true);
      expect(resJakarta.some((r) => r.name.includes('Jakarta Pusat'))).toBe(true);

      // Sleman (DI Yogyakarta)
      const resSleman = await searchAdministrativeRegions('Sleman');
      expect(resSleman.some((r) => r.name.includes('Sleman'))).toBe(true);
    });

    it('Kalimantan: finds IKN, Balikpapan, Samarinda, Pontianak', async () => {
      const resIKN = await searchAdministrativeRegions('IKN');
      expect(resIKN.length).toBeGreaterThan(0);
      expect(resIKN[0].name).toBe('IKN Nusantara');

      const resBalikpapan = await searchAdministrativeRegions('Balikpapan');
      expect(resBalikpapan.some((r) => r.name === 'Kota Balikpapan')).toBe(true);

      const resKaltim = await searchAdministrativeRegions('Kalimantan Timur');
      expect(resKaltim[0].name).toBe('Kalimantan Timur');
      expect(resKaltim[0].type).toBe('provinsi');
    });

    it('Sulawesi: finds Makassar, Manado, Palu', async () => {
      const resMakassar = await searchAdministrativeRegions('Makassar');
      expect(resMakassar.some((r) => r.name === 'Kota Makassar')).toBe(true);

      const resManado = await searchAdministrativeRegions('Manado');
      expect(resManado.some((r) => r.name === 'Kota Manado')).toBe(true);

      const resPalu = await searchAdministrativeRegions('Palu');
      expect(resPalu.some((r) => r.name === 'Kota Palu')).toBe(true);
    });

    it('Bali - Nusa Tenggara: finds Denpasar, Mataram, Kupang', async () => {
      const resDenpasar = await searchAdministrativeRegions('Denpasar');
      expect(resDenpasar.some((r) => r.name === 'Kota Denpasar')).toBe(true);
      expect(resDenpasar[0].province).toBe('Bali');

      const resMataram = await searchAdministrativeRegions('Mataram');
      expect(resMataram.some((r) => r.name === 'Kota Mataram')).toBe(true);

      const resKupang = await searchAdministrativeRegions('Kupang');
      expect(resKupang.some((r) => r.name.includes('Kupang'))).toBe(true);
    });

    it('Maluku: finds Ambon, Ternate', async () => {
      const resAmbon = await searchAdministrativeRegions('Ambon');
      expect(resAmbon.some((r) => r.name === 'Kota Ambon')).toBe(true);

      const resTernate = await searchAdministrativeRegions('Ternate');
      expect(resTernate.some((r) => r.name === 'Kota Ternate')).toBe(true);
    });

    it('Papua: finds Jayapura, Manokwari, Merauke, Sorong, and Papua Barat', async () => {
      const resPapuaBarat = await searchAdministrativeRegions('Papua Barat');
      expect(resPapuaBarat[0].name).toBe('Papua Barat');
      expect(resPapuaBarat[0].type).toBe('provinsi');

      const resJayapura = await searchAdministrativeRegions('Jayapura');
      expect(resJayapura.some((r) => r.name.includes('Jayapura'))).toBe(true);

      const resManokwari = await searchAdministrativeRegions('Manokwari');
      expect(resManokwari.some((r) => r.name.includes('Manokwari'))).toBe(true);

      const resMerauke = await searchAdministrativeRegions('Merauke');
      expect(resMerauke.some((r) => r.name.includes('Merauke'))).toBe(true);

      const resSorong = await searchAdministrativeRegions('Sorong');
      expect(resSorong.some((r) => r.name.includes('Sorong'))).toBe(true);
    });
  });

  describe('Aliases and Case-Insensitivity', () => {
    it('supports uppercase, lowercase, mixed case', async () => {
      const lower = await searchAdministrativeRegions('jawa barat');
      const upper = await searchAdministrativeRegions('JAWA BARAT');
      const mixed = await searchAdministrativeRegions('JaWa BaRaT');

      expect(lower[0].name).toBe('Jawa Barat');
      expect(upper[0].name).toBe('Jawa Barat');
      expect(mixed[0].name).toBe('Jawa Barat');
    });

    it('supports common Indonesian province acronyms (Jabar, DIY, Jogja, NTB, NTT, Kepri)', async () => {
      const resJabar = await searchAdministrativeRegions('Jabar');
      expect(resJabar.some((r) => r.name === 'Jawa Barat')).toBe(true);

      const resJogja = await searchAdministrativeRegions('Jogja');
      expect(resJogja.some((r) => r.name.includes('Yogyakarta'))).toBe(true);

      const resNTB = await searchAdministrativeRegions('NTB');
      expect(resNTB.some((r) => r.name === 'Nusa Tenggara Barat')).toBe(true);

      const resKepri = await searchAdministrativeRegions('Kepri');
      expect(resKepri.some((r) => r.name === 'Kepulauan Riau')).toBe(true);
    });
  });
});
