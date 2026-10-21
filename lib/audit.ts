import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { getClientIp } from "./request";

/** Append-only audit trail for sensitive actions. Never throws: auditing must not break the action. */
export async function logAudit(
  actorId: string | null,
  action: string,
  entity: string,
  entityId?: string | null,
  meta?: Prisma.InputJsonValue,
) {
  try {
    const ip = await getClientIp().catch(() => null);
    await db.auditLog.create({ data: { actorId, action, entity, entityId: entityId ?? null, meta, ip } });
  } catch (e) {
    console.error("[audit] failed to write audit log", e);
  }
}

export const audit = logAudit;
