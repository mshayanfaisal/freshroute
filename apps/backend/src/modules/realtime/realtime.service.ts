import { Injectable } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { UserRole } from '../../common/enums';

/**
 * Thin façade over the gateway so feature modules depend on a service, not the
 * transport. Centralises the event-name vocabulary used by the frontend.
 */
export const RealtimeEvents = {
  ORDER_PLACED: 'order.placed',
  ORDER_STATUS_CHANGED: 'order.status_changed',
  DELIVERY_ASSIGNED: 'delivery.assigned',
  STOP_UPDATED: 'delivery.stop_updated',
  COMPLAINT_SUBMITTED: 'complaint.submitted',
  COMPLAINT_ESCALATED: 'complaint.escalated',
  COMPLAINT_RESOLVED: 'complaint.resolved',
  SPOILAGE_ALERT: 'produce.spoilage_alert',
} as const;

@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: RealtimeGateway) {}

  notifyUser(userId: string, event: string, payload: unknown) {
    this.gateway.emitToUser(userId, event, payload);
  }

  notifyRole(role: UserRole, event: string, payload: unknown) {
    this.gateway.emitToRole(role, event, payload);
  }
}
