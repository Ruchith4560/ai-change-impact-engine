import { CheckoutService, CheckoutRequest } from "./checkout_service.js";

export class OrderController {
  private checkoutService: CheckoutService;

  constructor(checkoutService: CheckoutService = new CheckoutService()) {
    this.checkoutService = checkoutService;
  }

  public async handlePostOrder(req: { body: CheckoutRequest }) {
    try {
      const result = await this.checkoutService.executeCheckout(req.body);
      return { status: 200, data: result };
    } catch (err: unknown) {
      return { status: 500, error: err instanceof Error ? err.message : "Error" };
    }
  }
}
