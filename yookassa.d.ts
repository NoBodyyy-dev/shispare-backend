declare module 'yookassa' {
    interface YooKassaConfig {
        shopId: string;
        secretKey: string;
    }

    interface PaymentAmount {
        value: string;
        currency: string;
    }

    interface PaymentConfirmation {
        type: string;
        return_url: string;
        confirmation_url?: string;
    }

    interface PaymentMethodData {
        type: string;
    }

    interface Payment {
        id: string;
        status: string;
        amount: PaymentAmount;
        confirmation?: PaymentConfirmation;
        description?: string;
        metadata?: any;
    }

    class YooKassa {
        constructor(config: YooKassaConfig);
        createPayment(
            paymentData: {
                amount: PaymentAmount;
                payment_method_data?: PaymentMethodData;
                confirmation?: PaymentConfirmation;
                description?: string;
                capture?: boolean;
                metadata?: any;
            },
            idempotenceKey?: string
        ): Promise<Payment>;
    }

    export = YooKassa;
}