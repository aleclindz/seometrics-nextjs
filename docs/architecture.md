
graph TB
    %% Frontend Layer
    subgraph "Frontend Layer"
        FE0["AuthProvider"]
        FE1["WebsiteManagement"]
        FE2["UsageDashboard"]
        FE3["UpgradeBadge"]
        FE4["ThemeToggle"]
        FE5["SubscriptionManager"]
        FE6["SocialProof"]
        FE7["SnippetModal"]
    end
    
    %% Backend Layer
    subgraph "Backend Layer"
        BE0["server"]
        BE1["GSCConnection"]
        BE2["index"]
        BE3["base-provider"]
        BE4["page"]
        BE5["subscriptions"]
    end
    
    %% Database Layer
    subgraph "Database Layer"
        DB0["Supabase"]
    end
    
    %% External Services
    subgraph "External Services"
        EXT0["@supabase/ssr"]
        EXT1["@supabase/supabase-js"]
        EXT2["stripe"]
    end
    
    %% Connections
    FE0 --> BE0
    FE1 --> BE1
    FE2 --> BE2
    FE3 --> BE3
    FE4 --> BE4
    FE5 --> BE5
    FE6 --> BE0
    FE7 --> BE1
    BE0 --> DB0
    BE1 --> DB0
    BE2 --> DB0
    BE3 --> DB0
    BE4 --> DB0
    BE5 --> DB0
    BE0 --> EXT0
    BE0 --> EXT1
    BE0 --> EXT2
    BE1 --> EXT0
    BE1 --> EXT1
    BE1 --> EXT2
    BE2 --> EXT0
    BE2 --> EXT1
    BE2 --> EXT2
    
    %% Styling
    classDef frontend fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef backend fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef database fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef external fill:#fff3e0,stroke:#e65100,stroke-width:2px
    
    class FE0 frontend
    class FE1 frontend
    class FE2 frontend
    class FE3 frontend
    class FE4 frontend
    class FE5 frontend
    class FE6 frontend
    class FE7 frontend
    class BE0 backend
    class BE1 backend
    class BE2 backend
    class BE3 backend
    class BE4 backend
    class BE5 backend
    class DB0 database
    class EXT0 external
    class EXT1 external
    class EXT2 external
