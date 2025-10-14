graph TB
    subgraph "Client Browser"
        subgraph "React Application"
            subgraph "UI Components"
                Auth[Auth Components<br/>Login/Register]
                Canvas[Canvas Component<br/>5000x5000px bounded]
                Navbar[Navbar<br/>User info + Logout]
                Presence[Presence Sidebar<br/>Online users + Editing status]
                Error[Error Boundary<br/>Connection Status]
            end

            subgraph "Konva Layers"
                GridLayer[Grid Layer<br/>listening: false<br/>Static boundaries]
                ShapesLayer[Shapes Layer<br/>listening: true<br/>Rectangles + Text]
                CursorsLayer[Cursors Layer<br/>listening: false<br/>Multiplayer cursors]
                SelectionLayer[Selection Layer<br/>listening: false<br/>Visual indicators]
            end

            subgraph "Zustand State"
                UserStore[User Store<br/>Auth state<br/>userId, displayName<br/>cursorColor]
                CanvasStore[Canvas Store<br/>Shapes array<br/>Selection state<br/>Viewport state]
            end

            subgraph "Utilities"
                LockUtils[Lock Utils<br/>acquireLock transaction<br/>releaseLock transaction]
                Throttle[Throttle Utils<br/>Cursor updates 20-30 FPS]
                PerfMonitor[Performance Monitor<br/>FPS counter]
                Types[TypeScript Types<br/>Shape, User interfaces]
            end
        end
    end

    subgraph "Firebase Backend"
        subgraph "Firebase Auth"
            FBAuth[Firebase Authentication<br/>Email/Password + Google OAuth<br/>Session management]
        end

        subgraph "Firestore - Persistence"
            FSCanvas[(Firestore Database<br/>canvas/global-canvas-v1/shapes/<br/><b>SUBCOLLECTIONS</b>)]
            FSShapes[Individual Shape Docs<br/>shapeId: &#123;<br/>  type, x, y, width, height<br/>  text, fill, createdBy<br/>  isLocked, lockedBy<br/>&#125;]
        end

        subgraph "Realtime Database - Transient"
            RTDB[(Realtime Database<br/>/sessions/global-canvas-v1/)]
            RTDBSession[Consolidated User Session<br/>userId: &#123;<br/>  cursorX, cursorY<br/>  displayName, cursorColor<br/>  isOnline, lastSeen<br/>  currentlyEditing: shapeId<br/>&#125;]
        end

        subgraph "Firebase Emulator Suite"
            AuthEmu[Auth Emulator<br/>:9099<br/>Local development]
            FirestoreEmu[Firestore Emulator<br/>:8080<br/>Unlimited testing]
            RTDBEmu[RTDB Emulator<br/>:9000<br/>No quota usage]
        end
    end

    subgraph "Deployment"
        Vercel[Vercel Hosting<br/>React App<br/>Auto-deploy from Git]
        UptimeRobot[UptimeRobot Monitor<br/>Ping every 5 min<br/>Keep server warm]
    end

    %% Component connections
    Auth --> UserStore
    Canvas --> CanvasStore
    Canvas --> GridLayer
    Canvas --> ShapesLayer
    Canvas --> CursorsLayer
    Canvas --> SelectionLayer
    Presence --> UserStore
    Presence --> CanvasStore
    Navbar --> UserStore

    %% Layer rendering
    ShapesLayer --> CanvasStore
    CursorsLayer --> UserStore
    SelectionLayer --> CanvasStore

    %% Utilities
    ShapesLayer --> LockUtils
    CursorsLayer --> Throttle
    Canvas --> PerfMonitor
    CanvasStore --> Types
    UserStore --> Types

    %% Firebase Auth
    Auth -->|signup/login/logout| FBAuth
    FBAuth -->|user token| UserStore

    %% Firestore sync
    CanvasStore <-->|Real-time snapshots<br/>Subcollection listener<br/><100ms sync| FSCanvas
    FSCanvas --> FSShapes
    LockUtils -->|Atomic transactions<br/>acquireLock/releaseLock| FSShapes
    ShapesLayer -->|Create/Update/Delete| FSCanvas

    %% Realtime DB sync
    CursorsLayer -->|Throttled writes<br/>20-30 FPS<br/><50ms sync| RTDB
    RTDB --> RTDBSession
    RTDBSession -->|Real-time listener<br/>onValue| CursorsLayer
    Presence -->|onDisconnect cleanup| RTDB
    UserStore -->|Consolidated presence| RTDB

    %% Emulator connections (dev mode)
    FBAuth -.->|Dev Mode| AuthEmu
    FSCanvas -.->|Dev Mode| FirestoreEmu
    RTDB -.->|Dev Mode| RTDBEmu

    %% Deployment flow
    Canvas -.->|Build & Deploy| Vercel
    Vercel -.->|Keep warm| UptimeRobot
    User([Multiple Users<br/>5+ concurrent]) -->|Access| Vercel
    User -->|Interact| Canvas

    %% Styling
    classDef frontend fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef state fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef firebase fill:#ffebee,stroke:#c62828,stroke-width:2px
    classDef emulator fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef deploy fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef layer fill:#e1f5fe,stroke:#0277bd,stroke-width:2px

    class Auth,Canvas,Navbar,Presence,Error frontend
    class GridLayer,ShapesLayer,CursorsLayer,SelectionLayer layer
    class UserStore,CanvasStore,LockUtils,Throttle,PerfMonitor,Types state
    class FBAuth,FSCanvas,FSShapes,RTDB,RTDBSession firebase
    class AuthEmu,FirestoreEmu,RTDBEmu emulator
    class Vercel,UptimeRobot deploy