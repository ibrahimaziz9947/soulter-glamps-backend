import express from 'express';
import prisma from '../config/prisma.js';
import { authRequired } from '../middleware/auth.js';
import { requireSuperAdmin } from '../middleware/roles.js';

const router = express.Router();

// Database viewer - SUPER_ADMIN only
router.get('/tables', authRequired, requireSuperAdmin, async (req, res) => {
  try {
    const [users, glamps, bookings, commissions] = await Promise.all([
      prisma.user.findMany({ take: 100 }),
      prisma.glamp.findMany({ take: 100 }),
      prisma.booking.findMany({ 
        take: 100,
        include: {
          customer: { select: { name: true, email: true } },
          glamp: { select: { name: true } },
        }
      }),
      prisma.commission.findMany({ 
        take: 100,
        include: {
          agent: { select: { name: true, email: true } },
          booking: { select: { id: true } },
        }
      }),
    ]);

    res.json({
      success: true,
      data: {
        users: { count: users.length, data: users },
        glamps: { count: glamps.length, data: glamps },
        bookings: { count: bookings.length, data: bookings },
        commissions: { count: commissions.length, data: commissions },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get specific table data
router.get('/table/:tableName', authRequired, requireSuperAdmin, async (req, res) => {
  try {
    const { tableName } = req.params;
    const validTables = ['user', 'glamp', 'booking', 'commission'];
    
    if (!validTables.includes(tableName)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid table name',
      });
    }

    const data = await prisma[tableName].findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      table: tableName,
      count: data.length,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
