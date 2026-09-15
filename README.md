# 🎬 ScriptCraft — Modern Screenwriting Studio

A fast, intuitive, and distraction-free web studio created specifically for screenwriters and scriptwriters. Write your movie, TV, or stage play with standard Hollywood formatting, smart keyboard shortcuts, live scene navigation, character analytics, and **100% free, unlimited, watermark-free industry-standard PDF export**.

https://tirth31018-cmyk.github.io/Scriptcraft/

---

## 🚀 Quick Start

### 1. Enable `http://scriptcraft.com` Domain Link (One-Time Setup)
1. Double-click **`setup-domain.bat`** (Click **Yes** when Windows prompts for Administrator permission to map the domain to your local machine).
2. Now you can access your site at: **`http://scriptcraft.com`**!

### 2. Launch Studio
Double-click **`start.bat`** in the `scriptcraft` folder.
This runs the studio on port 80 and automatically opens **`http://scriptcraft.com`** in your default web browser!

---

## ✨ Features & Tools

### 1. "Easy to Write In" Editor
- **Smart Industry Auto-Transitions**:
  - `Enter` on **Scene Heading** $\rightarrow$ moves to **Action**
  - `Enter` on **Character** $\rightarrow$ moves to **Dialogue**
  - `Enter` on **Parenthetical** $\rightarrow$ moves to **Dialogue**
  - `Enter` on **Dialogue** $\rightarrow$ prompts next **Character** (or double Enter switches back to **Action**)
  - `Enter` on **Transition** $\rightarrow$ creates **Scene Heading**
- **Keyboard Shortcuts**:
  - `Tab` / `Shift+Tab`: Instant element cycle (Action $\leftrightarrow$ Character $\leftrightarrow$ Parenthetical $\leftrightarrow$ Dialogue)
  - `(`: Instant Parenthetical on Character or Dialogue
  - `Ctrl + S`: Instant manual save (in addition to live autosave)
  - `Ctrl + P`: Open PDF export window
- **Auto-Suggestions / Autocomplete**:
  - Typing in a Scene Heading suggests `INT. `, `EXT. `, `DAY`, `NIGHT`, `LATER`, `CONTINUOUS`, and your previously used locations.
  - Typing in a Character block auto-suggests your script's character names.

### 2. Modern Screenwriting Tools Suite
- **Live Scene Navigator / Outliner**:
  - Sidebar automatically detects all scenes.
  - Shows scene number, slugline, preview text, and estimated page fraction in eighths.
  - Click any scene to smoothly scroll directly to it.
  - Search filter to jump to any location or scene instantly.
- **Character Tracker & Cast Roster**:
  - Automatically identifies every speaking character.
  - Tracks dialogue line counts and speaking frequency.
- **Screenplay Metrics**:
  - Real-time Page Count calculation (standard 54 lines/page rule).
  - Word count and estimated screen time (1 page $\approx$ 1 minute of screen time).
- **Dual Mode (Visual Page vs. Fountain Markdown)**:
  - Switch between the authentic US Letter page simulation and raw **Fountain** mode anytime.
- **Writers' Beat Notes & Scratchpad**:
  - Dedicated side tab for brainstorming plot points, character motivations, and dialogue snippets.
- **Auto-Save & Local History**:
  - Never lose a single stroke: changes are automatically saved to your browser's `localStorage`.
  - Import and Export `.fountain`, `.txt`, and full project `.json` backups.
- **Themes & Focus**:
  - Modern Midnight Slate theme (Arc Studio inspired) and Classic Paper / Typewriter Ivory theme.
  - Typewriter Scrolling mode (keeps the line you're typing centered vertically on the screen).

### 3. ✨ AI Screenwriting Studio Suite
- **🔍 AI Grammar, Spelling & Screenplay Rule Auditor**:
  - Catches typos and spelling errors across blocks.
  - **Screenplay Present-Tense Enforcer**: Catches past-tense narrative in Action blocks (*"Elena walked to the door"* $\rightarrow$ *"Elena walks to the door"*).
  - **Unfilmable Thoughts Detector**: Flags novelistic exposition (*"Marcus remembers his past"* $\rightarrow$ prompts visual action/expression).
  - **Passive Voice Reducer**: Converts passive verbs into punchy active verbs (*"A siren is heard"* $\rightarrow$ *"A siren HOWLS"*).
  - Interactive Review Cards with 1-click "Fix" or "Fix All Safe Typos".
- **✍️ AI Detailed Scene Writer**:
  - Takes genre, setting, character names, and dramatic conflict/objective to generate complete, multi-beat, industry-formatted scenes.
  - Preview generated screenplay scene and click "Insert into Screenplay" with 1-click.
- **🎭 AI-to-Human Script Humanizer**:
  - Takes stiff, cliché, or AI-generated dialogue and transforms it into naturalistic, gritty human speech.
  - Cuts on-the-nose exposition, adds realistic contractions, subtext, speech cadence, and pauses `(beat)`.
  - Side-by-side comparison ("Original" vs "Humanized Polish") with 1-click apply.
- **🎨 AI Auto Screenplay Drawing & Storyboard Studio**:
  - Automatically analyzes scene sluglines and dramatic action beats to generate **16:9 cinematic storyboard sketch drawings**.
  - Identifies camera angles (Wide Establishing, Low-Angle Hero, Close-Up, Over-The-Shoulder, Dutch Angle).
  - Storyboard cards viewable in sidebar or modal gallery, downloadable as PNG storyboard sheets.

### 4. Free Hollywood-Standard PDF Converter
- **Industry Specification Compliance**:
  - Monospaced Courier 12pt (10 cpi, 6 lines/inch standard).
  - Left margin: 1.5 inches (binding hole punch margin).
  - Right, top, and bottom margins: 1.0 inch.
  - Character, dialogue, and parenthetical indents accurately placed.
- **Free & Unlimited**:
  - Zero watermarks, zero subscription paywalls, no login required.
  - Generates directly inside your browser for instant download.
- **Customizable Options**:
  - Toggle Formatted Title Page.
  - Toggle Scene Numbers (for production drafts).
  - Optional watermark (e.g. `DRAFT`, `CONFIDENTIAL`).

---

## 📂 Project Structure

```
scriptcraft/
├── index.html              # Main application single-page interface
├── start.bat               # 1-Click Windows launcher
├── server.py               # Python development server
├── styles/
│   └── main.css            # Responsive design system & screenplay page styling
├── scripts/
│   ├── screenplay-engine.js# Core parser, Fountain engine, metrics, starter script
│   ├── editor.js           # Contenteditable editor, shortcuts, autocomplete
│   ├── pdf-exporter.js     # Hollywood-standard PDF layout engine
│   └── app.js              # Application orchestrator, state, modals & autosave
└── vendor/
    └── jspdf.umd.min.js    # Client-side PDF generation library (offline ready)
```

---

## 🛠️ Deploying to the Web

Because ScriptCraft is a completely self-contained modern web application:
- You can upload this folder directly to **GitHub Pages**, **Netlify**, **Vercel**, or **Cloudflare Pages** for free instant worldwide access.
- No backend server or database configuration required!
