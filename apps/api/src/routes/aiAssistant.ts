/**
 * VOJAS AI Assistant Routes
 * =========================
 * POST /api/v1/ai/assistant — conversational, role-aware civic intelligence
 *
 * Endpoints:
 * - POST /api/v1/ai/assistant
 * - GET  /api/v1/ai/tools — list available controlled tools
 */

import { prisma } from '@vojas/db';
import { UserRole, buildUserContext } from '@vojas/shared';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { AIAgentService } from '../services/aiAgent/aiAgentService.js';
import { VOJAS_AI_TOOL_DEFINITIONS } from '../services/aiAgent/aiTools.js';

const router = Router();
const aiService = new AIAgentService(prisma);

/**
 * POST /ai/assistant
 * Conversational inquiries with role awareness, controlled tool execution, and zero hallucinations.
 */
router.post('/assistant', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { message, history, contextProjectId, language } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_QUERY', message: 'Query message must be a non-empty string.' },
      });
      return;
    }

    // Determine caller user context (authenticated or public citizen default)
    const userRole = (req.user?.role as UserRole) || UserRole.CITIZEN;
    const userId = req.user?.userId || 'anonymous-citizen';
    const userPermissions = req.userPermissions;

    const userContext = buildUserContext(userRole, userId, userPermissions);

    // Support caller-provided Gemini key (e.g. from Settings sandbox) or header
    const explicitGeminiKey =
      (req.headers['x-gemini-key'] as string) ||
      (typeof req.body.geminiApiKey === 'string' ? req.body.geminiApiKey : undefined);

    const explicitOpenAiKey =
      (req.headers['x-openai-key'] as string) ||
      (typeof req.body.openaiApiKey === 'string' ? req.body.openaiApiKey : undefined);

    const result = await aiService.processQuery(
      {
        message: message.trim(),
        history,
        contextProjectId: typeof contextProjectId === 'string' ? contextProjectId.trim() : undefined,
        explicitGeminiKey,
        explicitOpenAiKey,
        language: typeof language === 'string' ? language : 'en',
      },
      userContext
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /ai/tools
 * Returns the catalog of registered, controlled tools.
 */
router.get('/tools', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      tools: VOJAS_AI_TOOL_DEFINITIONS,
      enforcement: 'Server-side RBAC enforced on all tool calls. Direct database execution by LLMs is strictly disabled.',
    },
  });
});

export default router;

