// services/api/src/routes/auth.ts

import express, { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { Octokit } from '@octokit/rest';
import { pool } from '../db/postgres';
import { sendEmail } from '../services/email';

const router = express.Router();

// GitHub OAuth - Preferred for candidates (instant validation)
router.post('/auth/github', async (req: Request, res: Response) => {
  const { code } = req.body;
  
  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: process.env.GITHUB_REDIRECT_URI
      })
    });
    
    const { access_token } = await tokenResponse.json();
    
    if (!access_token) {
      return res.status(400).json({ error: 'Failed to get GitHub access token' });
    }
    
    // Get user data from GitHub
    const octokit = new Octokit({ auth: access_token });
    const { data: user } = await octokit.users.getAuthenticated();
    const { data: emails } = await octokit.users.listEmailsForAuthenticated();
    
    const primaryEmail = emails.find(e => e.primary)?.email || user.email;
    
    // Check if user exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE github_id = $1 OR email = $2',
      [user.id, primaryEmail]
    );
    
    let dbUser;
    
    if (existingUser.rows.length > 0) {
      // Update existing user
      const result = await pool.query(
        `UPDATE users SET 
          github_username = $1,
          github_access_token = $2,
          avatar_url = $3,
          last_login_at = NOW()
        WHERE id = $4
        RETURNING *`,
        [user.login, access_token, user.avatar_url, existingUser.rows[0].id]
      );
      dbUser = result.rows[0];
    } else {
      // Create new user
      const result = await pool.query(
        `INSERT INTO users (
          github_id, github_username, name, email, 
          avatar_url, github_access_token, user_type
        ) VALUES ($1, $2, $3, $4, $5, $6, 'candidate')
        RETURNING *`,
        [user.id, user.login, user.name, primaryEmail, user.avatar_url, access_token]
      );
      dbUser = result.rows[0];
      
      // Create empty candidate profile
      await pool.query(
        'INSERT INTO candidate_profiles (user_id) VALUES ($1)',
        [dbUser.id]
      );
    }
    
    // Start background validation calculation (non-blocking)
    calculateGitHubValidation(dbUser.id, access_token).catch(console.error);
    
    // Generate JWT
    const token = jwt.sign(
      { userId: dbUser.id, userType: 'candidate' },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );
    
    res.json({ 
      token,
      user: {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        avatar_url: dbUser.avatar_url,
        github_username: dbUser.github_username
      },
      next_step: 'onboarding'
    });
    
  } catch (error) {
    console.error('GitHub auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Google OAuth - Alternative for candidates
router.post('/auth/google', async (req: Request, res: Response) => {
  const { credential } = req.body;
  
  try {
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(400).json({ error: 'Invalid Google token' });
    }
    
    // Check if user exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE google_id = $1 OR email = $2',
      [payload.sub, payload.email]
    );
    
    let dbUser;
    
    if (existingUser.rows.length > 0) {
      // Update existing user
      const result = await pool.query(
        `UPDATE users SET 
          last_login_at = NOW()
        WHERE id = $1
        RETURNING *`,
        [existingUser.rows[0].id]
      );
      dbUser = result.rows[0];
    } else {
      // Create new user
      const result = await pool.query(
        `INSERT INTO users (
          google_id, name, email, avatar_url, user_type
        ) VALUES ($1, $2, $3, $4, 'candidate')
        RETURNING *`,
        [payload.sub, payload.name, payload.email, payload.picture]
      );
      dbUser = result.rows[0];
      
      // Create empty candidate profile
      await pool.query(
        'INSERT INTO candidate_profiles (user_id) VALUES ($1)',
        [dbUser.id]
      );
    }
    
    // Generate JWT
    const token = jwt.sign(
      { userId: dbUser.id, userType: 'candidate' },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );
    
    res.json({ 
      token,
      user: {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        avatar_url: dbUser.avatar_url
      },
      next_step: 'onboarding'
    });
    
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Magic Link Auth - For companies
router.post('/auth/magic-link/request', async (req: Request, res: Response) => {
  const { email } = req.body;
  
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }
  
  // Check if it's a common personal email domain
  const domain = email.split('@')[1].toLowerCase();
  const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com'];
  
  if (personalDomains.includes(domain)) {
    return res.status(400).json({ 
      error: 'Please use your company email address',
      suggestion: 'Personal email addresses are not allowed for company accounts'
    });
  }
  
  try {
    // Generate magic link token (15 min expiry)
    const token = jwt.sign(
      { email, type: 'magic-link' },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    );
    
    const magicLink = `${process.env.FRONTEND_URL}/auth/verify/${token}`;
    
    // Send email
    await sendEmail({
      to: email,
      subject: 'Your HireWire login link',
      html: `
        <h2>Welcome to HireWire!</h2>
        <p>Click the link below to log in:</p>
        <a href="${magicLink}" style="
          display: inline-block;
          padding: 12px 24px;
          background: #667eea;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: bold;
        ">Log in to HireWire</a>
        <p>This link expires in 15 minutes.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      `
    });
    
    res.json({ 
      message: 'Check your email for the login link',
      email 
    });
    
  } catch (error) {
    console.error('Magic link error:', error);
    res.status(500).json({ error: 'Failed to send magic link' });
  }
});

router.get('/auth/magic-link/verify/:token', async (req: Request, res: Response) => {
  const { token } = req.params;
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    if (decoded.type !== 'magic-link') {
      return res.status(400).json({ error: 'Invalid token type' });
    }
    
    const { email } = decoded;
    
    // Check if user exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    let dbUser;
    
    if (existingUser.rows.length > 0) {
      // Update last login
      const result = await pool.query(
        `UPDATE users SET last_login_at = NOW() WHERE id = $1 RETURNING *`,
        [existingUser.rows[0].id]
      );
      dbUser = result.rows[0];
    } else {
      // Create new company user
      const domain = email.split('@')[1];
      const companyName = domain.split('.')[0]; // Basic company name extraction
      
      // Create company
      const companyResult = await pool.query(
        `INSERT INTO companies (name, domain, website) 
        VALUES ($1, $2, $3) RETURNING *`,
        [companyName, domain, `https://${domain}`]
      );
      const company = companyResult.rows[0];
      
      // Create user
      const userResult = await pool.query(
        `INSERT INTO users (email, user_type, company_id) 
        VALUES ($1, 'company', $2) RETURNING *`,
        [email, company.id]
      );
      dbUser = userResult.rows[0];
    }
    
    // Generate session JWT
    const sessionToken = jwt.sign(
      { userId: dbUser.id, userType: 'company', companyId: dbUser.company_id },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );
    
    res.json({ 
      token: sessionToken,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        company_id: dbUser.company_id
      },
      next_step: dbUser.company_id ? 'dashboard' : 'company-onboarding'
    });
    
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(400).json({ error: 'Link expired. Please request a new one.' });
    }
    console.error('Verify magic link error:', error);
    res.status(400).json({ error: 'Invalid or expired link' });
  }
});

// Email/Password signup (fallback)
router.post('/auth/signup', async (req: Request, res: Response) => {
  const { email, password, name, user_type } = req.body;
  
  if (!email || !password || !user_type) {
    return res.status(400).json({ error: 'Email, password, and user type required' });
  }
  
  try {
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Check if user exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, user_type) 
      VALUES ($1, $2, $3, $4) RETURNING *`,
      [email, hashedPassword, name, user_type]
    );
    const user = result.rows[0];
    
    // Create profile based on type
    if (user_type === 'candidate') {
      await pool.query(
        'INSERT INTO candidate_profiles (user_id) VALUES ($1)',
        [user.id]
      );
    }
    
    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, userType: user_type },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );
    
    res.json({ 
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      next_step: 'onboarding'
    });
    
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed' });
  }
});

// Email/Password login
router.post('/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    
    if (!user.password_hash) {
      return res.status(401).json({ 
        error: 'Please use social login (GitHub/Google) or magic link'
      });
    }
    
    const bcrypt = require('bcrypt');
    const valid = await bcrypt.compare(password, user.password_hash);
    
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Update last login
    await pool.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    );
    
    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, userType: user.user_type },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );
    
    res.json({ 
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        user_type: user.user_type
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Background job: Calculate GitHub validation score
async function calculateGitHubValidation(userId: number, accessToken: string) {
  try {
    const octokit = new Octokit({ auth: accessToken });
    
    // Get user data
    const { data: user } = await octokit.users.getAuthenticated();
    
    // Get repos
    const { data: repos } = await octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 100
    });
    
    // Get commit activity for the past year
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    let totalCommits = 0;
    let totalStars = 0;
    
    for (const repo of repos) {
      totalStars += repo.stargazers_count || 0;
      
      // Get commit count
      try {
        const { data: commits } = await octokit.repos.listCommits({
          owner: repo.owner.login,
          repo: repo.name,
          since: oneYearAgo.toISOString(),
          per_page: 100
        });
        totalCommits += commits.length;
      } catch (err) {
        // Repo might be private or deleted
      }
    }
    
    // Calculate account age
    const accountCreated = new Date(user.created_at!);
    const accountAgeYears = (Date.now() - accountCreated.getTime()) / (1000 * 60 * 60 * 24 * 365);
    
    // Calculate validation score (0-100)
    let score = 0;
    
    // Public repos (max 20 points)
    score += Math.min(user.public_repos, 20);
    
    // Total stars (max 30 points)
    score += Math.min(totalStars / 10, 30);
    
    // Commit activity (max 30 points)
    score += Math.min(totalCommits / 100, 30);
    
    // Account age (max 10 points)
    score += Math.min(accountAgeYears * 2, 10);
    
    // Followers (max 10 points)
    score += Math.min(user.followers / 10, 10);
    
    const validationScore = Math.min(Math.round(score), 100);
    
    // Update user profile
    await pool.query(
      `UPDATE candidate_profiles SET 
        validation_score = $1,
        github_repos = $2,
        github_stars = $3,
        github_commits_year = $4
      WHERE user_id = $5`,
      [validationScore, user.public_repos, totalStars, totalCommits, userId]
    );
    
    console.log(`✅ Calculated validation score for user ${userId}: ${validationScore}%`);
    
  } catch (error) {
    console.error(`Failed to calculate GitHub validation for user ${userId}:`, error);
  }
}

export default router;
