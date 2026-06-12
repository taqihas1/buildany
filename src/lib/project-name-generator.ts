export function generateShortName(prompt: string): string {
  const cleaned = prompt
    .toLowerCase()
    .replace(/-/g, ' ')      // Replace hyphens with spaces
    .replace(/[^\w\s]/g, '')  // Remove other punctuation
    .trim();

  const fillerWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'with', 'for', 'of', 'in', 'on', 'at', 'to', 'from',
    'by', 'about', 'like', 'through', 'over', 'before', 'after', 'above', 'below',
    'up', 'down', 'out', 'off', 'again', 'further', 'then', 'once',
    'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most',
    'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too',
    'very', 'can', 'will', 'just', 'should', 'now', 'app', 'application', 'website', 'web',
    'build', 'create', 'make', 'using', 'based', 'that', 'this', 'these', 'those', 'i', 'me',
    'my', 'we', 'our', 'you', 'your', 'it', 'its', 'they', 'them', 'their', 'what', 'which',
    'who', 'whom', 'whose', 'would', 'could', 'may', 'might', 'must', 'shall', 'is', 'are',
    'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'done',
    'get', 'got', 'getting', 'use', 'using', 'used', 'help', 'helps', 'helped', 'need', 'needs',
    'needed', 'want', 'wants', 'wanted', 'add', 'adding', 'added', 'include', 'including', 'included',
    'high', 'low', 'new', 'old', 'big', 'small', 'large', 'long', 'short', 'good', 'bad', 'best',
    'better', 'link', 'storage', 'tracker', 'manager', 'dashboard', 'assistant', 'generator'
  ]);

  const words = cleaned.split(/\s+/).filter(w => w.length > 2 && !fillerWords.has(w));

  if (words.length === 0) {
    return 'NewProject';
  }

  // Take first 2-3 meaningful words and PascalCase them
  const nameWords = words.slice(0, 3);
  const pascalCased = nameWords.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
  
  // Ensure it's a reasonable length
  if (pascalCased.length > 25) {
    return words.slice(0, 2).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
  }
  
  return pascalCased || 'NewProject';
}
