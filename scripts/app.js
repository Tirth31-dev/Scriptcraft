/**
 * ScriptCraft - Main Application Orchestrator
 * Connects Engine, Editor, Exporter, LocalStorage Autosave, Sidebar Views, and UI Modals.
 */

class ScriptCraftApp {
  constructor() {
    this.engine = new ScreenplayEngine();
    this.pdfExporter = new ScreenplayPdfExporter();
    this.ai = new AIScreenwritingService();
    this.currentStoryboards = [];
    this.currentViewMode = 'formatted'; // 'formatted' or 'fountain'
    this.currentTheme = localStorage.getItem('scriptcraft_theme') || 'dark';
    this.autoSaveTimer = null;
    this.notes = localStorage.getItem('scriptcraft_notes') || '';

    this.initDOM();
    this.initEditor();
    this.initEventListeners();
    this.applyTheme(this.currentTheme);
    this.loadInitialData();
  }

  /**
   * Cache DOM elements
   */
  initDOM() {
    // Header & Meta
    this.scriptTitleInput = document.getElementById('script-title-input');
    this.statPagesEl = document.getElementById('stat-pages');
    this.statWordsEl = document.getElementById('stat-words');
    this.statTimeEl = document.getElementById('stat-time');
    this.saveStatusEl = document.getElementById('save-status');

    // Sidebar Tabs
    this.sidebar = document.getElementById('app-sidebar');
    this.tabButtons = document.querySelectorAll('.sidebar-tab-btn');
    this.tabContents = document.querySelectorAll('.tab-content');
    this.sceneListContainer = document.getElementById('scene-list-container');
    this.characterListContainer = document.getElementById('character-list-container');
    this.sidebarStoryboardContainer = document.getElementById('sidebar-storyboard-container');
    this.scratchpadTextarea = document.getElementById('scratchpad-notes');
    this.sceneSearchInput = document.getElementById('scene-search-input');

    // Views
    this.formattedEditorContainer = document.getElementById('screenplay-editor-container');
    this.screenplayPaper = document.getElementById('screenplay-paper');
    this.fountainEditorContainer = document.getElementById('fountain-editor-container');
    this.fountainTextarea = document.getElementById('fountain-raw-textarea');

    // Modals
    this.titlePageModal = document.getElementById('title-page-modal');
    this.exportPdfModal = document.getElementById('export-pdf-modal');
    this.shortcutsModal = document.getElementById('shortcuts-modal');
    this.aiStudioModal = document.getElementById('ai-studio-modal');

    // Floating Element Switcher buttons
    this.elementButtons = document.querySelectorAll('.btn-element-switch');
  }

  /**
   * Initialize ScreenplayEditor instance
   */
  initEditor() {
    this.editor = new ScreenplayEditor(this.screenplayPaper, {
      onUpdate: (blocks) => this.handleContentUpdate(blocks)
    });
  }

  /**
   * Load initial data from localStorage or provide starter screenplay
   */
  loadInitialData() {
    const savedData = localStorage.getItem('scriptcraft_screenplay');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        this.engine.metadata = parsed.metadata || this.engine.metadata;
        this.editor.loadBlocks(parsed.blocks || []);
      } catch (err) {
        console.error('Failed to parse saved script, loading starter script', err);
        this.loadStarterScript();
      }
    } else {
      this.loadStarterScript();
    }

    if (this.scratchpadTextarea) {
      this.scratchpadTextarea.value = this.notes;
    }

    this.updateTitleDisplay();
    this.handleAIGenerateStoryboards();
  }

  /**
   * Load default starter script
   */
  loadStarterScript() {
    const starter = ScreenplayEngine.getStarterScript();
    this.engine.metadata = { ...starter.metadata };
    this.editor.loadBlocks(starter.blocks);
    this.updateTitleDisplay();
  }

  /**
   * Update script title everywhere
   */
  updateTitleDisplay() {
    const title = this.engine.metadata.title || 'UNTITLED SCREENPLAY';
    if (this.scriptTitleInput) {
      this.scriptTitleInput.value = title;
    }
    document.title = `${title} — ScriptCraft`;
  }

  /**
   * Content update handler (called on typing/modifying)
   */
  handleContentUpdate(blocks) {
    this.triggerAutosave(blocks);
    this.updateMetrics(blocks);
    this.updateSceneList(blocks);
    this.updateCharacterList(blocks);
    this.updateActiveElementHighlight();
  }

  /**
   * Trigger debounced autosave to LocalStorage
   */
  triggerAutosave(blocks) {
    if (this.saveStatusEl) {
      this.saveStatusEl.textContent = 'Saving...';
      this.saveStatusEl.classList.add('saving');
    }

    clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = setTimeout(() => {
      const dataToSave = {
        metadata: this.engine.metadata,
        blocks: blocks || this.editor.blocks,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem('scriptcraft_screenplay', JSON.stringify(dataToSave));

      if (this.saveStatusEl) {
        this.saveStatusEl.textContent = 'Autosaved';
        this.saveStatusEl.classList.remove('saving');
      }
    }, 600);
  }

  /**
   * Update screenplay metrics pills
   */
  updateMetrics(blocks) {
    const metrics = this.engine.calculateMetrics(blocks);

    if (this.statPagesEl) {
      this.statPagesEl.textContent = `${metrics.estimatedPages} ${metrics.estimatedPages === 1 ? 'Page' : 'Pages'}`;
    }
    if (this.statWordsEl) {
      this.statWordsEl.textContent = `${metrics.totalWords.toLocaleString()} Words`;
    }
    if (this.statTimeEl) {
      this.statTimeEl.textContent = `~${metrics.estimatedMinutes} Min`;
    }
  }

  /**
   * Update Scene Navigator tab
   */
  updateSceneList(blocks) {
    if (!this.sceneListContainer) return;

    const scenes = this.engine.extractScenes(blocks);
    const searchQuery = (this.sceneSearchInput?.value || '').toLowerCase().trim();

    const filteredScenes = scenes.filter(s =>
      !searchQuery || s.heading.toLowerCase().includes(searchQuery) || s.preview.toLowerCase().includes(searchQuery)
    );

    if (filteredScenes.length === 0) {
      this.sceneListContainer.innerHTML = `
        <div class="empty-state">
          <p>${searchQuery ? 'No scenes match your search' : 'No scenes yet. Start with INT. or EXT.'}</p>
        </div>
      `;
      return;
    }

    this.sceneListContainer.innerHTML = filteredScenes.map(scene => `
      <div class="scene-item" data-id="${scene.id}">
        <div class="scene-header">
          <span class="scene-num">#${scene.number}</span>
          <span class="scene-slug">${scene.heading}</span>
        </div>
        ${scene.preview ? `<div class="scene-preview">${scene.preview}</div>` : ''}
        <div class="scene-meta">
          <span>${scene.eighths}/8 page</span>
        </div>
      </div>
    `).join('');

    // Click scene to jump
    this.sceneListContainer.querySelectorAll('.scene-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.id;
        this.editor.jumpToScene(id);
      });
    });
  }

  /**
   * Update Character list tab
   */
  updateCharacterList(blocks) {
    if (!this.characterListContainer) return;

    const characters = this.engine.extractCharacters(blocks);

    if (characters.length === 0) {
      this.characterListContainer.innerHTML = `
        <div class="empty-state">
          <p>No characters yet. Type a character name in caps to begin speaking.</p>
        </div>
      `;
      return;
    }

    this.characterListContainer.innerHTML = characters.map(char => `
      <div class="character-card">
        <div class="character-header">
          <span class="character-avatar">${char.name.charAt(0)}</span>
          <div class="character-info">
            <span class="character-name">${char.name}</span>
            <span class="character-lines">${char.lineCount} ${char.lineCount === 1 ? 'line' : 'lines'}</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  /**
   * Update the active element highlight in the element switcher toolbar
   */
  updateActiveElementHighlight() {
    const activeEl = this.editor.getActiveLineElement();
    const currentType = activeEl ? activeEl.dataset.type : ScreenplayElement.ACTION;

    this.elementButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.element === currentType);
    });
  }

  /**
   * Bind event listeners for UI buttons and interactions
   */
  initEventListeners() {
    // Title rename
    if (this.scriptTitleInput) {
      this.scriptTitleInput.addEventListener('input', (e) => {
        this.engine.metadata.title = e.target.value.trim() || 'UNTITLED SCREENPLAY';
        document.title = `${this.engine.metadata.title} — ScriptCraft`;
        this.triggerAutosave(this.editor.blocks);
      });
    }

    // Sidebar tab switching
    this.tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        this.tabButtons.forEach(b => b.classList.toggle('active', b === btn));
        this.tabContents.forEach(c => c.classList.toggle('active', c.id === `tab-${tab}`));
      });
    });

    // Sidebar Scene search
    if (this.sceneSearchInput) {
      this.sceneSearchInput.addEventListener('input', () => {
        this.updateSceneList(this.editor.blocks);
      });
    }

    // Scratchpad notes saving
    if (this.scratchpadTextarea) {
      this.scratchpadTextarea.addEventListener('input', (e) => {
        this.notes = e.target.value;
        localStorage.setItem('scriptcraft_notes', this.notes);
      });
    }

    // Sidebar collapse toggle
    const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
    if (toggleSidebarBtn) {
      toggleSidebarBtn.addEventListener('click', () => {
        this.sidebar.classList.toggle('collapsed');
      });
    }

    // Theme toggle
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
      });
    }

    // Typewriter scrolling toggle
    const typewriterBtn = document.getElementById('typewriter-toggle-btn');
    if (typewriterBtn) {
      typewriterBtn.addEventListener('click', () => {
        const active = this.editor.toggleTypewriter();
        typewriterBtn.classList.toggle('active', active);
      });
    }

    // View Mode Toggle (Formatted <-> Fountain)
    const viewModeToggleBtn = document.getElementById('view-mode-toggle-btn');
    if (viewModeToggleBtn) {
      viewModeToggleBtn.addEventListener('click', () => {
        this.toggleViewMode();
      });
    }

    // Element switcher buttons
    this.elementButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.element;
        const lineEl = this.editor.getActiveLineElement();
        if (lineEl) {
          const idx = parseInt(lineEl.dataset.index, 10);
          this.editor.setBlockType(idx, type);
          lineEl.focus();
        }
      });
    });

    // Modals buttons
    document.getElementById('btn-open-title-page')?.addEventListener('click', () => this.openTitlePageModal());
    document.getElementById('btn-open-export-pdf')?.addEventListener('click', () => this.openExportPdfModal());
    document.getElementById('btn-open-shortcuts')?.addEventListener('click', () => this.shortcutsModal.classList.remove('hidden'));

    // Modal Close buttons
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.closest('.modal-overlay').classList.add('hidden');
      });
    });

    // Title page form submit
    document.getElementById('title-page-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveTitlePageModal();
    });

    // PDF Export form submit
    document.getElementById('pdf-export-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.executePdfExport();
    });

    // File Action Buttons
    document.getElementById('btn-new-script')?.addEventListener('click', () => this.createNewScript());
    document.getElementById('btn-starter-script')?.addEventListener('click', () => this.loadStarterScriptConfirm());
    document.getElementById('btn-export-fountain')?.addEventListener('click', () => this.exportFountainFile());
    document.getElementById('btn-export-json')?.addEventListener('click', () => this.exportJsonBackup());
    
    // Import trigger
    const fileImportInput = document.getElementById('file-import-input');
    document.getElementById('btn-import-file')?.addEventListener('click', () => fileImportInput.click());
    fileImportInput?.addEventListener('change', (e) => this.handleFileImport(e));

    // Global keyboard shortcut: Ctrl+S to save/notify, Ctrl+P to export PDF, '?' for shortcuts
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        this.triggerAutosave(this.editor.blocks);
        if (this.saveStatusEl) {
          this.saveStatusEl.textContent = 'Saved!';
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        this.openExportPdfModal();
      }
    });

    this.initAIEvents();
  }

  /**
   * Initialize AI Screenwriting Suite Event Listeners
   */
  initAIEvents() {
    // Open AI Studio Modal
    document.getElementById('btn-open-ai-studio')?.addEventListener('click', () => {
      this.aiStudioModal.classList.remove('hidden');
    });

    // AI Tab Switching
    document.querySelectorAll('.ai-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.aitab;
        document.querySelectorAll('.ai-tab-btn').forEach(b => b.classList.toggle('active', b === btn));
        document.querySelectorAll('.ai-tab-pane').forEach(p => p.classList.toggle('active', p.id === `ai-pane-${tab}`));
      });
    });

    // 1. Scene Writer Generate
    document.getElementById('btn-ai-generate-scene')?.addEventListener('click', async () => {
      await this.handleAIGenerateScene();
    });

    // 1. Scene Writer Insert
    document.getElementById('btn-ai-insert-scene')?.addEventListener('click', () => {
      this.handleAIInsertScene();
    });

    // 2. Humanizer Run
    document.getElementById('btn-ai-run-humanize')?.addEventListener('click', () => {
      this.handleAIRunHumanize();
    });

    // 2. Humanizer Apply
    document.getElementById('btn-ai-apply-humanized')?.addEventListener('click', () => {
      this.handleAIApplyHumanized();
    });

    // 3. Proofreader Run
    document.getElementById('btn-ai-run-proofread')?.addEventListener('click', () => {
      this.handleAIRunProofread();
    });

    // 3. Proofreader Fix All Typos
    document.getElementById('btn-ai-fix-all-typos')?.addEventListener('click', () => {
      this.handleAIFixAllTypos();
    });

    // 4. Storyboards Generate (Modal + Sidebar)
    document.getElementById('btn-ai-generate-storyboards')?.addEventListener('click', () => {
      this.handleAIGenerateStoryboards();
    });
    document.getElementById('btn-sidebar-gen-storyboards')?.addEventListener('click', () => {
      this.handleAIGenerateStoryboards();
    });

    // 5. Settings Save
    document.getElementById('btn-save-ai-settings')?.addEventListener('click', () => {
      const key = document.getElementById('ai-gemini-key')?.value.trim();
      this.ai.setApiKey(key);
      alert('AI API Key settings saved.');
    });

    // Pre-fill API key input if stored
    const keyInput = document.getElementById('ai-gemini-key');
    if (keyInput && this.ai.apiKey) {
      keyInput.value = this.ai.apiKey;
    }
  }

  /**
   * 1. AI Scene Writer: Generate
   */
  async handleAIGenerateScene() {
    const btn = document.getElementById('btn-ai-generate-scene');
    const origText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'Writing Detailed Scene...';

    const genre = document.getElementById('ai-gen-genre')?.value || 'Thriller';
    const setting = document.getElementById('ai-gen-setting')?.value || 'Subway Maintenance Tunnel';
    const charA = document.getElementById('ai-gen-chara')?.value || 'KALE';
    const charB = document.getElementById('ai-gen-charb')?.value || 'ROURKE';
    const conflict = document.getElementById('ai-gen-conflict')?.value || 'Stolen bypass key';

    try {
      this.generatedSceneBlocks = await this.ai.generateDetailedScene({
        genre, setting, charA, charB, conflict
      });

      const previewText = this.engine.serializeToFountain(this.generatedSceneBlocks, {});
      const previewBox = document.getElementById('ai-gen-preview-box');
      if (previewBox) {
        previewBox.textContent = previewText.trim();
      }

      document.getElementById('ai-gen-preview-container')?.classList.remove('hidden');
    } catch (err) {
      alert('Generation error: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = origText;
    }
  }

  /**
   * 1. AI Scene Writer: Insert into editor
   */
  handleAIInsertScene() {
    if (!this.generatedSceneBlocks || this.generatedSceneBlocks.length === 0) return;

    this.editor.blocks.push(...this.generatedSceneBlocks);
    this.editor.render();
    this.handleContentUpdate(this.editor.blocks);
    this.handleAIGenerateStoryboards();

    this.aiStudioModal.classList.add('hidden');
    alert(`Inserted ${this.generatedSceneBlocks.length} screenplay blocks into script!`);
  }

  /**
   * 2. AI Script Humanizer: Run
   */
  handleAIRunHumanize() {
    const res = this.ai.humanizeScript(this.editor.blocks);
    this.pendingHumanizedResult = res;

    const origText = this.engine.serializeToFountain(this.editor.blocks, {});
    const humText = this.engine.serializeToFountain(res.humanizedBlocks, {});

    document.getElementById('humanizer-original-box').textContent = origText.trim();
    document.getElementById('humanizer-result-box').textContent = humText.trim();

    const badge = document.getElementById('humanizer-mod-badge');
    if (badge) {
      badge.textContent = `${res.modificationsCount} dialogues polished & humanized`;
    }

    document.getElementById('btn-ai-apply-humanized')?.classList.remove('hidden');
  }

  /**
   * 2. AI Script Humanizer: Apply
   */
  handleAIApplyHumanized() {
    if (!this.pendingHumanizedResult) return;

    this.editor.loadBlocks(this.pendingHumanizedResult.humanizedBlocks);
    this.handleContentUpdate(this.editor.blocks);
    this.aiStudioModal.classList.add('hidden');
    alert('✓ Screenplay dialogues polished with natural human cadence and subtext!');
  }

  /**
   * 3. AI Proofreader: Scan
   */
  handleAIRunProofread() {
    const issues = this.ai.proofreadScript(this.editor.blocks);
    this.currentProofreadIssues = issues;

    const summaryText = document.getElementById('proofreader-summary-text');
    const fixAllBtn = document.getElementById('btn-ai-fix-all-typos');
    const container = document.getElementById('proofreader-issues-container');

    if (issues.length === 0) {
      summaryText.textContent = '✓ Screenplay is spotless! No spelling or tense issues found.';
      container.innerHTML = `
        <div class="empty-state">
          <p style="color: var(--accent-success); font-weight: 600;">✓ All action lines are in active present tense and no spelling errors were found.</p>
        </div>
      `;
      fixAllBtn?.classList.add('hidden');
      return;
    }

    const typoCount = issues.filter(i => i.category === 'Spelling & Typo').length;
    summaryText.textContent = `Found ${issues.length} screenplay issue${issues.length === 1 ? '' : 's'} (${typoCount} spelling)`;

    if (typoCount > 0) {
      fixAllBtn?.classList.remove('hidden');
    } else {
      fixAllBtn?.classList.add('hidden');
    }

    container.innerHTML = issues.map((issue) => `
      <div class="issue-card" id="card_${issue.id}">
        <div class="issue-header">
          <span class="issue-badge badge-${issue.type}">${issue.category}</span>
          <span style="font-size: 0.75rem; color: var(--text-faint);">Line ${issue.blockIndex + 1}</span>
        </div>
        <div class="issue-diff">
          <span class="diff-original">${issue.originalWord}</span>
          <span>&rarr;</span>
          <span class="diff-suggested">${issue.suggestion}</span>
        </div>
        <div class="issue-explanation">${issue.explanation}</div>
        <div class="issue-actions">
          <button class="btn btn-ghost" onclick="app.dismissIssue('${issue.id}')" style="font-size: 0.75rem; padding: 2px 8px;">Dismiss</button>
          <button class="btn btn-success" onclick="app.fixIssue('${issue.id}')" style="font-size: 0.75rem; padding: 2px 8px;">Fix</button>
        </div>
      </div>
    `).join('');
  }

  /**
   * Fix a single proofread issue
   */
  fixIssue(issueId) {
    const issue = this.currentProofreadIssues?.find(i => i.id === issueId);
    if (!issue) return;

    const block = this.editor.blocks[issue.blockIndex];
    if (block) {
      block.text = issue.suggestedText;
      const lineEl = this.editor.getLineElementByIndex(issue.blockIndex);
      if (lineEl) lineEl.textContent = issue.suggestedText;
      this.handleContentUpdate(this.editor.blocks);
    }

    document.getElementById(`card_${issueId}`)?.remove();
  }

  dismissIssue(issueId) {
    document.getElementById(`card_${issueId}`)?.remove();
  }

  /**
   * Fix all safe typos in one click
   */
  handleAIFixAllTypos() {
    if (!this.currentProofreadIssues) return;

    let fixed = 0;
    this.currentProofreadIssues.forEach(issue => {
      if (issue.category === 'Spelling & Typo') {
        const block = this.editor.blocks[issue.blockIndex];
        if (block) {
          block.text = issue.suggestedText;
          fixed++;
        }
      }
    });

    this.editor.render();
    this.handleContentUpdate(this.editor.blocks);
    this.handleAIRunProofread();
    alert(`Fixed ${fixed} spelling typos across the screenplay!`);
  }

  /**
   * 4. AI Storyboards: Generate drawings for all scenes
   */
  handleAIGenerateStoryboards() {
    this.currentStoryboards = this.ai.generateStoryboardsForScript(this.editor.blocks);
    this.renderStoryboards();
  }

  /**
   * Render storyboards in modal and sidebar
   */
  renderStoryboards() {
    const modalGrid = document.getElementById('modal-storyboard-grid');
    const sidebarList = document.getElementById('sidebar-storyboard-container');

    if (!this.currentStoryboards || this.currentStoryboards.length === 0) {
      if (sidebarList) sidebarList.innerHTML = '<div class="empty-state"><p>No scenes found to draw.</p></div>';
      if (modalGrid) modalGrid.innerHTML = '<div class="empty-state"><p>No scenes found to draw.</p></div>';
      return;
    }

    // Modal Grid Rendering
    if (modalGrid) {
      modalGrid.innerHTML = this.currentStoryboards.map(sb => `
        <div class="storyboard-card">
          <div class="storyboard-thumb-wrap">
            <img src="${sb.drawingUrl}" alt="${sb.sceneHeading}">
          </div>
          <div class="storyboard-card-body">
            <div class="storyboard-shot-title">
              <span>Scene ${sb.sceneNumber}: ${sb.shotType}</span>
            </div>
            <div class="storyboard-action-snippet">${sb.sceneHeading} — ${sb.actionText}</div>
            <div class="storyboard-card-footer">
              <span style="font-size: 0.7rem; color: var(--accent-primary); font-weight: 600;">${sb.cameraAngle}</span>
              <a href="${sb.drawingUrl}" download="${sb.sceneHeading.replace(/[^a-zA-Z0-9]/g, '_')}_shot.png" class="btn btn-ghost" style="font-size: 0.72rem; padding: 2px 6px;">
                ⬇ PNG
              </a>
            </div>
          </div>
        </div>
      `).join('');
    }

    // Sidebar List Rendering
    if (sidebarList) {
      sidebarList.innerHTML = this.currentStoryboards.map(sb => `
        <div class="sidebar-sb-card" onclick="app.editor.jumpToScene('${sb.id.replace('sb_', '')}')" title="${sb.sceneHeading}">
          <img src="${sb.drawingUrl}" alt="${sb.sceneHeading}">
          <div class="sidebar-sb-caption">#${sb.sceneNumber} ${sb.sceneHeading}</div>
        </div>
      `).join('');
    }
  }

  /**
   * Switch between Formatted Page View and Fountain Raw View
   */
  toggleViewMode() {
    if (this.currentViewMode === 'formatted') {
      // Sync blocks to Fountain text
      const fountainText = this.engine.serializeToFountain(this.editor.blocks, this.engine.metadata);
      this.fountainTextarea.value = fountainText;

      this.formattedEditorContainer.classList.add('hidden');
      this.fountainEditorContainer.classList.remove('hidden');
      this.currentViewMode = 'fountain';

      document.getElementById('view-mode-toggle-btn').innerHTML = `
        <span class="icon">📄</span> Formatted View
      `;
    } else {
      // Sync Fountain text back to blocks
      const fountainText = this.fountainTextarea.value;
      const parsed = this.engine.parseFountain(fountainText);
      this.engine.metadata = parsed.metadata;
      this.editor.loadBlocks(parsed.blocks);
      this.updateTitleDisplay();

      this.fountainEditorContainer.classList.add('hidden');
      this.formattedEditorContainer.classList.remove('hidden');
      this.currentViewMode = 'formatted';

      document.getElementById('view-mode-toggle-btn').innerHTML = `
        <span class="icon">🖋️</span> Fountain View
      `;
    }
  }

  /**
   * Apply Theme (Dark or Light)
   */
  applyTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('scriptcraft_theme', theme);

    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.innerHTML = theme === 'dark' ? '☀️ Light' : '🌙 Dark';
    }
  }

  /**
   * Open Title Page Modal & Populate
   */
  openTitlePageModal() {
    const meta = this.engine.metadata;
    document.getElementById('tp-title').value = meta.title || '';
    document.getElementById('tp-credit').value = meta.credit || 'Written by';
    document.getElementById('tp-author').value = meta.author || '';
    document.getElementById('tp-source').value = meta.source || '';
    document.getElementById('tp-date').value = meta.draftDate || '';
    document.getElementById('tp-contact').value = meta.contact || '';

    this.titlePageModal.classList.remove('hidden');
  }

  /**
   * Save Title Page Modal Data
   */
  saveTitlePageModal() {
    this.engine.metadata.title = document.getElementById('tp-title').value.trim() || 'UNTITLED SCREENPLAY';
    this.engine.metadata.credit = document.getElementById('tp-credit').value.trim();
    this.engine.metadata.author = document.getElementById('tp-author').value.trim();
    this.engine.metadata.source = document.getElementById('tp-source').value.trim();
    this.engine.metadata.draftDate = document.getElementById('tp-date').value.trim();
    this.engine.metadata.contact = document.getElementById('tp-contact').value.trim();

    this.updateTitleDisplay();
    this.titlePageModal.classList.add('hidden');
    this.triggerAutosave(this.editor.blocks);
  }

  /**
   * Open Export PDF Modal
   */
  openExportPdfModal() {
    // If currently in Fountain view, parse current text into blocks first
    if (this.currentViewMode === 'fountain') {
      const parsed = this.engine.parseFountain(this.fountainTextarea.value);
      this.editor.loadBlocks(parsed.blocks);
    }
    this.exportPdfModal.classList.remove('hidden');
  }

  /**
   * Execute PDF Generation & Download
   */
  async executePdfExport() {
    const btn = document.getElementById('btn-download-pdf');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'Generating Hollywood-Standard PDF...';

    const includeTitle = document.getElementById('pdf-opt-titlepage')?.checked;
    const includeSceneNums = document.getElementById('pdf-opt-scenenums')?.checked;
    const watermarkText = document.getElementById('pdf-opt-watermark')?.value.trim();

    try {
      await this.pdfExporter.downloadPdf(
        this.editor.blocks,
        this.engine.metadata,
        {
          includeTitlePage: includeTitle,
          includeSceneNumbers: includeSceneNums,
          watermark: watermarkText
        }
      );

      btn.innerHTML = '✓ Downloaded!';
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
        this.exportPdfModal.classList.add('hidden');
      }, 1200);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('Failed to generate PDF: ' + err.message);
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }

  /**
   * Create New Blank Script
   */
  createNewScript() {
    if (confirm('Create a new screenplay? Make sure you have exported any work you wish to keep.')) {
      this.engine.metadata = {
        title: 'UNTITLED SCREENPLAY',
        credit: 'Written by',
        author: 'Screenwriter',
        source: '',
        draftDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        contact: ''
      };
      this.editor.loadBlocks([
        { id: 'b_init', type: ScreenplayElement.SCENE_HEADING, text: 'INT. ' }
      ]);
      this.updateTitleDisplay();
    }
  }

  loadStarterScriptConfirm() {
    if (confirm('Load sample screenplay "Neon Midnight"? Any unsaved changes will be replaced.')) {
      this.loadStarterScript();
    }
  }

  /**
   * Export .fountain file
   */
  exportFountainFile() {
    const fountainText = this.engine.serializeToFountain(this.editor.blocks, this.engine.metadata);
    const blob = new Blob([fountainText], { type: 'text/plain;charset=utf-8' });
    const filename = `${this.engine.metadata.title.replace(/[^a-zA-Z0-9_\-]/g, '_')}.fountain`;
    this.triggerFileDownload(blob, filename);
  }

  /**
   * Export JSON project backup
   */
  exportJsonBackup() {
    const data = {
      version: '1.0',
      metadata: this.engine.metadata,
      blocks: this.editor.blocks,
      notes: this.notes,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const filename = `${this.engine.metadata.title.replace(/[^a-zA-Z0-9_\-]/g, '_')}_backup.json`;
    this.triggerFileDownload(blob, filename);
  }

  /**
   * Import .fountain, .txt, or .json file
   */
  async handleFileImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    e.target.value = ''; // Reset input

    if (file.name.endsWith('.json')) {
      try {
        const parsed = JSON.parse(text);
        if (parsed.metadata) this.engine.metadata = parsed.metadata;
        if (parsed.blocks) this.editor.loadBlocks(parsed.blocks);
        if (parsed.notes && this.scratchpadTextarea) {
          this.notes = parsed.notes;
          this.scratchpadTextarea.value = parsed.notes;
        }
        this.updateTitleDisplay();
        alert('Script project restored successfully!');
      } catch (err) {
        alert('Invalid JSON script project file.');
      }
    } else {
      // Fountain or plain text
      const parsed = this.engine.parseFountain(text);
      this.engine.metadata = parsed.metadata;
      this.editor.loadBlocks(parsed.blocks);
      this.updateTitleDisplay();
      alert(`Imported ${parsed.blocks.length} screenplay blocks!`);
    }
  }

  triggerFileDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
  window.app = new ScriptCraftApp();
});
