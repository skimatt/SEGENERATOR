import { google } from 'googleapis';
import type { AppConfig } from '../../config/env.js';
import { GoogleSheetsError } from '../../shared/errors/app-error.js';
import { rowsToRawRecords } from '../normalization/header-resolver.js';

export type SheetsReadResult = {
  spreadsheetId: string;
  sheetName: string;
  rawRows: Record<string, unknown>[];
};

export class GoogleSheetsReader {
  constructor(private readonly config: AppConfig) {}

  async read(): Promise<SheetsReadResult> {
    const email = this.config.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = this.config.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const keyFile = this.config.GOOGLE_SERVICE_ACCOUNT_FILE;
    if (!keyFile && (!email || !privateKey)) {
      throw new GoogleSheetsError('Credential Google Sheets belum dikonfigurasi. Isi GOOGLE_SERVICE_ACCOUNT_FILE atau pasangan GOOGLE_SERVICE_ACCOUNT_EMAIL dan GOOGLE_PRIVATE_KEY, lalu bagikan spreadsheet kepada service account.');
    }
    try {
      const scopes = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
      let auth: InstanceType<typeof google.auth.GoogleAuth> | InstanceType<typeof google.auth.JWT>;
      if (keyFile) auth = new google.auth.GoogleAuth({ keyFile, scopes });
      else {
        if (!email || !privateKey) throw new GoogleSheetsError('Credential service account tidak lengkap.');
        auth = new google.auth.JWT({ email, key: privateKey, scopes });
      }
      const sheets = google.sheets({ version: 'v4', auth });
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.config.GOOGLE_SPREADSHEET_ID,
        range: `'${this.config.GOOGLE_SHEET_NAME.replace(/'/g, "''")}'`,
        valueRenderOption: 'FORMATTED_VALUE',
        dateTimeRenderOption: 'FORMATTED_STRING',
      });
      const values = response.data.values ?? [];
      return {
        spreadsheetId: this.config.GOOGLE_SPREADSHEET_ID,
        sheetName: this.config.GOOGLE_SHEET_NAME,
        rawRows: rowsToRawRecords(values),
      };
    } catch (error) {
      if (error instanceof GoogleSheetsError) throw error;
      throw new GoogleSheetsError(`Gagal membaca ${this.config.GOOGLE_SHEET_NAME} dari Google Sheets. Periksa akses service account, spreadsheet ID, dan nama sheet.`, error instanceof Error ? error.message : error);
    }
  }
}
