/**
 * Markdown processing and rendering module.
 * Converts Markdown syntax to HTML for display in the browser.
 */

/**
 * Markdown processor class for converting Markdown to HTML
 */
class MarkdownProcessor {
  /**
   * Converts Markdown syntax to HTML for display in the browser
   * Supports headings, bold, italics, code, links, lists, blockquotes, and hashtags
   * @param {string} md - Raw markdown text from user input
   * @returns {string} - Sanitized HTML formatted text ready for display
   */
  static toHtml(md) {
    if (typeof md !== 'string') return '';
    
    // First escape any existing HTML to prevent XSS
    let html = window.SecurityUtils.escapeHtml(md);
    
    // Convert markdown syntax to HTML
    html = this.processHeadings(html);
    html = this.processTextFormatting(html);
    html = this.processCode(html);
    html = this.processLinks(html);
    html = this.processBlockquotes(html);
    html = this.processLineBreaks(html);
    html = this.processLists(html);
    html = this.processHashtags(html);
    
    return html;
  }

  /**
   * Process heading syntax (# ## ### etc.)
   * @param {string} html - HTML string to process
   * @returns {string} - Processed HTML
   */
  static processHeadings(html) {
    return html
      .replace(/^###### (.*$)/gim, '<h6>$1</h6>')
      .replace(/^##### (.*$)/gim, '<h5>$1</h5>')
      .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>');
  }

  /**
   * Process bold and italic text formatting
   * @param {string} html - HTML string to process
   * @returns {string} - Processed HTML
   */
  static processTextFormatting(html) {
    return html
      // Convert **bold** text to <strong> tags
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      // Convert *italic* text to <em> tags
      .replace(/\*(.*?)\*/gim, '<em>$1</em>');
  }

  /**
   * Process inline code blocks
   * @param {string} html - HTML string to process
   * @returns {string} - Processed HTML
   */
  static processCode(html) {
    // Convert `code` text to <code> tags
    return html.replace(/`([^`]+)`/gim, '<code>$1</code>');
  }

  /**
   * Process markdown links
   * @param {string} html - HTML string to process
   * @returns {string} - Processed HTML
   */
  static processLinks(html) {
    // Convert [link text](url) to <a> tags with safe URL validation
    return html.replace(/\[(.*?)\]\((https?:\/\/[^\s)]+)\)/gim, (match, linkText, url) => {
      const safeUrl = window.SecurityUtils.sanitizeUrl(url);
      if (!safeUrl) return match; // Return original if URL is not safe
      return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
    });
  }

  /**
   * Process blockquotes
   * @param {string} html - HTML string to process
   * @returns {string} - Processed HTML
   */
  static processBlockquotes(html) {
    // Convert > blockquotes to <blockquote> tags
    return html.replace(/^&gt; (.*$)/gim, '<blockquote>$1</blockquote>');
  }

  /**
   * Process line breaks and paragraphs
   * @param {string} html - HTML string to process
   * @returns {string} - Processed HTML
   */
  static processLineBreaks(html) {
    return html
      // Convert empty lines to <br> tags
      .replace(/^\s*\n/gim, '<br>')
      // Convert all remaining newlines to <br> tags
      .replace(/\n/g, '<br>');
  }

  /**
   * Process markdown lists (bullets and numbered)
   * @param {string} html - HTML string to process
   * @returns {string} - Processed HTML
   */
  static processLists(html) {
    // Convert bullet lists (* item) to HTML <ul><li> structure
    html = html.replace(/<br>\s*\* (.*?)(?=<br>|$)/g, '<ul><li>$1</li></ul>');
    // Convert numbered lists (1. item) to HTML <ol><li> structure
    html = html.replace(/<br>\s*\d+\. (.*?)(?=<br>|$)/g, '<ol><li>$1</li></ol>');
    
    return html;
  }

  /**
   * Process hashtags for special styling
   * @param {string} html - HTML string to process
   * @returns {string} - Processed HTML
   */
  static processHashtags(html) {
    // Convert #hashtags to clickable spans with special styling
    return html.replace(/#(\w+)/g, '<span class="hashtag">#$1</span>');
  }

  /**
   * Convert HTML back to markdown (basic conversion)
   * @param {string} html - HTML string to convert
   * @returns {string} - Markdown text
   */
  static fromHtml(html) {
    if (typeof html !== 'string') return '';
    
    return html
      // Convert headings back
      .replace(/<h([1-6])>(.*?)<\/h[1-6]>/gi, (match, level, text) => {
        return '#'.repeat(parseInt(level)) + ' ' + text;
      })
      // Convert bold back
      .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b>(.*?)<\/b>/gi, '**$1**')
      // Convert italic back
      .replace(/<em>(.*?)<\/em>/gi, '*$1*')
      .replace(/<i>(.*?)<\/i>/gi, '*$1*')
      // Convert code back
      .replace(/<code>(.*?)<\/code>/gi, '`$1`')
      // Convert links back
      .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
      // Convert blockquotes back
      .replace(/<blockquote>(.*?)<\/blockquote>/gi, '> $1')
      // Convert line breaks back
      .replace(/<br\s*\/?>/gi, '\n')
      // Remove remaining HTML tags
      .replace(/<[^>]*>/g, '')
      // Decode HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'");
  }

  /**
   * Extract plain text from markdown (removes all formatting)
   * @param {string} md - Markdown text
   * @returns {string} - Plain text
   */
  static toPlainText(md) {
    if (typeof md !== 'string') return '';
    
    return md
      // Remove markdown syntax
      .replace(/^#{1,6}\s+/gm, '')  // Remove headings
      .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove bold
      .replace(/\*(.*?)\*/g, '$1')  // Remove italic
      .replace(/`([^`]+)`/g, '$1')  // Remove inline code
      .replace(/\[(.*?)\]\([^)]+\)/g, '$1')  // Remove links, keep text
      .replace(/^>\s+/gm, '')  // Remove blockquote markers
      .replace(/^\s*[-*+]\s+/gm, '')  // Remove bullet list markers
      .replace(/^\s*\d+\.\s+/gm, '')  // Remove numbered list markers
      .replace(/#(\w+)/g, '$1')  // Remove hashtag symbols
      .trim();
  }

  /**
   * Get word count from markdown text
   * @param {string} md - Markdown text
   * @returns {number} - Word count
   */
  static getWordCount(md) {
    const plainText = this.toPlainText(md);
    return plainText.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Get character count from markdown text (excluding formatting)
   * @param {string} md - Markdown text
   * @returns {number} - Character count
   */
  static getCharCount(md) {
    const plainText = this.toPlainText(md);
    return plainText.length;
  }

  /**
   * Extract hashtags from markdown text
   * @param {string} md - Markdown text
   * @returns {string[]} - Array of hashtags (without # symbol)
   */
  static extractHashtags(md) {
    if (typeof md !== 'string') return [];
    
    const hashtags = md.match(/#(\w+)/g);
    if (!hashtags) return [];
    
    return hashtags
      .map(tag => tag.substring(1)) // Remove # symbol
      .filter((tag, index, array) => array.indexOf(tag) === index); // Remove duplicates
  }
}

// Export for use in other modules
window.MarkdownProcessor = MarkdownProcessor;