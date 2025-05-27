export interface IPaymentGateway {
    createPayment(
        amount: number,
        currency: string,
        description: string,
        metadata?: Record<string, any>,
        returnUrl?: string
    ): Promise<{
        id: string;
        status: string;
        confirmationUrl?: string;
        metadata?: Record<string, any>;
        amount: { value: string; currency: string };
    }>;
}
