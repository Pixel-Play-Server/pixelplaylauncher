// src/lib/types/pixelplayPacks.ts

// Types matching backend Rust structures for pixelplay Packs

// Corresponds to Rust struct CompatibilityTarget
export interface CompatibilityTarget {
    identifier: string;
    filename: string | null;
}

// Corresponds to Rust enum pixelplayModSourceDefinition
export type pixelplayModSourceDefinition =
    | { type: 'modrinth'; project_id: string; project_slug: string } // Renamed fields to snake_case
    | { type: 'maven'; repository_ref: string; group_id: string; artifact_id: string } // Renamed fields to snake_case
    | { type: 'url' };

// Corresponds to Rust struct pixelplayModEntryDefinition (previously pixelplayPackMod)
export interface pixelplayModEntryDefinition { // Renamed from pixelplayPackMod
    id: string;
    displayName?: string | null; // Made optional
    source: pixelplayModSourceDefinition; // Updated type
    // compatibility field structure: Record<GameVersion, Record<Loader, CompatibilityTarget>>
    compatibility?: Record<string,
        Record<string, CompatibilityTarget> // Updated inner type
    >;
}

// Corresponds to Rust struct pixelplayPackDefinition
export interface pixelplayPackDefinition {
    displayName: string; // Correct
    description: string; // Correct
    inheritsFrom?: string[] | null; // Added field
    excludeMods?: string[] | null; // Added field
    mods?: pixelplayModEntryDefinition[]; // Updated type used
    assets?: string[]; // Added field
    isExperimental?: boolean; // Added field
    isProtectedByAuthor?: boolean; // Lock content management when true
}

// Corresponds to Rust struct pixelplayModpacksConfig
export interface pixelplayModpacksConfig {
    packs: Record<string, pixelplayPackDefinition>; // Maps pack ID (string) to definition
    repositories: Record<string, string>; // Maps repository reference (string) to URL (string)
} 