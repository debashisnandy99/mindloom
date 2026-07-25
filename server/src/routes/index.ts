import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import authRoutes from "./auth.routes.js";
import notebookRoutes from "./notebook.routes.js";
import { sourceRouter } from "./source.routes.js";

const router = Router();

router.use("/auth", authRoutes);

// Every resource below belongs to a signed-in user.
router.use("/notebooks", requireAuth, notebookRoutes);
router.use("/sources", requireAuth, sourceRouter);

export default router;
