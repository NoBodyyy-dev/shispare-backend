import {Request, Response, NextFunction} from "express";
import {ChatService} from "../services/chat.service";
import {CloudService} from "../services/cloud.service";
import {APIError} from "../services/error.service";
import {SocketService} from "../services/socket.service";

export class ChatController {
    private cloudService = new CloudService();
    private chatService: ChatService;

    constructor(socketService: SocketService) {
        this.chatService = new ChatService(socketService);
    }

    uploadFile = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const file = req.file;
            if (!file) {
                throw APIError.BadRequest({message: "Файл не загружен"});
            }

            // Имя файла уже должно быть декодировано в middleware
            // Но на всякий случай проверяем еще раз
            let filename = file.originalname;
            try {
                // Дополнительная проверка и декодирование, если нужно
                const decoded = Buffer.from(filename, 'latin1').toString('utf8');
                const hasCyrillic = /[\u0400-\u04FF]/.test(decoded);
                const hasNonAscii = /[^\x00-\x7F]/.test(decoded);
                
                if (decoded !== filename && (hasCyrillic || hasNonAscii)) {
                    filename = decoded;
                }
            } catch (e) {
                // Если декодирование не удалось, используем оригинальное имя
            }

            // Определяем тип файла
            const mimeType = file.mimetype;
            let fileType: 'image' | 'video' | 'file' = 'file';
            
            if (mimeType.startsWith('image/')) {
                fileType = 'image';
            } else if (mimeType.startsWith('video/')) {
                fileType = 'video';
            }

            // Загружаем файл в Cloudinary
            const uploadResult = await this.cloudService.uploadBuffer(file.buffer, {
                folder: 'chat',
                resource_type: fileType === 'image' ? 'image' : fileType === 'video' ? 'video' : 'raw',
            });

            res.status(200).json({
                success: true,
                attachment: {
                    type: fileType,
                    url: uploadResult.secure_url || uploadResult.url,
                    filename: filename,
                }
            });
        } catch (e) {
            next(e);
        }
    };
}

