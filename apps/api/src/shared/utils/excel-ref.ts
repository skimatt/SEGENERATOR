export function buildCellRef(column: string, row: number): string {
  return `${column}${row}`;
}

export function buildRange(startColumn: string, startRow: number, endColumn: string, endRow: number): string {
  return `${buildCellRef(startColumn, startRow)}:${buildCellRef(endColumn, endRow)}`;
}
