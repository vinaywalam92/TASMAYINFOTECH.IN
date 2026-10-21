/**
 * Shipping-provider boundary. Courier APIs (Shiprocket, Delhivery, …) need merchant accounts and
 * credentials that this project does not have, so NO live-rate or live-tracking integration is
 * implemented. Orders are fulfilled manually: staff add courier + tracking number in Admin → Orders,
 * and customers see exactly that. To integrate a provider later, implement `ShippingProvider` and
 * call it from `addShipmentAction` (src/actions/admin/ops.ts).
 */
export interface ShippingProvider {
  name: string;
  createShipment(orderNumber: string): Promise<{ trackingNumber: string; trackingUrl?: string }>;
  fetchStatus(trackingNumber: string): Promise<{ status: string; updatedAt: string }>;
}

export const shippingProvider: ShippingProvider | null = null;
