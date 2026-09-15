/**
 * ScriptCraft - AI Screenwriting Suite
 * 1. AI Grammar, Spelling & Screenplay Rule Proofreader
 * 2. AI Detailed Script & Scene Generator
 * 3. AI-to-Human Script Humanizer (Subtext & De-cliché Engine)
 * 4. AI Auto Storyboard Drawing & Cinematography Generator
 */

class AIScreenwritingService {
  constructor() {
    this.canvasRenderer = new StoryboardCanvasRenderer();
    this.apiKey = localStorage.getItem('scriptcraft_gemini_key') || '';
    
    // Screenwriting-specific past tense to present tense dictionary
    this.pastToPresentMap = {
      'walked': 'walks', 'ran': 'runs', 'looked': 'looks', 'opened': 'opens',
      'closed': 'closes', 'stepped': 'steps', 'turned': 'turns', 'pulled': 'pulls',
      'pushed': 'pushes', 'grabbed': 'grabs', 'screamed': 'screams', 'whispered': 'whispers',
      'smiled': 'smiles', 'frowned': 'frowns', 'sat': 'sits', 'stood': 'stands',
      'watched': 'watches', 'stared': 'stares', 'noticed': 'notices', 'dropped': 'drops',
      'picked': 'picks', 'rushed': 'rushes', 'stopped': 'stops', 'fired': 'fires',
      'aimed': 'aims', 'reached': 'reaches', 'drove': 'drives', 'entered': 'enters',
      'exited': 'exits', 'nodded': 'nods', 'shook': 'shakes', 'glanced': 'glances'
    };

    // Common spelling typos
    this.spellingDict = {
      'scripet': 'script', 'scripe': 'script', 'counvert': 'convert', 'morden': 'modern',
      'seperate': 'separate', 'definately': 'definitely', 'occured': 'occurred',
      'untill': 'until', 'recieve': 'receive', 'beleive': 'believe', 'tommorow': 'tomorrow',
      'wierd': 'weird', 'alot': 'a lot', 'truely': 'truly', 'neccessary': 'necessary'
    };
  }

  // =========================================================================
  // 1. AI Grammar, Spelling & Screenplay Rule Proofreader
  // =========================================================================

  /**
   * Scans script blocks for typos, past-tense narrative, unfilmable thoughts, and passive voice
   */
  proofreadScript(blocks) {
    const issues = [];

    blocks.forEach((block, idx) => {
      const text = block.text;
      if (!text.trim()) return;

      // 1. Check Typos & Misspellings
      const words = text.split(/[\s,\.\?!;:"\(\)]+/);
      words.forEach(word => {
        const lower = word.toLowerCase();
        if (this.spellingDict[lower]) {
          const regex = new RegExp(`\\b${word}\\b`, 'g');
          const fixed = text.replace(regex, this.spellingDict[lower]);
          issues.push({
            id: `issue_${idx}_spell_${word}`,
            blockId: block.id,
            blockIndex: idx,
            category: 'Spelling & Typo',
            type: 'typo',
            originalWord: word,
            suggestion: this.spellingDict[lower],
            originalText: text,
            suggestedText: fixed,
            explanation: `Misspelled word "${word}". Industry scripts should be typo-free.`
          });
        }
      });

      // 2. Check Past Tense in Action blocks (Hollywood requires Active Present Tense)
      if (block.type === ScreenplayElement.ACTION) {
        Object.entries(this.pastToPresentMap).forEach(([past, present]) => {
          const regex = new RegExp(`\\b${past}\\b`, 'gi');
          if (regex.test(text)) {
            const fixed = text.replace(regex, present);
            issues.push({
              id: `issue_${idx}_tense_${past}`,
              blockId: block.id,
              blockIndex: idx,
              category: 'Screenplay Grammar',
              type: 'past_tense',
              originalWord: past,
              suggestion: present,
              originalText: text,
              suggestedText: fixed,
              explanation: `Past tense "${past}" detected. Screenplays must be in active present tense ("${present}").`
            });
          }
        });

        // 3. Check Unfilmable Internal Thoughts
        const unfilmableRegex = /\b(remembers|thinks about|wonders why|feels guilty|feels sad|ponders|reminisces|knows that|realizes that)\b/i;
        const match = text.match(unfilmableRegex);
        if (match) {
          issues.push({
            id: `issue_${idx}_unfilmable`,
            blockId: block.id,
            blockIndex: idx,
            category: 'Unfilmable Action',
            type: 'unfilmable',
            originalWord: match[0],
            suggestion: 'Show via physical action/expression',
            originalText: text,
            suggestedText: text,
            explanation: `"${match[0]}" is an unfilmable thought. The camera cannot film what a character thinks—show it through a physical gesture, expression, or prop.`
          });
        }

        // 4. Check Passive Voice ("is seen", "can be heard", "begins to")
        const passiveMap = [
          { pattern: /\bis seen (walking|running|entering|standing)\b/i, fix: (m) => m[1] + 's', desc: 'Passive construction "is seen"' },
          { pattern: /\bcan be heard\b/i, fix: 'echoes', desc: 'Passive construction "can be heard"' },
          { pattern: /\bbegins to (\w+)\b/i, fix: (m) => m[1] + 's', desc: 'Unnecessary filter "begins to"' },
          { pattern: /\bstarts to (\w+)\b/i, fix: (m) => m[1] + 's', desc: 'Unnecessary filter "starts to"' }
        ];

        passiveMap.forEach((rule, pIdx) => {
          if (rule.pattern.test(text)) {
            const fixed = text.replace(rule.pattern, typeof rule.fix === 'function' ? rule.fix : rule.fix);
            issues.push({
              id: `issue_${idx}_passive_${pIdx}`,
              blockId: block.id,
              blockIndex: idx,
              category: 'Active Screenplay Voice',
              type: 'passive_voice',
              originalWord: text.match(rule.pattern)[0],
              suggestion: 'Use direct punchy verb',
              originalText: text,
              suggestedText: fixed,
              explanation: `${rule.desc} slows down reading pace. Use direct active verbs.`
            });
          }
        });
      }
    });

    return issues;
  }

  // =========================================================================
  // 2. AI Detailed Script & Scene Generator
  // =========================================================================

  /**
   * Generates a fully formatted, multi-beat screenplay scene from prompt parameters
   */
  async generateDetailedScene(params = {}) {
    const genre = params.genre || 'Thriller';
    const setting = params.setting || 'Subway Tunnel';
    const charA = (params.charA || 'KALE').toUpperCase();
    const charB = (params.charB || 'ROURKE').toUpperCase();
    const conflict = params.conflict || 'One character discovers the other is an undercover agent';
    const tone = params.tone || 'Gritty and tense';

    // If Gemini API Key is configured, attempt live generation
    if (this.apiKey) {
      try {
        const liveResult = await this.callGeminiSceneGenerator(params);
        if (liveResult && liveResult.length > 0) return liveResult;
      } catch (err) {
        console.warn('Gemini live generation failed, falling back to smart procedural generator:', err);
      }
    }

    // High-quality procedural screenplay scene generation
    const slugline = `INT. ${setting.toUpperCase()} - NIGHT`;
    const blocks = [];

    blocks.push({ id: 'gen_1', type: ScreenplayElement.SCENE_HEADING, text: slugline });
    blocks.push({
      id: 'gen_2',
      type: ScreenplayElement.ACTION,
      text: `Flashing fluorescent strobes hum above. Condensation drips into iron grates below. The atmosphere is thick, ${tone.toLowerCase()}.`
    });
    blocks.push({
      id: 'gen_3',
      type: ScreenplayElement.ACTION,
      text: `${charA} backs against a rusted support pillar, breath ragged. ${charB} emerges from the fog, hands visible, calculating every step.`
    });
    blocks.push({ id: 'gen_4', type: ScreenplayElement.CHARACTER, text: charB });
    blocks.push({
      id: 'gen_5',
      type: ScreenplayElement.DIALOGUE,
      text: `You didn't have to run. We had a timeline.`
    });
    blocks.push({ id: 'gen_6', type: ScreenplayElement.CHARACTER, text: charA });
    blocks.push({ id: 'gen_7', type: ScreenplayElement.PARENTHETICAL, text: '(tight, bitter laugh)' });
    blocks.push({
      id: 'gen_8',
      type: ScreenplayElement.DIALOGUE,
      text: `Your timeline ended the second you wired the access codes to Langley.`
    });
    blocks.push({
      id: 'gen_9',
      type: ScreenplayElement.ACTION,
      text: `${charB} pauses. A faint metallic click echoes through the vault. ${conflict}.`
    });
    blocks.push({ id: 'gen_10', type: ScreenplayElement.CHARACTER, text: charB });
    blocks.push({
      id: 'gen_11',
      type: ScreenplayElement.DIALOGUE,
      text: `Nobody walks out of this clean, ${charA}. You hand over the drive, or we both become the casualty report.`
    });
    blocks.push({ id: 'gen_12', type: ScreenplayElement.CHARACTER, text: charA });
    blocks.push({
      id: 'gen_13',
      type: ScreenplayElement.DIALOGUE,
      text: `Then let it burn.`
    });
    blocks.push({
      id: 'gen_14',
      type: ScreenplayElement.ACTION,
      text: `${charA} SLAMS the emergency release lever. Hydraulic sirens HOWL as steel blast doors crash downward!`
    });
    blocks.push({ id: 'gen_15', type: ScreenplayElement.TRANSITION, text: 'SMASH CUT TO:' });

    return blocks;
  }

  // =========================================================================
  // 3. AI-to-Human Script Humanizer (Subtext & Dialogue Punch-up)
  // =========================================================================

  /**
   * Converts stiff, cliché AI dialogue into naturalistic, gritty human speech
   */
  humanizeScript(blocks) {
    const humanizedBlocks = [];
    let modificationsCount = 0;

    // Conversational Cliché transforms
    const clicheMap = [
      { pattern: /as you already know,?\s*/gi, replace: '' },
      { pattern: /we don't have much time\./gi, replace: 'Clock\'s ticking.' },
      { pattern: /what are you doing here\?/gi, replace: 'You\'re supposed to be in Chicago.' },
      { pattern: /i cannot believe you did this to me\./gi, replace: 'After everything? Really?' },
      { pattern: /everything is going according to plan\./gi, replace: 'We\'re solid.' },
      { pattern: /let me explain what happened\./gi, replace: 'Just... hear me out.' },
      { pattern: /you need to listen to me carefully\./gi, replace: 'Look at me.' },
      { pattern: /there is something you must know\./gi, replace: 'There\'s a catch.' },
      { pattern: /i am doing this to protect you\./gi, replace: 'You think I wanted this?' }
    ];

    blocks.forEach((block) => {
      let text = block.text;
      let modified = false;

      if (block.type === ScreenplayElement.DIALOGUE) {
        // 1. Strip clichés
        clicheMap.forEach(cliche => {
          if (cliche.pattern.test(text)) {
            text = text.replace(cliche.pattern, cliche.replace);
            modified = true;
          }
        });

        // 2. Add realistic contractions (cannot -> can't, do not -> don't, I will -> I'll)
        const contractions = [
          [/\bcannot\b/gi, "can't"],
          [/\bdo not\b/gi, "don't"],
          [/\bwill not\b/gi, "won't"],
          [/\bI will\b/gi, "I'll"],
          [/\bYou are\b/gi, "You're"],
          [/\bWhat is\b/gi, "What's"],
          [/\bIt is\b/gi, "It's"]
        ];

        contractions.forEach(([from, to]) => {
          if (from.test(text)) {
            text = text.replace(from, to);
            modified = true;
          }
        });

        // 3. Add human speech cadence (subtext ellipses / beat pauses)
        if (text.length > 80 && !text.includes('...') && !text.includes('--')) {
          const sentences = text.split('. ');
          if (sentences.length >= 2) {
            text = `${sentences[0]}... Look, ${sentences.slice(1).join('. ')}`;
            modified = true;
          }
        }
      } else if (block.type === ScreenplayElement.ACTION) {
        // Humanize action: make descriptions more visceral and economical
        if (text.includes('very ') || text.includes('really ') || text.includes('suddenly ')) {
          text = text.replace(/\b(very|really|suddenly)\s+/gi, '');
          modified = true;
        }
      }

      if (modified) modificationsCount++;

      humanizedBlocks.push({
        ...block,
        text: text
      });
    });

    return {
      originalBlocks: blocks,
      humanizedBlocks: humanizedBlocks,
      modificationsCount: modificationsCount
    };
  }

  // =========================================================================
  // 4. AI Auto Storyboard Drawing & Cinematography Generator
  // =========================================================================

  /**
   * Automatically generate visual storyboard drawing cards for scenes in the screenplay
   */
  generateStoryboardsForScript(blocks) {
    const storyboards = [];
    let currentSceneHeading = 'EXT. SCENE - DAY';
    let sceneNum = 1;

    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (b.type === ScreenplayElement.SCENE_HEADING) {
        currentSceneHeading = b.text.toUpperCase();
        sceneNum++;

        // Find primary action beat for this scene
        let actionSnippet = '';
        for (let j = i + 1; j < Math.min(i + 5, blocks.length); j++) {
          if (blocks[j].type === ScreenplayElement.ACTION) {
            actionSnippet = blocks[j].text;
            break;
          }
        }

        // Determine cinematic shot composition from text
        const shotAnalysis = this.analyzeCinematicShot(currentSceneHeading, actionSnippet);

        // Render 16:9 sketch drawing
        const drawingUrl = this.canvasRenderer.renderShot({
          type: shotAnalysis.shotType,
          angle: shotAnalysis.angle,
          mood: shotAnalysis.mood,
          sceneHeading: currentSceneHeading,
          actionText: actionSnippet || 'Establishing atmosphere.'
        });

        storyboards.push({
          id: `sb_${b.id}`,
          sceneHeading: currentSceneHeading,
          sceneNumber: sceneNum - 1,
          shotType: shotAnalysis.shotType,
          cameraAngle: shotAnalysis.angle,
          mood: shotAnalysis.mood,
          actionText: actionSnippet,
          drawingUrl: drawingUrl
        });
      }
    }

    return storyboards;
  }

  /**
   * Determine cinematography parameters from scene text
   */
  analyzeCinematicShot(heading, action) {
    const combined = `${heading} ${action}`.toUpperCase();

    let shotType = 'MEDIUM TWO-SHOT';
    let angle = 'EYE LEVEL';
    let mood = 'dramatic';

    if (combined.includes('EXT.') || combined.includes('ROOFTOP') || combined.includes('SKYLINE')) {
      shotType = 'WIDE ESTABLISHING SHOT';
      angle = 'HIGH ANGLE';
    } else if (combined.includes('FREEZES') || combined.includes('PISTOL') || combined.includes('EYES') || combined.includes('WHISPER')) {
      shotType = 'EXTREME CLOSE-UP';
      angle = 'LOW ANGLE';
      mood = 'noir';
    } else if (combined.includes('BEHIND') || combined.includes('STEPS FROM') || combined.includes('APPROACHES')) {
      shotType = 'OVER-THE-SHOULDER (OTS)';
      angle = 'EYE LEVEL';
    } else if (combined.includes('SLAMS') || combined.includes('EXPLOSION') || combined.includes('BLEEDING') || combined.includes('HOWL')) {
      shotType = 'DUTCH ANGLE TENSION SHOT';
      angle = 'DUTCH ANGLE';
      mood = 'high tension';
    }

    return { shotType, angle, mood };
  }

  // =========================================================================
  // Optional Live Gemini API Connector
  // =========================================================================

  setApiKey(key) {
    this.apiKey = key.trim();
    localStorage.setItem('scriptcraft_gemini_key', this.apiKey);
  }

  async callGeminiSceneGenerator(params) {
    if (!this.apiKey) return null;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;
    const prompt = `You are an Oscar-winning Hollywood screenwriter.
Write a detailed, vivid, dramatic screenplay scene in standard Fountain format.
Genre: ${params.genre}
Setting: ${params.setting}
Characters: ${params.charA} and ${params.charB}
Conflict: ${params.conflict}
Tone: ${params.tone}

Output ONLY valid Fountain screenplay format (Scene heading, action lines, character names in ALL CAPS, dialogue, parentheticals). Do not include markdown code block backticks.`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!res.ok) {
      throw new Error(`Gemini API error: ${res.statusText}`);
    }

    const json = await res.json();
    const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (rawText) {
      const engine = new ScreenplayEngine();
      const parsed = engine.parseFountain(rawText);
      return parsed.blocks;
    }
    return null;
  }
}

if (typeof window !== 'undefined') {
  window.AIScreenwritingService = AIScreenwritingService;
}
