/**
 * ScriptCraft - Screenplay Editor Controller
 * Handles block manipulation, smart Enter/Tab keyboard navigation,
 * auto-suggestions for sluglines & characters, and typewriter scrolling.
 */

class ScreenplayEditor {
  constructor(containerElement, options = {}) {
    this.container = containerElement;
    this.options = {
      typewriterMode: false,
      onUpdate: () => {},
      ...options
    };

    this.blocks = [];
    this.activeBlockIndex = 0;
    this.knownCharacters = new Set();
    this.knownLocations = new Set();
    this.autocompleteActive = false;
    this.autocompleteIndex = 0;
    this.autocompleteItems = [];
    this.typewriterActive = false;

    this.initAutocompletePopup();
    this.bindEvents();
  }

  /**
   * Initialize autocomplete popup DOM
   */
  initAutocompletePopup() {
    this.popup = document.createElement('div');
    this.popup.className = 'autocomplete-popup hidden';
    document.body.appendChild(this.popup);

    // Click on suggestion
    this.popup.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const item = e.target.closest('.autocomplete-item');
      if (item) {
        const value = item.dataset.value;
        this.applyAutocomplete(value);
      }
    });
  }

  /**
   * Load structured blocks into the editor
   */
  loadBlocks(blocks) {
    this.blocks = blocks && blocks.length > 0 ? [...blocks] : [
      { id: 'b_' + Date.now(), type: ScreenplayElement.SCENE_HEADING, text: 'INT. ' }
    ];

    this.render();
    this.extractKnownEntities();
    this.notifyUpdate();
  }

  /**
   * Render all blocks to the editor DOM
   */
  render() {
    this.container.innerHTML = '';
    const fragment = document.createDocumentFragment();

    this.blocks.forEach((block, idx) => {
      const line = this.createBlockElement(block, idx);
      fragment.appendChild(line);
    });

    this.container.appendChild(fragment);
  }

  /**
   * Create DOM element for a single screenplay line
   */
  createBlockElement(block, idx) {
    const el = document.createElement('div');
    el.className = `screenplay-line element-${block.type}`;
    el.dataset.id = block.id;
    el.dataset.type = block.type;
    el.dataset.index = idx;
    el.setAttribute('contenteditable', 'true');
    el.setAttribute('spellcheck', 'true');

    // Display text
    el.textContent = block.text;

    // Placeholder when empty
    if (!block.text) {
      el.dataset.placeholder = ELEMENT_LABELS[block.type] || 'Write here...';
    }

    return el;
  }

  /**
   * Bind editor keyboard and input events
   */
  bindEvents() {
    this.container.addEventListener('keydown', (e) => this.handleKeyDown(e));
    this.container.addEventListener('input', (e) => this.handleInput(e));
    this.container.addEventListener('focusin', (e) => this.handleFocusIn(e));
    this.container.addEventListener('click', (e) => this.handleClick(e));

    // Close autocomplete on blur/click outside
    document.addEventListener('click', (e) => {
      if (!this.popup.contains(e.target) && !this.container.contains(e.target)) {
        this.hideAutocomplete();
      }
    });
  }

  /**
   * Handle Keydown (Enter, Tab, Backspace, Arrows)
   */
  handleKeyDown(e) {
    const lineEl = this.getActiveLineElement();
    if (!lineEl) return;

    const blockIndex = parseInt(lineEl.dataset.index, 10);
    const block = this.blocks[blockIndex];
    if (!block) return;

    // 1. Handle Autocomplete navigation
    if (this.autocompleteActive) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.navigateAutocomplete(1);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.navigateAutocomplete(-1);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        if (this.autocompleteItems.length > 0) {
          e.preventDefault();
          this.applyAutocomplete(this.autocompleteItems[this.autocompleteIndex]);
          return;
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        this.hideAutocomplete();
        return;
      }
    }

    // 2. Handle TAB key (cycles element type)
    if (e.key === 'Tab') {
      e.preventDefault();
      this.cycleElementType(blockIndex, e.shiftKey ? -1 : 1);
      return;
    }

    // 3. Handle ENTER key
    if (e.key === 'Enter') {
      e.preventDefault();
      this.handleEnterKey(lineEl, blockIndex, block);
      return;
    }

    // 4. Handle BACKSPACE key
    if (e.key === 'Backspace') {
      this.handleBackspaceKey(e, lineEl, blockIndex, block);
      return;
    }

    // 5. Parenthetical shortcut: typing '(' on Dialogue or Character
    if (e.key === '(' && (block.type === ScreenplayElement.DIALOGUE || block.type === ScreenplayElement.CHARACTER)) {
      const text = lineEl.textContent.trim();
      if (!text || (block.type === ScreenplayElement.DIALOGUE && this.getCaretOffset(lineEl) === 0)) {
        e.preventDefault();
        this.setBlockType(blockIndex, ScreenplayElement.PARENTHETICAL);
        lineEl.textContent = '(';
        this.setCaretPosition(lineEl, 1);
        return;
      }
    }
  }

  /**
   * Handle Enter key smart transition
   */
  handleEnterKey(lineEl, blockIndex, block) {
    const text = lineEl.textContent;
    const caretPos = this.getCaretOffset(lineEl);
    const textBefore = text.slice(0, caretPos);
    const textAfter = text.slice(caretPos);

    // Determine the next element type based on current element
    let nextType = ScreenplayElement.ACTION;

    switch (block.type) {
      case ScreenplayElement.SCENE_HEADING:
        nextType = ScreenplayElement.ACTION;
        break;
      case ScreenplayElement.ACTION:
        // Empty action line on double enter stays action
        nextType = ScreenplayElement.ACTION;
        break;
      case ScreenplayElement.CHARACTER:
        // Character + Enter -> Dialogue
        nextType = ScreenplayElement.DIALOGUE;
        break;
      case ScreenplayElement.PARENTHETICAL:
        // Parenthetical + Enter -> Dialogue
        nextType = ScreenplayElement.DIALOGUE;
        break;
      case ScreenplayElement.DIALOGUE:
        // Dialogue + Enter: if empty, turn to action; otherwise prompt for next Character
        if (!text.trim()) {
          this.setBlockType(blockIndex, ScreenplayElement.ACTION);
          return;
        }
        nextType = ScreenplayElement.CHARACTER;
        break;
      case ScreenplayElement.TRANSITION:
        nextType = ScreenplayElement.SCENE_HEADING;
        break;
      case ScreenplayElement.SHOT:
        nextType = ScreenplayElement.ACTION;
        break;
      default:
        nextType = ScreenplayElement.ACTION;
    }

    // Update current block text with text before caret
    block.text = textBefore;
    lineEl.textContent = textBefore;

    // Create new block with remaining text and nextType
    const newBlock = {
      id: 'b_' + Math.random().toString(36).substring(2, 9),
      type: nextType,
      text: textAfter
    };

    this.blocks.splice(blockIndex + 1, 0, newBlock);

    // Insert new element into DOM
    const newLineEl = this.createBlockElement(newBlock, blockIndex + 1);
    lineEl.after(newLineEl);

    // Refresh indices
    this.refreshIndices();

    // Focus on new element
    newLineEl.focus();
    this.setCaretPosition(newLineEl, 0);

    this.hideAutocomplete();
    this.extractKnownEntities();
    this.notifyUpdate();

    if (this.typewriterActive) {
      this.centerActiveLine(newLineEl);
    }
  }

  /**
   * Handle Backspace at start of line
   */
  handleBackspaceKey(e, lineEl, blockIndex, block) {
    const caretPos = this.getCaretOffset(lineEl);
    const text = lineEl.textContent;

    // If caret is at start of line (pos 0)
    if (caretPos === 0) {
      // If element is not Action and is empty, revert to Action or delete
      if (block.type !== ScreenplayElement.ACTION && !text.trim()) {
        e.preventDefault();
        this.setBlockType(blockIndex, ScreenplayElement.ACTION);
        return;
      }

      // If at start of line and previous block exists, merge with previous block
      if (blockIndex > 0) {
        e.preventDefault();
        const prevBlock = this.blocks[blockIndex - 1];
        const prevLineEl = this.getLineElementByIndex(blockIndex - 1);

        if (prevLineEl) {
          const originalPrevLength = prevBlock.text.length;
          prevBlock.text += text;
          prevLineEl.textContent = prevBlock.text;

          // Remove current block
          this.blocks.splice(blockIndex, 1);
          lineEl.remove();

          this.refreshIndices();

          // Set caret at merge point
          prevLineEl.focus();
          this.setCaretPosition(prevLineEl, originalPrevLength);

          this.extractKnownEntities();
          this.notifyUpdate();
        }
      }
    }
  }

  /**
   * Cycle element type on TAB or Shift+TAB
   */
  cycleElementType(blockIndex, direction = 1) {
    const block = this.blocks[blockIndex];
    if (!block) return;

    // Order of cycle: Action -> Character -> Parenthetical -> Dialogue -> Transition -> Scene Heading -> Shot
    const cycle = [
      ScreenplayElement.ACTION,
      ScreenplayElement.CHARACTER,
      ScreenplayElement.PARENTHETICAL,
      ScreenplayElement.DIALOGUE,
      ScreenplayElement.TRANSITION,
      ScreenplayElement.SCENE_HEADING,
      ScreenplayElement.SHOT
    ];

    const currentIdx = cycle.indexOf(block.type);
    let nextIdx = (currentIdx + direction + cycle.length) % cycle.length;
    this.setBlockType(blockIndex, cycle[nextIdx]);
  }

  /**
   * Set block element type explicitly
   */
  setBlockType(blockIndex, newType) {
    const block = this.blocks[blockIndex];
    if (!block) return;

    block.type = newType;
    const lineEl = this.getLineElementByIndex(blockIndex);
    if (lineEl) {
      // Update class
      lineEl.className = `screenplay-line element-${newType}`;
      lineEl.dataset.type = newType;

      // Auto-uppercase if needed
      if (newType === ScreenplayElement.CHARACTER || newType === ScreenplayElement.SCENE_HEADING || newType === ScreenplayElement.TRANSITION) {
        lineEl.textContent = lineEl.textContent.toUpperCase();
        block.text = lineEl.textContent;
      }
    }

    this.notifyUpdate();
  }

  /**
   * Handle Input event (typing, deleting, auto-caps, autocomplete trigger)
   */
  handleInput(e) {
    const lineEl = this.getActiveLineElement();
    if (!lineEl) return;

    const blockIndex = parseInt(lineEl.dataset.index, 10);
    const block = this.blocks[blockIndex];
    if (!block) return;

    let text = lineEl.textContent;

    // Auto-uppercase for Scene Heading, Character, Transition
    if (block.type === ScreenplayElement.SCENE_HEADING || block.type === ScreenplayElement.CHARACTER || block.type === ScreenplayElement.TRANSITION) {
      const caret = this.getCaretOffset(lineEl);
      const upper = text.toUpperCase();
      if (text !== upper) {
        lineEl.textContent = upper;
        this.setCaretPosition(lineEl, caret);
        text = upper;
      }
    }

    // Auto-detect element type if user types specific triggers on empty line
    if (block.type === ScreenplayElement.ACTION) {
      const upper = text.toUpperCase();
      if (SCENE_PREFIXES.some(p => upper.startsWith(p))) {
        this.setBlockType(blockIndex, ScreenplayElement.SCENE_HEADING);
      } else if (TRANSITIONS.includes(upper)) {
        this.setBlockType(blockIndex, ScreenplayElement.TRANSITION);
      }
    }

    block.text = text;

    // Check for autocomplete suggestions
    this.checkAutocomplete(lineEl, block);

    // Notify listeners for stats & scene list update
    this.notifyUpdate();

    if (this.typewriterActive) {
      this.centerActiveLine(lineEl);
    }
  }

  /**
   * Autocomplete trigger check
   */
  checkAutocomplete(lineEl, block) {
    const text = lineEl.textContent.trim().toUpperCase();

    // 1. Scene Heading Autocomplete
    if (block.type === ScreenplayElement.SCENE_HEADING) {
      // Suggest prefixes if short
      if (text.length <= 4) {
        const matches = ['INT. ', 'EXT. ', 'INT./EXT. ', 'EXT./INT. '].filter(p => p.startsWith(text) && p !== text);
        if (matches.length > 0) {
          this.showAutocomplete(lineEl, matches);
          return;
        }
      }

      // Suggest times of day after dash (e.g. INT. OFFICE - )
      if (text.includes(' - ')) {
        const parts = text.split(' - ');
        const timePart = parts[parts.length - 1].trim();
        const matches = SCENE_TIMES.filter(t => t.startsWith(timePart) && t !== timePart);
        if (matches.length > 0) {
          this.showAutocomplete(lineEl, matches, true);
          return;
        }
      }

      // Suggest known locations
      if (text.startsWith('INT. ') || text.startsWith('EXT. ')) {
        const prefix = text.startsWith('INT. ') ? 'INT. ' : 'EXT. ';
        const query = text.substring(prefix.length).trim();
        if (query.length > 0) {
          const matches = Array.from(this.knownLocations)
            .filter(loc => loc.startsWith(query) && loc !== query)
            .map(loc => prefix + loc);
          if (matches.length > 0) {
            this.showAutocomplete(lineEl, matches);
            return;
          }
        }
      }
    }

    // 2. Character Name Autocomplete
    if (block.type === ScreenplayElement.CHARACTER) {
      const query = text.trim();
      if (query.length >= 1) {
        const matches = Array.from(this.knownCharacters)
          .filter(name => name.startsWith(query) && name !== query);
        if (matches.length > 0) {
          this.showAutocomplete(lineEl, matches);
          return;
        }
      }
    }

    this.hideAutocomplete();
  }

  /**
   * Display autocomplete popup positioned below caret or line
   */
  showAutocomplete(lineEl, items, isSuffix = false) {
    this.autocompleteItems = items;
    this.autocompleteIndex = 0;
    this.autocompleteIsSuffix = isSuffix;

    this.popup.innerHTML = items.map((item, idx) => `
      <div class="autocomplete-item ${idx === 0 ? 'selected' : ''}" data-value="${item}">
        <span class="ac-text">${item}</span>
        <span class="ac-hint">${idx === 0 ? 'Enter/Tab' : ''}</span>
      </div>
    `).join('');

    const rect = lineEl.getBoundingClientRect();
    this.popup.style.top = `${rect.bottom + window.scrollY + 4}px`;
    this.popup.style.left = `${rect.left + window.scrollX + 24}px`;
    this.popup.classList.remove('hidden');
    this.autocompleteActive = true;
  }

  /**
   * Hide autocomplete popup
   */
  hideAutocomplete() {
    this.popup.classList.add('hidden');
    this.autocompleteActive = false;
    this.autocompleteItems = [];
  }

  /**
   * Navigate autocomplete suggestions
   */
  navigateAutocomplete(direction) {
    this.autocompleteIndex = (this.autocompleteIndex + direction + this.autocompleteItems.length) % this.autocompleteItems.length;
    const items = this.popup.querySelectorAll('.autocomplete-item');
    items.forEach((item, idx) => {
      item.classList.toggle('selected', idx === this.autocompleteIndex);
      if (idx === this.autocompleteIndex) {
        item.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  /**
   * Apply selected autocomplete suggestion
   */
  applyAutocomplete(value) {
    const lineEl = this.getActiveLineElement();
    if (!lineEl) return;

    const blockIndex = parseInt(lineEl.dataset.index, 10);
    const block = this.blocks[blockIndex];
    if (!block) return;

    if (this.autocompleteIsSuffix) {
      // Append or replace time part after dash
      const parts = lineEl.textContent.split(' - ');
      parts[parts.length - 1] = value;
      lineEl.textContent = parts.join(' - ');
    } else {
      lineEl.textContent = value;
    }

    block.text = lineEl.textContent;
    this.setCaretPosition(lineEl, lineEl.textContent.length);
    this.hideAutocomplete();
    this.extractKnownEntities();
    this.notifyUpdate();
  }

  /**
   * Handle line focus
   */
  handleFocusIn(e) {
    const lineEl = e.target.closest('.screenplay-line');
    if (lineEl) {
      this.activeBlockIndex = parseInt(lineEl.dataset.index, 10);
      if (this.typewriterActive) {
        this.centerActiveLine(lineEl);
      }
    }
  }

  handleClick(e) {
    const lineEl = e.target.closest('.screenplay-line');
    if (lineEl) {
      this.activeBlockIndex = parseInt(lineEl.dataset.index, 10);
    }
  }

  /**
   * Center active line vertically for Typewriter Scrolling
   */
  centerActiveLine(lineEl) {
    const rect = lineEl.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const scrollTarget = window.scrollY + rect.top - (windowHeight / 2);
    window.scrollTo({ top: scrollTarget, behavior: 'smooth' });
  }

  /**
   * Toggle Typewriter Mode
   */
  toggleTypewriter(enabled) {
    this.typewriterActive = enabled !== undefined ? enabled : !this.typewriterActive;
    if (this.typewriterActive) {
      const activeLine = this.getActiveLineElement();
      if (activeLine) this.centerActiveLine(activeLine);
    }
    return this.typewriterActive;
  }

  /**
   * Jump directly to scene by id
   */
  jumpToScene(sceneId) {
    const target = this.container.querySelector(`[data-id="${sceneId}"]`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.focus();
      this.setCaretPosition(target, 0);
      // Flash highlight
      target.classList.add('scene-flash');
      setTimeout(() => target.classList.remove('scene-flash'), 1200);
    }
  }

  /**
   * Refresh DOM index attributes
   */
  refreshIndices() {
    const lines = this.container.querySelectorAll('.screenplay-line');
    lines.forEach((el, idx) => {
      el.dataset.index = idx;
    });
  }

  /**
   * Extract known characters and locations for autocomplete cache
   */
  extractKnownEntities() {
    this.knownCharacters.clear();
    this.knownLocations.clear();

    for (const b of this.blocks) {
      if (b.type === ScreenplayElement.CHARACTER) {
        const baseName = b.text.replace(/\s*\([A-Z0-9\s\.\-']+\)$/, '').trim().toUpperCase();
        if (baseName) this.knownCharacters.add(baseName);
      } else if (b.type === ScreenplayElement.SCENE_HEADING) {
        const heading = b.text.toUpperCase();
        const match = heading.match(/^(?:INT\.|EXT\.|INT\.\/EXT\.|EXT\.\/INT\.)\s+(.+?)(?:\s*-\s*.*)?$/);
        if (match && match[1]) {
          this.knownLocations.add(match[1].trim());
        }
      }
    }
  }

  /**
   * Get currently focused line element
   */
  getActiveLineElement() {
    const sel = window.getSelection();
    if (!sel || !sel.anchorNode) return null;
    return sel.anchorNode.nodeType === Node.ELEMENT_NODE
      ? sel.anchorNode.closest('.screenplay-line')
      : sel.anchorNode.parentElement.closest('.screenplay-line');
  }

  getLineElementByIndex(index) {
    return this.container.querySelector(`[data-index="${index}"]`);
  }

  /**
   * Caret position helpers
   */
  getCaretOffset(element) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return 0;
    const range = sel.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    return preCaretRange.toString().length;
  }

  setCaretPosition(element, offset) {
    const range = document.createRange();
    const sel = window.getSelection();
    let currentOffset = 0;
    let found = false;

    function traverseNodes(node) {
      if (found) return;
      if (node.nodeType === Node.TEXT_NODE) {
        const nextOffset = currentOffset + node.length;
        if (offset >= currentOffset && offset <= nextOffset) {
          range.setStart(node, offset - currentOffset);
          range.collapse(true);
          found = true;
          return;
        }
        currentOffset = nextOffset;
      } else {
        for (let child of node.childNodes) {
          traverseNodes(child);
          if (found) return;
        }
      }
    }

    if (element.childNodes.length === 0) {
      range.setStart(element, 0);
      range.collapse(true);
    } else {
      traverseNodes(element);
      if (!found) {
        range.selectNodeContents(element);
        range.collapse(false);
      }
    }

    sel.removeAllRanges();
    sel.addRange(range);
  }

  notifyUpdate() {
    if (typeof this.options.onUpdate === 'function') {
      this.options.onUpdate(this.blocks);
    }
  }
}

if (typeof window !== 'undefined') {
  window.ScreenplayEditor = ScreenplayEditor;
}
