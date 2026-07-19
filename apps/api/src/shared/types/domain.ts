export type ProcessingMode = 'strict' | 'permissive';
export type Severity = 'info' | 'warning' | 'error' | 'critical';
export type EntityType = 'row' | 'ppl' | 'pml' | 'subsls' | 'assignment';

export type DataWarning = {
  code: string;
  message: string;
  severity: Severity;
};

export type CanonicalRow = {
  sourceRowNumber: number;
  no: string | null;
  kodeSubSls: string;
  namaSls: string | null;
  namaPpl: string | null;
  emailPpl: string | null;
  namaPml: string | null;
  emailPml: string | null;
  statusPplSobat: string | null;
  jenisMitra: string | null;
  capaian: number;
  targetPrelistAwal: number | null;
  linkAssignmentPpl: string | null;
  pplKey: string;
  pmlKey: string;
  assignmentKey: string;
  subslsKey: string;
  fingerprint: string;
  raw: Record<string, unknown>;
  warnings: DataWarning[];
};

export type Anomaly = {
  code: string;
  severity: Severity;
  message: string;
  sourceRows: number[];
  entityType: EntityType;
  entityKey: string;
  metadata: Record<string, unknown>;
};

export type AssignmentContribution = {
  assignmentKey: string;
  sourceRowNumber: number;
  capaian: number;
};

export type SubSlsAggregate = {
  subslsKey: string;
  kodeSubSls: string;
  namaSls: string | null;
  target: number | null;
  capaian: number;
  percentage: number | null;
  status: string;
  contributors: AssignmentContribution[];
  pplKeys: string[];
  pmlKeys: string[];
};

export type PplAggregate = {
  pplKey: string;
  namaPpl: string | null;
  emailPpl: string | null;
  pmlKey: string;
  namaPml: string | null;
  emailPml: string | null;
  subsls: SubSlsAggregate[];
  assignedTarget: number;
  uniqueRegionalTarget: number;
  totalCapaian: number;
  percentage: number | null;
  targetMissing: number;
  targetZero: number;
  noProgress: number;
  belowTarget: number;
  onTarget: number;
  aboveTarget: number;
  missingLink: number;
  reassignments: number;
  multiPml: number;
  multiPpl: number;
};

export type PmlAggregate = {
  pmlKey: string;
  namaPml: string | null;
  emailPml: string | null;
  ppls: PplAggregate[];
  totalTarget: number;
  totalCapaian: number;
  percentage: number | null;
};

export type AggregationResult = {
  pmls: PmlAggregate[];
  ppls: PplAggregate[];
  subsls: SubSlsAggregate[];
  uniqueRows: CanonicalRow[];
  totalTarget: number;
  totalCapaian: number;
  percentage: number | null;
};

export type PipelineResult = {
  period: string;
  rawRows: Record<string, unknown>[];
  rows: CanonicalRow[];
  aggregation: AggregationResult;
  anomalies: Anomaly[];
};

export type ProgressSubSlsMetrics = {
  kodeSubSls: string;
  targetCombined: number;
  targetUsaha: number;
  usahaKeluargaDitemukan: number;
  usahaKeluargaTidakDitemukan: number;
};

export type ProgressWorkbookSource = {
  filePath: string;
  sourceHash: string;
  updatedLabel: string | null;
  bySubSls: Map<string, ProgressSubSlsMetrics>;
};

export type UjiPetikPplMetrics = {
  pplKey: string;
  targetCombined: number;
  targetUsaha: number;
  targetKeluarga: number;
  usahaKeluargaDitemukan: number;
  usahaKeluargaTidakDitemukan: number;
  matchedSubSls: number;
  sourceHash: string;
};

export type UjiPetikAggregation = {
  byPpl: Map<string, UjiPetikPplMetrics>;
  anomalies: Anomaly[];
  sourceHash: string;
  updatedLabel: string | null;
};
