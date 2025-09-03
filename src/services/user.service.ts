import bcrypt from 'bcrypt';
import {User} from '../models/User.model';
import {APIError} from './error.service';

export class UserService {
    async userExists(email: string): Promise<boolean> {
        return !!(await User.findOne({email}));
    }

    async createIndividualUser(data: {
        fullName: string;
        email: string;
        password: string;
    }) {
        const hashedPassword = bcrypt.hashSync(data.password, 10);
        const user = await User.create({
            fullName: data.fullName,
            email: data.email,
            password: hashedPassword,
            type: 'IND',
            personalKey: crypto.randomUUID(),
        });
        return this.mapUser(user);
    }

    async createLegalUser(data: {
        email: string;
        password: string;
        legalType: 'ЮЛ' | 'ИП';
        legalId: string;
        companyInfo: any;
    }) {
        const hashedPassword = bcrypt.hashSync(data.password, 10);
        const user = await User.create({
            email: data.email,
            password: hashedPassword,
            type: 'LGL',
            legalType: data.legalType,
            legalId: data.legalId,
            fullName: data.companyInfo.fullName,
            legalName: data.legalType === 'ЮЛ' ? data.companyInfo.legalName : undefined,
            companyData: data.companyInfo.raw
        });
        return this.mapUser(user);
    }

    async verifyCredentials(email: string, password: string) {
        const user = await User.findOne({email});
        if (!user)
            throw APIError.NotFound({message: 'Пользователь не найден'});

        console.log(password);
        console.log(user.password);
        const isValid = bcrypt.compareSync(password, user.password);
        if (!isValid) {
            throw APIError.BadRequest({message: 'Неверный пароль'});
        }

        return this.mapUser(user);
    }

    async getUserById(id: string) {
        const user = await User.findById(id).select("-password");
        if (!user)
            throw APIError.NotFound({message: 'Пользователь не найден'});

        return user;
    }

    private mapUser(user: any) {
        return {
            id: user._id.toString(),
            email: user.email,
            role: user.role,
            fullName: user.fullName
        };
    }

    async updateUser(_id: string, body: { fullName: string }) {
        let user;
        try {
            user = await this.getUserById(_id);
        } catch (e) {
            throw e
        }
        user.fullName = body.fullName;
        await user.save();
        return user;
    }

    async getAllUsers() {
        return User.find().select("-password");
    }
}