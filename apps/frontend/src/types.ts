// Shared types mirroring the backend contract.
export type UserRole = 'farmer' | 'buyer' | 'driver' | 'admin';
export type ProduceCategory = 'vegetable' | 'fruit' | 'dairy' | 'eggs' | 'herbs';
export type SpoilageRisk = 'low' | 'medium' | 'high';
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'packed'
  | 'in_transit'
  | 'delivered'
  | 'disputed'
  | 'cancelled';
export type StopStatus = 'pending' | 'delivered' | 'failed';
export type ComplaintStatus = 'submitted' | 'under_review' | 'resolved';
export type DefectCategory =
  | 'packaging'
  | 'contamination'
  | 'freshness'
  | 'wrong_item'
  | 'quantity';
export type DefectSeverity = 'minor' | 'major' | 'critical';
export type ComplaintResolution = 'credit' | 'replace' | 'reject';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  orgName?: string | null;
  address?: string | null;
}

export interface Produce {
  id: string;
  name: string;
  variety: string | null;
  category: ProduceCategory;
  unit: string;
  pricePerUnit: number;
  quantityAvailable: number;
  harvestDate: string;
  shelfLifeDays: number;
  spoilageRisk: SpoilageRisk;
  isSoldOut: boolean;
  farmerId: string;
  daysSinceHarvest?: number;
  farmer?: { name: string; orgName?: string | null };
}

export interface OrderLine {
  id: string;
  productName: string;
  unit: string;
  unitPrice: number;
  quantityOrdered: number;
  quantityDelivered: number;
  farmerId: string;
  harvestDate: string | null;
}

export interface Order {
  id: string;
  reference: string;
  status: OrderStatus;
  buyerId: string;
  totalAmount: number;
  deliveryAddress: string | null;
  specialInstructions: string | null;
  lines: OrderLine[];
  createdAt: string;
}

export interface DeliveryStop {
  id: string;
  orderId: string;
  sequence: number;
  address: string;
  latitude: number | null;
  longitude: number | null;
  specialInstructions: string | null;
  status: StopStatus;
  failureReason: string | null;
  completedAt: string | null;
}

export interface DeliveryRun {
  id: string;
  driverId: string | null;
  scheduledDate: string;
  status: string;
  stops: DeliveryStop[];
}

export interface Complaint {
  id: string;
  buyerId: string;
  orderLineId: string;
  farmerId: string;
  description: string;
  status: ComplaintStatus;
  defectCategory: DefectCategory | null;
  severity: DefectSeverity | null;
  supplierAlertDraft: string | null;
  aiClassified: boolean;
  resolution: ComplaintResolution | null;
  createdAt: string;
}

export interface ForecastResult {
  forecasts: { category: string; predictedVolume: number; confidence: string; rationale: string }[];
  usedFallback: boolean;
  weekOfYear: number;
}

export interface PricingResult {
  suggestedPrice: number | null;
  changePercent: number | null;
  rationale: string;
  historicalRange?: { min: number; max: number; avg: number };
  usedFallback: boolean;
}
