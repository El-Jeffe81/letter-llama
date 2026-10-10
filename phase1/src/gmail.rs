use serde_json::Value;

use crate::html_to_text;

#[derive(Debug, PartialEq, Eq)]
pub enum HistoryRead {
    Deleted(Vec<String>),
    CursorDead,
}

pub fn deleted_from_history(status: u16, body: &str) -> HistoryRead {
    if status == 404 {
        return HistoryRead::CursorDead;
    }
    let Ok(value) = serde_json::from_str::<Value>(body) else {
        return HistoryRead::Deleted(Vec::new());
    };
    let mut ids = Vec::new();
    if let Some(history) = value.get("history").and_then(|h| h.as_array()) {
        for record in history {
            if let Some(deleted) = record.get("messagesDeleted").and_then(|d| d.as_array()) {
                for item in deleted {
                    if let Some(id) = item
                        .get("message")
                        .and_then(|m| m.get("id"))
                        .and_then(|id| id.as_str())
                    {
                        ids.push(id.to_string());
                    }
                }
            }
        }
    }
    HistoryRead::Deleted(ids)
}

pub fn missing_ids(local: &[String], remote: &[String]) -> Vec<String> {
    local
        .iter()
        .filter(|id| !remote.iter().any(|r| r == *id))
        .cloned()
        .collect()
}

pub fn list_ids(body: &str) -> Vec<String> {
    let Ok(value) = serde_json::from_str::<Value>(body) else {
        return Vec::new();
    };
    value
        .get("messages")
        .and_then(|m| m.as_array())
        .map(|rows| {
            rows.iter()
                .filter_map(|row| row.get("id").and_then(|id| id.as_str()).map(str::to_string))
                .collect()
        })
        .unwrap_or_default()
}

pub fn display_text(message: &Value) -> String {
    if let Some(text) = find_part(message.get("payload"), "text/plain") {
        return text;
    }
    if let Some(html) = find_part(message.get("payload"), "text/html") {
        return html_to_text(&html);
    }
    String::new()
}

fn find_part(node: Option<&Value>, mime: &str) -> Option<String> {
    let node = node?;
    if node.get("mimeType").and_then(|m| m.as_str()) == Some(mime) {
        if let Some(data) = node
            .get("body")
            .and_then(|b| b.get("data"))
            .and_then(|d| d.as_str())
        {
            return Some(decode_b64(data));
        }
    }
    for part in node.get("parts")?.as_array()? {
        if let Some(found) = find_part(Some(part), mime) {
            return Some(found);
        }
    }
    None
}

fn decode_b64(data: &str) -> String {
    use base64::engine::general_purpose::{STANDARD, URL_SAFE, URL_SAFE_NO_PAD};
    use base64::Engine;
    let bytes = URL_SAFE_NO_PAD
        .decode(data)
        .or_else(|_| URL_SAFE.decode(data))
        .or_else(|_| STANDARD.decode(data))
        .unwrap_or_default();
    String::from_utf8_lossy(&bytes).into_owned()
}

pub fn rfc822(from: &str, to: &str, subject: &str, text: &str) -> String {
    format!("From: {from}\r\nTo: {to}\r\nSubject: {subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n{text}")
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn history_404_is_a_dead_cursor() {
        assert_eq!(deleted_from_history(404, ""), HistoryRead::CursorDead);
    }

    #[test]
    fn history_lists_deleted_ids_only() {
        let body = r#"{"history":[{"messagesDeleted":[{"message":{"id":"gone1"}}],"messagesAdded":[{"message":{"id":"new1"}}]}]}"#;
        assert_eq!(
            deleted_from_history(200, body),
            HistoryRead::Deleted(vec!["gone1".to_string()])
        );
    }

    #[test]
    fn rescan_marks_only_absent_ids() {
        let missing = missing_ids(&["a".into(), "b".into()], &["b".into()]);
        assert_eq!(missing, vec!["a".to_string()]);
    }

    #[test]
    fn display_uses_plain_and_does_not_keep_html_script() {
        let message = json!({
            "payload": {
                "mimeType": "multipart/alternative",
                "parts": [
                    {"mimeType": "text/plain", "body": {"data": "SGk="}},
                    {"mimeType": "text/html", "body": {"data": "PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=="}}
                ]
            }
        });
        assert_eq!(display_text(&message), "Hi");
    }
}
