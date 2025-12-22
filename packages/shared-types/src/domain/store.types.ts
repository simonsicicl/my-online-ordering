/**
 * Store
 * Restaurant/store entity
 */
export interface Store {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  businessHours: BusinessHours[];
  deliveryZones?: DeliveryZone[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessHours {
  day: DayOfWeek;
  open: string; // Format: "HH:mm" (e.g., "09:00")
  close: string; // Format: "HH:mm" (e.g., "22:00")
  isOpen: boolean;
}

export enum DayOfWeek {
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
  SUNDAY = 'sunday',
}

export interface DeliveryZone {
  id: string;
  name: string;
  radius: number; // In kilometers
  deliveryFee: number; // In cents
}
