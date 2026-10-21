# Superseded files

These files were found in the project before the reconciliation pass. They targeted an older data
model (Role/Permission tables, Inventory table, PAYMENT_CONFIRMED, etc.) that no longer matches
`prisma/schema.prisma`, or duplicated a module that now lives elsewhere:

| File | Replaced by |
| --- | --- |
| lib/auth/* (scrypt, role tables) | src/lib/auth.ts (bcryptjs, Role enum + permission map) |
| lib/site.ts | src/lib/settings.ts (+ nav helper in src/lib/catalog.ts) |
| lib/shipping.ts | src/lib/delivery.ts |
| lib/types.ts | types exported from catalog.ts / cart.ts |
| root/next.config.mjs | next.config.ts |

Safe to delete once you have reviewed them. They are excluded from the TypeScript build.
