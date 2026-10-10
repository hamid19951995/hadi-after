# AE Studio - Product Blueprint

## 1. Product Direction

AE Studio should become an **AI production operating system for Adobe After Effects**, not only a chat panel.

The product should understand the current project, plan changes, execute reversible operations, reuse existing assets, and help the creator reach a final render.

Core promise:

> Describe the result. AE Studio understands the project, proposes a plan, builds the scene, and keeps every change editable and reversible.

## 2. Product Principles

1. **Project-aware by default**: every answer is grounded in the active project and its repository.
2. **Plan before mutation**: multi-step work is previewed before it changes the project.
3. **Editable output**: generated work uses native compositions, layers, keyframes, expressions, and assets.
4. **Progressive disclosure**: simple requests stay simple; advanced controls appear when needed.
5. **Reversible operations**: every AI action is grouped, logged, and undoable.
6. **Local-first privacy**: project files and media stay local unless the user explicitly enables an external provider.
7. **Graceful degradation**: the panel remains useful when AI, network, or a media provider is unavailable.
8. **Evidence over claims**: the assistant reports what it inspected, changed, skipped, and could not verify.

## 3. Target Users

### 3.1 Motion Designer

Needs fast iteration, reliable layer manipulation, and fewer repetitive operations.

### 3.2 Video Editor and Content Creator

Needs templates for social formats, captions, transitions, sound, and fast exports.

### 3.3 Creative Director

Needs brief-to-storyboard workflows, brand consistency, review notes, and variant generation.

### 3.4 Production Team

Needs shared project repositories, version history, approvals, asset status, and repeatable pipelines.

### 3.5 Technical Artist

Needs safe ExtendScript execution, expressions, diagnostics, and automation hooks.

## 4. Core Product Modes

The interface should expose explicit working modes:

- **Explore**: inspect the project, repository, assets, layers, and environment.
- **Plan**: create a proposed sequence of actions without changing After Effects.
- **Build**: create compositions, layers, animations, and assets.
- **Edit**: modify existing material by name, type, or selection.
- **Review**: find missing files, invalid expressions, layout issues, and render risks.
- **Render**: prepare output modules, queues, presets, and delivery variants.

The selected mode should control permissions. Explore and Plan are read-only. Build and Edit can mutate the project. Render requires explicit confirmation.

## 5. Ideal User Flow

```text
Brief
  -> Project inspection
  -> Asset and repository retrieval
  -> Creative direction
  -> Storyboard and shot list
  -> Action plan
  -> User approval
  -> Native AE construction
  -> Review and repair
  -> Version snapshot
  -> Render variants
```

Every stage should produce a visible artifact instead of disappearing into a chat response.

## 6. Information Architecture

### 6.1 Project Graph

Show the project as a navigable graph:

- Project
- Folders
- Compositions
- Layers
- Precompositions
- Footage
- Audio
- Fonts
- Effects
- Expressions
- Render Queue items

Selecting a node should update the Inspector and provide context to the assistant.

### 6.2 AI Workspace

The conversation view should support:

- natural-language requests
- attached project nodes
- selected layers as context chips
- action plans
- progress by step
- errors with repair actions
- undo and restore controls

### 6.3 Inspector

The Inspector should show editable properties for the selected item:

- name and type
- source and file path
- transform
- timing
- opacity and blend mode
- text and typography
- effects
- expressions
- parent and track matte
- 2D/3D state

### 6.4 Action Plan

Before a complex operation, show:

```text
Inspect project
Create or reuse composition
Select existing title layer
Apply brand typography
Add keyframes
Save snapshot
```

Each step should show expected impact, risk, and confirmation state.

## 7. Project Intelligence

The context model should include:

- After Effects version and build
- active project path and dirty state
- project folders and item hierarchy
- all compositions and dimensions
- layer names, types, indices, timing, visibility, lock state, 3D state
- text content and typography metadata
- source footage, file paths, duration, dimensions, and missing-file status
- selected layers
- current time and work area
- markers and comments
- effects and expressions
- parent relationships and track mattes
- render queue status and output modules
- repository search results relevant to the current request

Context must be bounded. The model should receive a summary plus targeted details, never an unbounded project dump.

## 8. Large Project Repository

The local repository should behave like a lightweight GitHub for creative projects.

### 8.1 Repository Features

- configurable root folder
- file tree and project manifest
- metadata and SHA-256 hashes
- incremental indexing
- text search with snippets
- binary asset metadata
- safe file retrieval
- ignored folders and file-size limits
- index status and progress
- repository health report

### 8.2 Versioning

Add creative version control:

- snapshot before major AI changes
- snapshot after successful plans
- named versions such as `intro-v03` and `social-variant-9x16`
- file and project diff summaries
- restore previous snapshot
- operation log with model, prompt, commands, and result

### 8.3 Retrieval Strategy

Use a retrieval pipeline:

1. Search file names and metadata.
2. Search text snippets and project notes.
3. Match After Effects layer and composition names.
4. Rank by current selection, active composition, recent edits, and query terms.
5. Send only the top relevant results to the model.

Large media should never be embedded into the prompt. Use thumbnails, dimensions, duration, transcript, scene labels, and local paths instead.

## 9. Creative Production Pipeline

### 9.1 Brief to Project

Input:

- purpose
- audience
- platform
- duration
- aspect ratio
- brand identity
- language
- call to action
- available assets

Output:

- creative direction
- storyboard
- shot list
- composition plan
- layer plan
- animation plan
- sound plan
- render plan

### 9.2 Native After Effects Construction

Prefer native objects:

- compositions
- text layers
- shape layers
- solids
- cameras and lights
- footage layers
- keyframes
- expressions
- effects
- markers
- render queue items

Generated output must remain editable by a designer.

### 9.3 Content Generation

Support specialized providers for:

- copy and captions
- storyboard frames
- still images
- voiceover
- music and sound effects
- subtitles and transcripts
- video references

Every generated asset should record provider, prompt, timestamp, local file path, and usage status.

## 10. Commands and Permissions

Commands should be typed, validated, and grouped by risk.

### Read-only

- inspect project
- inspect environment
- search repository
- inspect composition
- inspect layer
- check project health
- preview render settings

### Reversible mutation

- create composition
- add layer
- edit text
- select layer
- update transform
- apply effect
- add keyframes
- create marker
- update expression

### Confirmation required

- delete layers
- overwrite files
- save project
- import external asset
- render queue
- render output
- call paid media generation
- run arbitrary ExtendScript

The UI should show the exact command, target, and affected items before confirmation.

## 11. Design System

### Visual language

- quiet professional dark interface
- one strong accent color for active operations
- clear semantic colors for success, warning, blocked, and destructive actions
- dense information layout for project inspection
- restrained animation for progress and state changes

### Interaction rules

- use tabs for modes
- use chips for selected context
- use a timeline for sequential plans
- use tree navigation for project structure
- use inspector panels for properties
- use icons with tooltips for compact actions
- keep destructive actions visually distinct
- never hide a running operation behind a generic spinner

### Responsive behavior

- compact mode for narrow CEP panels
- detachable expanded workspace for planning and repository browsing
- keyboard shortcuts for inspect, plan, run, undo, and restore
- no critical action should require a tiny target

## 12. Reliability and Recovery

Implement:

- one undo group per operation
- pre-operation snapshot for complex plans
- step-level result reporting
- automatic retry only for safe idempotent steps
- repair prompt for failed commands
- host timeout and cancellation
- bridge health indicator
- provider health and latency
- offline mode
- incomplete-plan recovery
- crash-safe operation journal

A failed step must never be reported as successful.

## 13. Security and Privacy

- bind local bridge to `127.0.0.1` only
- validate every path against the repository root
- reject path traversal
- exclude secrets and environment files from indexing
- redact API keys and tokens from logs
- keep cloud providers opt-in
- show when project data leaves the machine
- require confirmation for destructive or paid actions
- limit arbitrary script execution
- provide an audit log and clear-memory action

## 14. Performance Requirements

Target behavior:

- panel first paint under 1 second after CEP startup
- bridge health response under 200 ms locally
- cached repository manifest available immediately
- incremental index for changed files only
- search response under 500 ms for normal repositories
- no main-thread blocking during indexing
- stream AI responses progressively
- never load an entire media file into memory

For very large projects:

- worker-based indexing
- persistent content hashes
- file watcher updates
- SQLite or embedded search index when file count grows
- thumbnail and transcript caches
- configurable memory and disk budgets

## 15. Quality and Review

Add a project health report with:

- missing footage
- missing fonts
- broken expressions
- invalid paths
- unsupported codecs
- empty compositions
- layers outside the work area
- mismatched frame rates
- render queue failures
- duplicate assets
- unused footage
- excessive project size

Add visual review tools:

- contact sheet generation
- storyboard preview
- composition thumbnail comparison
- before/after snapshot comparison
- safe render preview

## 16. Testing Strategy

### Unit tests

- command normalization
- request validation
- repository indexing
- search ranking
- path security
- snapshot metadata
- provider fallback

### Host tests

- create composition
- add and select layers
- update text
- import footage
- queue render
- save project
- error propagation from ExtendScript

### Integration tests

- CEP panel to host bridge
- bridge to Ollama
- bridge to HADI/Copilot
- repository search to model context
- failed command repair

### Visual tests

- compact panel
- expanded panel
- plan preview
- project graph
- inspector
- error and confirmation states

## 17. Roadmap

### Phase 1 - Foundation

- stable project inventory
- repository indexing and search
- explicit Explore, Plan, Build, Edit, Review, Render modes
- command schemas and validation
- host error visibility
- basic operation journal

### Phase 2 - Professional Editing

- select by name and index
- layer inspector
- property editing
- markers and comments
- effects and expressions inventory
- project health report
- snapshot and restore

### Phase 3 - Creative Production

- brief-to-storyboard
- shot list generation
- reusable templates
- brand system
- caption and subtitle workflows
- audio and image generation with local asset tracking

### Phase 4 - Team Repository

- repository branches and named snapshots
- review comments
- approval workflow
- shared asset catalog
- team permissions
- audit history

### Phase 5 - Scale

- SQLite or vector retrieval index
- file watchers
- distributed render orchestration
- multi-project workspace
- plugin and preset marketplace
- organization policies and usage controls

## 18. Success Metrics

- time from brief to first editable composition
- percentage of plans completed without repair
- percentage of generated layers accepted by designers
- average number of manual corrections
- repository search latency
- render failure rate
- successful recovery rate
- weekly active creators
- repeat usage per project
- local versus cloud request ratio

## 19. Commercial Packaging

### Free

- local Ollama support
- basic project inspection
- limited commands
- local repository

### Creator

- creative templates
- media generation integrations
- version snapshots
- project health reports

### Studio

- team repository
- review and approval
- shared assets
- usage dashboards
- role-based access

### Enterprise

- private provider routing
- policy controls
- audit logs
- on-premise deployment
- support and service-level commitments

## 20. Definition of a Professional Release

A release is ready when:

- a designer can inspect and understand the current project through the UI;
- the assistant can plan before changing anything;
- every mutation is validated, logged, and undoable;
- existing assets can be searched and reused;
- large projects do not overload the model context;
- failures explain the exact step and offer repair or rollback;
- generated work remains editable in After Effects;
- local projects remain private by default;
- the user can reproduce, review, and restore AI operations.

## 21. Recommended Priority

The highest-value implementation order is:

```text
Project Graph
  -> Plan and Preview
  -> Repository Retrieval
  -> Snapshot and Restore
  -> Layer and Property Inspector
  -> Brief-to-Storyboard Pipeline
  -> Creative Asset Generation
  -> Team Collaboration
```

The product should earn trust through visibility and reversibility before expanding into autonomous production.
