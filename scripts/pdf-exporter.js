/**
 * ScriptCraft - Industry-Standard PDF Exporter
 * Complies with Academy / Hollywood Screenplay Formatting:
 * - 8.5" x 11" US Letter
 * - Courier 12pt (10 pitch, 6 lines per inch)
 * - 1.5" Left Margin, 1.0" Right/Top/Bottom Margins
 * - Exact element indents and widths
 * - Smart orphan prevention & page numbering
 * - Clean title page generation
 */

class ScreenplayPdfExporter {
  constructor() {
    // 72 points per inch standard in PDF
    this.INCH = 72;
    this.PAGE_WIDTH = 8.5 * this.INCH;   // 612 pt
    this.PAGE_HEIGHT = 11.0 * this.INCH; // 792 pt

    this.MARGIN_LEFT = 1.5 * this.INCH;  // 108 pt
    this.MARGIN_RIGHT = 1.0 * this.INCH; // 72 pt (usable right boundary: 612 - 72 = 540 pt)
    this.MARGIN_TOP = 1.0 * this.INCH;   // 72 pt
    this.MARGIN_BOTTOM = 1.0 * this.INCH;// 72 pt (usable bottom boundary: 792 - 72 = 720 pt)

    this.FONT_SIZE = 12;
    this.LINE_HEIGHT = 14.4; // 6 lines per inch (72 / 6 = 12pt + 2.4pt leading)
    
    // Indentations from paper left edge
    this.INDENTS = {
      scene_heading: this.MARGIN_LEFT,              // 108 pt (1.5")
      action: this.MARGIN_LEFT,                     // 108 pt (1.5")
      character: this.MARGIN_LEFT + (2.0 * this.INCH),// 252 pt (3.5")
      parenthetical: this.MARGIN_LEFT + (1.5 * this.INCH), // 216 pt (3.0")
      dialogue: this.MARGIN_LEFT + (1.0 * this.INCH),      // 180 pt (2.5")
      shot: this.MARGIN_LEFT,                       // 108 pt (1.5")
      transition: 4.5 * this.INCH                   // 324 pt (4.5")
    };

    // Maximum text block widths in points
    this.WIDTHS = {
      scene_heading: 6.0 * this.INCH,   // 432 pt
      action: 6.0 * this.INCH,          // 432 pt
      character: 3.5 * this.INCH,       // 252 pt
      parenthetical: 3.0 * this.INCH,   // 216 pt
      dialogue: 3.5 * this.INCH,        // 252 pt
      shot: 6.0 * this.INCH,            // 432 pt
      transition: 2.5 * this.INCH       // 180 pt
    };
  }

  /**
   * Export screenplay to PDF blob or trigger direct download
   */
  async generatePdf(blocks, metadata = {}, options = {}) {
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) {
      throw new Error('jsPDF library is not loaded.');
    }

    const opts = {
      includeTitlePage: options.includeTitlePage !== false,
      includeSceneNumbers: options.includeSceneNumbers === true,
      watermark: options.watermark || '',
      startPageNumber: 1,
      ...options
    };

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'letter',
      compress: true
    });

    // Configure base font
    doc.setFont('courier', 'normal');
    doc.setFontSize(this.FONT_SIZE);
    doc.setTextColor(0, 0, 0);

    // 1. Title Page (if requested)
    if (opts.includeTitlePage) {
      this.renderTitlePage(doc, metadata);
      doc.addPage();
    }

    // 2. Screenplay Body
    let currentY = this.MARGIN_TOP;
    let pageNumber = 1;
    let sceneCounter = 1;

    // Helper to add new page with proper header
    const addNewScriptPage = () => {
      doc.addPage();
      pageNumber++;
      currentY = this.MARGIN_TOP;

      // Header: Page number at top-right (e.g., "2.")
      if (pageNumber > 1) {
        doc.setFont('courier', 'normal');
        doc.setFontSize(this.FONT_SIZE);
        const pageText = `${pageNumber}.`;
        doc.text(pageText, this.PAGE_WIDTH - this.MARGIN_RIGHT, 0.5 * this.INCH, { align: 'right' });
      }

      // Watermark if requested
      if (opts.watermark) {
        this.renderWatermark(doc, opts.watermark);
      }
    };

    // Render watermark on page 1 if requested
    if (opts.watermark) {
      this.renderWatermark(doc, opts.watermark);
    }

    // Process blocks line by line
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const prevBlock = blocks[i - 1];

      // Formatting text based on element type
      let text = block.text.trim();
      if (!text) continue;

      let isHeading = block.type === ScreenplayElement.SCENE_HEADING;
      let isChar = block.type === ScreenplayElement.CHARACTER;
      let isParen = block.type === ScreenplayElement.PARENTHETICAL;
      let isDial = block.type === ScreenplayElement.DIALOGUE;
      let isTrans = block.type === ScreenplayElement.TRANSITION;

      if (isHeading || isChar || isTrans) {
        text = text.toUpperCase();
      }
      if (isParen && !text.startsWith('(')) {
        text = `(${text})`;
      }

      const xPos = this.INDENTS[block.type] || this.MARGIN_LEFT;
      const maxWidth = this.WIDTHS[block.type] || this.WIDTHS.action;

      // Split text into lines matching max width
      doc.setFont('courier', isHeading ? 'bold' : 'normal');
      const lines = doc.splitTextToSize(text, maxWidth);
      const blockHeight = lines.length * this.LINE_HEIGHT;

      // Calculate vertical space needed before this block
      let spaceBefore = this.LINE_HEIGHT; // 1 blank line default
      if (isHeading) {
        spaceBefore = (currentY > this.MARGIN_TOP) ? this.LINE_HEIGHT * 2 : 0;
      } else if (isParen || isDial) {
        // Dialogue directly attaches to Character or Parenthetical with NO blank line
        if (prevBlock && (prevBlock.type === ScreenplayElement.CHARACTER || prevBlock.type === ScreenplayElement.PARENTHETICAL)) {
          spaceBefore = 0;
        }
      } else if (currentY === this.MARGIN_TOP) {
        spaceBefore = 0;
      }

      // Check for orphan protection (e.g. Character name with no room for dialogue)
      let requiredHeight = spaceBefore + blockHeight;
      if (isChar) {
        // Ensure character name AND at least 2 lines of dialogue fit on this page
        requiredHeight += this.LINE_HEIGHT * 2;
      } else if (isHeading) {
        // Ensure scene heading AND at least 1 action line fit on this page
        requiredHeight += this.LINE_HEIGHT * 2;
      }

      // Check if page break is needed
      if (currentY + requiredHeight > (this.PAGE_HEIGHT - this.MARGIN_BOTTOM)) {
        addNewScriptPage();
        spaceBefore = 0; // Top of new page has no space before
      }

      currentY += spaceBefore;

      // If scene heading and scene numbers enabled
      if (isHeading && opts.includeSceneNumbers) {
        const scNum = `${sceneCounter++}`;
        doc.setFont('courier', 'bold');
        // Left scene number (in left margin)
        doc.text(scNum, this.MARGIN_LEFT - 24, currentY, { align: 'right' });
        // Right scene number (in right margin)
        doc.text(scNum, this.PAGE_WIDTH - this.MARGIN_RIGHT + 12, currentY, { align: 'left' });
      }

      // Render lines
      for (const line of lines) {
        if (isTrans) {
          // Transitions can be right-aligned
          doc.text(line, this.PAGE_WIDTH - this.MARGIN_RIGHT, currentY, { align: 'right' });
        } else {
          doc.text(line, xPos, currentY);
        }
        currentY += this.LINE_HEIGHT;
      }
    }

    return doc;
  }

  /**
   * Render Standard Hollywood Title Page
   */
  renderTitlePage(doc, metadata) {
    const title = (metadata.title || 'UNTITLED SCREENPLAY').toUpperCase();
    const credit = metadata.credit || 'Written by';
    const author = metadata.author || 'Anonymous Writer';
    const source = metadata.source || '';
    const draftDate = metadata.draftDate || '';
    const contact = metadata.contact || '';

    // Centered Title Block
    const centerX = this.PAGE_WIDTH / 2;
    let titleY = 3.5 * this.INCH; // ~252 pt

    // Title (Underlined or Bold uppercase)
    doc.setFont('courier', 'bold');
    doc.setFontSize(16);
    const titleLines = doc.splitTextToSize(title, 5.0 * this.INCH);
    for (const tl of titleLines) {
      doc.text(tl, centerX, titleY, { align: 'center' });
      // Draw standard Hollywood title underline
      const titleWidth = doc.getTextWidth(tl);
      doc.line(centerX - (titleWidth / 2), titleY + 3, centerX + (titleWidth / 2), titleY + 3);
      titleY += 20;
    }

    // Credit & Author
    doc.setFont('courier', 'normal');
    doc.setFontSize(12);
    titleY += 28;
    doc.text(credit, centerX, titleY, { align: 'center' });
    
    titleY += 22;
    doc.text(author, centerX, titleY, { align: 'center' });

    if (source) {
      titleY += 28;
      doc.setFontSize(11);
      doc.text(source, centerX, titleY, { align: 'center' });
    }

    // Bottom Left / Right Information
    const bottomY = 9.5 * this.INCH; // ~684 pt
    doc.setFontSize(10);

    // Left: Draft date
    if (draftDate) {
      doc.text(`Draft Date: ${draftDate}`, this.MARGIN_LEFT, bottomY);
    }

    // Right/Left: Contact info
    if (contact) {
      const contactLines = contact.split('\n');
      let contactY = bottomY;
      for (const cl of contactLines) {
        doc.text(cl, this.MARGIN_LEFT, contactY + 16);
        contactY += 14;
      }
    }
  }

  /**
   * Render light translucent watermark diagonally across page
   */
  renderWatermark(doc, text) {
    const prevColor = doc.getTextColor();
    doc.setTextColor(220, 220, 220);
    doc.setFont('courier', 'bold');
    doc.setFontSize(54);
    
    // Diagonal angle ~45 deg
    doc.text(text.toUpperCase(), this.PAGE_WIDTH / 2, this.PAGE_HEIGHT / 2, {
      align: 'center',
      angle: 45
    });

    doc.setTextColor(prevColor);
  }

  /**
   * Trigger immediate file download in browser
   */
  async downloadPdf(blocks, metadata, options = {}, filename = null) {
    const doc = await this.generatePdf(blocks, metadata, options);
    const safeTitle = (metadata.title || 'Screenplay')
      .replace(/[^a-zA-Z0-9_\-\s]/g, '')
      .trim()
      .replace(/\s+/g, '_');
    const finalName = filename || `${safeTitle}.pdf`;
    doc.save(finalName);
    return finalName;
  }
}

if (typeof window !== 'undefined') {
  window.ScreenplayPdfExporter = ScreenplayPdfExporter;
}
