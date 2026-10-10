use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use sha2::{Digest, Sha256};

use crate::{MODIFY_SCOPE, PERMANENT_SCOPE};

pub fn verifier() -> String {
    let mut bytes = [0u8; 32];
    getrandom::getrandom(&mut bytes).expect("os randomness");
    URL_SAFE_NO_PAD.encode(bytes)
}

pub fn challenge(verifier: &str) -> String {
    URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()))
}

pub fn authorize_url(
    client_id: &str,
    redirect_uri: &str,
    code_challenge: &str,
    state: &str,
    permanent_delete: bool,
) -> String {
    let scope = if permanent_delete {
        PERMANENT_SCOPE
    } else {
        MODIFY_SCOPE
    };
    format!(
        "https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id={}&redirect_uri={}&scope={}&state={}&code_challenge={}&code_challenge_method=S256&access_type=offline&prompt=consent",
        pct(client_id),
        pct(redirect_uri),
        pct(scope),
        pct(state),
        pct(code_challenge),
    )
}

pub fn code_from_query(query: &str) -> Option<String> {
    for pair in query.trim_start_matches('?').split('&') {
        let mut parts = pair.splitn(2, '=');
        if parts.next() == Some("code") {
            return parts.next().map(decode_query).filter(|s| !s.is_empty());
        }
    }
    None
}

fn pct(s: &str) -> String {
    let mut out = String::new();
    for b in s.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(b as char)
            }
            _ => out.push_str(&format!("%{b:02X}")),
        }
    }
    out
}

fn decode_query(s: &str) -> String {
    let bytes = s.as_bytes();
    let mut out = Vec::new();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let Ok(v) = u8::from_str_radix(&s[i + 1..i + 3], 16) {
                out.push(v);
                i += 3;
                continue;
            }
        }
        out.push(if bytes[i] == b'+' { b' ' } else { bytes[i] });
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pkce_challenge_matches_verifier() {
        let v = verifier();
        assert!(v.len() >= 43);
        let c = challenge(&v);
        assert_eq!(c, URL_SAFE_NO_PAD.encode(Sha256::digest(v.as_bytes())));
        assert!(!c.contains('='));
    }

    #[test]
    fn first_login_does_not_ask_for_full_mail() {
        let url = authorize_url("id", "http://127.0.0.1:9/", "chal", "st", false);
        assert!(url.contains("gmail.modify"));
        assert!(!url.contains("mail.google.com"));
        assert!(url.contains("code_challenge_method=S256"));
    }

    #[test]
    fn permanent_login_asks_only_for_full_mail() {
        let url = authorize_url("id", "http://127.0.0.1:9/", "chal", "st", true);
        assert!(url.contains("mail.google.com"));
        assert!(!url.contains("gmail.modify"));
    }

    #[test]
    fn reads_code() {
        assert_eq!(
            code_from_query("code=abc%2F1&state=st").as_deref(),
            Some("abc/1")
        );
        assert_eq!(code_from_query("error=access_denied"), None);
    }
}
