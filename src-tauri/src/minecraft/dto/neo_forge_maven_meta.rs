use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct NeoForgeMavenMetadata {
    #[serde(rename = "versioning")]
    pub versioning: Versioning,
}

#[derive(Debug, Deserialize)]
pub struct Versioning {
    #[serde(rename = "latest")]
    pub latest: String,
    #[serde(rename = "release")]
    pub release: String,
    #[serde(rename = "versions")]
    pub versions: Versions,
}

#[derive(Debug, Deserialize)]
pub struct Versions {
    #[serde(rename = "version")]
    pub versions: Vec<String>,
}

impl NeoForgeMavenMetadata {
    fn minecraft_to_loader_base(minecraft_version: &str) -> Option<String> {
        let normalized = minecraft_version.trim();
        let parts: Vec<&str> = normalized.split('.').collect();
        if parts.len() < 2 || parts[0] != "1" {
            return None;
        }

        // 1.21.1 -> 21.1, 1.20.6 -> 20.6, 1.21 -> 21
        let major = parts[1];
        let minor = parts.get(2).copied().unwrap_or("0");
        if minor == "0" {
            Some(major.to_string())
        } else {
            Some(format!("{}.{}", major, minor))
        }
    }

    pub fn get_latest_version(&self) -> &str {
        &self.versioning.latest
    }

    pub fn get_release_version(&self) -> &str {
        &self.versioning.release
    }

    pub fn get_all_versions(&self) -> &[String] {
        &self.versioning.versions.versions
    }

    pub fn get_versions_for_minecraft(&self, minecraft_version: &str) -> Vec<String> {
        // Primary strategy: map MC to NeoForge base prefix (Forge-style)
        // e.g. 1.21.1 -> 21.1.*, 1.20.6 -> 20.6.*
        if let Some(loader_base) = Self::minecraft_to_loader_base(minecraft_version) {
            let mut by_prefix: Vec<String> = self
                .versioning
                .versions
                .versions
                .iter()
                .filter(|v| {
                    *v == &loader_base || v.starts_with(&format!("{}.", loader_base))
                })
                .cloned()
                .collect();
            by_prefix.reverse();
            if !by_prefix.is_empty() {
                return by_prefix;
            }
        }

        let mut exact_versions: Vec<String> = self
            .versioning
            .versions
            .versions
            .iter()
            .filter(|v| {
                Self::parse_neoforge_version_to_minecraft(v)
                    .map(|parsed| parsed == minecraft_version)
                    .unwrap_or(false)
            })
            .cloned()
            .collect();

        // Reverse to get newest first (Maven metadata is chronological, oldest to newest)
        exact_versions.reverse();
        if !exact_versions.is_empty() {
            return exact_versions;
        }

        // Fallback: match by major.minor when no exact major.minor.patch exists.
        // This helps versions like "1.21.5" when NeoForge only provides "1.21.x".
        let mut mc_parts = minecraft_version.split('.');
        let major = mc_parts.next();
        let minor = mc_parts.next();
        let major_minor = match (major, minor) {
            (Some(a), Some(b)) => format!("{}.{}", a, b),
            _ => return exact_versions,
        };

        let mut fallback_versions: Vec<String> = self
            .versioning
            .versions
            .versions
            .iter()
            .filter(|v| {
                Self::parse_neoforge_version_to_minecraft(v)
                    .map(|parsed| {
                        parsed == major_minor
                            || parsed
                                .strip_prefix(&(major_minor.clone() + "."))
                                .is_some()
                    })
                    .unwrap_or(false)
            })
            .cloned()
            .collect();

        fallback_versions.reverse();
        fallback_versions
    }

    pub fn get_latest_version_for_minecraft(&self, minecraft_version: &str) -> Option<String> {
        // After reverse, first element is the newest
        self.get_versions_for_minecraft(minecraft_version)
            .into_iter()
            .next()
    }

    pub fn parse_neoforge_version_to_minecraft(neoforge_version: &str) -> Option<String> {
        let parts: Vec<&str> = neoforge_version.split('.').collect();

        if parts.is_empty() {
            return None;
        }

        fn numeric_prefix(part: &str) -> Option<u32> {
            let digits: String = part.chars().take_while(|c| c.is_ascii_digit()).collect();
            if digits.is_empty() {
                None
            } else {
                digits.parse::<u32>().ok()
            }
        }

        match numeric_prefix(parts[0]) {
            Some(p1) => {
                if p1 > 0 {
                    // Release/Beta logic
                    if parts.len() < 2 {
                        return None; // Need at least p1 and p2
                    }
                    let p2 = numeric_prefix(parts[1])?;

                    // NeoForge scheme "21.1.219" maps to MC "1.21.1"
                    // (third segment is usually build number, not MC patch).
                    if p2 > 0 {
                        Some(format!("1.{}.{}", p1, p2))
                    } else {
                        Some(format!("1.{}", p1))
                    }
                } else {
                    // p1 == 0, Snapshot/Custom logic
                    if parts.len() > 1 {
                        Some(parts[1].to_string())
                    } else {
                        None // Need at least two parts for snapshot logic
                    }
                }
            }
            None => None, // p1 is not a number
        }
    }

    pub fn print_parsed_versions(&self) {
        log::info!("NeoForge Version -> Parsed Minecraft Version:");
        for neoforge_version in &self.versioning.versions.versions {
            let parsed_mc_version = Self::parse_neoforge_version_to_minecraft(neoforge_version);
            log::info!(
                "  {} -> {}",
                neoforge_version,
                parsed_mc_version.as_deref().unwrap_or("Parse Failed")
            );
        }
    }
}
