# Venue Simulation Tool

## Final Year Project Documentation

### 1. Project Title
Venue Simulation Tool: An Intelligent 2D/3D Event Space Planning, AV Design, and Layout Generation System

### 2. Executive Summary
This project is a web-based venue planning platform that helps users design event spaces in both 2D and 3D. The system supports manual room design, AI-generated room layouts from natural language prompts, and import of existing floor plans from `draw.io`, XML, and HTML files. It also includes AV planning features such as camera placement, speaker placement, mixing desk layout, and cable routing.

The main idea behind the project is to reduce the time and technical difficulty involved in planning real-world venues such as weddings, conferences, church services, funerals, exhibitions, and corporate events. Instead of using several disconnected tools for room layout, furniture planning, stage planning, and AV wiring, this system combines them into one workflow.

This project is implemented as a full-stack system:
- `frontend/`: Next.js + React + Three.js
- `backend/`: Django + Django REST Framework + SQLite
- `AI engine`: local Ollama with Gemma 3

### 3. Problem Statement
Event planners, media teams, churches, conference organizers, and venue managers often plan spaces using a combination of rough sketches, PowerPoint, spreadsheets, CAD-like tools, and human guesswork. This creates several problems:

- layout planning is slow and repetitive
- translating a 2D floor plan into a realistic room setup is difficult
- AV planning is often separated from spatial planning
- client review is harder because many tools are technical
- collaboration and visualization are weak when only 2D plans exist

This project solves that by providing one unified platform where users can:
- generate or import a room layout
- arrange furniture and event assets
- preview the result in 3D
- add AV equipment and cable routes
- save, share, and export designs

### 4. Main Project Objectives
The objectives already implemented in the project are:

1. Build a venue planning platform that supports both 2D and 3D editing.
2. Support multiple layout creation pipelines instead of forcing one entry point.
3. Allow natural-language prompt-to-layout generation using a local LLM.
4. Convert draw.io/XML/HTML floor plans into editable 3D scenes.
5. Support room editing, object placement, snapping, collision control, and view synchronization.
6. Add AV planning as an integrated layer instead of a separate external tool.
7. Save projects per authenticated user so each account sees its own work.
8. Support shareable read-only links and client-facing exports.
9. Make the system usable by non-technical users through templates and guided flows.

### 5. Current Feature Set
The project currently supports the following major features:

#### 5.1 Authentication and User Isolation
- user registration and login
- JWT authentication with HttpOnly cookies
- protected dashboard and editor
- each authenticated user sees only their own projects

#### 5.2 Project Creation Pipelines
The project supports several ways of creating a scene:
- manual blank 2D project
- manual blank 3D project
- import from `draw.io`
- import from XML/HTML floor plans
- natural language prompt to generated room plan
- start from prebuilt templates

#### 5.3 2D and 3D Venue Editing
- synchronized 2D and 3D room editing
- drag objects in 2D
- resize room from 2D
- inspect the room in 3D
- movable assets such as chairs, tables, podiums, screens, altar, desks, piano, camera, speakers, and mixing desks
- live wall shell with camera-angle transparency in 3D

#### 5.4 Smart Layout Generation
- prompt-to-layout using Ollama + Gemma 3
- supported event/layout interpretation
- deterministic room object placement after AI intent generation
- structured enforcement of event styles such as theatre, banquet, classroom, boardroom, cabaret, lounge, and more

#### 5.5 Floor Plan Import
- upload `.drawio`, `.xml`, or exported `.html`
- parse shapes, labels, groups, offsets, and dimensions
- infer object types from text and draw.io shape libraries
- map imported 2D plans into editable scene objects

#### 5.6 AV Layer
- AV items can coexist with normal layout items
- cameras, speakers, mixing desks, screens, TVs
- cable connection model between AV devices
- AV connections visible in both 2D and 3D
- combined planning of room layout + AV plan in one project

#### 5.7 Templates
- users can start from prebuilt room templates
- templates create editable project copies
- templates reduce setup time and improve usability

#### 5.8 Sharing and Export
- shareable project links
- read-only shared viewer
- export floor plan as PNG
- export floor plan as PDF

### 6. High-Level System Architecture

#### Frontend
The frontend is a React/Next.js application that provides:
- landing page and prompt entry
- login/register flow
- dashboard
- editor workspace
- shared viewer

Important frontend modules:
- `frontend/app/dashboard/page.tsx`
- `frontend/app/editor/[id]/page.tsx`
- `frontend/store/UseEditorStore.ts`
- `frontend/components/editor/*`
- `frontend/components/scene/*`

#### Backend
The Django backend provides:
- authentication APIs
- project CRUD APIs
- AI layout generation API
- draw.io import API
- project sharing APIs

Important backend modules:
- `backend/accounts/*`
- `backend/projects/*`
- `backend/ai_layout/*`
- `backend/layout_imports/*`

### 7. Core Data Structures

This project is strongly centered around a few reusable data structures.

#### 7.1 Project
The main saved object in the system is `Project`.

Main fields:
- `id`
- `name`
- `createdAt`
- `updatedAt`
- `room`
- `items`
- `connections`
- `measurements`
- `sceneSettings`

Purpose:
- represents one full design workspace
- stores room dimensions, scene objects, AV connections, and visual settings
- is the primary unit saved in SQLite and edited in the frontend

#### 7.2 Room
The room is represented by:
- `width`
- `depth`
- `height`
- optional `wallThickness`

Purpose:
- defines the physical space boundary
- used by clamping, rendering, AI layout, import scaling, and room shell generation

#### 7.3 SceneItem
Each item placed in a project is represented by:
- `id`
- `type`
- `x, y, z`
- `rotationY`
- `scale`
- `assetUrl`
- `label`
- `color`
- `material`
- `layer`

Purpose:
- represents furniture, AV equipment, decor, and room-facing assets
- can belong to either the normal layout layer or the AV layer

#### 7.4 SceneConnection
Each AV connection is represented by:
- `id`
- `fromItemId`
- `toItemId`
- `cableType`

Purpose:
- models signal or utility relationships between AV devices
- examples: video from camera to screen, audio from mixing desk to speaker

#### 7.5 SceneSettings
Scene settings store editor and rendering behavior:
- grid visibility
- HDRI usage
- ambient and directional lighting intensity
- snapping
- livestream mode
- wall thickness/color
- floor color/material

Purpose:
- gives the editor a consistent visual and interaction configuration

#### 7.6 AssetDefinition
Each supported asset in the library has:
- `id`
- `type`
- `name`
- `category`
- `thumbnail`
- `modelUrl`
- `defaultScale`
- `boundingBox`

Purpose:
- standardizes how assets are added, rendered, and spatially measured

#### 7.7 LayoutPlan / Layout Intent
The AI does not directly generate final 3D coordinates. Instead, it first generates layout intent such as:
- event type
- layout style
- room dimensions
- seating strategy
- stage/podium/screen/decor intent

Purpose:
- separates high-level planning from low-level geometry placement
- makes AI output safer, more debuggable, and more deterministic

### 8. Main Algorithms Used in the Project

#### 8.1 Prompt-to-Layout Pipeline
Files:
- `backend/ai_layout/services.py`
- `backend/ai_layout/schemas.py`
- `backend/ai_layout/mapper.py`
- `backend/ai_layout/views.py`

How it works:
1. The frontend sends a natural-language prompt to Django.
2. Django forwards the prompt to local Ollama with Gemma 3.
3. The model is instructed to return layout intent only, not coordinates.
4. The backend validates and normalizes that intent.
5. A deterministic mapper converts the intent into project objects and positions.

Why this is important:
- reduces hallucinated coordinates
- keeps AI output easier to validate
- makes layout generation reproducible

Algorithmic ideas used:
- keyword-based style inference
- capacity extraction from prompt text
- event-type normalization
- room-capacity fitting
- rule-based defaults per layout style
- deterministic object placement strategies

#### 8.2 Layout Style Enforcement
The project does not depend only on the AI’s raw wording. It uses controlled sets such as:
- supported event types
- supported seating layouts
- supported layout styles

Then it applies:
- style keyword matching
- event keyword matching
- room size minimums per style
- seating default rules per style

This gives the system stronger consistency.

Example:
- if the user says `banquet` or `round tables`, the system biases toward banquet-style table layouts
- if the user says `boardroom`, the system enforces a central meeting-table style

#### 8.3 Deterministic Scene Mapping
Files:
- `backend/ai_layout/mapper.py`

The mapper contains multiple specific layout builders:
- `add_theatre_rows`
- `add_round_tables`
- `add_classroom`
- `add_boardroom`
- `add_u_shape`
- `add_hollow_square`
- `add_pods`
- `add_exhibition`
- `add_lounge`

These algorithms convert abstract intent into concrete scene objects.

Examples of algorithmic logic:
- seat count calculation
- aisle insertion
- column/row balancing
- round table seat placement using trigonometry
- room-aware spacing
- stage cluster insertion

This is one of the strongest technical components in the project because it turns semantic intent into structured geometry.

#### 8.4 draw.io / XML / HTML Import Parsing
Files:
- `backend/layout_imports/services.py`
- `backend/layout_imports/views.py`

How it works:
1. User uploads file.
2. Backend extracts embedded XML if the file is HTML.
3. Backend parses draw.io cells, geometry, edges, labels, style maps, and rotations.
4. Parent/group offsets are resolved so grouped objects get correct absolute positions.
5. Shapes and labels are matched to known venue objects.
6. Measurement edges are used to estimate real-world scale.
7. Final scene objects are created and saved as a project.

Algorithmic ideas used:
- XML parsing
- style-token parsing
- grouped coordinate accumulation
- label-to-shape nearest-neighbor matching
- dimension scaling from measurement labels
- object classification from shape libraries and label patterns

This is a strong selling point because it lets existing floor plan work feed directly into the 3D planner.

#### 8.5 2D and 3D Synchronization
The system uses one shared `Project` object for both views.

This means:
- 2D canvas reads the same project state as 3D
- 3D view reads the same project state as 2D
- moving an item in 2D immediately updates 3D
- saving one project saves both representations

This is an important architectural decision because it avoids duplicated layout state.

#### 8.6 Snap and Collision Logic
File:
- `frontend/lib/editorPhysics.ts`

Algorithms implemented:
- footprint estimation from asset bounding boxes
- room clamping so objects stay inside room bounds
- center-line snapping to nearby objects
- overlap detection using approximate rectangular footprints

Purpose:
- makes editing more controlled
- prevents objects from being accidentally placed outside the room
- improves user precision without needing full CAD complexity

#### 8.7 AV Connection Logic
File:
- `frontend/lib/sceneConnections.ts`

The AV layer uses:
- AV item detection
- cable type inference between compatible item types
- path generation using segmented orthogonal lines
- consistent cable color coding

Examples:
- mixing desk to speaker defaults to audio
- camera to screen/mixer defaults to video
- everything else falls back to data

This is useful because it introduces system-level AV planning, not just placement of gadgets.

#### 8.8 Undo / Redo via Snapshot History
File:
- `frontend/store/UseEditorStore.ts`

The editor stores:
- `historyPast`
- `historyFuture`

Each significant project mutation creates a snapshot of:
- room
- items
- connections
- scene settings

Purpose:
- makes editing safer
- lets users experiment without losing progress

### 9. How the Project Works in Simple Terms

If explained simply to a panel:

1. A user signs in.
2. The user creates a project in one of several ways:
   - blank project
   - AI prompt
   - imported floor plan
   - template
3. The system creates a `Project` object containing the room and scene items.
4. The user edits the room in 2D or 3D.
5. The same underlying data drives both views.
6. The user can add furniture, stage items, and AV gear.
7. The user can connect AV devices using cable relationships.
8. The project is saved in SQLite per user account.
9. The user can share or export the result.

In short:
the system is a unified venue planning engine with AI generation, import intelligence, visualization, and AV integration.

### 10. Current Work Packages / Project Objectives Already Achieved
These are the project objectives you can confidently say you have already worked on:

1. Full-stack authenticated project management
2. Multi-pipeline layout creation
3. Prompt-driven smart room generation using a local LLM
4. Deterministic scene mapping from AI intent
5. Import pipeline from draw.io/XML/HTML to editable projects
6. Shared 2D and 3D synchronized editing
7. Smart editor behavior: snapping, collision avoidance, room constraints
8. Export and share functionality
9. Template-based project startup
10. AV overlay integration with cable logic

### 11. Strong Selling Points for Demonstration
These are the best features to emphasize when selling or presenting the project:

#### 11.1 Multiple Entry Paths
Users are not forced into one workflow. They can start from:
- AI prompt
- imported file
- manual design
- template

This makes the system practical for both beginners and professionals.

#### 11.2 AI + Deterministic Hybrid Design
The project does not blindly trust the LLM. It combines:
- semantic AI reasoning
- strict validation
- deterministic geometry placement

That is a much stronger design than naive AI scene generation.

#### 11.3 2D + 3D in One Shared Model
Many tools specialize in one or the other. This project keeps both synchronized.

#### 11.4 AV Planning Is Integrated
Most venue planning tools stop at tables and chairs. Your project includes:
- cameras
- speakers
- mixing desks
- cable runs

This is a strong niche differentiator.

#### 11.5 Existing Floor Plans Can Be Imported
Instead of forcing users to redraw spaces from scratch, the system learns from uploaded floor plans.

#### 11.6 User-Specific Cloud-Like Persistence
Even though development uses SQLite, the architecture already separates projects by authenticated owner, which is the correct structure for multi-user deployment.

#### 11.7 Client-Friendly Output
The project supports:
- 3D preview
- PNG export
- PDF export
- share links

This makes it easier to use in real planning workflows.

### 12. Technical Strengths

#### Strength 1: Clean Separation of Concerns
- frontend handles interaction and rendering
- backend handles persistence, AI integration, validation, and parsing

#### Strength 2: Reusable Project Model
All major features build around the same project structure.

#### Strength 3: Rule-Based Normalization
This is important for reliability because it reduces bad AI output and weak imports.

#### Strength 4: Extensible Architecture
The project can easily grow to support:
- more assets
- more templates
- more cable types
- more export modes
- richer room segmentation

### 13. Current Limitations
These are honest and acceptable to mention in a final-year presentation:

1. Internal multi-room wall segmentation is still limited compared with advanced architectural tools.
2. Cable paths are automatically generated but not yet manually editable with bend points.
3. AI generation is strong for structured event layouts, but still depends on prompt quality.
4. Collision detection is approximate, not mesh-perfect.
5. Template library is still small.
6. Exports are currently stronger for 2D than true 3D asset package delivery.
7. SQLite is good for development, but not ideal for scaled production deployment.

### 14. Recommended Improvements Before Real-World Shipping

The following roadmap is prioritized for turning the project into a production-ready product.

#### 14.1 Highest Priority
1. Add internal wall segment and room-partition data structures.
   Why:
   - lets imported office/church plans match exact real rooms
   - improves 3D realism and floor plan fidelity

2. Add manual wall drawing and door/window editing tools.
   Why:
   - makes the planner useful for custom architectural editing

3. Add manual cable routing with bend points.
   Why:
   - AV teams need realistic cable path planning

4. Add an equipment bill of materials.
   Why:
   - generate counts of chairs, speakers, cameras, screens, desks
   - useful for quotations and logistics

5. Add project comments and client review annotations.
   Why:
   - makes the sharing flow more useful in real work

#### 14.2 Medium Priority
6. Add more professional asset models and categories.
7. Add edge-based snapping, spacing rules, and alignment to walls.
8. Add richer scene analytics such as:
   - seating capacity summary
   - visibility score
   - camera coverage
   - speaker coverage
9. Add role-based collaboration:
   - planner
   - AV technician
   - client reviewer
10. Add project versioning and restore points.

#### 14.3 AI Improvements
11. Add AI-assisted AV placement suggestions.
12. Add AI-generated cable routing suggestions.
13. Add AI-generated equipment list from event type and capacity.
14. Add prompt explanation mode so users can understand why a layout was generated.

#### 14.4 Production Readiness
15. Move from SQLite to PostgreSQL for deployment.
16. Add object storage for uploads and exported files.
17. Add background task processing for large imports and AI generation jobs.
18. Add monitoring, error tracking, and audit logging.
19. Add rate limiting and quota controls for AI usage.

#### 14.5 Presentation / Marketability Improvements
20. Add a polished onboarding wizard.
21. Add sample demo projects for weddings, church services, conferences, and funerals.
22. Add a quote-generation module for venue + AV planning.
23. Add a printable client proposal pack.
24. Add multi-device responsive improvements for tablets.

### 15. Potential Real-World Use Cases
This system can realistically be used for:
- wedding planning
- church event planning
- funeral livestream planning
- corporate conference room setup
- school or university event layout design
- exhibition booth arrangement
- venue booking visualization
- AV crew pre-production planning

### 16. Research / Academic Value
From an academic point of view, this project demonstrates:
- full-stack web engineering
- human-computer interaction for design systems
- applied artificial intelligence
- deterministic algorithm design
- computer graphics / 3D scene interaction
- data modeling for real-world planning systems
- import/conversion pipeline engineering

This is not just a CRUD app. It combines:
- AI reasoning
- spatial modeling
- rendering
- parsing
- editing tools
- user-specific persistence

### 17. Suggested Presentation Structure
If you need to present this project, you can follow this structure:

1. Problem being solved
2. Why existing approaches are inefficient
3. Proposed solution
4. System architecture
5. Input pipelines
6. Core data model
7. AI generation flow
8. Import conversion flow
9. 2D/3D synchronized editing
10. AV layer and cable planning
11. Sharing/export
12. Demo
13. Limitations
14. Future improvements

### 18. Short Viva / Demo Pitch
This project is a smart venue planning platform that helps users design event spaces using AI, imports, templates, and manual editing. It supports both 2D and 3D room planning and extends beyond normal floor-planning by including AV equipment placement and cable routing. The platform uses a structured project data model, a Django backend for persistence and AI processing, and a React/Three.js frontend for synchronized editing and visualization. Its main contribution is combining layout design, visualization, and AV planning in one workflow.

### 19. Conclusion
The project already demonstrates a strong final-year system because it solves a real planning problem, uses a meaningful architecture, and implements several technically interesting modules. Its strongest value lies in combining:
- multi-source venue layout creation
- AI-assisted planning
- synchronized 2D/3D editing
- AV planning
- user-specific project storage

With the improvements listed above, this can move beyond an academic prototype and become a real product for event planners, venues, churches, and media teams.
