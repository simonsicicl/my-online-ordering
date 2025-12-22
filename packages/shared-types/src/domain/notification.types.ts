/**
 * Notification
 * Multi-channel notification record
 */
export interface Notification {
  id: string;
  userId: string;
  channel: NotificationChannel;
  template: NotificationTemplate;
  subject?: string;
  message: string;
  data?: NotificationData;
  status: NotificationStatus;
  sentAt?: Date;
  createdAt: Date;
}

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  WEBSOCKET = 'WEBSOCKET',
}

export enum NotificationTemplate {
  ORDER_CONFIRMATION = 'ORDER_CONFIRMATION',
  ORDER_STATUS_UPDATE = 'ORDER_STATUS_UPDATE',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  STOCK_LOW_ALERT = 'STOCK_LOW_ALERT',
  TIER_UPGRADED = 'TIER_UPGRADED',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

export interface NotificationData {
  [key: string]: any; // Template-specific data
}
