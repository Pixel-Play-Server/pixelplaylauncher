use crate::state::profile_state::Profile;
use log::{info, warn};
use std::collections::HashMap;
use uuid::Uuid;

/// Performs profile migrations during startup.
/// Currently handles:
/// - Migration from "pixelplay-dev" to "pixelplay-prod" pack IDs
pub fn migrate_profiles(profiles: &mut HashMap<Uuid, Profile>) -> usize {
    let mut migration_count = 0;
    
    // Migration 1: pixelplay-dev → pixelplay-prod
    migration_count += migrate_pixelplay_pack_ids(profiles);
    
    if migration_count > 0 {
        info!("ProfileManager: Completed profile migrations. Total changes: {}", migration_count);
    }
    
    migration_count
}

/// Migrates profiles from "pixelplay-dev" to "pixelplay-prod" pack ID
fn migrate_pixelplay_pack_ids(profiles: &mut HashMap<Uuid, Profile>) -> usize {
    let mut migrated_count = 0;
    
    for (_, profile) in profiles.iter_mut() {
        if profile.selected_pixelplay_pack_id == Some("pixelplay-dev".to_string()) {
            info!(
                "Migrating profile '{}' (ID: {}) from pixelplay-dev to pixelplay-prod", 
                profile.name, 
                profile.id
            );
            
            profile.selected_pixelplay_pack_id = Some("pixelplay-prod".to_string());
            migrated_count += 1;
        }
    }
    
    if migrated_count > 0 {
        info!("Migration: Updated {} profiles from pixelplay-dev to pixelplay-prod", migrated_count);
    }
    
    migrated_count
}