use crate::error::CommandError;
use crate::state::process_state::ProcessMetadata;
use crate::state::state_manager::State;
use tauri::{Manager, Emitter};
use uuid::Uuid;

#[tauri::command]
pub async fn get_processes() -> Result<Vec<ProcessMetadata>, CommandError> {
    let state = State::get().await?;
    let processes = state.process_manager.list_processes().await;
    Ok(processes)
}

#[tauri::command]
pub async fn get_process(process_id: Uuid) -> Result<Option<ProcessMetadata>, CommandError> {
    let state = State::get().await?;
    let process = state.process_manager.get_process_metadata(process_id).await;
    Ok(process)
}

#[tauri::command]
pub async fn get_processes_by_profile(
    profile_id: Uuid,
) -> Result<Vec<ProcessMetadata>, CommandError> {
    let state = State::get().await?;
    let processes = state
        .process_manager
        .get_process_metadata_by_profile(profile_id)
        .await;
    Ok(processes)
}

#[tauri::command]
pub async fn stop_process(process_id: Uuid) -> Result<(), CommandError> {
    let state = State::get().await?;
    state.process_manager.stop_process(process_id).await?;
    Ok(())
}

#[tauri::command]
pub async fn get_full_log(process_id: Uuid) -> Result<String, CommandError> {
    let state = State::get().await?;
    let log_content = state
        .process_manager
        .get_full_log_content(process_id)
        .await?;
    Ok(log_content)
}

#[tauri::command]
pub async fn open_log_window<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    process_id: Uuid,
    is_live_logs: Option<bool>,
) -> Result<(), CommandError> {
    let window_label = format!("log_window_{}", process_id);

    if let Some(window) = app.get_webview_window(&window_label) {
        window.set_focus().map_err(|e| {
            CommandError::from(crate::error::AppError::Other(format!(
                "Failed to focus existing log window {}: {}",
                window_label, e
            )))
        })?;
        return Ok(());
    }

    let is_live = is_live_logs.unwrap_or(false);

    let window = tauri::WebviewWindowBuilder::new(
        &app,
        &window_label,
        tauri::WebviewUrl::App(
            format!(
                "log-window.html?processId={}&isLiveLogs={}",
                process_id, is_live
            )
            .into(),
        ),
    )
    .title(format!("Minecraft Logs ({})", process_id))
    .inner_size(1200.0, 800.0)
    .center()
    .build()
    .map_err(|e| CommandError::from(crate::error::AppError::Other(e.to_string())))?;

    Ok(())
}

#[tauri::command]
pub async fn open_pixelplay_server<R: tauri::Runtime>(app: tauri::AppHandle<R>, server: String) -> Result<(), CommandError> {
    // Try to get last played profile from config state
    match crate::state::state_manager::State::get().await {
        Ok(state) => {
            let cfg = state.config_manager.get_config().await;
            if let Some(profile_id) = cfg.last_played_profile {
                // Emit an event to frontend to handle opening/connecting
                let _ = app.emit("deep_link_open", serde_json::json!({"profile": profile_id, "server": server}));
                return Ok(());
            }
        }
        Err(e) => {
            log::warn!("open_pixelplay_server: failed to get state: {}", e);
        }
    }

    // If no last profile, still emit server so frontend can prompt user
    let _ = app.emit("deep_link_open", serde_json::json!({"profile": null, "server": server}));
    Ok(())
}

#[tauri::command]
pub async fn set_discord_state(
    state_type: String,
    profile_name: Option<String>,
) -> Result<(), CommandError> {
    let state = State::get().await?;
    let has_running_game = state
        .process_manager
        .list_processes()
        .await
        .iter()
        .any(|p| p.state == crate::state::process_state::ProcessState::Running);

    // Normalize the incoming state_type and map to internal DiscordState
    match state_type.to_lowercase().as_str() {
        "idle" | "inactivo" => {
            if has_running_game {
                return Ok(());
            }
            if let Err(e) = state.discord_manager.set_state(crate::state::discord_state::DiscordState::Idle, true).await {
                log::warn!("Failed to set Discord state to Idle: {}", e);
            }
        }
        "ingame" | "in_game" | "playing" | "playing_game" => {
            // Support passing "Profile|1.20.1" in profile_name to include version
            let raw = profile_name.unwrap_or_else(|| "Minecraft".to_string());
            let mut parts = raw.splitn(2, '|');
            let profile = parts.next().unwrap_or("Minecraft").to_string();
            let version = parts.next().map(|s| s.to_string());
            if let Err(e) = state.discord_manager.set_state(crate::state::discord_state::DiscordState::InGame { profile, version }, true).await {
                log::warn!("Failed to set Discord state to InGame: {}", e);
            }
        }
        "modal" | "launcher" => {
            if has_running_game {
                return Ok(());
            }
            let modal = profile_name.unwrap_or_else(|| "unknown".to_string());
            if let Err(e) = state.discord_manager.set_state(crate::state::discord_state::DiscordState::Modal(modal), true).await {
                log::warn!("Failed to set Discord state to Modal: {}", e);
            }
        }
        other => {
            log::warn!("Unknown discord state_type received from frontend: {}", other);
        }
    }

    Ok(())
}
