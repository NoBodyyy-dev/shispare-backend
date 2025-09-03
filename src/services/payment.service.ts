import {ICreatePayment, IPaymentMethodType, Payment, YooCheckout} from "@a2seven/yoo-checkout";
import paycfg from "../config/payment.config"
import {APIError} from "./error.service";
import bcrypt from "bcrypt";
import {v4 as uuidv4} from 'uuid';

type PaymentData = {
    orderData: {
        orderId: string
        description: string
    };
    paymentData: {
        amount: string;
        type: IPaymentMethodType,

    };
}

export class PaymentService {
    private YooKassa = new YooCheckout({
        shopId: paycfg.SHOP_ID,
        secretKey: paycfg.API_KEY
    })

    createPayment = async (data: PaymentData): Promise<Payment> => {
        console.log(data.paymentData)
        try {
            const createPayment: ICreatePayment = {
                amount: {
                    value: data.paymentData.amount,
                    currency: "RUB"
                },
                payment_method_data: {
                    type: data.paymentData.type
                },
                confirmation: {
                    type: "redirect",
                    return_url: "http://localhost:5173/cart"
                },
                metadata: {
                    orderId: data.orderData.orderId,
                },
                description: data.orderData.description,
                capture: true
            }
            return await this.YooKassa.createPayment(createPayment, bcrypt.hashSync(data.orderData.orderId + Date.now().toString(), 3));
        } catch (e) {
            console.log(e);
            throw APIError.InternalServerError()
        }
    }

    getPaymentDataById = async (id: string) => {
        try {
            const getPaymentData = await this.YooKassa.getPayment(id);
            if (!getPaymentData.id) throw APIError.NotFound({message: "Некорректный id! Не найден"})
            return getPaymentData;
        } catch (e) {
            throw APIError.InternalServerError()
        }
    }

    capturePayment = async (paymentId: string) => {
        try {
            const paymentData = await this.getPaymentDataById(paymentId);
            const IdempotenceKey = uuidv4()
            return await this.YooKassa.capturePayment(paymentId, {
                amount: {
                    value: paymentData.amount.value,
                    currency: "RUB"
                },
            }, IdempotenceKey);
        } catch (e) {
            console.log(e);
            throw APIError.InternalServerError()
        }
    }

    cancelPayment = async (paymentId: string) => {
        try {
            const idempotencyKey = uuidv4();
            return await this.YooKassa.cancelPayment(paymentId, idempotencyKey);
        } catch (e) {
            console.log(e);
            throw APIError.InternalServerError()
        }
    }

    getPaymentUrl = async (paymentId: string): Promise<string | null> => {
        try {
            const payment = await this.getPaymentDataById(paymentId);
            return payment.confirmation?.confirmation_url || null;
        } catch (e) {
            console.log(e);
            return null;
        }
    }
}