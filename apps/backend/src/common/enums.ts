/**
 * Central enum definitions shared across FreshRoute modules.
 * Kept in one file so entities, DTOs, guards and the frontend contract stay in sync.
 */

export enum UserRole {
  FARMER = 'farmer',
  BUYER = 'buyer',
  DRIVER = 'driver',
  ADMIN = 'admin',
}

/** Coarse produce categories used by the forecaster and analytics. */
export enum ProduceCategory {
  VEGETABLE = 'vegetable',
  FRUIT = 'fruit',
  DAIRY = 'dairy',
  EGGS = 'eggs',
  HERBS = 'herbs',
}

export enum SpoilageRisk {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

/**
 * Order lifecycle. Transitions are guarded by role in OrdersService.
 * Pending → Confirmed → Packed → In Transit → Delivered / Disputed
 */
export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PACKED = 'packed',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  DISPUTED = 'disputed',
  CANCELLED = 'cancelled',
}

export enum DeliveryRunStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export enum StopStatus {
  PENDING = 'pending',
  DELIVERED = 'delivered',
  FAILED = 'failed',
}

export enum ComplaintStatus {
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  RESOLVED = 'resolved',
}

export enum ComplaintResolution {
  CREDIT = 'credit',
  REPLACE = 'replace',
  REJECT = 'reject',
}

/** AI defect categories produced by the Complaint Classifier. */
export enum DefectCategory {
  PACKAGING = 'packaging',
  CONTAMINATION = 'contamination',
  FRESHNESS = 'freshness',
  WRONG_ITEM = 'wrong_item',
  QUANTITY = 'quantity',
}

export enum DefectSeverity {
  MINOR = 'minor',
  MAJOR = 'major',
  CRITICAL = 'critical',
}

export enum ConfidenceBand {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

/** Which AI feature produced a suggestion (for accuracy tracking / analytics). */
export enum AiFeature {
  DEMAND_FORECAST = 'demand_forecast',
  DYNAMIC_PRICING = 'dynamic_pricing',
  COMPLAINT_CLASSIFIER = 'complaint_classifier',
  ROUTE_OPTIMISER = 'route_optimiser',
}
