import type { CloudProviderId, Connection, DestinationId } from './types';

export interface DestinationMeta {
  id: DestinationId;
  name: string;
  short: string;
  /** Monogram shown in the brand-neutral tile. */
  mark: string;
  /** Tailwind classes for the tile (literal strings for JIT). */
  tile: string;
  description: string;
  requiresConnection: boolean;
  /** Default folder / target name shown in the UI. */
  defaultTarget: string;
  /** OAuth-style permissions shown in the simulated consent screen. */
  scopes: string[];
  /** Simulated quota for the storage meter, in bytes. */
  quota?: number;
}

const GB = 1024 ** 3;

export const DESTINATIONS: Record<DestinationId, DestinationMeta> = {
  download: {
    id: 'download',
    name: 'Download',
    short: 'Download',
    mark: '↓',
    tile: 'bg-slate-900 text-white',
    description: 'Save the file to this device',
    requiresConnection: false,
    defaultTarget: 'This device',
    scopes: [],
  },
  email: {
    id: 'email',
    name: 'Email',
    short: 'Email',
    mark: '@',
    tile: 'bg-sky-500 text-white',
    description: 'Send as an attachment with a summary',
    requiresConnection: false,
    defaultTarget: '',
    scopes: [],
  },
  link: {
    id: 'link',
    name: 'Share link',
    short: 'Link',
    mark: '⧉',
    tile: 'bg-fuchsia-500 text-white',
    description: 'Read-only link + QR code, no account needed',
    requiresConnection: false,
    defaultTarget: 'Anyone with the link',
    scopes: [],
  },
  'google-sheets': {
    id: 'google-sheets',
    name: 'Google Sheets',
    short: 'Sheets',
    mark: 'S',
    tile: 'bg-emerald-600 text-white',
    description: 'Write to a spreadsheet, optionally keep it in sync',
    requiresConnection: true,
    defaultTarget: 'Spendwise Exports',
    scopes: ['Create spreadsheets in your Drive', 'Edit spreadsheets created by Spendwise'],
    quota: 15 * GB,
  },
  'google-drive': {
    id: 'google-drive',
    name: 'Google Drive',
    short: 'Drive',
    mark: 'D',
    tile: 'bg-amber-400 text-slate-900',
    description: 'Store files in a Drive folder',
    requiresConnection: true,
    defaultTarget: '/Spendwise',
    scopes: ['See and upload files created by Spendwise'],
    quota: 15 * GB,
  },
  dropbox: {
    id: 'dropbox',
    name: 'Dropbox',
    short: 'Dropbox',
    mark: 'Db',
    tile: 'bg-blue-600 text-white',
    description: 'Upload to an app folder',
    requiresConnection: true,
    defaultTarget: '/Apps/Spendwise',
    scopes: ['Read and write files in /Apps/Spendwise only'],
    quota: 2 * GB,
  },
  onedrive: {
    id: 'onedrive',
    name: 'OneDrive',
    short: 'OneDrive',
    mark: 'O',
    tile: 'bg-sky-700 text-white',
    description: 'Upload to your OneDrive',
    requiresConnection: true,
    defaultTarget: '/Documents/Spendwise',
    scopes: ['Read and write files in your app folder', 'Maintain access (offline)'],
    quota: 5 * GB,
  },
};

export const CLOUD_PROVIDERS: CloudProviderId[] = ['google-sheets', 'google-drive', 'dropbox', 'onedrive'];
export const DESTINATION_ORDER: DestinationId[] = ['download', 'email', 'link', 'google-sheets', 'google-drive', 'dropbox', 'onedrive'];

export function isCloudProvider(id: DestinationId): id is CloudProviderId {
  return (CLOUD_PROVIDERS as DestinationId[]).includes(id);
}

export function emptyConnection(provider: CloudProviderId): Connection {
  return {
    provider,
    status: 'disconnected',
    account: null,
    connectedAt: null,
    lastSyncAt: null,
    target: DESTINATIONS[provider].defaultTarget,
    bytesStored: 0,
    filesStored: 0,
  };
}
