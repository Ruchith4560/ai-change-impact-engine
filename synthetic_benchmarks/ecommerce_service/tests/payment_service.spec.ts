import { PaymentService } from "../src/payment_service.js";

describe("PaymentService Unit Tests", () => {
  it("processes a valid payment transaction", async () => {
    const svc = new PaymentService("key_123");
    const res = await svc.processTransaction("order_1", 100);
    expect(res.status).toBe("SUCCESS");
    expect(res.amount).toBe(100);
  });

  it("throws an error for zero or negative amount", async () => {
    const svc = new PaymentService("key_123");
    await expect(svc.processTransaction("order_2", -50)).rejects.toThrow(
      "Amount must be greater than zero"
    );
  });
});
