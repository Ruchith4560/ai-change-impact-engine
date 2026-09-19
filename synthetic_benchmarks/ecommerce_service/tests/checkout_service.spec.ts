import { CheckoutService } from "../src/checkout_service.js";
import { PaymentService } from "../src/payment_service.js";

describe("CheckoutService Integration Tests", () => {
  it("executes checkout successfully through payment service", async () => {
    const paymentSvc = new PaymentService("test_key");
    const checkoutSvc = new CheckoutService(paymentSvc);

    const result = await checkoutSvc.executeCheckout({
      orderId: "ord_99",
      amount: 250,
      customerId: "cust_1",
    });

    expect(result.status).toBe("SUCCESS");
    expect(result.amount).toBe(250);
  });
});
