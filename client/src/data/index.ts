import type { IconPaths, Notebook, Source, SourceType, ToolId } from '../types'

/** Design controls, baked in as constants (they were editor knobs in the
 *  source design). */
export const ACCENT_HUE = 295
export const INDEXING_SECONDS = 8

// ── Icons ───────────────────────────────────────────────────────────────────
export const ICONS: Record<SourceType, IconPaths> = {
  pdf: { d: 'M6 3h9l4 4v14H6z', d2: 'M15 3v4h4M9 12h6M9 16h6' },
  url: {
    d: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18',
    d2: 'M3 12h18M12 3c3.2 2.8 3.2 15.2 0 18c-3.2-2.8-3.2-15.2 0-18',
  },
  yt: { d: 'M3 8c0-2.2 1-3 3-3h12c2 0 3 0.8 3 3v8c0 2.2-1 3-3 3H6c-2 0-3-0.8-3-3z', d2: 'M10 9l6 3-6 3z' },
  doc: { d: 'M6 3h12v18H6z', d2: 'M9 8h6M9 12h6M9 16h4' },
  txt: { d: 'M5 5h14M5 10h14M5 15h9', d2: '' },
}

export const LOGO_PATH = 'M4 9h16M4 15h16M9 4v16M15 4v16'

// ── Workspace tools ─────────────────────────────────────────────────────────
export interface Tool {
  id: ToolId
  label: string
  d: string
  d2: string
}

export const TOOLS: Tool[] = [
  {
    id: 'mindmap',
    label: 'Mind map',
    d: 'M12 12L5 6.5M12 12l7-5.5M12 12v7.5',
    d2: 'M12 10a2 2 0 1 0 0 4a2 2 0 1 0 0-4M5 4.5a2 2 0 1 0 0 4M19 4.5a2 2 0 1 1 0 4M12 19.5a2 2 0 1 0 0 0.01',
  },
  { id: 'quiz', label: 'Quiz', d: 'M9 9a3 3 0 1 1 4.2 2.75c-.9.4-1.2.95-1.2 1.85', d2: 'M12 17.3v.2' },
  { id: 'table', label: 'Table', d: 'M4 5h16v14H4z', d2: 'M4 10h16M10 5v14' },
  { id: 'flash', label: 'Cards', d: 'M8 7h12v13H8z', d2: 'M4 16V4h12' },
  { id: 'summary', label: 'Brief', d: 'M5 5h14M5 9h14M5 13h10M5 17h7', d2: '' },
  { id: 'audio', label: 'Audio', d: 'M5 10v4M9 6v12M13 9v6M17 4v16M21 10v4', d2: '' },
  { id: 'timeline', label: 'Timeline', d: 'M6 4v16', d2: 'M6 6h5M6 12h7M6 18h4' },
]

export const TOOL_TITLES: Record<ToolId, string> = {
  mindmap: 'Mind map',
  quiz: 'Quiz — Week 4',
  table: 'Concept table',
  flash: 'Flashcards',
  summary: 'Study brief',
  audio: 'Audio overview',
  timeline: 'Timeline',
}

// ── Add-source options ──────────────────────────────────────────────────────
export interface AddType {
  t: SourceType
  label: string
  name: string
  meta: string
}

export const ADD_TYPES: AddType[] = [
  { t: 'pdf', label: 'Upload PDF', name: 'Regularization survey (2024).pdf', meta: 'PDF · 18 pages' },
  { t: 'url', label: 'Add web link', name: 'Why momentum really works — blog', meta: 'Web · distill-style post' },
  { t: 'yt', label: 'Add YouTube video', name: 'Optimizer schedules — conference talk', meta: 'YouTube · 14:22' },
  { t: 'doc', label: 'Import Google Doc', name: 'Study group notes — Thursday', meta: 'Google Docs · 4 pages' },
  { t: 'txt', label: 'Paste text', name: 'Pasted snippet — eval metrics', meta: 'Text · 840 words' },
]

export interface AddMeta {
  title: string
  sub: string
  ph: string
  file?: boolean
  textarea?: boolean
}

export const ADD_META: Record<SourceType, AddMeta> = {
  pdf: {
    title: 'Upload a PDF',
    sub: 'Pick a file from your computer — it never leaves your device in this prototype.',
    ph: '',
    file: true,
  },
  url: { title: 'Add a web link', sub: 'Mindloom will fetch, clean and index the page.', ph: 'https://…' },
  yt: {
    title: 'Add a YouTube video',
    sub: 'The transcript is fetched and indexed with timestamps.',
    ph: 'https://youtube.com/watch?v=…',
  },
  doc: { title: 'Import a Google Doc', sub: 'Paste a share link — view access is enough.', ph: 'https://docs.google.com/document/…' },
  txt: { title: 'Paste text', sub: 'Notes, a transcript, an email thread — anything.', ph: 'Paste your text here…', textarea: true },
}

// ── Chat ────────────────────────────────────────────────────────────────────
export const SUGGESTIONS = [
  'Compare how my sources define overfitting',
  'What does attention actually compute?',
  'Which source explains backprop most simply?',
  'Summarize Chapter 6 in five bullets',
  'Where do my sources disagree?',
  'Key equations to memorize for the exam',
  'Build me a study plan from the course notes',
  "Explain regularization like I'm new to this",
  'What is examinable this week?',
]

export interface Reply {
  text: string
  cites: number[]
}

export const REPLIES: Reply[] = [
  {
    text: 'Across your sources, attention is a soft lookup: every token builds a query, scores it against all keys, and reads out a weighted mix of values. The paper gives the formula; the course notes flag it as non-examinable this term.',
    cites: [2, 4],
  },
  {
    text: 'Goodfellow frames overfitting as the gap between training and generalization error, and the lecture video makes the same point visually — the valley you descend on training data is not quite the valley you are tested on.',
    cites: [1, 3],
  },
  {
    text: 'Short answer: start with the video for intuition (gradients flowing backward, one layer at a time), then do the Ch. 6 derivation by hand — the TA notes say you must derive ∂L/∂W₁ for a 2-layer MLP in the exam.',
    cites: [3, 1, 4],
  },
  {
    text: 'They mostly agree, with one nuance: the notes present L1 vs L2 geometrically (diamond vs circle constraint), while Ch. 6 treats both as penalties on the loss. Same math, different picture — know both framings.',
    cites: [4, 1],
  },
]

// ── Quiz ────────────────────────────────────────────────────────────────────
export interface QuizItem {
  q: string
  src: string
  correct: number
  opts: string[]
}

export const QUIZ: QuizItem[] = [
  {
    q: 'In the Transformer, what does self-attention compute for each token?',
    src: 'Attention Is All You Need',
    correct: 1,
    opts: [
      'A convolution over neighboring tokens',
      'A weighted sum of value vectors, scored by query–key similarity',
      'A recurrent hidden-state update',
      'A random projection of the embedding',
    ],
  },
  {
    q: 'Backpropagation is best described as…',
    src: 'Deep Learning — Ch. 6',
    correct: 2,
    opts: [
      'A learning algorithm that updates weights',
      'A way to initialize deep networks',
      'An efficient application of the chain rule to compute gradients',
      'A regularization technique',
    ],
  },
  {
    q: 'Which of these is the "cheapest regularizer", per your lecture transcript?',
    src: 'Lecture 12 transcript',
    correct: 3,
    opts: ['Dropout', 'Weight decay', 'Batch normalization', 'Early stopping'],
  },
]

// ── Flashcards ──────────────────────────────────────────────────────────────
export interface Flashcard {
  f: string
  b: string
}

export const FLASH: Flashcard[] = [
  { f: 'Overfitting', b: 'When training error keeps falling but generalization (validation) error rises — the model memorizes instead of learning.' },
  { f: 'Self-attention', b: 'Each token emits a query, scores it against every key, and reads a weighted sum of values — a differentiable soft lookup.' },
  { f: 'Chain rule (in backprop)', b: 'Gradients of the loss flow backward layer by layer; each layer multiplies in only its local derivative.' },
  { f: 'Dropout', b: 'Randomly zeroing units during training so the network cannot rely on any single feature path.' },
  { f: 'Early stopping', b: 'Halt training when validation error stops improving — regularization for free.' },
]

// ── Concept table ───────────────────────────────────────────────────────────
export interface TableRow {
  concept: string
  source: string
  mentions: number
  pct: number
}

export const TABLE: TableRow[] = [
  { concept: 'Attention', source: 'Attention Is All You Need', mentions: 23, pct: 96 },
  { concept: 'Backpropagation', source: 'Backprop, visualized', mentions: 17, pct: 91 },
  { concept: 'Overfitting', source: 'Deep Learning — Ch. 6', mentions: 12, pct: 88 },
  { concept: 'Dropout', source: 'Deep Learning — Ch. 6', mentions: 9, pct: 84 },
  { concept: 'Positional encoding', source: 'Attention Is All You Need', mentions: 7, pct: 79 },
  { concept: 'LR schedules', source: 'Course notes — Week 4', mentions: 5, pct: 71 },
]

// ── Timeline ────────────────────────────────────────────────────────────────
export interface TimelineEvent {
  year: string
  title: string
  desc: string
}

export const EVENTS: TimelineEvent[] = [
  { year: '1958', title: 'The perceptron', desc: 'Rosenblatt’s single-layer learner — the ancestor your Ch. 6 reading opens with.' },
  { year: '1986', title: 'Backprop popularized', desc: 'Multi-layer training becomes practical; the exact algorithm your lecture video visualizes.' },
  { year: '2012', title: 'AlexNet moment', desc: 'Deep nets + GPUs win ImageNet; dropout (your flashcard deck) debuts at scale.' },
  { year: '2014', title: 'Adam optimizer', desc: 'Per-parameter step sizes — compared against SGD+momentum in your Lecture 12 transcript.' },
  { year: '2017', title: 'The Transformer', desc: '“Attention is all you need” removes recurrence entirely — your arXiv source.' },
  { year: '2020+', title: 'Scaling era', desc: 'The same ingredients, orders of magnitude larger — context for why Week 4 fundamentals matter.' },
]

// ── Study brief ─────────────────────────────────────────────────────────────
export interface SummaryPoint {
  n: string
  head: string
  body: string
}

export const SUMMARY_POINTS: SummaryPoint[] = [
  { n: '01', head: 'Backprop = chain rule + bookkeeping', body: 'compute local derivatives once, reuse them backwards. You must derive the 2-layer case by hand for the exam.' },
  { n: '02', head: 'Generalization is the real goal', body: 'watch the validation curve; the train–val gap is overfitting made visible. Dropout, weight decay and early stopping close it.' },
  { n: '03', head: 'Attention is a soft dictionary', body: 'queries score against keys, values get mixed. Non-examinable, but it is where everything after Week 4 is heading.' },
  { n: '04', head: 'Optimizers differ in step size, not direction', body: 'Adam gives each parameter its own learning rate; SGD+momentum is simpler and often generalizes as well.' },
]

// ── Mind map ────────────────────────────────────────────────────────────────
export interface MindNode {
  label: string
  main?: boolean
}

export const MM_NODES: MindNode[] = [
  { label: 'Neural Networks', main: true },
  { label: 'Backpropagation' },
  { label: 'Attention' },
  { label: 'Regularization' },
  { label: 'Optimizers' },
  { label: 'Loss functions' },
  { label: 'Architectures' },
]

export const MM_INITIAL_POS = [
  { x: 50, y: 50 },
  { x: 22, y: 18 },
  { x: 78, y: 16 },
  { x: 14, y: 62 },
  { x: 84, y: 60 },
  { x: 32, y: 86 },
  { x: 68, y: 88 },
]

// ── Landing feature cards ───────────────────────────────────────────────────
export interface Feature {
  d: string
  d2: string
  title: string
  copy: string
}

export const FEATURES: Feature[] = [
  {
    d: 'M9 11l2.5 2.5L16 9M12 3l7 3v6c0 4.4-3 7.5-7 9c-4-1.5-7-4.6-7-9V6z',
    d2: '',
    title: 'Grounded, cited answers',
    copy: 'Every reply points to the page, timestamp, or paragraph it came from. No hallucinated confidence.',
  },
  {
    d: 'M12 12L5 6.5M12 12l7-5.5M12 12v7.5',
    d2: 'M12 10a2 2 0 1 0 0 4a2 2 0 1 0 0-4',
    title: 'One-click mind maps',
    copy: 'See how concepts across five PDFs actually connect — then quiz yourself on the weak spots.',
  },
  {
    d: 'M6 3h9l4 4v14H6z',
    d2: 'M15 3v4h4',
    title: 'Every format welcome',
    copy: 'PDFs, web pages, YouTube lectures, Google Docs, pasted notes. Indexed in seconds, queryable forever.',
  },
  {
    d: 'M5 10v4M9 6v12M13 9v6M17 4v16M21 10v4',
    d2: '',
    title: 'Audio overviews',
    copy: 'Turn a week of readings into a two-host deep dive you can play on the walk to class.',
  },
]

// ── Landing floating icons (parallax) ───────────────────────────────────────
export interface Float {
  x: string
  y: string
  size: number
  depth: number
  t: SourceType
}

export const FLOATS: Float[] = [
  { x: '4%', y: '14%', size: 52, depth: 22, t: 'pdf' },
  { x: '89%', y: '9%', size: 46, depth: 30, t: 'yt' },
  { x: '1.5%', y: '60%', size: 44, depth: 28, t: 'url' },
  { x: '92%', y: '54%', size: 54, depth: 16, t: 'doc' },
  { x: '10%', y: '84%', size: 42, depth: 24, t: 'txt' },
]

// ── Initial state ───────────────────────────────────────────────────────────
export const INITIAL_SOURCES: Source[] = [
  {
    id: 1,
    type: 'pdf',
    name: 'Deep Learning — Ch. 6 (Goodfellow)',
    meta: 'PDF · 42 pages',
    status: 'indexed',
    points: [
      'Feedforward nets approximate any function given enough hidden units',
      'Backprop is just the chain rule, applied efficiently via dynamic programming',
      'Regularization (dropout, weight decay) trades training fit for generalization',
    ],
    paras: [
      'The feedforward network defines a mapping y = f(x; θ) and learns the value of the parameters θ that result in the best function approximation…',
      'Back-propagation refers only to the method for computing the gradient, while another algorithm, such as stochastic gradient descent, performs learning using this gradient.',
    ],
  },
  {
    id: 2,
    type: 'url',
    name: 'Attention Is All You Need — arXiv',
    meta: 'Web · arxiv.org',
    status: 'indexed',
    points: [
      'Self-attention replaces recurrence entirely — sequence length no longer serializes compute',
      'Multi-head attention lets the model attend to different representation subspaces',
      'Positional encodings inject order information the architecture otherwise lacks',
    ],
    paras: [
      'We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely…',
      'An attention function can be described as mapping a query and a set of key-value pairs to an output, where the output is computed as a weighted sum of the values.',
    ],
  },
  {
    id: 3,
    type: 'yt',
    name: 'Backprop, visualized — lecture video',
    meta: 'YouTube · 21:04',
    status: 'indexed',
    points: [
      'Gradients flow backward layer by layer — each layer only needs its local derivative',
      'The loss landscape metaphor: training is descending a foggy valley',
      'Learning rate too high overshoots the valley floor; too low crawls',
    ],
    paras: [
      '[04:12] So instead of asking "how does this weight affect the loss" all at once, we ask it one layer at a time, passing the answer backwards…',
      '[13:40] Notice the gradient with respect to earlier layers is a product of many terms — this is exactly why very deep nets struggled before better activations.',
    ],
  },
  {
    id: 4,
    type: 'doc',
    name: 'Course notes — Week 4',
    meta: 'Google Docs · 9 pages',
    status: 'indexed',
    points: [
      'Exam will cover backprop derivation for a 2-layer MLP',
      'Know the difference between L1 and L2 regularization geometrically',
      'Attention section is non-examinable this term but recommended',
    ],
    paras: [
      'Reminder from the TA session: you should be able to derive ∂L/∂W₁ for the two-layer network by hand, including the ReLU mask…',
      'Common mistake from last year: forgetting that softmax + cross-entropy simplifies to (p − y) — do not expand it the long way in the exam.',
    ],
  },
  {
    id: 5,
    type: 'txt',
    name: 'Lecture 12 transcript (pasted)',
    meta: 'Text · 6,120 words',
    status: 'indexing',
    points: [
      'Optimizers compared: SGD with momentum vs Adam on the same loss surface',
      'Batch norm stabilizes the distribution each layer sees',
      'Early stopping is the cheapest regularizer you have',
    ],
    paras: [
      '…so when people say Adam "adapts the learning rate", what they really mean is each parameter gets its own step size, scaled by an estimate of recent gradient variance…',
      'If you only remember one thing from today: monitor the validation curve, not the training curve. The gap between them is the whole story of generalization.',
    ],
  },
]

export const INITIAL_MESSAGE = {
  role: 'bot' as const,
  text: "I've finished reading 4 of your 5 sources — the lecture transcript is still indexing and will join automatically. Ask anything; every answer cites the exact passage it came from.",
  cites: [] as number[],
}

export const INITIAL_NOTEBOOKS: Notebook[] = [
  { id: 1, title: 'Machine Learning — Week 4', desc: 'Backprop, attention, regularization — exam prep for the Friday midterm.', srcs: 5, updated: 'today' },
  { id: 2, title: 'Cognitive Science 101', desc: 'Memory, perception and the predictive brain. Lecture notes + two textbooks.', srcs: 8, updated: '2 days ago' },
  { id: 3, title: 'Thesis — literature review', desc: 'Transformer efficiency papers, annotated and cross-referenced.', srcs: 14, updated: 'last week' },
  { id: 4, title: 'Statistics bootcamp', desc: 'Bayes, bootstrap and hypothesis testing — self-study over the break.', srcs: 6, updated: '3 weeks ago' },
]
