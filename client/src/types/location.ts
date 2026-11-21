export type RegionType = 'provinsi' | 'kabupaten' | 'kota' | 'khusus' | 'koordinat';

export interface AdministrativeRegion {
  id: string;
  name: string;
  rawName: string;
  type: RegionType;
  province: string;
  center: [number, number];
  bbox: [[number, number], [number, number]];
  zoom: number;
  aliases?: string[];
}
