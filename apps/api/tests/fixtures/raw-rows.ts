export const baseRawRows: Record<string, unknown>[] = [
  { no: '1', kodeSubSls: '001001', namaSls: 'SLS A', namaPpl: 'Ani', emailPpl: ' ANI@EXAMPLE.COM ', namaPml: 'Budi', emailPml: 'budi@example.com', statusPplSobat: 'Aktif', jenisMitra: 'Mitra', capaian: '4', targetPrelistAwal: '10', linkAssignmentPpl: 'https://example.com/a' },
  { no: '2', kodeSubSls: '001002', namaSls: 'SLS B', namaPpl: 'Ani', emailPpl: 'ani@example.com', namaPml: 'Budi', emailPml: 'budi@example.com', statusPplSobat: 'Aktif', jenisMitra: 'Mitra', capaian: '-', targetPrelistAwal: '-', linkAssignmentPpl: '-' },
  { no: '3', kodeSubSls: '001001', namaSls: 'SLS A', namaPpl: 'Cici', emailPpl: 'cici@example.com', namaPml: 'Budi', emailPml: 'budi@example.com', statusPplSobat: 'Aktif', jenisMitra: 'Mitra', capaian: '3', targetPrelistAwal: '10', linkAssignmentPpl: 'https://example.com/c' },
];

export const duplicateRawRows = [...baseRawRows, { ...baseRawRows[0] }];
export const targetConflictRows = [...baseRawRows, { ...baseRawRows[0], no: '4', targetPrelistAwal: '12', capaian: '5' }];
