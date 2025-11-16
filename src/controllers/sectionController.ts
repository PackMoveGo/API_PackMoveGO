import { Request, Response } from 'express';
import crypto from 'crypto';

// Define the expected sections for each path
const expectedSections: { [key: string]: string[] } = {
  '/': ['hero', 'services', 'testimonials', 'why-choose-us', 'service-areas', 'download-apps', 'quote-form'],
  '/about': ['hero', 'content', 'quote-form'],
  '/services': ['hero', 'services', 'quote-form'],
  '/contact': ['hero', 'contact-form', 'quote-form'],
  // Add more paths and their expected sections as needed
};

export const verifySections = async (req: Request, res: Response) => {
  try {
    const { sections, timestamp, path } = req.body;

    // Validate request body
    if (!Array.isArray(sections) || !timestamp || !path) {
      res.status(400).json({
        success: false,
        message: 'Invalid request body',
        isValid: false
      });
      return;
    }

    // Get expected sections for the current path
    const expectedSectionsForPath = expectedSections[path] || [];
    
    // Check if all expected sections are present
    const hasAllExpectedSections = expectedSectionsForPath.every(
      section => sections.includes(section)
    );

    // Check if there are any unexpected sections
    const hasUnexpectedSections = sections.some(
      section => !expectedSectionsForPath.includes(section)
    );

    // Generate a hash of the sections for additional security
    const sectionsHash = crypto
      .createHash('sha256')
      .update(sections.sort().join(''))
      .digest('hex');

    // Determine if the sections are valid
    const isValid = hasAllExpectedSections && !hasUnexpectedSections;

    // Log verification attempt
    console.log(`Section verification for ${path}:`, {
      timestamp: new Date(timestamp).toISOString(),
      isValid,
      hasAllExpectedSections,
      hasUnexpectedSections,
      sectionsHash
    });

    res.json({
      success: true,
      isValid,
      message: isValid 
        ? 'Sections verified successfully' 
        : 'Section structure has been modified',
      details: {
        hasAllExpectedSections,
        hasUnexpectedSections,
        expectedSections: expectedSectionsForPath,
        receivedSections: sections
      }
    });
    return;

  } catch (error) {
    console.error('Section verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error verifying sections',
      isValid: false
    });
  }
}; 