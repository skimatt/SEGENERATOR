import { describe, expect, it } from 'vitest';
import { isStrictBlockingCode } from '../../src/modules/reports/report-service.js';

describe('report strict mode', () => {
  it('tetap memblokir konflik data inti tetapi tidak memblokir perbedaan target lintas sumber Uji Petik', () => {
    expect(isStrictBlockingCode('TARGET_CONFLICT')).toBe(true);
    expect(isStrictBlockingCode('NUMBER_PARSE_ERROR')).toBe(true);
    expect(isStrictBlockingCode('UJI_PETIK_TARGET_MISMATCH')).toBe(false);
  });
});
