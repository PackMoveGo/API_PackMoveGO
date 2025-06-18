import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(__dirname, '../data');

export const getDataFile = (req: Request, res: Response) => {
  const { name } = req.params;
  // Only allow specific files for security
  const allowedFiles = [
    'nav', 'contact', 'referral', 'blog', 'reviews', 'locations', 'supplies', 'Services', 'Testimonials', 'about'
  ];
  if (!allowedFiles.includes(name)) {
    return res.status(404).json({ error: 'Data file not found' });
  }
  // about.txt is a text file, others are JSON
  const ext = name === 'about' ? '.txt' : '.json';
  const filePath = path.join(dataDir, name + ext);
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(404).json({ error: 'Data file not found' });
    }
    if (ext === '.json') {
      try {
        return res.json(JSON.parse(data));
      } catch (e) {
        return res.status(500).json({ error: 'Invalid JSON format' });
      }
    } else {
      return res.type('text/plain').send(data);
    }
  });
}; 