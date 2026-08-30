import { Request, Response } from "express";
import { z } from "zod";
import { successResponse, errorResponse } from "../utils/response.js";
import { userService } from "../services/userService.js";
import { tokenService } from "../services/tokenService.js";
import { AppError } from "../middleware/errorHandler.js";

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
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
      return res.status(401).json(
        errorResponse("UNAUTHORIZED", "Invalid email or password")
      );
    }

    const valid = await userService.verifyPassword(password, user.password);
    if (!valid) {
      return res.status(401).json(
        errorResponse("UNAUTHORIZED", "Invalid email or password")
      );
    }

    const token = tokenService.sign({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

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

  async logout(_req: Request, res: Response) {
    // JWT is stateless, so logout is client-side only
    // Here we just return a success response
    res.json(successResponse({ message: "Logged out successfully" }));
  },
};
