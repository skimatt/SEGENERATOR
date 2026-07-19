export type ProgressSheetFieldMapping = {
  aliases: string[];
  headerRows: number[];
};

export type ProgressSheetMapping = {
  sheetName: string;
  fields: Record<string, ProgressSheetFieldMapping>;
};

export const progressWorkbookMapping = {
  progress: {
    sheetName: 'PROGRES PENDATAAN',
    fields: {
      kodeSubSls: { aliases: ['Kode'], headerRows: [4] },
      targetCombined: { aliases: ['Jumlah Prelist Usaha & Keluarga'], headerRows: [4] },
    },
  },
  company: {
    sheetName: 'USAHA PERUSAHAAN',
    fields: {
      kodeSubSls: { aliases: ['Kode'], headerRows: [5] },
      targetUsaha: { aliases: ['Jumlah Prelist Usaha'], headerRows: [5] },
    },
  },
  familyBusiness: {
    sheetName: 'USAHA KELUARGA',
    fields: {
      kodeSubSls: { aliases: ['Kode'], headerRows: [5] },
      usahaKeluargaDitemukan: { aliases: ['Ditemukan'], headerRows: [5] },
      usahaKeluargaTidakDitemukan: { aliases: ['Tidak Ditemukan'], headerRows: [5] },
    },
  },
} satisfies Record<string, ProgressSheetMapping>;

