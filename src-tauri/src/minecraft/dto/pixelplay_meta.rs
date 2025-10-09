use crate::minecraft::dto::piston_meta::AssetObject;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize)]
pub struct pixelplayAssets {
    pub objects: HashMap<String, AssetObject>,
}
