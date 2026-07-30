use reqwest::{header::HeaderMap, Client, StatusCode};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
#[cfg(debug_assertions)]
use std::path::{Path, PathBuf};
use std::{
    collections::HashMap,
    env,
    time::{Duration, Instant},
};

const OPENAI_RESPONSES_URL: &str = "https://api.openai.com/v1/responses";
#[cfg(test)]
const OPENAI_MODELS_URL: &str = "https://api.openai.com/v1/models";
pub const DEFAULT_OPENAI_MODEL: &str = "gpt-5.4-mini";
const DEFAULT_TIMEOUT_MILLISECONDS: u64 = 90_000;
const MAX_TIMEOUT_MILLISECONDS: u64 = 180_000;
const MAX_COMMAND_BYTES: usize = 1_500_000;
const MAX_RESPONSE_BYTES: usize = 2_000_000;

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderConfiguration {
    #[serde(default)]
    pub model: Option<String>,
    #[serde(default)]
    pub timeout_milliseconds: Option<u64>,
}

impl Default for ProviderConfiguration {
    fn default() -> Self {
        Self {
            model: None,
            timeout_milliseconds: None,
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiParameterLocation {
    #[serde(rename = "type")]
    pub kind: String,
    #[serde(default)]
    pub menu: Option<String>,
    #[serde(default)]
    pub page: Option<Value>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiParameterSpec {
    pub id: String,
    pub label: String,
    pub section: String,
    pub value_type: String,
    #[serde(default)]
    pub minimum: Option<f64>,
    #[serde(default)]
    pub maximum: Option<f64>,
    #[serde(default)]
    pub step: Option<f64>,
    #[serde(default)]
    pub enum_values: Option<Vec<String>>,
    pub default_value: Value,
    pub location: AiParameterLocation,
    pub sonic_effect: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiMatrixEntity {
    pub id: String,
    pub label: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiMatrixCatalog {
    pub slots: u8,
    pub depth_minimum: i16,
    pub depth_maximum: i16,
    pub sources: Vec<AiMatrixEntity>,
    pub destinations: Vec<AiMatrixEntity>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiCatalogContext {
    pub parameters: Vec<AiParameterSpec>,
    pub modulation: AiMatrixCatalog,
    pub fx_modulation: AiMatrixCatalog,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RepairContext {
    pub candidate: Value,
    pub validation_issues: Vec<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateSummitPatchRequest {
    pub description: String,
    #[serde(default)]
    pub refinement_instructions: Option<String>,
    pub target_firmware: String,
    pub patch_scope: String,
    #[serde(default)]
    pub current_patch_summary: Option<Value>,
    #[serde(default)]
    pub provider_configuration: ProviderConfiguration,
    pub catalog: AiCatalogContext,
    #[serde(default)]
    pub repair: Option<RepairContext>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TokenUsage {
    pub input_tokens: u64,
    pub output_tokens: u64,
    pub total_tokens: u64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerationMetadata {
    pub request_id: String,
    pub model: String,
    pub duration_milliseconds: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub usage: Option<TokenUsage>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateSummitPatchResponse {
    pub generation: Value,
    pub metadata: GenerationMetadata,
}

#[derive(Debug, Clone, Copy, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum OpenAiErrorCode {
    MissingApiKey,
    InvalidRequest,
    Authentication,
    PermissionDenied,
    RateLimit,
    CreditBalanceExhausted,
    OrganizationSpendLimitExceeded,
    ProjectSpendLimitExceeded,
    OrganizationUsageLimitExceeded,
    InsufficientQuota,
    ModelUnavailable,
    NetworkFailure,
    Timeout,
    Refusal,
    IncompleteResponse,
    MalformedStructuredOutput,
    ProviderUnavailable,
}

#[derive(Debug, Clone, Deserialize, Serialize, thiserror::Error)]
#[error("{message}")]
#[serde(rename_all = "camelCase")]
pub struct OpenAiApplicationError {
    pub code: OpenAiErrorCode,
    pub message: String,
    pub retryable: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<u16>,
}

impl OpenAiApplicationError {
    fn new(code: OpenAiErrorCode, message: impl Into<String>, retryable: bool) -> Self {
        Self {
            code,
            message: message.into(),
            retryable,
            status: None,
        }
    }

    fn with_status(mut self, status: StatusCode) -> Self {
        self.status = Some(status.as_u16());
        self
    }
}

struct OpenAiClient {
    api_key: String,
    model: String,
    http: Client,
}

impl OpenAiClient {
    fn from_environment(
        provider_configuration: &ProviderConfiguration,
    ) -> Result<Self, OpenAiApplicationError> {
        let local_values = development_env_values();
        let api_key = non_empty_env("OPENAI_API_KEY")
            .or_else(|| local_values.get("OPENAI_API_KEY").cloned())
            .ok_or_else(|| {
                OpenAiApplicationError::new(
                    OpenAiErrorCode::MissingApiKey,
                    "OPENAI_API_KEY non è configurata nel backend.",
                    false,
                )
            })?;
        let model = provider_configuration
            .model
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_owned)
            .or_else(|| non_empty_env("OPENAI_MODEL"))
            .or_else(|| local_values.get("OPENAI_MODEL").cloned())
            .unwrap_or_else(|| DEFAULT_OPENAI_MODEL.to_owned());
        let timeout_milliseconds = provider_configuration
            .timeout_milliseconds
            .unwrap_or(DEFAULT_TIMEOUT_MILLISECONDS)
            .clamp(1_000, MAX_TIMEOUT_MILLISECONDS);
        let http = Client::builder()
            .timeout(Duration::from_millis(timeout_milliseconds))
            .build()
            .map_err(|_| {
                OpenAiApplicationError::new(
                    OpenAiErrorCode::ProviderUnavailable,
                    "Impossibile inizializzare il client OpenAI.",
                    true,
                )
            })?;
        Ok(Self {
            api_key,
            model,
            http,
        })
    }

    async fn generate(
        &self,
        request: &GenerateSummitPatchRequest,
    ) -> Result<GenerateSummitPatchResponse, OpenAiApplicationError> {
        validate_command_request(request)?;
        let body = build_responses_request(request, &self.model);
        let started = Instant::now();
        let response = self
            .http
            .post(OPENAI_RESPONSES_URL)
            .bearer_auth(&self.api_key)
            .json(&body)
            .send()
            .await
            .map_err(classify_network_error)?;
        let status = response.status();
        let headers = response.headers().clone();
        if response
            .content_length()
            .is_some_and(|length| length > MAX_RESPONSE_BYTES as u64)
        {
            return Err(OpenAiApplicationError::new(
                OpenAiErrorCode::MalformedStructuredOutput,
                "La risposta OpenAI supera il limite consentito.",
                false,
            )
            .with_status(status));
        }
        let response_bytes = response.bytes().await.map_err(classify_network_error)?;
        if response_bytes.len() > MAX_RESPONSE_BYTES {
            return Err(OpenAiApplicationError::new(
                OpenAiErrorCode::MalformedStructuredOutput,
                "La risposta OpenAI supera il limite consentito.",
                false,
            )
            .with_status(status));
        }
        let payload: Value = serde_json::from_slice(&response_bytes).map_err(|_| {
            OpenAiApplicationError::new(
                OpenAiErrorCode::MalformedStructuredOutput,
                "OpenAI ha restituito una risposta non decodificabile.",
                true,
            )
            .with_status(status)
        })?;
        if !status.is_success() {
            return Err(classify_http_error(status, &payload));
        }
        parse_success_response(payload, headers, started.elapsed(), &self.model)
    }
}

#[tauri::command]
pub async fn generate_summit_patch(
    request: GenerateSummitPatchRequest,
) -> Result<GenerateSummitPatchResponse, OpenAiApplicationError> {
    let client = OpenAiClient::from_environment(&request.provider_configuration)?;
    client.generate(&request).await
}

fn validate_command_request(
    request: &GenerateSummitPatchRequest,
) -> Result<(), OpenAiApplicationError> {
    let description_length = request.description.trim().chars().count();
    let refinement_length = request
        .refinement_instructions
        .as_deref()
        .unwrap_or_default()
        .trim()
        .chars()
        .count();
    let unique_parameter_ids = request
        .catalog
        .parameters
        .iter()
        .map(|parameter| parameter.id.as_str())
        .collect::<std::collections::HashSet<_>>();
    let matrix_catalogs = [&request.catalog.modulation, &request.catalog.fx_modulation];
    let catalog_is_valid = !request.catalog.parameters.is_empty()
        && request.catalog.parameters.len() <= 400
        && unique_parameter_ids.len() == request.catalog.parameters.len()
        && matrix_catalogs.iter().all(|catalog| {
            catalog.slots > 0
                && !catalog.sources.is_empty()
                && !catalog.destinations.is_empty()
                && catalog.depth_minimum < catalog.depth_maximum
        });
    let repair_is_valid = request.repair.as_ref().is_none_or(|repair| {
        repair.validation_issues.len() <= 50
            && repair
                .validation_issues
                .iter()
                .all(|issue| issue.chars().count() <= 500)
    });
    let model_is_valid = request
        .provider_configuration
        .model
        .as_deref()
        .is_none_or(|model| {
            let length = model.trim().chars().count();
            (1..=128).contains(&length)
        });
    let firmware_is_valid = {
        let value = request.target_firmware.trim();
        !value.is_empty()
            && value.chars().count() <= 32
            && value
                .chars()
                .all(|character| character.is_ascii_digit() || character == '.')
    };
    let request_is_bounded =
        serde_json::to_vec(request).is_ok_and(|serialized| serialized.len() <= MAX_COMMAND_BYTES);
    if !(3..=2_000).contains(&description_length)
        || refinement_length > 1_000
        || !firmware_is_valid
        || !matches!(request.patch_scope.as_str(), "single" | "multi")
        || !catalog_is_valid
        || !repair_is_valid
        || !model_is_valid
        || !request_is_bounded
    {
        return Err(OpenAiApplicationError::new(
            OpenAiErrorCode::InvalidRequest,
            "La richiesta di generazione non è valida.",
            false,
        ));
    }
    Ok(())
}

fn build_responses_request(request: &GenerateSummitPatchRequest, model: &str) -> Value {
    let schema = generation_json_schema(&request.catalog);
    let task = if request.refinement_instructions.is_some() {
        "refinement"
    } else {
        "generation"
    };
    let user_payload = json!({
        "task": task,
        "soundDescription": request.description.trim(),
        "refinementInstructions": request.refinement_instructions,
        "targetFirmware": request.target_firmware,
        "patchScope": request.patch_scope,
        "currentPatchSummary": request.current_patch_summary,
        "verifiedCatalog": request.catalog,
        "repair": request.repair,
    });
    json!({
        "model": model,
        "store": false,
        "max_output_tokens": 12_000,
        "input": [
            {
                "role": "system",
                "content": [
                    {
                        "type": "input_text",
                        "text": system_prompt()
                    }
                ]
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": user_payload.to_string()
                    }
                ]
            }
        ],
        "text": {
            "format": {
                "type": "json_schema",
                "name": "ai_summit_patch_generation",
                "description": "A verified-catalog delta used to build a Novation Summit patch locally.",
                "strict": true,
                "schema": schema
            }
        }
    })
}

fn system_prompt() -> &'static str {
    "You design Novation Summit patches from text. Return only the requested structured object. \
Use exclusively exact parameter, modulation-source and modulation-destination IDs from the \
verified compact catalog. The settings and matrix arrays are DELTAS: include only values that \
must differ from the supplied Init/current patch. Never invent parameters, ranges, enum values, \
menu locations, MIDI, NRPN or SysEx. Prefer a small, audible delta over unnecessary changes. \
For an initial generation, assume the deterministic verified Init Patch described by the \
catalog defaults. For refinement, preserve the current patch unless the refinement explicitly \
requires a change. Use sourceB \"direct\" when no secondary modulation source is needed. If \
uncertain, omit the setting and add a warning. Explanations must be concise Italian text. \
Do not output hidden chain-of-thought. Do not claim hardware verification or exact recreation."
}

fn generation_json_schema(catalog: &AiCatalogContext) -> Value {
    let parameter_ids: Vec<&str> = catalog
        .parameters
        .iter()
        .map(|parameter| parameter.id.as_str())
        .collect();
    let mod_sources: Vec<&str> = catalog
        .modulation
        .sources
        .iter()
        .map(|entity| entity.id.as_str())
        .collect();
    let mod_destinations: Vec<&str> = catalog
        .modulation
        .destinations
        .iter()
        .map(|entity| entity.id.as_str())
        .collect();
    let fx_sources: Vec<&str> = catalog
        .fx_modulation
        .sources
        .iter()
        .map(|entity| entity.id.as_str())
        .collect();
    let fx_destinations: Vec<&str> = catalog
        .fx_modulation
        .destinations
        .iter()
        .map(|entity| entity.id.as_str())
        .collect();
    let confidence = || json!({"type": "number", "minimum": 0, "maximum": 1});
    let matrix_slot = |catalog: &AiMatrixCatalog, sources: Vec<&str>, destinations: Vec<&str>| {
        json!({
            "type": "object",
            "properties": {
                "slot": {"type": "integer", "minimum": 1, "maximum": catalog.slots},
                "sourceA": {"type": "string", "enum": sources},
                "sourceB": {"type": "string", "enum": sources},
                "destination": {"type": "string", "enum": destinations},
                "depth": {
                    "type": "integer",
                    "minimum": catalog.depth_minimum,
                    "maximum": catalog.depth_maximum
                },
                "rationale": {"type": "string"},
                "confidence": confidence()
            },
            "required": [
                "slot", "sourceA", "sourceB", "destination", "depth", "rationale", "confidence"
            ],
            "additionalProperties": false
        })
    };
    json!({
        "type": "object",
        "properties": {
            "schemaVersion": {"type": "string", "const": "1.0.0"},
            "patchName": {"type": "string", "minLength": 1, "maxLength": 16},
            "category": {
                "type": "string",
                "enum": ["bass", "lead", "pad", "pluck", "keys", "bell", "fx", "sequence", "other"]
            },
            "description": {"type": "string"},
            "soundAnalysis": {
                "type": "object",
                "properties": {
                    "role": {"type": "string"},
                    "brightness": confidence(),
                    "movement": confidence(),
                    "width": confidence(),
                    "attackCharacter": {"type": "string"},
                    "sustainCharacter": {"type": "string"},
                    "transientCharacter": {"type": "string"},
                    "harmonicCharacter": {"type": "string"},
                    "spatialCharacter": {"type": "string"}
                },
                "required": [
                    "role", "brightness", "movement", "width", "attackCharacter",
                    "sustainCharacter", "transientCharacter", "harmonicCharacter",
                    "spatialCharacter"
                ],
                "additionalProperties": false
            },
            "settings": {
                "type": "array",
                "maxItems": 240,
                "items": {
                    "type": "object",
                    "properties": {
                        "parameterId": {"type": "string", "enum": parameter_ids},
                        "value": {
                            "anyOf": [
                                {"type": "number"},
                                {"type": "string"},
                                {"type": "boolean"}
                            ]
                        },
                        "rationale": {"type": "string"},
                        "confidence": confidence()
                    },
                    "required": ["parameterId", "value", "rationale", "confidence"],
                    "additionalProperties": false
                }
            },
            "modulationSlots": {
                "type": "array",
                "maxItems": catalog.modulation.slots,
                "items": matrix_slot(
                    &catalog.modulation,
                    mod_sources,
                    mod_destinations
                )
            },
            "fxModulationSlots": {
                "type": "array",
                "maxItems": catalog.fx_modulation.slots,
                "items": matrix_slot(
                    &catalog.fx_modulation,
                    fx_sources,
                    fx_destinations
                )
            },
            "sectionConfidence": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "section": {
                            "type": "string",
                            "enum": [
                                "oscillators", "mixer", "filter", "envelopes", "lfo",
                                "voice", "modulation", "effects", "performance"
                            ]
                        },
                        "confidence": confidence(),
                        "reason": {"type": "string"}
                    },
                    "required": ["section", "confidence", "reason"],
                    "additionalProperties": false
                }
            },
            "assumptions": {"type": "array", "items": {"type": "string"}},
            "warnings": {"type": "array", "items": {"type": "string"}},
            "summary": {"type": "string"}
        },
        "required": [
            "schemaVersion", "patchName", "category", "description", "soundAnalysis",
            "settings", "modulationSlots", "fxModulationSlots", "sectionConfidence",
            "assumptions", "warnings", "summary"
        ],
        "additionalProperties": false
    })
}

fn parse_success_response(
    payload: Value,
    headers: HeaderMap,
    duration: Duration,
    fallback_model: &str,
) -> Result<GenerateSummitPatchResponse, OpenAiApplicationError> {
    let status = payload
        .get("status")
        .and_then(Value::as_str)
        .unwrap_or_default();
    if status == "incomplete" {
        return Err(OpenAiApplicationError::new(
            OpenAiErrorCode::IncompleteResponse,
            "La risposta OpenAI è incompleta. Riprova con una richiesta più breve.",
            true,
        ));
    }
    if status != "completed" {
        return Err(OpenAiApplicationError::new(
            OpenAiErrorCode::ProviderUnavailable,
            "OpenAI non ha completato la generazione.",
            true,
        ));
    }
    let mut output_text: Option<&str> = None;
    let mut refused = false;
    if let Some(output) = payload.get("output").and_then(Value::as_array) {
        for item in output {
            if let Some(content) = item.get("content").and_then(Value::as_array) {
                for part in content {
                    match part.get("type").and_then(Value::as_str) {
                        Some("output_text") => {
                            output_text = part.get("text").and_then(Value::as_str);
                        }
                        Some("refusal") => refused = true,
                        _ => {}
                    }
                }
            }
        }
    }
    if refused {
        return Err(OpenAiApplicationError::new(
            OpenAiErrorCode::Refusal,
            "OpenAI ha rifiutato questa richiesta. Riformula la descrizione sonora.",
            false,
        ));
    }
    let generation = output_text
        .ok_or_else(|| {
            OpenAiApplicationError::new(
                OpenAiErrorCode::MalformedStructuredOutput,
                "La risposta OpenAI non contiene l'output strutturato atteso.",
                true,
            )
        })
        .and_then(|text| {
            serde_json::from_str(text).map_err(|_| {
                OpenAiApplicationError::new(
                    OpenAiErrorCode::MalformedStructuredOutput,
                    "L'output strutturato OpenAI non è JSON valido.",
                    true,
                )
            })
        })?;
    let request_id = headers
        .get("x-request-id")
        .and_then(|value| value.to_str().ok())
        .map(str::to_owned)
        .or_else(|| payload.get("id").and_then(Value::as_str).map(str::to_owned))
        .unwrap_or_else(|| "unavailable".to_owned());
    let model = payload
        .get("model")
        .and_then(Value::as_str)
        .unwrap_or(fallback_model)
        .to_owned();
    let usage = payload.get("usage").and_then(parse_usage);
    Ok(GenerateSummitPatchResponse {
        generation,
        metadata: GenerationMetadata {
            request_id,
            model,
            duration_milliseconds: duration.as_millis().try_into().unwrap_or(u64::MAX),
            usage,
        },
    })
}

fn parse_usage(value: &Value) -> Option<TokenUsage> {
    Some(TokenUsage {
        input_tokens: value.get("input_tokens")?.as_u64()?,
        output_tokens: value.get("output_tokens")?.as_u64()?,
        total_tokens: value.get("total_tokens")?.as_u64()?,
    })
}

fn classify_network_error(error: reqwest::Error) -> OpenAiApplicationError {
    if error.is_timeout() {
        OpenAiApplicationError::new(
            OpenAiErrorCode::Timeout,
            "La richiesta OpenAI ha superato il tempo massimo.",
            true,
        )
    } else {
        OpenAiApplicationError::new(
            OpenAiErrorCode::NetworkFailure,
            "Impossibile raggiungere OpenAI. Controlla la connessione e riprova.",
            true,
        )
    }
}

fn classify_http_error(status: StatusCode, payload: &Value) -> OpenAiApplicationError {
    let error = payload.get("error").unwrap_or(payload);
    let error_code = error
        .get("code")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_ascii_lowercase();
    let category = [
        error.get("code").and_then(Value::as_str),
        error.get("type").and_then(Value::as_str),
        error.get("message").and_then(Value::as_str),
    ]
    .into_iter()
    .flatten()
    .collect::<Vec<_>>()
    .join(" ")
    .to_ascii_lowercase();
    let result = match status {
        StatusCode::UNAUTHORIZED => OpenAiApplicationError::new(
            OpenAiErrorCode::Authentication,
            "La configurazione OpenAI non è autenticata.",
            false,
        ),
        StatusCode::FORBIDDEN => OpenAiApplicationError::new(
            OpenAiErrorCode::PermissionDenied,
            "Il progetto OpenAI non autorizza questa operazione.",
            false,
        ),
        StatusCode::NOT_FOUND if category.contains("model") => OpenAiApplicationError::new(
            OpenAiErrorCode::ModelUnavailable,
            "Il modello OpenAI configurato non è disponibile per questo progetto.",
            false,
        ),
        StatusCode::TOO_MANY_REQUESTS if error_code == "credit_balance_exhausted" => {
            OpenAiApplicationError::new(
                OpenAiErrorCode::CreditBalanceExhausted,
                "Il credito prepagato dell'organizzazione OpenAI è esaurito.",
                false,
            )
        }
        StatusCode::TOO_MANY_REQUESTS if error_code == "organization_spend_limit_exceeded" => {
            OpenAiApplicationError::new(
                OpenAiErrorCode::OrganizationSpendLimitExceeded,
                "È stato raggiunto il limite di spesa dell'organizzazione OpenAI.",
                false,
            )
        }
        StatusCode::TOO_MANY_REQUESTS if error_code == "project_spend_limit_exceeded" => {
            OpenAiApplicationError::new(
                OpenAiErrorCode::ProjectSpendLimitExceeded,
                "È stato raggiunto il limite di spesa del progetto OpenAI.",
                false,
            )
        }
        StatusCode::TOO_MANY_REQUESTS if error_code == "organization_usage_limit_exceeded" => {
            OpenAiApplicationError::new(
                OpenAiErrorCode::OrganizationUsageLimitExceeded,
                "È stato raggiunto il limite di utilizzo assegnato all'organizzazione OpenAI.",
                false,
            )
        }
        StatusCode::TOO_MANY_REQUESTS
            if category.contains("quota")
                || category.contains("billing")
                || category.contains("credit") =>
        {
            OpenAiApplicationError::new(
                OpenAiErrorCode::InsufficientQuota,
                "Quota o credito OpenAI non sufficienti.",
                false,
            )
        }
        StatusCode::TOO_MANY_REQUESTS => OpenAiApplicationError::new(
            OpenAiErrorCode::RateLimit,
            "Limite di richieste OpenAI raggiunto. Attendi e riprova.",
            true,
        ),
        StatusCode::REQUEST_TIMEOUT | StatusCode::GATEWAY_TIMEOUT => OpenAiApplicationError::new(
            OpenAiErrorCode::Timeout,
            "La richiesta OpenAI ha superato il tempo massimo.",
            true,
        ),
        status if status.is_server_error() => OpenAiApplicationError::new(
            OpenAiErrorCode::ProviderUnavailable,
            "OpenAI è temporaneamente non disponibile.",
            true,
        ),
        _ if category.contains("model") => OpenAiApplicationError::new(
            OpenAiErrorCode::ModelUnavailable,
            "Il modello OpenAI configurato non è disponibile per questo progetto.",
            false,
        ),
        _ => OpenAiApplicationError::new(
            OpenAiErrorCode::InvalidRequest,
            "OpenAI ha rifiutato la richiesta strutturata.",
            false,
        ),
    };
    result.with_status(status)
}

fn non_empty_env(name: &str) -> Option<String> {
    env::var(name)
        .ok()
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
}

#[cfg(debug_assertions)]
fn development_env_values() -> HashMap<String, String> {
    for path in development_env_paths() {
        if !path.is_file() {
            continue;
        }
        if let Ok(entries) = dotenvy::from_path_iter(path) {
            return entries
                .filter_map(Result::ok)
                .filter(|(name, _)| name == "OPENAI_API_KEY" || name == "OPENAI_MODEL")
                .collect();
        }
    }
    HashMap::new()
}

#[cfg(not(debug_assertions))]
fn development_env_values() -> HashMap<String, String> {
    HashMap::new()
}

#[cfg(debug_assertions)]
fn development_env_paths() -> Vec<PathBuf> {
    let mut paths = Vec::new();
    if let Ok(current) = env::current_dir() {
        paths.push(current.join(".env.local"));
    }
    let manifest_dir = Path::new(env!("CARGO_MANIFEST_DIR"));
    if let Some(repository_root) = manifest_dir.parent() {
        let candidate = repository_root.join(".env.local");
        if !paths.contains(&candidate) {
            paths.push(candidate);
        }
    }
    paths
}

#[cfg(test)]
mod tests {
    use super::*;

    fn catalog() -> AiCatalogContext {
        let direct = AiMatrixEntity {
            id: "direct".to_owned(),
            label: "Direct".to_owned(),
        };
        let filter = AiMatrixEntity {
            id: "filter.frequency".to_owned(),
            label: "Filter Frequency".to_owned(),
        };
        AiCatalogContext {
            parameters: vec![AiParameterSpec {
                id: "filter.frequency".to_owned(),
                label: "Frequency".to_owned(),
                section: "filter".to_owned(),
                value_type: "integer".to_owned(),
                minimum: Some(0.0),
                maximum: Some(255.0),
                step: Some(1.0),
                enum_values: None,
                default_value: json!(127),
                location: AiParameterLocation {
                    kind: "panel".to_owned(),
                    menu: None,
                    page: None,
                },
                sonic_effect: "Controls filter brightness.".to_owned(),
            }],
            modulation: AiMatrixCatalog {
                slots: 16,
                depth_minimum: -64,
                depth_maximum: 63,
                sources: vec![direct.clone()],
                destinations: vec![filter.clone()],
            },
            fx_modulation: AiMatrixCatalog {
                slots: 4,
                depth_minimum: -64,
                depth_maximum: 63,
                sources: vec![direct],
                destinations: vec![filter],
            },
        }
    }

    fn request() -> GenerateSummitPatchRequest {
        GenerateSummitPatchRequest {
            description: "Pluck brillante, corto e controllato.".to_owned(),
            refinement_instructions: None,
            target_firmware: "2.1".to_owned(),
            patch_scope: "single".to_owned(),
            current_patch_summary: None,
            provider_configuration: ProviderConfiguration {
                model: Some(DEFAULT_OPENAI_MODEL.to_owned()),
                timeout_milliseconds: Some(90_000),
            },
            catalog: catalog(),
            repair: None,
        }
    }

    #[test]
    fn responses_request_is_private_and_strict() {
        let body = build_responses_request(&request(), DEFAULT_OPENAI_MODEL);
        assert_eq!(body["store"], json!(false));
        assert_eq!(body["text"]["format"]["strict"], json!(true));
        assert_eq!(body["text"]["format"]["type"], json!("json_schema"));
        assert_eq!(
            body["text"]["format"]["schema"]["additionalProperties"],
            json!(false)
        );
    }

    #[test]
    fn parses_completed_structured_output_without_logging_payloads() {
        let generation = json!({
            "schemaVersion": "1.0.0",
            "patchName": "Test",
            "category": "pluck",
            "description": "Test",
            "soundAnalysis": {
                "role": "pluck",
                "brightness": 0.8,
                "movement": 0.2,
                "width": 0.4,
                "attackCharacter": "fast",
                "sustainCharacter": "short",
                "transientCharacter": "defined",
                "harmonicCharacter": "bright",
                "spatialCharacter": "controlled"
            },
            "settings": [],
            "modulationSlots": [],
            "fxModulationSlots": [],
            "sectionConfidence": [],
            "assumptions": [],
            "warnings": [],
            "summary": "Test"
        });
        let payload = json!({
            "id": "resp_test",
            "model": DEFAULT_OPENAI_MODEL,
            "status": "completed",
            "output": [{
                "type": "message",
                "content": [{"type": "output_text", "text": generation.to_string()}]
            }],
            "usage": {"input_tokens": 10, "output_tokens": 20, "total_tokens": 30}
        });
        let parsed = parse_success_response(
            payload,
            HeaderMap::new(),
            Duration::from_millis(25),
            DEFAULT_OPENAI_MODEL,
        )
        .expect("response should parse");
        assert_eq!(parsed.generation["patchName"], "Test");
        assert_eq!(parsed.metadata.request_id, "resp_test");
        assert_eq!(parsed.metadata.usage.expect("usage").total_tokens, 30);
    }

    #[test]
    fn classifies_quota_separately_from_rate_limits() {
        let billing_cases = [
            (
                "credit_balance_exhausted",
                OpenAiErrorCode::CreditBalanceExhausted,
            ),
            (
                "organization_spend_limit_exceeded",
                OpenAiErrorCode::OrganizationSpendLimitExceeded,
            ),
            (
                "project_spend_limit_exceeded",
                OpenAiErrorCode::ProjectSpendLimitExceeded,
            ),
            (
                "organization_usage_limit_exceeded",
                OpenAiErrorCode::OrganizationUsageLimitExceeded,
            ),
        ];
        for (code, expected) in billing_cases {
            let classified = classify_http_error(
                StatusCode::TOO_MANY_REQUESTS,
                &json!({"error": {"code": code, "type": "insufficient_quota"}}),
            );
            assert_eq!(classified.code, expected);
        }
        let quota = classify_http_error(
            StatusCode::TOO_MANY_REQUESTS,
            &json!({"error": {"type": "insufficient_quota"}}),
        );
        let rate = classify_http_error(
            StatusCode::TOO_MANY_REQUESTS,
            &json!({"error": {"code": "rate_limit_exceeded"}}),
        );
        assert!(matches!(quota.code, OpenAiErrorCode::InsufficientQuota));
        assert!(matches!(rate.code, OpenAiErrorCode::RateLimit));
    }

    #[test]
    #[ignore = "requires the developer's local OpenAI credential and network"]
    fn live_default_model_access() {
        let client = OpenAiClient::from_environment(&request().provider_configuration)
            .expect("OpenAI backend configuration should be usable");
        let status = tauri::async_runtime::block_on(async {
            client
                .http
                .get(format!("{OPENAI_MODELS_URL}/{}", client.model))
                .bearer_auth(&client.api_key)
                .send()
                .await
                .map(|response| response.status())
        })
        .expect("OpenAI model lookup should complete");
        assert!(
            status.is_success(),
            "configured OpenAI model is not accessible (status {})",
            status.as_u16()
        );
    }

    #[test]
    #[ignore = "requires the developer's local OpenAI credential and network"]
    fn live_openai_patch_generation() {
        let request = request();
        let result = tauri::async_runtime::block_on(async {
            let client = OpenAiClient::from_environment(&request.provider_configuration)?;
            client.generate(&request).await
        })
        .expect("live OpenAI generation should succeed");
        assert_eq!(result.generation["schemaVersion"], "1.0.0");
        assert!(result.metadata.model.starts_with(DEFAULT_OPENAI_MODEL));
    }
}
