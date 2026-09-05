import type { Prisma } from "@/generated/prisma/client";
import { nextOrderCode } from "@/lib/codes";

export async function createOrderFromRevision(
  db: Prisma.TransactionClient,
  input: { quoteId: number; revisionId: number; confirmedAt: Date; promisedDeliveryDate: Date | null },
) {
  const revision = await db.quoteRevision.findUniqueOrThrow({
    where: { id: input.revisionId },
    include: { lines: true },
  });
  if (revision.quoteId !== input.quoteId) throw new Error("Revision does not belong to this quotation.");
  const code = await nextOrderCode(db);
  return db.order.create({
    data: {
      code,
      quoteId: input.quoteId,
      revisionId: input.revisionId,
      confirmedAt: input.confirmedAt,
      promisedDeliveryDate: input.promisedDeliveryDate,
      lines: {
        create: revision.lines.map((line) => ({
          quoteLineId: line.id,
          productId: line.productId,
          variantId: line.variantId,
          qty: line.qty,
          unitPricePaise: line.unitPricePaise,
        })),
      },
    },
    include: { lines: true },
  });
}
