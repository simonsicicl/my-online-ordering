/**
 * Device
 * Hardware device registration
 */
export interface Device {
  id: string;
  storeId: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  ipAddress?: string;
  macAddress?: string;
  model?: string;
  serialNumber?: string;
  metadata?: DeviceMetadata;
  lastHeartbeat?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum DeviceType {
  RECEIPT_PRINTER = 'RECEIPT_PRINTER',
  LABEL_PRINTER = 'LABEL_PRINTER',
  BARCODE_SCANNER = 'BARCODE_SCANNER',
  CASH_DRAWER = 'CASH_DRAWER',
  CARD_TERMINAL = 'CARD_TERMINAL',
  KDS_DISPLAY = 'KDS_DISPLAY',
}

export enum DeviceStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  ERROR = 'ERROR',
}

export interface DeviceMetadata {
  ipAddress?: string;
  macAddress?: string;
  firmwareVersion?: string;
}

/**
 * Print Job
 * Queue for print jobs
 */
export interface PrintJob {
  id: string;
  deviceId: string;
  storeId: string;
  type: PrintJobType;
  content: PrintJobContent;
  status: PrintJobStatus;
  attempts: number;
  error?: string;
  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
}

export enum PrintJobType {
  RECEIPT = 'RECEIPT',
  LABEL = 'LABEL',
  REPORT = 'REPORT',
}

export enum PrintJobStatus {
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface PrintJobContent {
  orderNumber?: string;
  items?: any[];
  total?: number;
  customData?: Record<string, any>;
  // Additional print-specific fields
}
