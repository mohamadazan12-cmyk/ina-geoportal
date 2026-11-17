import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { verifyToken } from '../utils/jwt';
import { sendSuccess, sendError } from '../utils/responseFormatter';
import { prisma } from '../config/db';
import { getStorageDriver, documentKey, StorageObjectNotFoundError } from '../services/storage';

export interface DocumentMeta {
  id: string;
  code: string;
  title: string;
  category: 'prioritas' | 'non-prioritas';
  year: number;
  publisher: string;
  description: string;
  pages: number;
  format: string;
  fileName?: string;
  filePath?: string;
}

export const OFFICIAL_DOCUMENTS: DocumentMeta[] = [
  {
    id: 'sdg-01',
    code: 'SDG-01/BIG/2024',
    title: 'Standar Data Geospasial Peta Ketahanan dan Kerentanan Pangan Nasional',
    category: 'prioritas',
    year: 2024,
    publisher: 'Badan Informasi Geospasial & Badan Pangan Nasional',
    description: 'Spesifikasi penyusunan data spasial, struktur basis data atribut, katalog unsur geografi, dan simbolisasi peta kerentanan pangan skala 1:50.000.',
    pages: 48,
    format: 'PDF',
  },
  {
    id: 'sdg-02',
    code: 'SDG-02/BIG/2024',
    title: 'Standar Data Geospasial Biota Laut Dilindungi',
    category: 'prioritas',
    year: 2024,
    publisher: 'Kementerian Kelautan dan Perikanan & BIG',
    description: 'Pedoman standarisasi sebaran spasial mamalia laut, penyu, ikan dilindungi, dan terumbu karang bernilai konservasi tinggi perairan Indonesia.',
    pages: 62,
    format: 'PDF',
  },
  {
    id: 'sdg-03',
    code: 'SDG-03/ESDM/2023',
    title: 'Spesifikasi Produk Peta Bukaan Tambang Skala 1:50.000',
    category: 'non-prioritas',
    year: 2023,
    publisher: 'Kementerian ESDM & Pusat Standardisasi BIG',
    description: 'Ketentuan teknis digitasi citra satelit resolusi tinggi, batas konsesi IUP, dan perhitungan luasan reklamasi lahan tambang terbuka.',
    pages: 36,
    format: 'PDF',
  },
  {
    id: 'sdg-04',
    code: 'SDG-04/BMKG/2024',
    title: 'Spesifikasi Informasi Geospasial Gelombang Laut BMKG',
    category: 'prioritas',
    year: 2024,
    publisher: 'Badan Meteorologi, Klimatologi, dan Geofisika',
    description: 'Standar format model numerik oseanografi, data tinggi gelombang signifikan, periode gelombang, dan diseminasi format NetCDF/WMS.',
    pages: 54,
    format: 'PDF',
  },
  {
    id: 'sdg-05',
    code: 'SDG-05/BMKG/2024',
    title: 'Standar Data Angin Permukaan Laut Perairan Nusantara',
    category: 'prioritas',
    year: 2024,
    publisher: 'BMKG & Pusat Jaring Kontrol Geodesi BIG',
    description: 'Format data vektor arah dan kecepatan angin rata-rata harian pada ketinggian 10 meter untuk keselamatan pelayaran nasional.',
    pages: 42,
    format: 'PDF',
  },
  {
    id: 'sdg-06',
    code: 'SDG-06/BNPB/2024',
    title: 'Spesifikasi Penyajian Peta Rawan Bencana Longsor Skala 1:25.000',
    category: 'prioritas',
    year: 2024,
    publisher: 'BNPB & Badan Informasi Geospasial',
    description: 'Klasifikasi indeks kerentanan gerakan tanah berdasarkan curah hujan ekstrem, kemiringan lereng, dan geologi formasi batuan.',
    pages: 70,
    format: 'PDF',
  },
  {
    id: 'sdg-07',
    code: 'SDG-07/KLHK/2023',
    title: 'Standar Batas Kawasan Hutan Konservasi & Suaka Margasatwa',
    category: 'prioritas',
    year: 2023,
    publisher: 'Kementerian Lingkungan Hidup dan Kehutanan',
    description: 'Spesifikasi penetapan batas definitif kawasan konservasi darat dan perairan berdasarkan berita acara tata batas.',
    pages: 58,
    format: 'PDF',
  },
  {
    id: 'sdg-08',
    code: 'SDG-08/PUPR/2023',
    title: 'Spesifikasi Teknis Basis Data Jaringan Irigasi Primer dan Sekunder',
    category: 'non-prioritas',
    year: 2023,
    publisher: 'Kementerian PUPR Direktorat SDA',
    description: 'Standarisasi kodifikasi aset bendung, saluran primer, pintu air, dan peta petak tersier skala detail 1:5.000.',
    pages: 45,
    format: 'PDF',
  },
];

async function checkPhysicalFileExists(doc: DocumentMeta): Promise<boolean> {
  if (!doc.fileName) return false;
  try {
    const driver = getStorageDriver('private');
    return await driver.exists(documentKey(doc.fileName));
  } catch {
    return false;
  }
}

export async function getDocuments(req: AuthenticatedRequest, res: Response): Promise<void> {
  const docsWithStatus = await Promise.all(
    OFFICIAL_DOCUMENTS.map(async (doc) => {
      const isAvailable = await checkPhysicalFileExists(doc);
      return {
        ...doc,
        isAvailableForDownload: isAvailable,
        statusMessage: isAvailable ? 'Tersedia untuk diunduh' : 'Dokumen belum tersedia untuk diunduh.',
      };
    })
  );
  sendSuccess(res, docsWithStatus, 'Daftar dokumen standar data berhasil dimuat');
}

export async function getDocumentById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const doc = OFFICIAL_DOCUMENTS.find((d) => d.id === id);

  if (!doc) {
    sendError(res, 'NOT_FOUND', 'Dokumen tidak ditemukan.', 404);
    return;
  }

  const isAvailable = await checkPhysicalFileExists(doc);
  sendSuccess(
    res,
    {
      ...doc,
      isAvailableForDownload: isAvailable,
      statusMessage: isAvailable ? 'Tersedia untuk diunduh' : 'Dokumen belum tersedia untuk diunduh.',
    },
    'Detail dokumen berhasil dimuat'
  );
}

export async function downloadDocument(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    let user = req.user;
    if (!user && req.query.token) {
      try {
        user = verifyToken(req.query.token as string);
      } catch {
        // invalid token
      }
    }

    // 1. Enforce Authentication Required
    if (!user) {
      sendError(
        res,
        'AUTH_REQUIRED',
        'Akses ditolak. Login diperlukan untuk mengunduh dokumen.',
        401
      );
      return;
    }

    const { id } = req.params;
    const doc = OFFICIAL_DOCUMENTS.find((d) => d.id === id);

    if (!doc) {
      sendError(res, 'NOT_FOUND', 'Dokumen tidak ditemukan.', 404);
      return;
    }

    // 2. Physical File Availability Verification
    if (!doc.fileName || !(await checkPhysicalFileExists(doc))) {
      sendError(
        res,
        'FILE_NOT_FOUND',
        'Dokumen belum tersedia untuk diunduh. Berkas fisik belum dipublikasikan oleh instansi wali data.',
        404
      );
      return;
    }

    const driver = getStorageDriver('private');
    const key = documentKey(doc.fileName);

    try {
      if (!(await driver.exists(key))) {
        sendError(res, 'FILE_NOT_FOUND', 'Dokumen belum tersedia untuk diunduh.', 404);
        return;
      }

      // Record download activity for authenticated user
      try {
        const existingDataset = await prisma.dataset.findFirst();
        if (existingDataset) {
          await prisma.downloadHistory.create({
            data: {
              userId: user.userId,
              datasetId: existingDataset.id,
              format: doc.format.toLowerCase(),
              purpose: `Unduh Dokumen ${doc.code}`,
              status: 'COMPLETED',
            },
          });
        }
      } catch {
        // ignore history tracking errors
      }

      const safeFileName = doc.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);
      res.setHeader('Content-Type', 'application/pdf');
      // Private store: bytes are streamed here, never via a public blob URL.
      res.setHeader('Cache-Control', 'private, no-store');

      const stream = await driver.createReadStream(key);
      stream.pipe(res);
    } catch (err: any) {
      if (err instanceof StorageObjectNotFoundError) {
        sendError(res, 'FILE_NOT_FOUND', 'Dokumen belum tersedia untuk diunduh.', 404);
        return;
      }
      throw err;
    }
  } catch (error: any) {
    sendError(res, 'DOWNLOAD_ERROR', error.message || 'Gagal memproses unduhan dokumen', 500);
  }
}
