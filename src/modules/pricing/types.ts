export type Tier = "BRONZE" | "SILVER" | "GOLD";

export type EvaluationPolicy = {
  tierCeilingBronzeBps: number;
  tierCeilingSilverBps: number;
  tierCeilingGoldBps: number;
  financeLineExcessBps: number;
  financeBlendedExcessBps: number;
  financeExcessValuePaise: number;
};

export type EvaluationLineInput = {
  key?: number | string;
  description: string;
  categoryId: number;
  categoryName: string;
  categoryCeilingBps: number;
  qty: number;
  unitPricePaise: number;
  unitCostPaise: number;
  taxBps: number;
  lineDiscountBps: number;
};

export type EvaluationInput = {
  customerTier: Tier;
  policy: EvaluationPolicy;
  orderDiscountBps: number;
  lines: EvaluationLineInput[];
};

export type EvaluatedLine = EvaluationLineInput & {
  basePaise: number;
  effectiveDiscountBps: number;
  allowedDiscountBps: number;
  excessBps: number;
  excessValuePaise: number;
  netPaise: number;
  taxPaise: number;
  costPaise: number;
};

export type EvaluationResult = {
  lines: EvaluatedLine[];
  subtotalPaise: number;
  discountPaise: number;
  taxPaise: number;
  totalPaise: number;
  costPaise: number;
  marginPaise: number;
  marginBps: number;
  maxLineExcessBps: number;
  blendedExcessBps: number;
  excessValuePaise: number;
  requiredLevel: "NONE" | "MANAGER" | "FINANCE";
  reasons: string[];
  detailReasons: string[];
};
