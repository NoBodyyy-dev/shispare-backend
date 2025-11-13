import {Router} from "express";
import {ChatController} from "../controllers/chat.controller";
import {authMiddleware} from "../middleware/auth.middleware";
import multer from "multer";
import {socketService} from "../app";

export const chatRouter = Router();
const chatController = new ChatController(socketService);

// Middleware для декодирования имени файла с кириллицей
// Multer по умолчанию обрабатывает имена файлов как latin1, а не UTF-8
const decodeFilename = (req: any, res: any, next: any) => {
    if (req.file && req.file.originalname) {
        try {
            const originalName = req.file.originalname;
            // Пытаемся декодировать имя файла из latin1 в UTF-8
            // Это стандартная проблема multer - он интерпретирует UTF-8 как latin1
            try {
                // Создаем буфер из строки, интерпретируя её как latin1
                const buffer = Buffer.from(originalName, 'latin1');
                // Декодируем буфер как UTF-8
                const decoded = buffer.toString('utf8');
                
                // Проверяем, содержит ли декодированное имя кириллицу
                const hasCyrillic = /[\u0400-\u04FF]/.test(decoded);
                // Проверяем, содержит ли другие не-ASCII символы
                const hasNonAscii = /[^\x00-\x7F]/.test(decoded);
                
                // Если декодированное имя отличается и содержит валидные UTF-8 символы
                if (decoded !== originalName && (hasCyrillic || hasNonAscii)) {
                    req.file.originalname = decoded;
                }
            } catch (e) {
                // Если декодирование не удалось, оставляем как есть
                console.warn('Failed to decode filename:', e);
            }
        } catch (e) {
            // Игнорируем ошибки декодирования
        }
    }
    next();
};

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (req, file, cb) => {
        // Принимаем все файлы
        cb(null, true);
    },
});

// Загрузка файла для чата
chatRouter.post("/upload", [authMiddleware, upload.single("file"), decodeFilename], chatController.uploadFile);

