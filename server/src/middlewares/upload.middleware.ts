import multer from "multer";
import { env } from "../env.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Memory storage: the buffer is streamed straight to S3, so nothing
 * touches the API server's disk.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_UPLOAD_MB * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(ApiError.badRequest("Only PDF uploads are supported"));
    }
    cb(null, true);
  },
});

export const uploadPdf = upload.single("file");
