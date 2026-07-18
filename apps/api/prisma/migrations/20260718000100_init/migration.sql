CREATE TYPE "ProcessingMode" AS ENUM ('strict', 'permissive');
CREATE TYPE "ImportStatus" AS ENUM ('imported', 'validated', 'failed');
CREATE TYPE "ReportStatus" AS ENUM ('generating', 'completed', 'failed');

CREATE TABLE "DataSource" (
  "id" TEXT NOT NULL, "spreadsheetId" TEXT NOT NULL, "sheetName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DataSource_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Import" (
  "id" TEXT NOT NULL, "dataSourceId" TEXT NOT NULL, "snapshotId" TEXT NOT NULL, "period" TEXT NOT NULL,
  "sourceHash" TEXT NOT NULL, "rowCount" INTEGER NOT NULL, "mode" "ProcessingMode" NOT NULL,
  "status" "ImportStatus" NOT NULL, "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Import_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "RawRow" (
  "id" TEXT NOT NULL, "importId" TEXT NOT NULL, "sourceRowNumber" INTEGER NOT NULL, "raw" JSONB NOT NULL,
  CONSTRAINT "RawRow_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "NormalizedRow" (
  "id" TEXT NOT NULL, "importId" TEXT NOT NULL, "sourceRowNumber" INTEGER NOT NULL,
  "canonical" JSONB NOT NULL, "fingerprint" TEXT NOT NULL,
  CONSTRAINT "NormalizedRow_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Anomaly" (
  "id" TEXT NOT NULL, "importId" TEXT NOT NULL, "code" TEXT NOT NULL, "severity" TEXT NOT NULL,
  "message" TEXT NOT NULL, "entityType" TEXT NOT NULL, "entityKey" TEXT NOT NULL, "sourceRows" INTEGER[],
  "metadata" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Anomaly_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Report" (
  "id" TEXT NOT NULL, "importId" TEXT NOT NULL, "filename" TEXT NOT NULL, "filePath" TEXT NOT NULL,
  "fileHash" TEXT, "warningCount" INTEGER NOT NULL, "errorCount" INTEGER NOT NULL,
  "status" "ReportStatus" NOT NULL, "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ReportManualEntry" (
  "id" TEXT NOT NULL, "reportId" TEXT NOT NULL, "stableKey" TEXT NOT NULL, "values" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "ReportManualEntry_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Snapshot" (
  "id" TEXT NOT NULL, "spreadsheetId" TEXT NOT NULL, "sheetName" TEXT NOT NULL, "importedAt" TIMESTAMP(3) NOT NULL,
  "rowCount" INTEGER NOT NULL, "sourceHash" TEXT NOT NULL, "templateHash" TEXT, "generatedBy" TEXT NOT NULL,
  "appVersion" TEXT NOT NULL, "processingMode" TEXT NOT NULL, "filePath" TEXT NOT NULL,
  CONSTRAINT "Snapshot_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL, "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "level" TEXT NOT NULL,
  "requestId" TEXT, "module" TEXT NOT NULL, "action" TEXT NOT NULL, "message" TEXT NOT NULL,
  "metadata" JSONB NOT NULL, CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DataSource_spreadsheetId_sheetName_key" ON "DataSource"("spreadsheetId", "sheetName");
CREATE UNIQUE INDEX "Import_snapshotId_key" ON "Import"("snapshotId");
CREATE UNIQUE INDEX "RawRow_importId_sourceRowNumber_key" ON "RawRow"("importId", "sourceRowNumber");
CREATE INDEX "NormalizedRow_importId_fingerprint_idx" ON "NormalizedRow"("importId", "fingerprint");
CREATE INDEX "Anomaly_importId_severity_idx" ON "Anomaly"("importId", "severity");
CREATE UNIQUE INDEX "ReportManualEntry_reportId_stableKey_key" ON "ReportManualEntry"("reportId", "stableKey");

ALTER TABLE "Import" ADD CONSTRAINT "Import_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RawRow" ADD CONSTRAINT "RawRow_importId_fkey" FOREIGN KEY ("importId") REFERENCES "Import"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NormalizedRow" ADD CONSTRAINT "NormalizedRow_importId_fkey" FOREIGN KEY ("importId") REFERENCES "Import"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Anomaly" ADD CONSTRAINT "Anomaly_importId_fkey" FOREIGN KEY ("importId") REFERENCES "Import"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_importId_fkey" FOREIGN KEY ("importId") REFERENCES "Import"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReportManualEntry" ADD CONSTRAINT "ReportManualEntry_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
