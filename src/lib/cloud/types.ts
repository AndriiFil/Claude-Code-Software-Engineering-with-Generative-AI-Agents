/**
 * Domain model for the cloud export hub.
 *
 * Integrations are SIMULATED: nothing leaves the browser except files the user
 * downloads and share links, which carry their data inside the URL fragment.
 */

export type TemplateId = 'tax-report' | 'monthly-summary' | 'category-analysis' | 'full-backup';

export type PeriodId = 'this-month' | 'last-month' | 'this-year' | 'last-year' | 'last-12-months' | 'all';

export type FileFormat = 'csv' | 'json';

export type DestinationId = 'download' | 'email' | 'google-sheets' | 'google-drive' | 'dropbox' | 'onedrive' | 'link';

/** Destinations that need an account connection first. */
export type CloudProviderId = Extract<DestinationId, 'google-sheets' | 'google-drive' | 'dropbox' | 'onedrive'>;

export type Cell = string | number;

/** Output of a template: a titled table plus headline figures. */
export interface Dataset {
  title: string;
  subtitle: string;
  columns: string[];
  /** Index of columns holding currency values (for formatting in previews). */
  currencyColumns: number[];
  rows: Cell[][];
  highlights: { label: string; value: string }[];
}

export type ConnectionStatus = 'disconnected' | 'connected' | 'syncing' | 'error';

export interface Connection {
  provider: CloudProviderId;
  status: ConnectionStatus;
  account: string | null;
  connectedAt: string | null;
  lastSyncAt: string | null;
  /** Default folder / spreadsheet target. */
  target: string;
  /** Simulated storage used by Spendwise files on that service, in bytes. */
  bytesStored: number;
  filesStored: number;
}

export type JobStatus = 'queued' | 'preparing' | 'uploading' | 'delivering' | 'completed' | 'failed';

export interface EmailDetails {
  to: string[];
  subject: string;
  message: string;
}

export interface LinkDetails {
  url: string;
  expiresAt: string | null;
  redacted: boolean;
}

export interface ExportJob {
  id: string;
  templateId: TemplateId;
  period: PeriodId;
  format: FileFormat;
  destination: DestinationId;
  status: JobStatus;
  /** 0..100 */
  progress: number;
  trigger: 'manual' | 'schedule';
  scheduleId?: string;
  createdAt: string;
  finishedAt?: string;
  error?: string;
  /** Filled in once the file is generated. */
  fileName?: string;
  bytes?: number;
  rowCount?: number;
  /** SHA-256 of the generated file, so recipients can verify integrity. */
  checksum?: string;
  /** Human-readable target, e.g. "/Apps/Spendwise" or "alex@company.com". */
  target?: string;
  email?: EmailDetails;
  link?: LinkDetails;
}

export type Frequency = 'daily' | 'weekly' | 'monthly';

export interface Schedule {
  id: string;
  name: string;
  templateId: TemplateId;
  format: FileFormat;
  destination: Exclude<DestinationId, 'link' | 'download'>;
  frequency: Frequency;
  /** 0 = Sunday (weekly only). */
  weekday: number;
  /** 1..28 (monthly only). */
  dayOfMonth: number;
  /** "HH:MM", local time. */
  time: string;
  enabled: boolean;
  createdAt: string;
  lastRunAt: string | null;
  /** Email recipients when destination === 'email'. */
  recipients: string[];
}

export interface CloudState {
  connections: Record<CloudProviderId, Connection>;
  jobs: ExportJob[];
  schedules: Schedule[];
}
