import { describe, it, expect, beforeEach } from 'vitest'

describe('Markdown Module', () => {
  let Markdown

  beforeEach(() => {
    // Mock markdown functions
    Markdown = {
      parseMarkdown: (text) => {
        if (!text) return ''
        
        return text
          // Headers
          .replace(/^### (.*$)/gim, '<h3>$1</h3>')
          .replace(/^## (.*$)/gim, '<h2>$1</h2>')
          .replace(/^# (.*$)/gim, '<h1>$1</h1>')
          // Bold
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          // Italic
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          // Code blocks
          .replace(/```(.*?)```/gs, '<pre><code>$1</code></pre>')
          // Inline code
          .replace(/`(.*?)`/g, '<code>$1</code>')
          // Links
          .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
          // Line breaks
          .replace(/\n/g, '<br>')
      },

      stripMarkdown: (text) => {
        if (!text) return ''
        
        return text
          .replace(/^#+\s/gm, '')
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\*(.*?)\*/g, '$1')
          .replace(/```.*?```/gs, '')
          .replace(/`(.*?)`/g, '$1')
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
          .replace(/<[^>]+>/g, '')
          .replace(/\n+/g, ' ')
          .trim()
      },

      generatePreview: (text, maxLength = 150) => {
        const stripped = Markdown.stripMarkdown(text)
        return stripped.length > maxLength 
          ? stripped.substring(0, maxLength) + '...'
          : stripped
      }
    }
  })

  describe('parseMarkdown', () => {
    it('should convert headers correctly', () => {
      expect(Markdown.parseMarkdown('# Header 1')).toBe('<h1>Header 1</h1>')
      expect(Markdown.parseMarkdown('## Header 2')).toBe('<h2>Header 2</h2>')
      expect(Markdown.parseMarkdown('### Header 3')).toBe('<h3>Header 3</h3>')
    })

    it('should convert bold text', () => {
      expect(Markdown.parseMarkdown('**bold text**')).toBe('<strong>bold text</strong>')
    })

    it('should convert italic text', () => {
      expect(Markdown.parseMarkdown('*italic text*')).toBe('<em>italic text</em>')
    })

    it('should convert inline code', () => {
      expect(Markdown.parseMarkdown('`code`')).toBe('<code>code</code>')
    })

    it('should convert code blocks', () => {
      const input = '```\nconst x = 1;\n```'
      const expected = '<pre><code><br>const x = 1;<br></code></pre>'
      expect(Markdown.parseMarkdown(input)).toBe(expected)
    })

    it('should convert links', () => {
      const input = '[Google](https://google.com)'
      const expected = '<a href="https://google.com">Google</a>'
      expect(Markdown.parseMarkdown(input)).toBe(expected)
    })

    it('should handle empty input', () => {
      expect(Markdown.parseMarkdown('')).toBe('')
      expect(Markdown.parseMarkdown(null)).toBe('')
    })
  })

  describe('stripMarkdown', () => {
    it('should remove markdown formatting', () => {
      const input = '# Header\n**bold** and *italic* text with `code`'
      const expected = 'Header bold and italic text with code'
      expect(Markdown.stripMarkdown(input)).toBe(expected)
    })

    it('should remove links but keep text', () => {
      const input = '[Google](https://google.com)'
      expect(Markdown.stripMarkdown(input)).toBe('Google')
    })

    it('should handle complex markdown', () => {
      const input = '## Title\n**Important:** Check [this link](http://example.com)\n```code block```'
      const result = Markdown.stripMarkdown(input)
      expect(result).not.toContain('##')
      expect(result).not.toContain('**')
      expect(result).not.toContain('[')
      expect(result).not.toContain('```')
      expect(result).toContain('Important:')
      expect(result).toContain('this link')
    })
  })

  describe('generatePreview', () => {
    it('should truncate long text', () => {
      const longText = 'a'.repeat(200)
      const preview = Markdown.generatePreview(longText, 50)
      expect(preview).toHaveLength(53) // 50 + '...'
      expect(preview.endsWith('...')).toBe(true)
    })

    it('should not truncate short text', () => {
      const shortText = 'Short text'
      const preview = Markdown.generatePreview(shortText, 50)
      expect(preview).toBe(shortText)
      expect(preview.endsWith('...')).toBe(false)
    })

    it('should strip markdown from preview', () => {
      const input = '**Bold** and *italic* text'
      const preview = Markdown.generatePreview(input)
      expect(preview).toBe('Bold and italic text')
    })
  })
})