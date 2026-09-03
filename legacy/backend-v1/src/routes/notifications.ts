import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate } from "../middleware/auth.js";
import {
  listNotifications,
  unreadCount,
  markRead,
  markAllRead,
  deleteNotification,
} from "../controllers/notificationController.js";

const router = Router();

// All notification routes require auth
router.use(authenticate);

router.get("/", asyncHandler(listNotifications));
router.get("/unread-count", asyncHandler(unreadCount));
router.post("/read", asyncHandler(markRead));
router.post("/read-all", asyncHandler(markAllRead));
router.delete("/:id", asyncHandler(deleteNotification));

export default router;
