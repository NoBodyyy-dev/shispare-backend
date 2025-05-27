import {IPaymentGateway} from "../interfaces/payment.interface";

export class PaymentService {
    constructor(private paymentGateway: IPaymentGateway) {}

    async createPayment(
        amount: number,
        currency: string,
        description: string,
        metadata?: Record<string, any>,
        returnUrl?: string
    ) {
        return this.paymentGateway.createPayment(
            amount,
            currency,
            description,
            metadata,
            returnUrl
        );
    }
}