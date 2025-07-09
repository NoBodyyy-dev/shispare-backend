import axios from 'axios';
import config from "../config/config";
import {APIError} from './error.service';

interface ValidationResult {
    fullName: string;
    legalName?: string;
    raw: any;
}

export class CompanyValidationService {
    async validate(type: 'ЮЛ' | 'ИП', legalId: string): Promise<ValidationResult> {
        this.validateINN(legalId, type);

        let response: any;
        try {
            response = await axios.get(
                `https://api-fns.ru/api/egr?req=${legalId}&key=${config.FNS_API_KEY}`,
                { timeout: 10000 }
            );
        } catch (e) {
            throw APIError.BadRequest({
                message: 'Не удалось проверить компанию! Попробуйте позже',
                code: 'FNS_SERVICE_UNAVAILABLE',
                isPublic: true
            });
        }

        if (response.status !== 200 || !response.data?.items) {
            throw APIError.BadRequest({
                message: 'Не удалось проверить компанию',
                code: 'FNS_INVALID_RESPONSE',
                isPublic: true
            });
        }

        const companyData = response.data.items[0]?.[type];
        if (!companyData) {
            throw APIError.NotFound({
                message: 'Компания не найдена в реестре',
                code: 'COMPANY_NOT_FOUND',
                isPublic: true
            });
        }

        if (companyData["Статус"]?.toLowerCase() !== 'действующее') {
            throw APIError.BadRequest({
                message: 'Компания недействительна (ликвидирована или банкрот)',
                code: 'COMPANY_INACTIVE',
                isPublic: true
            });
        }

        try {
            return {
                fullName: type === 'ИП'
                    ? companyData["ФИОПолн"]
                    : companyData["Руководитель"]?.["ФИОПолн"] ?? 'Не указано',
                legalName: type === 'ЮЛ' ? companyData["НаимСокрЮЛ"] : undefined,
                raw: companyData
            };
        } catch (e) {
            throw APIError.InternalServerError({
                message: 'Ошибка обработки данных компании',
                code: 'COMPANY_DATA_PROCESSING_ERROR',
                isPublic: false
            });
        }
    }

    private validateINN(inn: string, type: 'ЮЛ' | 'ИП'): void {
        const innRegex = type === 'ЮЛ' ? /^\d{10}$/ : /^\d{12}$/;
        if (!innRegex.test(inn)) {
            throw APIError.BadRequest({
                message: `Некорректный ИНН для ${type}`,
                code: 'INVALID_INN_LENGTH'
            });
        }

        const innDigits = inn.split('').map(Number);

        if (type === 'ЮЛ') {2
            const weights = [2, 4, 10, 3, 5, 9, 4, 6, 8];
            const controlSum = innDigits.slice(0, 9).reduce(
                (sum, digit, i) => sum + digit * weights[i], 0
            );
            const controlNumber = (controlSum % 11) % 10;

            if (controlNumber !== innDigits[9]) {
                throw APIError.BadRequest({
                    message: 'Некорректная контрольная сумма ИНН юридического лица',
                    code: 'INVALID_INN_CHECKSUM'
                });
            }
        } else {
            const weights1 = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
            const controlSum1 = innDigits.slice(0, 10).reduce(
                (sum, digit, i) => sum + digit * weights1[i], 0
            );
            const controlNumber1 = (controlSum1 % 11) % 10;

            const weights2 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
            const controlSum2 = innDigits.slice(0, 11).reduce(
                (sum, digit, i) => sum + digit * weights2[i], 0
            );
            const controlNumber2 = (controlSum2 % 11) % 10;

            if (controlNumber1 !== innDigits[10] || controlNumber2 !== innDigits[11]) {
                throw APIError.BadRequest({
                    message: 'Некорректная контрольная сумма ИНН индивидуального предпринимателя',
                    code: 'INVALID_INN_CHECKSUM'
                });
            }
        }
    }
}