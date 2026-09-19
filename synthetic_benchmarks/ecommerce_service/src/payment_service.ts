export interface PaymentResult {
  transactionId: string;
  status: "SUCCESS" | "FAILED";
  amount: number;
}

export class PaymentService {
  private apiKey: string;

  constructor(apiKey: string = "test_key") {
    this.apiKey = apiKey;
  }

  /**
   * Processes a financial charge against payment gateway.
   */
  public async processTransaction(orderId: string, amount: number): Promise<PaymentResult> {
    if (amount <= 0) {
      throw new Error("Amount must be greater than zero");
    }
    return {
      transactionId: `tx_${orderId}_${Date.now()}`,
      status: "SUCCESS",
      amount,
    };
  }
}
