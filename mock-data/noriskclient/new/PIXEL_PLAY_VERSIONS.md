Where this launcher downloads Minecraft versions and related metadata

This repository's launcher uses the standard Minecraft/version manifests and community loader endpoints. Key sources:

- Mojang Version Manifest (official):
  - https://launchermeta.mojang.com/mc/game/version_manifest.json
  - The launcher uses this to list available Minecraft versions (release/snapshot) and to locate the per-version JSON files.

- Version JSONs (per-version details):
  - Each version entry from the manifest points to a version-specific JSON (e.g., https://launchermeta.mojang.com/v1/packages/...) which contains the download URL for the client/server jar, libraries, and asset index.

- Loader/Mod loader manifests (Fabric/Quilt/Forge):
  - Fabric loader metadata: https://meta.fabricmc.net/v2/versions/loader/{MINECRAFT_VERSION}/{FABRIC_LOADER_VERSION}/profile/json
  - Quilt/Fabric/Forge integrations use the respective community endpoints to resolve loader metadata and installer manifests.

Where to change the code if you want to alter how versions are resolved or presented:

- src-tauri/src/minecraft/api/mc_api.rs
  - Contains the constant: VERSION_MANIFEST_URL pointing to the Mojang manifest. Modify this if you want to use a different manifest endpoint.

- Mock data (for development/testing):
  - mock-data/pixelplayclient/pixelplay_versions.json – contains example profiles and displayed names used in the UI.
  - mock-data/pixelplayclient/*.json – other files include Fabric/Loader mock manifests; see entries named "manifest" referencing meta.fabricmc.net, etc.

- Loader-specific manifests and parsing:
  - src-tauri/src/minecraft/dto (fabric_meta.rs, quilt_meta.rs) and
  - src/types/quilt.ts (typescript definitions)

Notes:
- To change how versions appear to users (e.g., name/label), edit the mock-data files above or update the code that maps Version objects to UI strings (components that render `profile.name`, `version.version_number`, etc.).
- Be careful changing the official manifest URL: using a custom server requires the same JSON format as Mojang's manifest.

If you want, I can:
- Prefix all displayed versions in the UI with "Pixel Play" (I already changed mock-data examples). I can also search-and-replace UI components which render version names to inject the prefix at render time (safer than mass-renaming data files).
- Update the Rust code to point to a custom manifest URL and produce a frontend build.
