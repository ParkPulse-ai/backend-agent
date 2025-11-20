import express from 'express';

export const hcsRoutes = express.Router();

/**
 * POST /api/hcs/create-topic
 * Create a new HCS topic for voting logs
 */
hcsRoutes.post('/create-topic', async (req, res, next) => {
  try {
    const hederaService = req.app.locals.hederaService;
    const { memo } = req.body;

    const result = await hederaService.createHCSTopic(memo);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/hcs/submit
 * Submit a message to HCS topic
 */
hcsRoutes.post('/submit', async (req, res, next) => {
  try {
    const hederaService = req.app.locals.hederaService;
    const message = req.body;

    const result = await hederaService.submitToHCS(message);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/hcs/topic-info
 * Get HCS topic information
 */
hcsRoutes.get('/topic-info', async (req, res, next) => {
  try {
    const hederaService = req.app.locals.hederaService;
    const result = await hederaService.getHCSTopicInfo();
    res.json(result);
  } catch (error) {
    next(error);
  }
});
