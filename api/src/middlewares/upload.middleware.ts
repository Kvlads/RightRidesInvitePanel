// src/api/middlewares/upload.middleware.ts
import multer from 'multer';
import path from 'path';

const storage = multer.memoryStorage();

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // Увеличим лимит приема до 15МБ для исходников с iPhone
  },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp|heic/; // Добавим heic на всякий случай
    // mimetype у Apple иногда бывает странным, проверяем и расширение
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (extname || file.mimetype.startsWith('image/')) {
      return cb(null, true);
    }
    cb(new Error('Разрешены только изображения'));
  },
});