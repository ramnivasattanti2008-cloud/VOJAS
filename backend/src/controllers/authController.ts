import { Request, Response } from "express";
import { z } from "zod";
import { successResponse, errorResponse } from "../utils/response.js";
import { userService } from "../services/userService.js";
import { tokenService } from "../services/tokenService.js";
import { auditLog } from "../services/auditLogService.js";
import { AppError } from "../middleware/errorHandler.js";
import { config } from "../config/index.js";

/**
 * Set the auth token as a secure httpOnly cookie (XSS-safe).
 * The token is still returned in the JSON body for non-browser clients
 * (CLI tools, mobile apps) that prefer the Authorization header flow.
 */
function setAuthCookie(res: Response, token: string) {
  res.cookie(config.cookie.name, token, {
    httpOnly: config.cookie.httpOnly,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    maxAge: config.cookie.maxAgeMs,
    path: "/",
  });
}

function clearAuthCookie(res: Response) {
  res.clearCookie(config.cookie.name, {
    httpOnly: config.cookie.httpOnly,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: "/",
  });
}

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z
    .string()
    .min(10, "Password must be at least 10 characters")
    .max(100)
    .refine(
      (p) => /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p),
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authController = {
  async register(req: Request, res: Response) {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Invalid registration data", parsed.error.issues)
      );
    }

    const user = await userService.create(parsed.data);
    const token = tokenService.sign({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    await auditLog({
      userId: user.id,
      action: "REGISTER",
      resource: "User",
      resourceId: user.id,
      details: { email: user.email, role: user.role },
      req,
    });

    setAuthCookie(res, token);

    res.status(201).json(
      successResponse({ user, token })
    );
  },

  async login(req: Request, res: Response) {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Invalid login data", parsed.error.issues)
      );
    }

    const { email, password } = parsed.data;
    const user = await userService.findByEmail(email);

    if (!user) {
      await auditLog({
        userId: "unknown",
        action: "LOGIN_FAILED",
        resource: "Auth",
        resourceId: email,
        details: { reason: "user_not_found", email },
        req,
      });
      return res.status(401).json(
        errorResponse("UNAUTHORIZED", "Invalid email or password")
      );
    }

    const valid = await userService.verifyPassword(password, user.password);
    if (!valid) {
      await auditLog({
        userId: user.id,
        action: "LOGIN_FAILED",
        resource: "Auth",
        resourceId: user.id,
        details: { reason: "bad_password", email },
        req,
      });
      return res.status(401).json(
        errorResponse("UNAUTHORIZED", "Invalid email or password")
      );
    }

    const token = tokenService.sign({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    await auditLog({
      userId: user.id,
      action: "LOGIN",
      resource: "Auth",
      resourceId: user.id,
      details: { email },
      req,
    });

    setAuthCookie(res, token);

    res.json(
      successResponse({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt,
        },
        token,
      })
    );
  },

  async me(req: Request, res: Response) {
    // req.user is set by auth middleware
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json(
        errorResponse("UNAUTHORIZED", "Not authenticated")
      );
    }

    const user = await userService.findById(userId);
    if (!user) {
      return res.status(404).json(
        errorResponse("NOT_FOUND", "User not found")
      );
    }

    res.json(successResponse({ user }));
  },

  async logout(req: Request, res: Response) {
    const userId = (req as any).user?.userId;
    if (userId) {
      await auditLog({
        userId,
        action: "LOGOUT",
        resource: "Auth",
        resourceId: userId,
        req,
      });
    }
    clearAuthCookie(res);
    res.json(successResponse({ message: "Logged out successfully" }));
  },
};
