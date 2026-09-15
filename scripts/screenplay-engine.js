/**
 * ScriptCraft - Screenplay Engine
 * Handles screenplay element definitions, Fountain parsing & serialization,
 * character tracking, scene extraction, and screenplay metrics.
 */

const ScreenplayElement = {
  SCENE_HEADING: 'scene_heading',
  ACTION: 'action',
  CHARACTER: 'character',
  PARENTHETICAL: 'parenthetical',
  DIALOGUE: 'dialogue',
  TRANSITION: 'transition',
  SHOT: 'shot'
};

const ELEMENT_LABELS = {
  [ScreenplayElement.SCENE_HEADING]: 'Scene Heading',
  [ScreenplayElement.ACTION]: 'Action',
  [ScreenplayElement.CHARACTER]: 'Character',
  [ScreenplayElement.PARENTHETICAL]: 'Parenthetical',
  [ScreenplayElement.DIALOGUE]: 'Dialogue',
  [ScreenplayElement.TRANSITION]: 'Transition',
  [ScreenplayElement.SHOT]: 'Shot'
};

const SCENE_PREFIXES = [
  'INT. ', 'EXT. ', 'INT./EXT. ', 'EXT./INT. ', 'I/E ', 'EST. '
];

const SCENE_TIMES = [
  'DAY', 'NIGHT', 'DUSK', 'DAWN', 'LATER', 'MOMENTS LATER', 'CONTINUOUS', 'SAME TIME', 'SUNSET', 'SUNRISE'
];

const TRANSITIONS = [
  'CUT TO:', 'FADE IN:', 'FADE OUT.', 'FADE TO BLACK.', 'DISSOLVE TO:', 'SMASH CUT TO:', 'JUMP CUT TO:', 'MATCH CUT TO:'
];

class ScreenplayEngine {
  constructor() {
    this.metadata = {
      title: 'UNTITLED SCREENPLAY',
      credit: 'Written by',
      author: 'Anonymous Writer',
      source: '',
      draftDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      contact: 'Contact Info / Agent / Email'
    };
  }

  /**
   * Determine the most likely element type for a single line of text
   */
  static inferElementType(line, previousElement = null) {
    const trimmed = line.trim();
    if (!trimmed) return ScreenplayElement.ACTION;

    const upper = trimmed.toUpperCase();

    // Explicit Fountain markers
    if (trimmed.startsWith('.')) return ScreenplayElement.SCENE_HEADING;
    if (trimmed.startsWith('@')) return ScreenplayElement.CHARACTER;
    if (trimmed.startsWith('>')) return ScreenplayElement.TRANSITION;
    if (trimmed.startsWith('~')) return ScreenplayElement.ACTION;

    // Scene Headings
    if (SCENE_PREFIXES.some(prefix => upper.startsWith(prefix))) {
      return ScreenplayElement.SCENE_HEADING;
    }

    // Transitions
    if (TRANSITIONS.includes(upper) || upper.endsWith('TO:')) {
      return ScreenplayElement.TRANSITION;
    }

    // Parentheticals: starts with ( and ends with )
    if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
      return ScreenplayElement.PARENTHETICAL;
    }

    // Shot indicators
    if (/^(CLOSE ON|ANGLE ON|WIDE SHOT|POV|BACK TO SCENE|INSERT)/i.test(trimmed)) {
      return ScreenplayElement.SHOT;
    }

    // Context-sensitive detection
    if (previousElement === ScreenplayElement.CHARACTER || previousElement === ScreenplayElement.PARENTHETICAL) {
      if (!trimmed.startsWith('(')) {
        return ScreenplayElement.DIALOGUE;
      }
    }

    // Character: all-caps line (allowing V.O., O.S., CONT'D)
    const isCharacterFormat = /^([A-Z0-9\s\.\-']+(\([A-Z0-9\s\.\-']+\))?)$/.test(trimmed);
    if (isCharacterFormat && trimmed.length < 40 && trimmed === upper && previousElement !== ScreenplayElement.CHARACTER) {
      // Avoid false positive if it looks like an all-caps short action line
      if (!trimmed.endsWith('.') && !trimmed.endsWith(',')) {
        return ScreenplayElement.CHARACTER;
      }
    }

    return ScreenplayElement.ACTION;
  }

  /**
   * Parse full Fountain formatted text into structured blocks and metadata
   */
  parseFountain(fountainText) {
    const lines = fountainText.split(/\r?\n/);
    const blocks = [];
    const metadata = { ...this.metadata };

    let inTitlePage = true;
    let titleKey = null;
    let previousElement = null;

    let i = 0;
    // 1. Process Title Page (key: value pairs at top before first blank line or heading)
    for (; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === '') {
        if (inTitlePage && Object.keys(metadata).length > 0 && lines.slice(0, i).some(l => l.includes(':'))) {
          inTitlePage = false;
          i++;
          break;
        }
        continue;
      }

      const titleMatch = line.match(/^([A-Za-z\s]+):\s*(.*)$/);
      if (inTitlePage && titleMatch) {
        titleKey = titleMatch[1].trim().toLowerCase();
        const value = titleMatch[2].trim();
        if (titleKey === 'title') metadata.title = value;
        else if (titleKey === 'credit') metadata.credit = value;
        else if (titleKey === 'author' || titleKey === 'authors') metadata.author = value;
        else if (titleKey === 'source') metadata.source = value;
        else if (titleKey === 'draft date' || titleKey === 'date') metadata.draftDate = value;
        else if (titleKey === 'contact') metadata.contact = value;
      } else if (inTitlePage && line.startsWith('   ') && titleKey) {
        // Multi-line title page field
        if (titleKey === 'contact') metadata.contact += '\n' + line.trim();
      } else {
        // First non-title line encountered
        inTitlePage = false;
        break;
      }
    }

    // 2. Process Screenplay Body
    for (; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        // Blank line resets context (after dialogue/action)
        previousElement = null;
        continue;
      }

      // Check Fountain forced markers
      let cleanText = trimmed;
      let type = null;

      if (trimmed.startsWith('.')) {
        type = ScreenplayElement.SCENE_HEADING;
        cleanText = trimmed.substring(1).trim();
      } else if (trimmed.startsWith('@')) {
        type = ScreenplayElement.CHARACTER;
        cleanText = trimmed.substring(1).trim();
      } else if (trimmed.startsWith('>')) {
        if (trimmed.endsWith('<')) {
          type = ScreenplayElement.ACTION; // Centered text in Fountain
          cleanText = trimmed.slice(1, -1).trim();
        } else {
          type = ScreenplayElement.TRANSITION;
          cleanText = trimmed.substring(1).trim();
        }
      } else if (trimmed.startsWith('~')) {
        type = ScreenplayElement.ACTION;
        cleanText = trimmed.substring(1).trim();
      } else {
        type = ScreenplayEngine.inferElementType(cleanText, previousElement);
      }

      blocks.push({
        id: 'blk_' + Math.random().toString(36).substring(2, 9),
        type: type,
        text: cleanText
      });

      previousElement = type;
    }

    this.metadata = metadata;
    return { metadata, blocks };
  }

  /**
   * Serialize structured blocks back into standard Fountain text format
   */
  serializeToFountain(blocks, metadata = this.metadata) {
    let output = '';

    // Title page header
    if (metadata.title) output += `Title: ${metadata.title}\n`;
    if (metadata.credit) output += `Credit: ${metadata.credit}\n`;
    if (metadata.author) output += `Author: ${metadata.author}\n`;
    if (metadata.source) output += `Source: ${metadata.source}\n`;
    if (metadata.draftDate) output += `Draft date: ${metadata.draftDate}\n`;
    if (metadata.contact) {
      const contactLines = metadata.contact.split('\n');
      output += `Contact:\n    ${contactLines.join('\n    ')}\n`;
    }
    output += '\n\n';

    // Blocks
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      const prev = blocks[i - 1];

      switch (b.type) {
        case ScreenplayElement.SCENE_HEADING:
          output += `\n\n${b.text.toUpperCase()}\n\n`;
          break;
        case ScreenplayElement.CHARACTER:
          output += `\n\n${b.text.toUpperCase()}\n`;
          break;
        case ScreenplayElement.PARENTHETICAL:
          output += `${b.text.startsWith('(') ? b.text : '(' + b.text + ')'}\n`;
          break;
        case ScreenplayElement.DIALOGUE:
          output += `${b.text}\n`;
          break;
        case ScreenplayElement.TRANSITION:
          output += `\n\n> ${b.text.toUpperCase()}\n\n`;
          break;
        case ScreenplayElement.SHOT:
          output += `\n\n${b.text.toUpperCase()}\n\n`;
          break;
        case ScreenplayElement.ACTION:
        default:
          output += (prev && prev.type === ScreenplayElement.ACTION ? '\n' : '\n\n') + b.text;
          break;
      }
    }

    return output.trim();
  }

  /**
   * Extract list of scenes for Scene Navigator
   */
  extractScenes(blocks) {
    const scenes = [];
    let currentScene = null;
    let sceneIndex = 1;
    let currentBlockCount = 0;

    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (b.type === ScreenplayElement.SCENE_HEADING) {
        if (currentScene) {
          currentScene.blockCount = currentBlockCount;
          currentScene.eighths = Math.max(1, Math.round(currentBlockCount / 6));
        }
        currentBlockCount = 0;
        currentScene = {
          id: b.id,
          number: sceneIndex++,
          heading: b.text.toUpperCase(),
          blockIndex: i,
          eighths: 1,
          preview: ''
        };
        scenes.push(currentScene);
      } else {
        currentBlockCount++;
        if (currentScene && !currentScene.preview && b.type === ScreenplayElement.ACTION) {
          currentScene.preview = b.text.substring(0, 80) + (b.text.length > 80 ? '...' : '');
        }
      }
    }

    if (currentScene) {
      currentScene.blockCount = currentBlockCount;
      currentScene.eighths = Math.max(1, Math.round(currentBlockCount / 6));
    }

    return scenes;
  }

  /**
   * Extract characters roster with dialogue counts
   */
  extractCharacters(blocks) {
    const characterMap = new Map();

    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (b.type === ScreenplayElement.CHARACTER) {
        const rawName = b.text.trim().toUpperCase();
        const baseName = rawName.replace(/\s*\([A-Z0-9\s\.\-']+\)$/, '').trim();
        if (!baseName) continue;

        if (!characterMap.has(baseName)) {
          characterMap.set(baseName, {
            name: baseName,
            lineCount: 0,
            firstAppearanceIndex: i
          });
        }
        const entry = characterMap.get(baseName);
        entry.lineCount++;
      }
    }

    return Array.from(characterMap.values()).sort((a, b) => b.lineCount - a.lineCount);
  }

  /**
   * Calculate screenplay statistics
   */
  calculateMetrics(blocks) {
    let totalWords = 0;
    let dialogueWords = 0;
    let actionWords = 0;
    let lineLinesCount = 0;

    for (const b of blocks) {
      const words = b.text.trim().split(/\s+/).filter(Boolean).length;
      totalWords += words;

      if (b.type === ScreenplayElement.DIALOGUE) dialogueWords += words;
      else if (b.type === ScreenplayElement.ACTION) actionWords += words;

      const lineLen = b.type === ScreenplayElement.DIALOGUE ? 35 : (b.type === ScreenplayElement.CHARACTER ? 25 : 60);
      const visualLines = Math.max(1, Math.ceil(b.text.length / lineLen));
      lineLinesCount += visualLines;

      if (b.type === ScreenplayElement.SCENE_HEADING) lineLinesCount += 2;
      else if (b.type === ScreenplayElement.CHARACTER) lineLinesCount += 1;
      else if (b.type === ScreenplayElement.TRANSITION) lineLinesCount += 2;
      else lineLinesCount += 1;
    }

    const estimatedPages = Math.max(1, Math.ceil(lineLinesCount / 54));
    const estimatedMinutes = estimatedPages;

    return {
      totalWords,
      estimatedPages,
      estimatedMinutes,
      dialogueRatio: totalWords > 0 ? Math.round((dialogueWords / totalWords) * 100) : 0,
      actionRatio: totalWords > 0 ? Math.round((actionWords / totalWords) * 100) : 0,
      totalBlocks: blocks.length
    };
  }

  /**
   * Starter screenplay sample
   */
  static getStarterScript() {
    return {
      metadata: {
        title: 'NEON MIDNIGHT',
        credit: 'Written by',
        author: 'Screenwriter',
        source: 'Original Story',
        draftDate: 'September 2026',
        contact: 'writer@screenplay.io\nLos Angeles, CA'
      },
      blocks: [
        { id: 'b1', type: ScreenplayElement.SCENE_HEADING, text: 'EXT. ROOFTOP HELIPAD - NIGHT' },
        { id: 'b2', type: ScreenplayElement.ACTION, text: 'Rain hammers the reflective tarmac. Neon reflections from the skyscrapers below fracture into kaleidoscopic puddles.' },
        { id: 'b3', type: ScreenplayElement.ACTION, text: 'ELENA VANCE (30s), drenched in a storm-gray trench coat, clutches an aluminum briefcase like it holds the last breath of the world.' },
        { id: 'b4', type: ScreenplayElement.ACTION, text: 'Footsteps approach behind her. Slow. Measured.' },
        { id: 'b5', type: ScreenplayElement.CHARACTER, text: 'MARCUS (O.S.)' },
        { id: 'b6', type: ScreenplayElement.DIALOGUE, text: 'You should have taken the train, Elena.' },
        { id: 'b7', type: ScreenplayElement.ACTION, text: 'Elena freezes, thumb resting over the case\'s biometric lock.' },
        { id: 'b8', type: ScreenplayElement.CHARACTER, text: 'ELENA' },
        { id: 'b9', type: ScreenplayElement.PARENTHETICAL, text: '(without turning)' },
        { id: 'b10', type: ScreenplayElement.DIALOGUE, text: 'The trains don\'t run where I\'m going.' },
        { id: 'b11', type: ScreenplayElement.CHARACTER, text: 'MARCUS' },
        { id: 'b12', type: ScreenplayElement.DIALOGUE, text: 'Nowhere does. Put the case down.' },
        { id: 'b13', type: ScreenplayElement.ACTION, text: 'A lightning crack splits the skyline, illuminating Marcus stepping from the shadows—pistol lowered, eyes hollow.' },
        { id: 'b14', type: ScreenplayElement.CHARACTER, text: 'ELENA' },
        { id: 'b15', type: ScreenplayElement.DIALOGUE, text: 'If I let this go, the whole grid goes dark by sunrise. You know that.' },
        { id: 'b16', type: ScreenplayElement.CHARACTER, text: 'MARCUS' },
        { id: 'b17', type: ScreenplayElement.PARENTHETICAL, text: '(a sad smile)' },
        { id: 'b18', type: ScreenplayElement.DIALOGUE, text: 'Maybe the dark is what we deserve.' },
        { id: 'b19', type: ScreenplayElement.TRANSITION, text: 'SMASH CUT TO:' },
        { id: 'b20', type: ScreenplayElement.SCENE_HEADING, text: 'INT. UNDERGROUND POWER SUBSTATION - CONTINUOUS' },
        { id: 'b21', type: ScreenplayElement.ACTION, text: 'Rows of monolithic cooling towers hum with menacing vibration. Warning lights FLASH AMBER.' },
        { id: 'b22', type: ScreenplayElement.ACTION, text: 'TECH OPERATOR JAX (20s) scrambles frantically across the terminal bank.' },
        { id: 'b23', type: ScreenplayElement.CHARACTER, text: 'JAX' },
        { id: 'b24', type: ScreenplayElement.DIALOGUE, text: 'Sector four is bleeding voltage! We need the bypass key now!' }
      ]
    };
  }
}

if (typeof window !== 'undefined') {
  window.ScreenplayEngine = ScreenplayEngine;
  window.ScreenplayElement = ScreenplayElement;
  window.ELEMENT_LABELS = ELEMENT_LABELS;
  window.SCENE_PREFIXES = SCENE_PREFIXES;
  window.SCENE_TIMES = SCENE_TIMES;
  window.TRANSITIONS = TRANSITIONS;
}
