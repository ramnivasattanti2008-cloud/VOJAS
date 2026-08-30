import jwt from "jsonwebtoken";
import { config } from "../config/index.js";
import type { Role } from "@prisma/client";

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
}

type JwtExpiresIn = "7d" | "24h" | "1h" | "30m";

const VALID_EXPIRY: Record<string, JwtExpiresIn> = {
  "7d": "7d",
  "24h": "24h",
  "1h": "1h",
  "30m": "30m",
};

export const tokenService = {
  sign(payload: TokenPayload): string {
    const expiresIn = VALID_EXPIRY[config.jwt.expiresIn] ?? "7d";
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn,
      algorithm: config.jwt.algorithm,
    });
  },

  verify(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, config.jwt.secret, {
        algorithms: [config.jwt.algorithm],
      }) as TokenPayload;
      return decoded;
    } catch {
      throw new Error("Invalid or expired token");
    }
  },
};
