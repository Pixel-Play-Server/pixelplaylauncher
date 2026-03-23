fn main() {
    println!("cargo:rerun-if-env-changed=PIXELPLAY_UPDATER_PLATFORM_TARGET");
    if let Ok(v) = std::env::var("PIXELPLAY_UPDATER_PLATFORM_TARGET") {
        if !v.is_empty() {
            println!("cargo:rustc-env=PIXELPLAY_UPDATER_PLATFORM_TARGET={v}");
        }
    }
    tauri_build::build()
}
