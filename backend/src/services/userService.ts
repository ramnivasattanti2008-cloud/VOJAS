import bcrypt from "bcrypt";
import { prisma } from "../config/database.js";
import { config } from "../config/index.js";
import { AppError } from "../middleware/errorHandler.js";
import type { Role } from "@prisma/client";

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  role?: Role;
}

export interface UserOutput {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: Date;
}

export const userService = {
  async create(input: CreateUserInput): Promise<UserOutput> {
    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (existing) {
      throw new AppError(409, "CONFLICT", "Email already registered");
    }

    const hashed = await bcrypt.hash(input.password, config.bcrypt.rounds);
    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase().trim(),
        password: hashed,
        name: input.name.trim(),
        role: input.role ?? "VIEWER",
      },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    };
  },

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  },

  async findById(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    } as UserOutput;
  },

  async verifyPassword(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  },
};
