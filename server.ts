import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Create a default user for testing if no users exist
  app.get('/api/init', async (req, res) => {
    let elder = await prisma.user.findFirst({ where: { role: 'ELDER' } });
    if (!elder) {
      elder = await prisma.user.create({
        data: { role: 'ELDER', name: 'Grandpa' }
      });
    }

    const medsCount = await prisma.medicationSchedule.count({ where: { userId: elder.id } });
    if (medsCount === 0) {
      // default meds
      const now = new Date();
      now.setMinutes(now.getMinutes() + 15);
      const h = now.getHours().toString().padStart(2, '0');
      const m = now.getMinutes().toString().padStart(2, '0');
      const urgentTime = `${h}:${m}`;
      
      await prisma.medicationSchedule.createMany({
        data: [
          { userId: elder.id, name: '降压药 (高血压)', time: '08:00' },
          { userId: elder.id, name: '感冒灵颗粒 (测试提醒)', time: urgentTime },
          { userId: elder.id, name: '维生素C', time: '12:00' },
          { userId: elder.id, name: '降糖药 (糖尿病)', time: '18:00' }
        ]
      });
    }
    res.json({ success: true, elder });
  });

  app.get('/api/meds', async (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId || typeof userId !== 'string') return res.status(400).json({ error: "Missing userId" });
      
      const schedules = await prisma.medicationSchedule.findMany({ where: { userId } });
      
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      
      const logs = await prisma.medicationLog.findMany({
        where: {
          userId,
          takenAt: { gte: startOfDay, lte: endOfDay }
        }
      });
      
      // Merge
      const meds = schedules.map(s => ({
        id: s.id,
        name: s.name,
        time: s.time,
        taken: logs.some(l => l.scheduleId === s.id),
        takenAt: logs.find(l => l.scheduleId === s.id)?.takenAt || null
      }));
      res.json(meds);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to get meds" });
    }
  });

  app.post('/api/meds/take', async (req, res) => {
    try {
      const { userId, scheduleId } = req.body;
      const log = await prisma.medicationLog.create({
        data: { userId, scheduleId }
      });
      res.json({ success: true, log });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to record medication" });
    }
  });

  app.post("/api/log", async (req, res) => {
    try {
      const { message, reply, medication_taken, mood, symptoms, userId } = req.body;
      
      // Save to log
      await prisma.logEntry.create({
        data: {
          userId,
          text: message,
          reply: reply,
          medication_taken: medication_taken ?? null,
          mood: mood || 'neutral',
          symptoms: symptoms || null
        }
      });

      res.json({ success: true });

    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to log entry." });
    }
  });

  app.get("/api/dashboard", async (req, res) => {
    try {
      const logs = await prisma.logEntry.findMany({
        orderBy: { createdAt: 'desc' },
        take: 30, // Last 30 logs
        include: { user: true }
      });
      res.json(logs);
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  app.get("/api/dashboard/meds", async (req, res) => {
    try {
      const elder = await prisma.user.findFirst({ where: { role: 'ELDER' } });
      if (!elder) return res.json([]);
      
      const schedules = await prisma.medicationSchedule.findMany({ where: { userId: elder.id } });
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const logs = await prisma.medicationLog.findMany({
        where: { userId: elder.id, takenAt: { gte: startOfDay } }
      });
      
      const meds = schedules.map(s => ({
        id: s.id,
        name: s.name,
        time: s.time,
        taken: logs.some(l => l.scheduleId === s.id)
      }));
      res.json(meds);
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
