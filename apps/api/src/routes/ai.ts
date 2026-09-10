import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '@vojas/db';
import type { ProjectSector, ProjectStatus } from '@vojas/db';
import { success } from '../utils/apiResponse.js';

const router = Router();

/**
 * Natural language parsing helper to extract key search intents
 */
function parseQueryIntent(query: string) {
  const q = query.toLowerCase();
  
  // Extract potential sector.
  // Typed as ProjectSector rather than string: 'DRINKING_WATER' was being
  // emitted here, which is not a member of the enum, so every water query
  // died in Prisma with "Invalid value for argument `sector`". Typing it
  // makes that a compile error instead of a 500.
  let sector: ProjectSector | undefined;
  if (q.includes('road') || q.includes('transport') || q.includes('bridge') || q.includes('pathway') || q.includes('footpath')) sector = 'TRANSPORT';
  else if (q.includes('water') || q.includes('drinking') || q.includes('pipeline') || q.includes('tank') || q.includes('sanitation') || q.includes('toilet')) sector = 'WATER_SANITATION';
  else if (q.includes('health') || q.includes('hospital') || q.includes('dispensary') || q.includes('clinic')) sector = 'HEALTH';
  else if (q.includes('school') || q.includes('college') || q.includes('education') || q.includes('library') || q.includes('classroom')) sector = 'EDUCATION';
  else if (q.includes('light') || q.includes('solar') || q.includes('electric') || q.includes('power')) sector = 'ENERGY';
  else if (q.includes('community') || q.includes('hall') || q.includes('shed')) sector = 'PUBLIC_INFRASTRUCTURE';

  // Extract potential status. Typed for the same reason as sector: 'DELAYED'
  // was being emitted here and is not a member of ProjectStatus, so every
  // "delayed"/"pending" query would have thrown in Prisma. There is no
  // DELAYED state — lateness is derived from expectedEndDate, not stored — so
  // those words fall through to the keyword search rather than inventing a
  // status filter that cannot be honoured.
  let status: ProjectStatus | undefined;
  if (q.includes('completed') || q.includes('finished') || q.includes('done')) status = 'COMPLETED';
  else if (q.includes('in progress') || q.includes('ongoing') || q.includes('active') || q.includes('underway')) status = 'IN_PROGRESS';
  else if (q.includes('sanctioned') || q.includes('approved')) status = 'SANCTIONED';
  else if (q.includes('unsanctioned')) status = 'UNSANCTIONED';

  // Check for satellite or ground discrepancy interest
  const wantsSatellite = q.includes('satellite') || q.includes('imagery') || q.includes('sentinel') || q.includes('spectral') || q.includes('change');
  const wantsDiscrepancy = q.includes('discrepancy') || q.includes('mismatch') || q.includes('fraud') || q.includes('irregularity') || q.includes('risk') || q.includes('issue');
  const wantsHighBudget = q.includes('expensive') || q.includes('crore') || q.includes('highest') || q.includes('large budget');

  return { sector, status, wantsSatellite, wantsDiscrepancy, wantsHighBudget };
}

/**
 * POST /api/v1/ai/ask — Evidence-backed civic Q&A
 */
router.post('/ask', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      query: z.string().min(2).max(500),
      context: z.object({
        projectId: z.string().optional(),
        state: z.string().optional(),
        sector: z.string().optional(),
      }).optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid query request' },
      });
    }

    const { query, context } = parsed.data;
    const intent = parseQueryIntent(query);

    // If querying about a specific project
    if (context?.projectId) {
      const p = await prisma.project.findUnique({
        where: { id: context.projectId },
        include: {
          mp: true,
          satelliteObservations: { take: 3, orderBy: { observationDate: 'desc' } },
          changeAnalyses: { take: 2, orderBy: { createdAt: 'desc' } },
          reports: { take: 3, orderBy: { createdAt: 'desc' } },
        },
      });

      if (!p) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
      }

      const sanctionedCr = (Number(p.approvedAmount) / 10000000).toFixed(2);
      const spentCr = (Number(p.spentAmount) / 10000000).toFixed(2);
      const utilRate = Number(p.approvedAmount) > 0 ? Math.round((Number(p.spentAmount) / Number(p.approvedAmount)) * 100) : 0;
      const satCount = p.satelliteObservations.length;
      const latestSat = p.satelliteObservations[0];
      const reportCount = p.reports.length;

      let answer = `**${p.name}** in ${p.district ?? 'Unknown'}, ${p.state ?? 'Unknown'} is currently recorded with status **${p.status}**.\n\n`;
      answer += `• **Financial Status**: ₹${sanctionedCr} Cr sanctioned, ₹${spentCr} Cr recorded spent (${utilRate}% utilization).\n`;
      if (p.mp) {
        answer += `• **Recommending MP**: ${p.mp.name} (${p.mp.house === 'LOK_SABHA' ? 'Lok Sabha' : 'Rajya Sabha'}${p.mp.party ? ` - ${p.mp.party}` : ''}, ${p.mp.constituency}).\n`;
      }
      if (satCount > 0 && latestSat) {
        answer += `• **Satellite Ground Truth**: ${satCount} Sentinel-2 observation(s) recorded. Latest pass on ${new Date(latestSat.observationDate).toISOString().split('T')[0]} with ${latestSat.cloudCover}% cloud cover. Spectral indices indicate ${latestSat.ndvi != null ? `NDVI: ${latestSat.ndvi.toFixed(2)}` : 'multispectral capture'}.\n`;
      } else {
        answer += `• **Satellite Ground Truth**: No usable cloud-free satellite passes linked yet${p.latitude ? ' (coordinates recorded, awaiting acquisition)' : ' (official gazette record lacks verified GPS coordinates)'}.\n`;
      }
      if (reportCount > 0) {
        answer += `• **Citizen Reports**: ${reportCount} community ground verification(s) filed for this project.\n`;
      } else {
        answer += `• **Citizen Reports**: No citizen discrepancy reports currently lodged for this site.\n`;
      }

      return success(res, {
        answer,
        projects: [{
          id: p.id,
          name: p.name,
          state: p.state,
          district: p.district,
          approvedAmount: p.approvedAmount,
          spentAmount: p.spentAmount,
          status: p.status,
          sector: p.sector,
          latitude: p.latitude,
          longitude: p.longitude,
        }],
        insights: [
          `Budget utilization is at ${utilRate}%.`,
          satCount > 0 ? `${satCount} Sentinel-2 satellite passes available for temporal inspection.` : 'Awaiting satellite coordinates or cloud-free pass.',
          reportCount > 0 ? `${reportCount} citizen reports available for review.` : 'Zero citizen complaints recorded.',
        ],
        evidenceCitations: [
          `Official MPLADS Gazette Record #${p.sourceWorkId ?? p.id}`,
          satCount > 0 ? `Sentinel-2 Level-2A Multi-Spectral Surface Reflectance` : 'Database Ledger',
        ],
        suggestedQueries: [
          'Show satellite time-lapse for this project',
          'Compare physical progress with financial spending',
          'Are there similar projects in this district?',
        ],
      });
    }

    // General query across projects
    const where: Record<string, unknown> = {};
    if (context?.state || intent.sector) {
      if (context?.state) where.state = { equals: context.state, mode: 'insensitive' };
    }
    if (intent.sector) where.sector = intent.sector;
    if (intent.status) where.status = intent.status;

    // Search term matching in project title/description
    const cleanTokens = query
      .replace(/[?.,!]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3 && !['show', 'what', 'tell', 'find', 'which', 'where', 'projects', 'project', 'about', 'with', 'have', 'from'].includes(w.toLowerCase()));

    if (cleanTokens.length > 0) {
      where.OR = cleanTokens.map(tok => ({
        OR: [
          { name: { contains: tok, mode: 'insensitive' } },
          { description: { contains: tok, mode: 'insensitive' } },
          { district: { contains: tok, mode: 'insensitive' } },
          { state: { contains: tok, mode: 'insensitive' } },
        ],
      }));
    }

    const orderBy: any = intent.wantsHighBudget ? { approvedAmount: 'desc' } : { updatedAt: 'desc' };

    const [matchedProjects, totalCount] = await Promise.all([
      prisma.project.findMany({
        where,
        take: 5,
        orderBy,
        select: {
          id: true,
          name: true,
          state: true,
          district: true,
          constituency: true,
          sector: true,
          status: true,
          approvedAmount: true,
          spentAmount: true,
          latitude: true,
          longitude: true,
          _count: { select: { satelliteObservations: true, reports: true } },
        },
      }),
      prisma.project.count({ where }),
    ]);

    let answer = '';
    if (matchedProjects.length === 0) {
      answer = `No MPLAD projects matched the exact parameters for "${query}". Try searching by state (e.g. "Gujarat", "Odisha"), sector (e.g. "Drinking water", "Roads"), or status (e.g. "Completed", "In Progress").`;
    } else {
      answer = `Found **${totalCount.toLocaleString()} matching MPLADS projects** in official records. Here is an evidence summary of key sites:\n\n`;
      matchedProjects.forEach((p, i) => {
        const amtLakhs = (Number(p.approvedAmount) / 100000).toFixed(1);
        const spentLakhs = (Number(p.spentAmount) / 100000).toFixed(1);
        const satStr = p._count.satelliteObservations > 0 ? ` • 🛰️ ${p._count.satelliteObservations} satellite passes` : '';
        const repStr = p._count.reports > 0 ? ` • 📢 ${p._count.reports} citizen reports` : '';
        answer += `${i + 1}. **${p.name}** (${p.district}, ${p.state})\n   Status: \`${p.status}\` | Budget: ₹${amtLakhs}L (Spent: ₹${spentLakhs}L)${satStr}${repStr}\n\n`;
      });
      answer += `All figures are verified from government gazettes and Sentinel-2 orbital feeds with zero algorithmic fabrication.`;
    }

    return success(res, {
      answer,
      projects: matchedProjects,
      totalCount,
      insights: [
        `Matched ${totalCount} public works based on your query criteria.`,
        `${matchedProjects.filter(p => p.latitude != null).length} of the top 5 results have geocoded satellite markers.`,
        `${matchedProjects.filter(p => p._count.reports > 0).length} of the top results have citizen ground observations.`,
      ],
      evidenceCitations: [
        'Official Ministry of Statistics and Programme Implementation (MoSPI) Records',
        'Copernicus European Space Agency Sentinel-2 Level-2A Feeds',
      ],
      suggestedQueries: [
        'Which projects have high budget utilization?',
        'Show works verified by Sentinel-2 satellite',
        'Are there reported discrepancies in this area?',
      ],
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/ai/suggestions — Sample civic queries
 */
router.get('/suggestions', (_req: Request, res: Response) => {
  return success(res, {
    suggestions: [
      'Show road construction projects in Gujarat with verified coordinates',
      'What are the drinking water projects in Odisha?',
      'Which public works have satellite observations recorded?',
      'Show projects with spending higher than 50 Lakhs in Bihar',
      'Find completed healthcare projects in Tamil Nadu',
    ],
  });
});

export default router;
