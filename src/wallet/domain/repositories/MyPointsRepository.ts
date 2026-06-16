// Description: Declares repository operations for member points overview and exchange.

import type { PointsExchangeResult, UserPoints } from '../types/wallet.types';

export interface MyPointsRepository {
  getOverview(): Promise<UserPoints>;
  exchangePoints(points: number): Promise<PointsExchangeResult>;
}
