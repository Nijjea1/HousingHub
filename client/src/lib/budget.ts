/** The rent calculator on the guides page. */

/** A common rule of thumb: keep rent and utilities under 30% of what you have each month. */
export const HOUSING_SHARE_GUIDE = 0.3;

export interface BudgetInput {
  income: number;
  rent: number;
  utilities: number;
  otherExpenses: number;
}

export interface Budget {
  housing: number;
  /** Rent and utilities as a share of income; null when there is no income to divide by. */
  share: number | null;
  left: number;
  /** The most rent plus utilities can be and stay within the guide. */
  guideMax: number;
  overGuide: boolean;
}

export function budget({ income, rent, utilities, otherExpenses }: BudgetInput): Budget {
  const housing = rent + utilities;
  const share = income > 0 ? housing / income : null;
  return {
    housing,
    share,
    left: income - housing - otherExpenses,
    guideMax: Math.floor(income * HOUSING_SHARE_GUIDE),
    overGuide: share === null ? housing > 0 : share > HOUSING_SHARE_GUIDE,
  };
}
