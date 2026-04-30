import { Router } from 'express';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const router = Router();

// Redis connection (using environment variables in production)
const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

const conversionQueue = new Queue('conversion-queue', { connection });

router.post('/', async (req, res) => {
  const { fileId, targetFormat } = req.body;

  if (!fileId || !targetFormat) {
    return res.status(400).json({ error: 'Missing fileId or targetFormat' });
  }

  const jobId = uuidv4();

  try {
    const job = await conversionQueue.add('convert', {
      jobId,
      fileId,
      targetFormat,
    }, {
      jobId,
    });

    res.status(202).json({
      message: 'Conversion started',
      jobId: job.id,
    });
  } catch (error) {
    console.error('Error adding to queue:', error);
    res.status(500).json({ error: 'Failed to start conversion' });
  }
});

router.get('/status/:id', async (req, res) => {
  const { id } = req.params;
  const job = await conversionQueue.getJob(id);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  const state = await job.getState();
  const progress = job.progress;

  if (state === 'completed') {
    return res.status(200).json({
      status: 'completed',
      downloadUrl: `/downloads/${job.returnvalue}`,
    });
  }

  if (state === 'failed') {
    return res.status(200).json({
      status: 'failed',
      error: job.failedReason,
    });
  }

  res.status(200).json({
    status: state,
    progress,
  });
});

export default router;
