import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);

interface SearchResult {
  type: 'service' | 'location' | 'review' | 'blog' | 'supply';
  id: string;
  title: string;
  description: string;
  url: string;
  category?: string;
  rating?: number;
}

/**
 * Unified search across all content types
 */
export const searchAll = async (req: Request, res: Response) => {
  try {
    const { q, type, limit = 10 } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
        results: []
      });
    }

    const searchTerm = q.toLowerCase().trim();
    const searchType = type as string | undefined;
    const resultLimit = parseInt(limit as string, 10) || 10;
    
    const results: SearchResult[] = [];
    const dataDir = path.join(__dirname, '../database');

    // Search services
    if (!searchType || searchType === 'service' || searchType === 'all') {
      try {
        const servicesData = JSON.parse(await readFile(path.join(dataDir, 'services.json'), 'utf8'));
        const services = servicesData.services || [];
        
        services.forEach((service: any) => {
          const title = (service.title || service.name || '').toLowerCase();
          const description = (service.description || '').toLowerCase();
          const category = (service.category || '').toLowerCase();
          
          if (title.includes(searchTerm) || description.includes(searchTerm) || category.includes(searchTerm)) {
            results.push({
              type: 'service',
              id: service.id || service._id || '',
              title: service.title || service.name || 'Service',
              description: service.description || '',
              url: `/services#${service.id || service._id || ''}`,
              category: service.category
            });
          }
        });
      } catch (err) {
        console.warn('⚠️ Error searching services:', err);
      }
    }

    // Search locations
    if (!searchType || searchType === 'location' || searchType === 'all') {
      try {
        const locationsData = JSON.parse(await readFile(path.join(dataDir, 'locations.json'), 'utf8'));
        const locations = locationsData.locations || [];
        
        locations.forEach((location: any) => {
          const city = (location.city || '').toLowerCase();
          const state = (location.state || '').toLowerCase();
          const address = (location.address || '').toLowerCase();
          
          if (city.includes(searchTerm) || state.includes(searchTerm) || address.includes(searchTerm)) {
            results.push({
              type: 'location',
              id: location.id || location._id || '',
              title: `${location.city || ''}, ${location.state || ''}`,
              description: location.address || '',
              url: `/locations#${location.id || location._id || ''}`,
              category: location.region
            });
          }
        });
      } catch (err) {
        console.warn('⚠️ Error searching locations:', err);
      }
    }

    // Search reviews
    if (!searchType || searchType === 'review' || searchType === 'all') {
      try {
        const reviewsData = JSON.parse(await readFile(path.join(dataDir, 'reviews.json'), 'utf8'));
        const reviews = reviewsData.reviews || [];
        
        reviews.forEach((review: any) => {
          const title = (review.title || '').toLowerCase();
          const comment = (review.comment || review.review || '').toLowerCase();
          const service = (review.service || '').toLowerCase();
          
          if (title.includes(searchTerm) || comment.includes(searchTerm) || service.includes(searchTerm)) {
            results.push({
              type: 'review',
              id: review.id || review._id || '',
              title: review.title || 'Review',
              description: review.comment || review.review || '',
              url: `/review#${review.id || review._id || ''}`,
              rating: review.rating
            });
          }
        });
      } catch (err) {
        console.warn('⚠️ Error searching reviews:', err);
      }
    }

    // Search blog posts
    if (!searchType || searchType === 'blog' || searchType === 'all') {
      try {
        const blogData = JSON.parse(await readFile(path.join(dataDir, 'blog.json'), 'utf8'));
        const posts = blogData.posts || blogData.blogPosts || [];
        
        posts.forEach((post: any) => {
          const title = (post.title || '').toLowerCase();
          const excerpt = (post.excerpt || post.description || '').toLowerCase();
          const content = (post.content || '').toLowerCase();
          
          if (title.includes(searchTerm) || excerpt.includes(searchTerm) || content.includes(searchTerm)) {
            results.push({
              type: 'blog',
              id: post.id || post._id || '',
              title: post.title || 'Blog Post',
              description: post.excerpt || post.description || '',
              url: `/blog#${post.id || post._id || ''}`,
              category: post.category
            });
          }
        });
      } catch (err) {
        console.warn('⚠️ Error searching blog:', err);
      }
    }

    // Search supplies
    if (!searchType || searchType === 'supply' || searchType === 'all') {
      try {
        const suppliesData = JSON.parse(await readFile(path.join(dataDir, 'supplies.json'), 'utf8'));
        const supplies = suppliesData.supplies || [];
        
        supplies.forEach((category: any) => {
          if (category.items && Array.isArray(category.items)) {
            category.items.forEach((item: any) => {
              const name = (item.name || '').toLowerCase();
              const description = (item.description || '').toLowerCase();
              
              if (name.includes(searchTerm) || description.includes(searchTerm)) {
                results.push({
                  type: 'supply',
                  id: item.id || item._id || '',
                  title: item.name || 'Supply Item',
                  description: item.description || '',
                  url: `/supplies#${item.id || item._id || ''}`,
                  category: category.category || category.name
                });
              }
            });
          }
        });
      } catch (err) {
        console.warn('⚠️ Error searching supplies:', err);
      }
    }

    // Limit results
    const limitedResults = results.slice(0, resultLimit);

    return res.status(200).json({
      success: true,
      query: q,
      count: limitedResults.length,
      total: results.length,
      results: limitedResults
    });
  } catch (error) {
    console.error('❌ Search error:', error);
    return res.status(500).json({
      success: false,
      message: 'Search failed',
      results: []
    });
  }
};

