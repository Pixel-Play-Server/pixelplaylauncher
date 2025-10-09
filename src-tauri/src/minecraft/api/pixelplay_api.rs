use crate::integrations::pixelplay_packs::pixelplayModpacksConfig;
use crate::integrations::pixelplay_versions::pixelplayVersionsConfig;
use crate::minecraft::auth::minecraft_auth::pixelplayToken;
use crate::minecraft::dto::pixelplay_meta::pixelplayAssets;
use crate::state::process_state::ProcessMetadata;
use crate::{
    config::HTTP_CLIENT,
    error::{AppError, Result},
};
use log::{debug, error, info};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use rand;

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CrashlogDto {
    pub mc_logs_url: String,
    pub metadata: Option<ProcessMetadata>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ServerIdResponse {
    pub server_id: String,
    pub expires_in: i32,
}

pub struct pixelplayApi;

impl pixelplayApi {
    pub fn new() -> Self {
        Self
    }

    pub fn get_api_base(is_experimental: bool) -> String {
        if is_experimental {
            debug!("[pixelplay API] Using experimental API endpoint");
            String::from("https://api-staging.pixelplay.gg/api/v1")
        } else {
            debug!("[pixelplay API] Using production API endpoint");
            String::from("https://api.pixelplay.gg/api/v1")
        }
    }

    /// Request a new server ID from pixelplay API for secure authentication
    pub async fn request_server_id(is_experimental: bool) -> Result<ServerIdResponse> {
        let base_url = Self::get_api_base(is_experimental);
        let url = format!("{}/launcher/auth/request-server-id", base_url);

        debug!("[pixelplay API] Requesting new server ID");
        debug!("[pixelplay API] Full URL: {}", url);

        let response = HTTP_CLIENT
            .post(url)
            .send()
            .await
            .map_err(|e| {
                error!("[pixelplay API] Server ID request failed: {}", e);
                AppError::RequestError(format!("Failed to request server ID from pixelplay API: {}", e))
            })?;

        let status = response.status();
        debug!("[pixelplay API] Server ID request response status: {}", status);

        if !status.is_success() {
            let error_body = response
                .text()
                .await
                .unwrap_or_else(|_| "Failed to read error body".to_string());
            error!(
                "[pixelplay API] Server ID request error response: Status {}, Body: {}",
                status, error_body
            );
            return Err(AppError::RequestError(format!(
                "pixelplay API returned error status for server ID request: {}, Body: {}",
                status, error_body
            )));
        }

        debug!("[pixelplay API] Parsing server ID response as JSON");
        match response.json::<ServerIdResponse>().await {
            Ok(server_response) => {
                let server_id = &server_response.server_id;
                if !server_id.starts_with("nrc-") {
                    error!("[pixelplay API] Invalid server ID received: {}", server_id);
                    return Err(AppError::RequestError(format!(
                        "Invalid server ID received from pixelplay API: {}",
                        server_id
                    )));
                }
                
                info!("[pixelplay API] Server ID request successful: {}", server_id);
                Ok(server_response)
            }
            Err(e) => {
                error!("[pixelplay API] Failed to parse server ID response: {}", e);
                Err(AppError::ParseError(format!("Failed to parse pixelplay API server ID response: {}", e)))
            }
        }
    }

    pub async fn post_from_pixelplay_endpoint_with_parameters<T: for<'de> Deserialize<'de>>(
        endpoint: &str,
        pixelplay_token: &str,
        params: &str,
        extra_params: Option<HashMap<&str, &str>>,
        is_experimental: bool,
    ) -> Result<T> {
        let base_url = Self::get_api_base(is_experimental);
        let url = format!("{}/{}", base_url, endpoint);

        debug!("[pixelplay API] Making request to endpoint: {}", endpoint);
        debug!("[pixelplay API] Full URL: {}", url);

        let mut query_params: HashMap<&str, &str> = HashMap::new();
        if !params.is_empty() {
            query_params.insert("params", params);
            debug!("[pixelplay API] Added base params: {}", params);
        }

        if let Some(extra) = extra_params {
            for (key, value) in extra {
                query_params.insert(key, value);
                debug!("[pixelplay API] Added extra param: {} = {}", key, value);
            }
        }

        debug!(
            "[pixelplay API] Sending POST request with {} parameters",
            query_params.len()
        );
        let response = HTTP_CLIENT
            .post(url)
            .header("Authorization", format!("Bearer {}", pixelplay_token))
            .query(&query_params)
            .send()
            .await
            .map_err(|e| {
                error!("[pixelplay API] Request failed: {}", e);
                AppError::RequestError(format!("Failed to send request to pixelplay API: {}", e))
            })?;

        let status = response.status();
        debug!("[pixelplay API] Response status: {}", status);

        if !status.is_success() {
            error!("[pixelplay API] Error response: Status {}", status);
            return Err(AppError::RequestError(format!(
                "pixelplay API returned error status: {}",
                status
            )));
        }

        debug!("[pixelplay API] Parsing response body as JSON");
        response.json::<T>().await.map_err(|e| {
            error!("[pixelplay API] Failed to parse response: {}", e);
            AppError::ParseError(format!("Failed to parse pixelplay API response: {}", e))
        })
    }

    pub async fn get_from_pixelplay_endpoint_with_parameters<T: for<'de> Deserialize<'de>>(
        endpoint: &str,
        pixelplay_token: &str,
        extra_params: Option<HashMap<&str, &str>>,
        is_experimental: bool,
    ) -> Result<T> {
        let base_url = Self::get_api_base(is_experimental);
        let url = format!("{}/{}", base_url, endpoint);

        debug!("[pixelplay API] Making GET request to endpoint: {}", endpoint);
        debug!("[pixelplay API] Full URL: {}", url);

        let mut request = HTTP_CLIENT
            .get(url)
            .header("Authorization", format!("Bearer {}", pixelplay_token));

        if let Some(extra) = extra_params {
            debug!("[pixelplay API] Adding {} query parameters", extra.len());
            request = request.query(&extra);
        }

        debug!("[pixelplay API] Sending GET request");
        let response = request.send().await.map_err(|e| {
            error!("[pixelplay API] GET request failed: {}", e);
            AppError::RequestError(format!("Failed to send GET request to pixelplay API: {}", e))
        })?;

        let status = response.status();
        debug!("[pixelplay API] Response status: {}", status);

        if !status.is_success() {
            error!("[pixelplay API] Error response: Status {}", status);
            return Err(AppError::RequestError(format!(
                "pixelplay API returned error status: {}",
                status
            )));
        }

        debug!("[pixelplay API] Parsing response body as JSON");
        response.json::<T>().await.map_err(|e| {
            error!("[pixelplay API] Failed to parse response: {}", e);
            AppError::ParseError(format!("Failed to parse pixelplay API response: {}", e))
        })
    }

    pub async fn delete_from_pixelplay_endpoint_text_with_parameters(
        endpoint: &str,
        pixelplay_token: &str,
        extra_params: Option<HashMap<&str, &str>>,
        is_experimental: bool,
    ) -> Result<String> {
        let base_url = Self::get_api_base(is_experimental);
        let url = format!("{}/{}", base_url, endpoint);

        debug!(
            "[pixelplay API] Making DELETE request to endpoint: {}",
            endpoint
        );
        debug!("[pixelplay API] Full URL: {}", url);

        let mut request = HTTP_CLIENT
            .delete(url)
            .header("Authorization", format!("Bearer {}", pixelplay_token));

        if let Some(extra) = extra_params {
            debug!("[pixelplay API] Adding {} query parameters", extra.len());
            request = request.query(&extra);
        }

        debug!("[pixelplay API] Sending DELETE request");
        let response = request.send().await.map_err(|e| {
            error!("[pixelplay API] DELETE request failed: {}", e);
            AppError::RequestError(format!(
                "Failed to send DELETE request to pixelplay API: {}",
                e
            ))
        })?;

        let status = response.status();
        debug!("[pixelplay API] Response status: {}", status);

        if !status.is_success() {
            error!("[pixelplay API] Error response: Status {}", status);
            return Err(AppError::RequestError(format!(
                "pixelplay API returned error status: {}",
                status
            )));
        }

        debug!("[pixelplay API] Reading response body as text");
        response.text().await.map_err(|e| {
            error!("[pixelplay API] Failed to read response text: {}", e);
            AppError::ParseError(format!("Failed to read pixelplay API response text: {}", e))
        })
    }

    /// Secure version of token refresh using server-provided server ID
    /// This prevents the middleman attack by using controlled server IDs
    pub async fn refresh_pixelplay_token_v3(
        system_id: &str,
        username: &str,
        access_token: &str,
        selected_profile: &str,
        force: bool,
        is_experimental: bool,
    ) -> Result<pixelplayToken> {
        info!("[pixelplay API] Refreshing pixelplay token v3 with SystemID: {}", system_id);
        debug!("[pixelplay API] Username: {}", username);
        debug!("[pixelplay API] Force refresh: {}", force);
        debug!("[pixelplay API] Experimental mode: {}", is_experimental);

        // Step 1: Request server ID from pixelplay API
        debug!("[pixelplay API] Step 1: Requesting server ID from pixelplay API");
        let server_response = Self::request_server_id(is_experimental).await?;
        let server_id = &server_response.server_id;
        info!("[pixelplay API] Received server ID: {}", server_id);

        // Step 2: Join the Minecraft server session (client-side authentication)
        debug!("[pixelplay API] Step 2: Joining Minecraft server session with server ID: {}", server_id);
        let mc_api = crate::minecraft::api::mc_api::MinecraftApiService::new();
        mc_api.join_server_session(access_token, selected_profile, server_id).await?;
        info!("[pixelplay API] Successfully joined Minecraft server session");

        // Step 3: Call pixelplay API v2 (server will verify with has_joined)
        let base_url = Self::get_api_base(is_experimental);
        let url = format!("{}/launcher/auth/validate/v2", base_url);

        debug!("[pixelplay API] Step 3: Making POST request to auth/validate/v2 endpoint");
        debug!("[pixelplay API] Full URL: {}", url);

        // All parameters as query parameters
        let force_str = force.to_string();
        let mut query_params = HashMap::new();
        query_params.insert("force", force_str.as_str());
        query_params.insert("hwid", system_id);
        query_params.insert("username", username);
        query_params.insert("server_id", server_id);

        debug!("[pixelplay API] Sending POST request with server-provided server ID");
        let response = HTTP_CLIENT
            .post(url)
            .query(&query_params)
            .send()
            .await
            .map_err(|e| {
                error!("[pixelplay API] v3 token refresh request failed: {}", e);
                AppError::RequestError(format!("Failed to send v3 token refresh request to pixelplay API: {}", e))
            })?;

        let status = response.status();
        debug!("[pixelplay API] v3 token refresh response status: {}", status);

        if !status.is_success() {
            let error_body = response
                .text()
                .await
                .unwrap_or_else(|_| "Failed to read error body".to_string());
            error!(
                "[pixelplay API] v3 token refresh error response: Status {}, Body: {}",
                status, error_body
            );
            return Err(AppError::RequestError(format!(
                "pixelplay API v3 returned error status: {}, Body: {}",
                status, error_body
            )));
        }

        debug!("[pixelplay API] Parsing v3 token refresh response body as JSON");
        match response.json::<pixelplayToken>().await {
            Ok(token) => {
                info!("[pixelplay API] v3 token refresh successful");
                debug!("[pixelplay API] Token valid status: {}", token.value.len() > 0);
                Ok(token)
            }
            Err(e) => {
                error!("[pixelplay API] Failed to parse v3 token refresh response: {}", e);
                Err(AppError::ParseError(format!("Failed to parse pixelplay API v3 response: {}", e)))
            }
        }
    }

    pub async fn request_from_pixelplay_endpoint<T: for<'de> Deserialize<'de>>(
        endpoint: &str,
        pixelplay_token: &str,
        request_uuid: &str,
        is_experimental: bool,
    ) -> Result<T> {
        debug!(
            "[pixelplay API] Request from endpoint: {} with UUID: {}",
            endpoint, request_uuid
        );
        let mut extra_params = HashMap::new();
        extra_params.insert("uuid", request_uuid);

        Self::post_from_pixelplay_endpoint_with_parameters(
            endpoint,
            pixelplay_token,
            "",
            Some(extra_params),
            is_experimental,
        )
        .await
    }

    pub async fn get_from_pixelplay_endpoint<T: for<'de> Deserialize<'de>>(
        endpoint: &str,
        pixelplay_token: &str,
        request_uuid: Option<&str>,
        is_experimental: bool,
    ) -> Result<T> {
        debug!("[pixelplay API] GET request from endpoint: {}", endpoint);

        let mut extra_params = HashMap::new();
        if let Some(uuid) = request_uuid {
            debug!("[pixelplay API] Adding UUID: {}", uuid);
            extra_params.insert("uuid", uuid);
        }

        Self::get_from_pixelplay_endpoint_with_parameters(
            endpoint,
            pixelplay_token,
            Some(extra_params),
            is_experimental,
        )
        .await
    }

    /// Request pixelplay assets json for specific branch
    pub async fn pixelplay_assets(
        pack: &str,
        pixelplay_token: &str,
        request_uuid: &str,
        is_experimental: bool,
    ) -> Result<pixelplayAssets> {
        Self::get_from_pixelplay_endpoint(
            &format!("launcher/pack/{}", pack),
            pixelplay_token,
            Some(request_uuid),
            is_experimental,
        )
        .await
    }

    /// Fetches the complete modpack configuration from the pixelplay API.
    pub async fn get_modpacks(
        pixelplay_token: &str,
        is_experimental: bool,
    ) -> Result<pixelplayModpacksConfig> {
        debug!(
            "[pixelplay API] Fetching modpack configuration. Experimental: {}",
            is_experimental
        );
        Self::get_from_pixelplay_endpoint("launcher/modpacks", pixelplay_token, None, is_experimental)
            .await
    }

    /// Fetches the standard version profiles from the pixelplay API.
    pub async fn get_standard_versions(
        pixelplay_token: &str,
        is_experimental: bool,
    ) -> Result<pixelplayVersionsConfig> {
        debug!(
            "[pixelplay API] Fetching standard version profiles. Experimental: {}",
            is_experimental
        );
        Self::get_from_pixelplay_endpoint("launcher/versions", pixelplay_token, None, is_experimental)
            .await
    }

    /// Request discord link status
    pub async fn discord_link_status(
        pixelplay_token: &str,
        request_uuid: &str,
        is_experimental: bool,
    ) -> Result<bool> {
        debug!(
            "[pixelplay API] Requesting Discord link status with UUID: {}",
            request_uuid
        );
        Self::get_from_pixelplay_endpoint(
            "core/oauth/discord/check",
            pixelplay_token,
            Some(request_uuid),
            is_experimental,
        )
        .await
    }

    /// Request to unlink Discord account
    pub async fn unlink_discord(
        pixelplay_token: &str,
        request_uuid: &str,
        is_experimental: bool,
    ) -> Result<String> {
        debug!(
            "[pixelplay API] Requesting Discord unlink with UUID: {}",
            request_uuid
        );
        let mut extra_params = HashMap::new();
        extra_params.insert("uuid", request_uuid);

        Self::delete_from_pixelplay_endpoint_text_with_parameters(
            "core/oauth/discord/unlink",
            pixelplay_token,
            Some(extra_params),
            is_experimental,
        )
        .await
    }

    /// Submits a crash log to the pixelplay API.
    pub async fn submit_crash_log(
        pixelplay_token: &str,
        crash_log_data: &CrashlogDto,
        request_uuid: &str,
        is_experimental: bool,
    ) -> Result<()> {
        let base_url = Self::get_api_base(is_experimental);
        let endpoint = "core/crashlog";
        let url = format!("{}/{}", base_url, endpoint);

        debug!(
            "[pixelplay API] Submitting crash log to endpoint: {}",
            endpoint
        );
        debug!("[pixelplay API] Full URL: {}", url);
        debug!("[pixelplay API] With request UUID: {}", request_uuid);
        debug!("[pixelplay API] Crash log data: {:?}", crash_log_data);

        let response = HTTP_CLIENT
            .post(url)
            .header("Authorization", format!("Bearer {}", pixelplay_token))
            .query(&[("uuid", request_uuid)])
            .json(crash_log_data)
            .send()
            .await
            .map_err(|e| {
                error!("[pixelplay API] Crash log submission request failed: {}", e);
                AppError::RequestError(format!("Failed to send crash log to pixelplay API: {}", e))
            })?;

        let status = response.status();
        debug!(
            "[pixelplay API] Crash log submission response status: {}",
            status
        );

        if !status.is_success() {
            let error_body = response
                .text()
                .await
                .unwrap_or_else(|_| "Failed to read error body".to_string());
            error!(
                "[pixelplay API] Crash log submission error response: Status {}, Body: {}",
                status, error_body
            );
            return Err(AppError::RequestError(format!(
                "pixelplay API returned error status for crash log: {}, Body: {}",
                status, error_body
            )));
        }

        info!("[pixelplay API] Crash log submitted successfully.");
        Ok(())
    }

    pub async fn get_mcreal_app_token(
        pixelplay_token: &str,
        request_uuid: &str,
        is_experimental: bool,
    ) -> Result<String> {
        let base_url = Self::get_api_base(is_experimental);
        let endpoint = "mcreal/user/mobileAppToken";
        let url = format!("{}/{}", base_url, endpoint);
        
        info!("[pixelplay API] Requesting mcreal app token");
        debug!("[pixelplay API] Full URL: {}", url);
        
        let response = HTTP_CLIENT
            .get(url)
            .header("Authorization", format!("Bearer {}", pixelplay_token))
            .query(&[("uuid", request_uuid)])
            .send()
            .await
            .map_err(|e| {
                error!("[pixelplay API] McReal app token request failed: {}", e);
                AppError::RequestError(format!("Failed to get mobile app token from pixelplay API: {}", e))
            })?;

        let status = response.status();
        debug!("[pixelplay API] McReal app token response status: {}", status);

        if !status.is_success() {
            let error_body = response
                .text()
                .await
                .unwrap_or_else(|_| "Failed to read error body".to_string());
            error!(
                "[pixelplay API] McReal app token error response: Status {}, Body: {}",
                status, error_body
            );
            return Err(AppError::RequestError(format!(
                "pixelplay API returned error status for mobile app token: {}, Body: {}",
                status, error_body
            )));
        }

        response.text().await.map_err(|e| {
            error!("[pixelplay API] Failed to read mobile app token response: {}", e);
            AppError::ParseError(format!("Failed to read pixelplay API mobile app token response: {}", e))
        })
    }

    pub async fn reset_mcreal_app_token(
        pixelplay_token: &str,
        request_uuid: &str,
        is_experimental: bool,
    ) -> Result<String> {
        let base_url = Self::get_api_base(is_experimental);
        let endpoint = "mcreal/user/mobileAppToken/reset";
        let url = format!("{}/{}", base_url, endpoint);
        
        info!("[pixelplay API] Resetting mcreal app token");
        debug!("[pixelplay API] Full URL: {}", url);
        
        let response = HTTP_CLIENT
            .post(url)
            .header("Authorization", format!("Bearer {}", pixelplay_token))
            .query(&[("uuid", request_uuid)])
            .send()
            .await
            .map_err(|e| {
                error!("[pixelplay API] McReal app token reset request failed: {}", e);
                AppError::RequestError(format!("Failed to reset mobile app token from pixelplay API: {}", e))
            })?;

        let status = response.status();
        debug!("[pixelplay API] McReal app token reset response status: {}", status);

        if !status.is_success() {
            let error_body = response
                .text()
                .await
                .unwrap_or_else(|_| "Failed to read error body".to_string());
            error!(
                "[pixelplay API] McReal app token reset error response: Status {}, Body: {}",
                status, error_body
            );
            return Err(AppError::RequestError(format!(
                "pixelplay API returned error status for mobile app token reset: {}, Body: {}",
                status, error_body
            )));
        }

        response.text().await.map_err(|e| {
            error!("[pixelplay API] Failed to read mobile app token reset response: {}", e);
            AppError::ParseError(format!("Failed to read pixelplay API mobile app token reset response: {}", e))
        })
    }

    // Add more pixelplay API methods as needed
}
