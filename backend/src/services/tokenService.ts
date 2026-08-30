import jwt from "jsonwebtoken";
import { config } from "../config/index.js";
import type { Role } from "@prisma/client";

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
}

export const tokenService = {
  sign(payload: TokenPayload): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn as any,
    });
  },

  verify(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as TokenPayload;
      return decoded;
    } catch {
      throw new Error("Invalid or expired token");
    }
  },
};
