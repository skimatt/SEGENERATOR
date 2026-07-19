import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  APP_TIMEZONE: z.string().default('Asia/Jakarta'),
  DATABASE_URL: z.string().min(1),
  GOOGLE_SPREADSHEET_ID: z.string().min(1).default('1zpMTFkKYVDdo8dyFy_ZJRGXFXFuVvMZSsPCzhD_0jfg'),
  GOOGLE_SHEET_NAME: z.string().min(1).default('DATA_MENTAH2'),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.preprocess((value) => value === '' ? undefined : value, z.string().email().optional()),
  GOOGLE_PRIVATE_KEY: z.string().optional(),
  GOOGLE_SERVICE_ACCOUNT_FILE: z.preprocess((value) => value === '' ? undefined : value, z.string().min(1).optional()),
  REPORT_TEMPLATE_PATH: z.string().default('./templates/LK PPK  TEMPLATES.xlsx'),
  REPORT_OUTPUT_DIR: z.string().default('./storage/reports'),
  SNAPSHOT_DIR: z.string().default('./storage/snapshots'),
  PROGRESS_WORKBOOK_PATH: z.string().min(1).default('./data/Export_Progres_Pendataan_Sub_Satuan_Lingkungan_Setempat_Sub-SLS.xlsx'),
  DEFAULT_PROCESSING_MODE: z.enum(['strict', 'permissive']).default('strict'),
  REPORT_PERIOD: z.string().min(1).default('2026_TERMIN_1'),
  WEB_ORIGIN: z.string().default('http://localhost:5173'),
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Konfigurasi environment tidak valid: ${parsed.error.message}`);
  }
  return parsed.data;
}
