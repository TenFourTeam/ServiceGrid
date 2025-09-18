import { useState, useEffect } from 'react';

interface LegalDocumentFrontmatter {
  title: string;
  slug: string;
  lastUpdated: string;
  icon: string;
  description: string;
}

interface LegalDocument {
  frontmatter: LegalDocumentFrontmatter;
  content: string;
  isLoading: boolean;
  error: string | null;
}

const parseFrontmatter = (markdown: string): { frontmatter: LegalDocumentFrontmatter; content: string } => {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = markdown.match(frontmatterRegex);
  
  if (!match) {
    throw new Error('Invalid markdown format - missing frontmatter');
  }

  const [, frontmatterString, content] = match;
  const frontmatter: any = {};
  
  frontmatterString.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length > 0) {
      frontmatter[key.trim()] = valueParts.join(':').trim();
    }
  });

  return {
    frontmatter: frontmatter as LegalDocumentFrontmatter,
    content: content.trim()
  };
};

export function useLegalDocument(slug: string): LegalDocument {
  const [document, setDocument] = useState<LegalDocument>({
    frontmatter: {
      title: '',
      slug: '',
      lastUpdated: '',
      icon: '',
      description: ''
    },
    content: '',
    isLoading: true,
    error: null
  });

  useEffect(() => {
    const loadDocument = async () => {
      try {
        setDocument(prev => ({ ...prev, isLoading: true, error: null }));
        
        const fileMap: Record<string, string> = {
          'tos': 'terms-of-service.md',
          'cookies': 'cookie-policy.md',
          'credits': 'service-credits.md',
          'dpa': 'data-processing-addendum.md'
        };
        
        const fileName = fileMap[slug];
        if (!fileName) {
          throw new Error(`Legal document not found: ${slug}`);
        }

        const response = await fetch(`/src/legal/${fileName}`);
        if (!response.ok) {
          throw new Error(`Failed to load document: ${response.statusText}`);
        }
        
        const markdown = await response.text();
        const { frontmatter, content } = parseFrontmatter(markdown);
        
        setDocument({
          frontmatter,
          content,
          isLoading: false,
          error: null
        });
      } catch (error) {
        setDocument(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        }));
      }
    };

    if (slug) {
      loadDocument();
    }
  }, [slug]);

  return document;
}

export function useLegalDocuments() {
  const documents = [
    { slug: 'tos', icon: 'FileText' },
    { slug: 'cookies', icon: 'Cookie' },
    { slug: 'credits', icon: 'BadgeDollarSign' },
    { slug: 'dpa', icon: 'Shield' }
  ];

  return documents;
}