import { PaymentService, PaymentResult } from "./payment_service.js";

export interface CheckoutRequest {
  orderId: string;
  amount: number;
  customerId: string;
}

export class CheckoutService {
  private paymentService: PaymentService;

  constructor(paymentService: PaymentService = new PaymentService()) {
    this.paymentService = paymentService;
  }

  public async executeCheckout(request: CheckoutRequest): Promise<PaymentResult> {
    console.log(`Executing checkout for order ${request.orderId}`);
    return await this.paymentService.processTransaction(request.orderId, request.amount);
  }
}
