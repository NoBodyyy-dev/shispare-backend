import {UserService} from './user.service';
import {SessionService} from './session.service';
import {TokenService} from './token.service';
import {CompanyValidationService} from './validator.service';
import {APIError} from './error.service';
import {SenderService} from './sender.service';
import {CartService} from "./cart.service";

interface RegisterData {
    type: 'IND' | 'LGL';
    legalType?: 'ЮЛ' | 'ИП';
    fullName?: string;
    legalId?: string;
    email: string;
    password: string;
}

export class AuthService {
    private userService: UserService;
    private sessionService: SessionService;
    private tokenService: TokenService;
    private companyValidator: CompanyValidationService;
    private senderService: SenderService;
    private cartService: CartService;

    constructor() {
        this.userService = new UserService();
        this.sessionService = new SessionService();
        this.tokenService = new TokenService();
        this.companyValidator = new CompanyValidationService();
        this.senderService = new SenderService();
        this.cartService = new CartService();
    }

    async register(data: RegisterData) {
        this.validateRegistrationData(data);

        if (await this.userService.userExists(data.email))
            throw APIError.BadRequest({message: 'Пользователь с таким email уже существует'});

        const user = await this.createUser(data);

        const sessionToken = this.tokenService.generateSessionToken({
            id: user.id,
            email: user.email,
            role: user.role
        });

        const code: string = this.sessionService.generateCode();
        await Promise.all([
            this.sessionService.createSession({
                userId: user.id,
                token: sessionToken,
                code
            }),
            this.senderService.sendVerificationEmail({email: data.email, code: code}),
            this.cartService.initialCart(user.id)
        ])

        return {sessionToken};
    }

    private validateRegistrationData(data: any) {
        if (!data.email || !data.password) {
            throw APIError.BadRequest({message: 'Адрес электронной почты и пароль обязательны'});
        }

        if (data.type === 'LGL' && (!data.legalType || !data.legalId)) {
            throw APIError.BadRequest({message: 'Для ЮЛ/ИП укажите тип и ИНН'});
        }
    }

    private async createUser(data: RegisterData) {
        if (data.type === 'IND') {
            return this.userService.createIndividualUser({
                fullName: data.fullName!,
                email: data.email,
                password: data.password
            });
        } else {
            const companyInfo = await this.companyValidator.validate(data.legalType!, data.legalId!);
            return this.userService.createLegalUser({
                email: data.email,
                password: data.password,
                legalType: data.legalType!,
                legalId: data.legalId!,
                companyInfo
            });
        }
    }

    async login(data: { email: string; password: string }) {
        const user = await this.userService.verifyCredentials(data.email, data.password);
        if (!user) return {success: false}
        const sessionToken = this.tokenService.generateSessionToken({
            id: user.id,
            email: user.email,
            role: user.role
        });

        const code = this.sessionService.generateCode();
        await this.sessionService.createSession({
            userId: user.id,
            token: sessionToken,
            code
        });

        await this.senderService.sendVerificationEmail({email: user.email, code});

        return {sessionToken, success: true};
    }

    async verifyCode(sessionToken: string, code: string) {
        console.log(sessionToken);
        const session = await this.sessionService.verifyCode(sessionToken, code);
        const tokens = this.tokenService.generateTokens({
            id: session.user._id.toString(),
            email: session.user.email,
            role: session.user.role
        }, true);

        await this.tokenService.saveToken(session.user._id.toString(), tokens.refreshToken!);
        await this.sessionService.deleteSession(session.id);

        return tokens;
    }

    async refreshToken(refreshToken: string) {
        const tokenData = await this.tokenService.validateToken(refreshToken, "R");
        if (!tokenData) throw APIError.Unauthorized();
        const user = await this.userService.getUserById(tokenData!.id!);
        const tokens = this.tokenService.generateTokens({
            id: user.id,
            email: user.email,
            role: user.role
        }, true);

        await this.tokenService.saveToken(user.id, tokens.refreshToken!);
        console.log("end")
        return tokens;
    }

    async logout(refreshToken: string) {
        await this.tokenService.removeToken(refreshToken);
    }
}