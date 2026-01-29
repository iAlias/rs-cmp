/**
 * RS-CMP Backend API Server
 * Fastify-based API for managing sites, configurations, and consent logs
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { Pool } from 'pg';
import crypto from 'crypto';

const fastify = Fastify({
  logger: true,
});

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'rscmp',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// CORS configuration
fastify.register(cors, {
  origin: true, // Allow all origins for demo
  credentials: true,
});

// Rate limiting
fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

/**
 * GET /v1/site/:id/config
 * Get site configuration
 */
fastify.get('/v1/site/:id/config', async (request, reply) => {
  const { id } = request.params as { id: string };

  try {
    const result = await pool.query(
      'SELECT * FROM sites WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Site not found' });
    }

    const site = result.rows[0];
    const config = {
      siteId: site.id,
      siteName: site.name,
      domain: site.domain,
      policyVersion: site.policy_version || '1.0',
      banner: site.config_json.banner || getDefaultBannerConfig(),
      categories: site.config_json.categories || getDefaultCategories(),
      translations: site.config_json.translations || getDefaultTranslations(),
    };

    return reply.send(config);
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
});

/**
 * POST /v1/consent
 * Log user consent
 */
fastify.post('/v1/consent', async (request, reply) => {
  const { siteId, categories, timestamp, version } = request.body as any;

  if (!siteId || !categories || !timestamp) {
    return reply.status(400).send({ error: 'Missing required fields' });
  }

  try {
    // Hash IP address for privacy
    const ipAddress = request.ip;
    const ipHash = hashIP(ipAddress);

    // Insert consent log
    await pool.query(
      `INSERT INTO consents (site_id, timestamp, categories_json, ip_hash, version)
       VALUES ($1, $2, $3, $4, $5)`,
      [siteId, timestamp, JSON.stringify(categories), ipHash, version]
    );

    return reply.send({ success: true });
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
});

/**
 * GET /v1/consent/export
 * Export consent logs as CSV
 */
fastify.get('/v1/consent/export', async (request, reply) => {
  const { siteId, startDate, endDate } = request.query as any;

  if (!siteId) {
    return reply.status(400).send({ error: 'Missing siteId parameter' });
  }

  try {
    let query = 'SELECT * FROM consents WHERE site_id = $1';
    const params: any[] = [siteId];

    if (startDate) {
      params.push(startDate);
      query += ` AND timestamp >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      query += ` AND timestamp <= $${params.length}`;
    }

    query += ' ORDER BY timestamp DESC';

    const result = await pool.query(query, params);

    // Convert to CSV
    const csv = convertToCSV(result.rows);

    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', `attachment; filename="consents-${siteId}.csv"`);
    return reply.send(csv);
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
});

/**
 * POST /v1/site
 * Create a new site
 */
fastify.post('/v1/site', async (request, reply) => {
  const { name, domain } = request.body as any;

  if (!name || !domain) {
    return reply.status(400).send({ error: 'Missing required fields' });
  }

  try {
    // Generate site ID
    const siteId = generateSiteId();

    // Default configuration
    const config = {
      banner: getDefaultBannerConfig(),
      categories: getDefaultCategories(),
      translations: getDefaultTranslations(),
    };

    await pool.query(
      `INSERT INTO sites (id, name, domain, config_json, policy_version, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [siteId, name, domain, JSON.stringify(config), '1.0']
    );

    return reply.status(201).send({
      siteId,
      name,
      domain,
      config,
    });
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
});

/**
 * PUT /v1/site/:id/config
 * Update site configuration
 */
fastify.put('/v1/site/:id/config', async (request, reply) => {
  const { id } = request.params as { id: string };
  const { config } = request.body as any;

  if (!config) {
    return reply.status(400).send({ error: 'Missing config' });
  }

  try {
    const result = await pool.query(
      'UPDATE sites SET config_json = $1 WHERE id = $2 RETURNING *',
      [JSON.stringify(config), id]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Site not found' });
    }

    return reply.send({ success: true, site: result.rows[0] });
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
});

/**
 * GET /health
 * Health check endpoint
 */
fastify.get('/health', async (request, reply) => {
  return reply.send({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Helper: Hash IP address
 */
function hashIP(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex');
}

/**
 * Helper: Generate site ID
 */
function generateSiteId(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Helper: Convert rows to CSV
 */
function convertToCSV(rows: any[]): string {
  if (rows.length === 0) return '';

  const headers = Object.keys(rows[0]).join(',');
  const data = rows.map((row) => {
    return Object.values(row)
      .map((value) => {
        if (typeof value === 'object') {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        return `"${String(value).replace(/"/g, '""')}"`;
      })
      .join(',');
  });

  return [headers, ...data].join('\n');
}

/**
 * Helper: Default banner configuration
 */
function getDefaultBannerConfig() {
  return {
    position: 'bottom',
    layout: 'bar',
    primaryColor: '#2563eb',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    buttonTextColor: '#ffffff',
    showLogo: false,
  };
}

/**
 * Helper: Default categories
 */
function getDefaultCategories() {
  return [
    {
      id: 'necessary',
      name: 'Necessary',
      description: 'Required for the website to function properly',
      required: true,
      enabled: true,
    },
    {
      id: 'analytics',
      name: 'Analytics',
      description: 'Help us understand how visitors use our website',
      required: false,
      enabled: false,
    },
    {
      id: 'marketing',
      name: 'Marketing',
      description: 'Used to deliver personalized advertisements',
      required: false,
      enabled: false,
    },
    {
      id: 'preferences',
      name: 'Preferences',
      description: 'Remember your preferences and settings',
      required: false,
      enabled: false,
    },
  ];
}

/**
 * Helper: Default translations
 */
function getDefaultTranslations() {
  return {
    en: {
      title: 'Cookie Consent',
      description: 'We use cookies to enhance your browsing experience and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.',
      acceptAll: 'Accept All',
      rejectAll: 'Reject All',
      customize: 'Customize',
      save: 'Save Preferences',
      close: 'Close',
      categories: {
        necessary: {
          name: 'Necessary',
          description: 'Required for the website to function properly',
        },
        analytics: {
          name: 'Analytics',
          description: 'Help us understand how visitors use our website',
        },
        marketing: {
          name: 'Marketing',
          description: 'Used to deliver personalized advertisements',
        },
        preferences: {
          name: 'Preferences',
          description: 'Remember your preferences and settings',
        },
      },
    },
    it: {
      title: 'Consenso ai Cookie',
      description: 'Utilizziamo i cookie per migliorare la tua esperienza di navigazione e analizzare il nostro traffico. Cliccando su "Accetta tutto", acconsenti all\'uso dei nostri cookie.',
      acceptAll: 'Accetta tutto',
      rejectAll: 'Rifiuta tutto',
      customize: 'Personalizza',
      save: 'Salva preferenze',
      close: 'Chiudi',
      categories: {
        necessary: {
          name: 'Necessari',
          description: 'Necessari per il funzionamento del sito web',
        },
        analytics: {
          name: 'Analitici',
          description: 'Ci aiutano a capire come i visitatori utilizzano il nostro sito web',
        },
        marketing: {
          name: 'Marketing',
          description: 'Utilizzati per fornire pubblicità personalizzate',
        },
        preferences: {
          name: 'Preferenze',
          description: 'Ricordano le tue preferenze e impostazioni',
        },
      },
    },
  };
}

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000');
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Server listening on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
