# WebGIS Symbology & Legend Specification
# INA-GEOPORTAL WEB APP REDESIGN V2.0

## 1. Overview & Objective
Dokumen ini mendefinisikan arsitektur simbologi, aturan pewarnaan, dan spesifikasi visual komponen Legenda Peta (Legend Drawer) pada WebGIS Ina-Geoportal v2.0.
Sistem ini menjamin konsistensi 100% antara tampilan fitur di kanvas peta (Leaflet canvas) dan representasi simbol pada panel legenda, dengan kepatuhan penuh terhadap palet warna Figma dan standar OGC.

---

## 2. Architecture & File Hierarchy

```
client/src/
├── utils/
│   └── symbology.ts               # Sentralisasi konfigurasi simbologi & dynamic feature styler
├── components/webmap/
│   ├── LayerStackController.tsx   # Pengendali render layer Leaflet (WMS & GeoJSON)
│   ├── FigmaMapOverlay.tsx        # Floating search bar & stack kontrol vertikal (Figma 81:950)
│   ├── LegendDrawer.tsx           # Panel legenda multi-class mobile-responsive
│   ├── LayerManagerDrawer.tsx     # Pengatur urutan layer, visibility, dan opacity
│   └── WebmapViewer.tsx           # Kontainer utama WebGIS
└── __tests__/
    └── workflow.test.ts           # Automated test suite (16 tests, termasuk symbology engine)
```

---

## 3. Dataset Symbology Catalog

Simbologi dikelompokkan berdasarkan dataset dan kelas atribut tematik:

| Dataset ID | Nama Layer | Tipe Geometri | Atribut Penentu | Kelas / Kategori | Warna Garis / Simbol | Fill & Opacity |
|---|---|---|---|---|---|---|
| `ds-batas-kabkot` | Batas Administrasi Kabupaten/Kota | Polygon | Definitif | Batas Wilayah Kab/Kota | `#10b981` (Emerald) | Fill `#10b981` (18%) |
| `ds-jalan-nasional` | Jaringan Jalan Nasional | LineString | `STATUS`, `NAMA_RUAS` | Jalan Arteri Primer (Pantura) | `#ea580c` (Orange Tebal 4px) | - |
| | | | | Jalan Kolektor Primer (Lintas Tengah) | `#f59e0b` (Amber 3px) | - |
| | | | | Jalan Nasional Arteri (Sumatera/Sulawesi) | `#d97706` (2.5px) | - |
| `ds-rawan-gempa` | Kawasan Rawan Bencana Gempa | Polygon | `TINGKAT_KERAWANAN` | Bahaya Sangat Tinggi (Sesar Aktif) | `#dc2626` (Red 600) | Fill `#dc2626` (45%) |
| | | | | Bahaya Tinggi (Lembang / Megathrust) | `#ef4444` (Red 500) | Fill `#ef4444` (35%) |
| | | | | Bahaya Sedang | `#f59e0b` (Amber 500) | Fill `#f59e0b` (25%) |
| `ds-tutupan-lahan` | Peta Penutupan Lahan Nasional | Polygon | `KODE_PENUTUPAN` | 2001: Hutan Lahan Kering Primer | `#15803d` (Green 700) | Fill `#15803d` (50%) |
| | | | | 2004: Hutan Rawa Gambut | `#059669` (Emerald 600) | Fill `#059669` (50%) |
| | | | | 2010: Perkebunan Kelapa Sawit | `#ca8a04` (Yellow 600) | Fill `#ca8a04` (45%) |
| `ds-faskes` | Sebaran Fasilitas Kesehatan | Point | `JENIS`, `KELAS` | RSUP Kelas A | Simbol Lingkaran `#dc2626` (r: 8px) | Stroke `#ffffff` 2px |
| | | | | RSUD Regional (Kelas B) | Simbol Lingkaran `#2563eb` (r: 7px) | Stroke `#ffffff` 2px |
| `ds-rbi` | Peta Rupa Bumi Indonesia (RBI) | Polygon | Morfologi | Topografi & Morfologi Gunung Api | `#4f46e5` (Indigo 600) | Fill `#6366f1` (35%) |

---

## 4. OGC WMS GetLegendGraphic Integration

Untuk layer bertipe WMS pihak ketiga (Simpul Jaringan K/L/D):
- Request GetLegendGraphic otomatis dibentuk menggunakan standar OGC WMS 1.1.1:
  ```
  ${layer.url}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetLegendGraphic&LAYER=${encodeURIComponent(layer.wmsLayer)}&FORMAT=image/png
  ```
- Dilengkapi fallback `onError` anggun jika server penyedia memiliki batasan CORS atau format tidak tersedia, dengan tetap menampilkan metadata layer dan nama simpul jaringan.

---

## 5. UI/UX & Responsive Legend Drawer Behavior

1. **State-Driven Display**: Legenda hanya merender layer yang statusnya `visible: true`. Jika layer disembunyikan lewat Layer Manager, item legenda terkait langsung menghilang secara reaktif.
2. **Individual Cards**: Tiap layer aktif ditampilkan dalam kartu terisolasi (`border border-slate-100 bg-slate-50/70`) dengan informasi nama layer, sumber/simpul jaringan, persentase opacity, dan simbol kelas.
3. **Mobile Dimensions**:
   - `max-w-[390px]` terpusat horizontal di atas navigasi bawah.
   - Header dark navy `#0C1D36` selaras dengan top bar dan header aplikasi.
   - Area scroll vertical `max-h-80` dengan fluid scroll touch pada mobile screen.
   - Empty state informatif jika seluruh layer dinonaktifkan.

---

## 6. Verification & Automated Testing

Sistem legenda dan simbologi diverifikasi melalui unit test otomatis di `client/src/__tests__/workflow.test.ts`:
- Verifikasi keberadaan katalog simbologi untuk seluruh 6 dataset.
- Verifikasi akurasi pewarnaan dan ketebalan garis rawan gempa berdasarkan kelas resiko.
- Verifikasi diferensiasi penomoran rute dan jalan arteri nasional.
- Verifikasi radius dan warna lingkaran marker fasilitas kesehatan (RSUP vs RSUD).
- Total tests passing: 24 tests (16 client, 8 server).
