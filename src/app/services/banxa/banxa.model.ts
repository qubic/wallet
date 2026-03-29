export interface BanxaOption {
  code: string;
  name: string;
}

export interface BanxaPaymentMethod {
  id: string;
  name: string;
  code?: string;
  description?: string;
}

export interface BanxaQuoteRequest {
  fiatCode: string;
  fiatAmount: number;
  coinCode: string;
  blockchain: string;
  walletAddress: string;
  paymentMethodId: string;
}

export interface BanxaQuote {
  fiatCode: string;
  fiatAmount: number;
  coinCode: string;
  coinAmount: number;
  price: number;
  networkFee: number;
  feeAmount: number;
  paymentMethodId: string;
  paymentMethodName?: string;
  blockchain: string;
  walletAddress: string;
}

export interface BanxaBuyOrderRequest extends BanxaQuoteRequest {
  returnUrl: string;
  accountReference?: string;
}

export interface BanxaBuyOrderResult {
  orderId: string;
  checkoutUrl: string;
}

export interface BanxaOptionsResponse<T> {
  data: T[];
}

export interface BanxaQuoteResponse {
  data: BanxaQuote;
}

export interface BanxaBuyOrderResponse {
  data: BanxaBuyOrderResult;
}
