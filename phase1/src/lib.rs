pub mod gmail;
pub mod oauth;
pub mod store;

pub const TEST_ACCOUNT: &str = "jjgumballs@gmail.com";
pub const MODIFY_SCOPE: &str = "https://www.googleapis.com/auth/gmail.modify";
pub const PERMANENT_SCOPE: &str = "https://mail.google.com/";
pub const BATCH_LIMIT: usize = 50;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Scopes {
    pub modify: bool,
    pub permanent: bool,
}

impl Scopes {
    pub fn from_granted(granted: &[String]) -> Self {
        let permanent = granted.iter().any(|s| s == PERMANENT_SCOPE);
        let modify = permanent || granted.iter().any(|s| s == MODIFY_SCOPE);
        Self { modify, permanent }
    }

    pub fn for_login(permanent_delete: bool) -> &'static [&'static str] {
        if permanent_delete {
            &[PERMANENT_SCOPE]
        } else {
            &[MODIFY_SCOPE]
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum MailOp {
    Trash,
    PermanentDelete,
}

#[derive(Debug, PartialEq, Eq)]
pub enum GateError {
    PermanentDeleteNotGranted,
    TrashNotGranted,
    BadMessageId,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct HttpReq {
    pub method: &'static str,
    pub path: String,
    pub body: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct HttpRes {
    pub status: u16,
    pub body: String,
}

pub trait Http {
    fn call(&self, req: HttpReq) -> Result<HttpRes, String>;
}

#[derive(Default)]
pub struct FakeHttp {
    pub calls: std::sync::Mutex<Vec<HttpReq>>,
    pub status_for: std::sync::Mutex<Vec<(String, u16)>>,
}

impl FakeHttp {
    pub fn script(&self, path_contains: &str, status: u16) {
        self.status_for
            .lock()
            .expect("script")
            .push((path_contains.to_string(), status));
    }

    pub fn calls(&self) -> Vec<HttpReq> {
        self.calls.lock().expect("calls").clone()
    }
}

impl Http for FakeHttp {
    fn call(&self, req: HttpReq) -> Result<HttpRes, String> {
        let status = self
            .status_for
            .lock()
            .expect("status")
            .iter()
            .rev()
            .find(|(needle, _)| req.path.contains(needle))
            .map(|(_, status)| *status)
            .unwrap_or(200);
        self.calls.lock().expect("push").push(req);
        Ok(HttpRes {
            status,
            body: "{}".to_string(),
        })
    }
}

pub fn safe_message_id(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= 128
        && id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
}

#[derive(Debug)]
pub struct BatchReport {
    pub done: Vec<String>,
    pub skipped: Vec<String>,
    pub failed: Vec<(String, String)>,
}

pub fn execute_batch(
    http: &impl Http,
    scopes: &Scopes,
    op: MailOp,
    ids: &[String],
) -> Result<BatchReport, GateError> {
    match op {
        MailOp::PermanentDelete if !scopes.permanent => {
            return Err(GateError::PermanentDeleteNotGranted);
        }
        MailOp::Trash if !scopes.modify => return Err(GateError::TrashNotGranted),
        _ => {}
    }

    let mut report = BatchReport {
        done: Vec::new(),
        skipped: Vec::new(),
        failed: Vec::new(),
    };

    for id in ids.iter().take(BATCH_LIMIT) {
        if !safe_message_id(id) {
            report.failed.push((id.clone(), "bad id".to_string()));
            continue;
        }
        let probe = match http.call(HttpReq {
            method: "GET",
            path: format!("/gmail/v1/users/me/messages/{id}?format=minimal"),
            body: None,
        }) {
            Ok(res) => res,
            Err(err) => {
                report.failed.push((id.clone(), err));
                continue;
            }
        };
        if probe.status == 404 {
            report.skipped.push(id.clone());
            continue;
        }
        if probe.status != 200 {
            report
                .failed
                .push((id.clone(), format!("probe {}", probe.status)));
            continue;
        }
        let (method, path) = match op {
            MailOp::Trash => ("POST", format!("/gmail/v1/users/me/messages/{id}/trash")),
            MailOp::PermanentDelete => ("DELETE", format!("/gmail/v1/users/me/messages/{id}")),
        };
        match http.call(HttpReq {
            method,
            path,
            body: None,
        }) {
            Ok(res) if res.status == 200 || res.status == 204 => report.done.push(id.clone()),
            Ok(res) => report
                .failed
                .push((id.clone(), format!("act {}", res.status))),
            Err(err) => report.failed.push((id.clone(), err)),
        }
    }
    Ok(report)
}

pub fn html_to_text(html: &str) -> String {
    let mut out = String::new();
    let lower = html.to_ascii_lowercase();
    let mut i = 0;
    while i < html.len() {
        if lower[i..].starts_with("<script") {
            if let Some(end) = lower[i..].find("</script>") {
                i += end + "</script>".len();
                continue;
            }
        }
        if lower[i..].starts_with("<style") {
            if let Some(end) = lower[i..].find("</style>") {
                i += end + "</style>".len();
                continue;
            }
        }
        if html.as_bytes()[i] == b'<' {
            if let Some(end) = html[i..].find('>') {
                i += end + 1;
                continue;
            }
        }
        let ch = html[i..].chars().next().unwrap_or('\u{FFFD}');
        out.push(ch);
        i += ch.len_utf8();
    }
    out.replace("&", "&")
        .replace("<", "<")
        .replace(">", ">")
        .replace("&nbsp;", " ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn modify_cannot_permanent_delete_and_makes_no_call() {
        let http = FakeHttp::default();
        let scopes = Scopes::from_granted(&[MODIFY_SCOPE.to_string()]);
        let err = execute_batch(
            &http,
            &scopes,
            MailOp::PermanentDelete,
            &["abc123".to_string()],
        )
        .unwrap_err();
        assert_eq!(err, GateError::PermanentDeleteNotGranted);
        assert!(http.calls().is_empty());
    }

    #[test]
    fn trash_posts_trash_not_delete() {
        let http = FakeHttp::default();
        let scopes = Scopes::from_granted(&[MODIFY_SCOPE.to_string()]);
        let report = execute_batch(&http, &scopes, MailOp::Trash, &["abc123".to_string()]).unwrap();
        assert_eq!(report.done, vec!["abc123".to_string()]);
        let calls = http.calls();
        assert_eq!(calls[1].method, "POST");
        assert!(calls[1].path.ends_with("/trash"));
        assert!(!calls.iter().any(|c| c.method == "DELETE"));
    }

    #[test]
    fn full_scope_deletes_and_missing_neighbor_is_skipped() {
        let http = FakeHttp::default();
        http.script("missing99", 404);
        let scopes = Scopes::from_granted(&[PERMANENT_SCOPE.to_string()]);
        let report = execute_batch(
            &http,
            &scopes,
            MailOp::PermanentDelete,
            &["keepok".to_string(), "missing99".to_string()],
        )
        .unwrap();
        assert_eq!(report.done, vec!["keepok".to_string()]);
        assert_eq!(report.skipped, vec!["missing99".to_string()]);
        let calls = http.calls();
        assert!(calls.iter().any(|c| c.method == "DELETE" && c.path.ends_with("/keepok")));
        assert!(!calls.iter().any(|c| c.method == "DELETE" && c.path.contains("missing99")));
    }

    #[test]
    fn login_scopes_stay_split() {
        assert_eq!(Scopes::for_login(false), &[MODIFY_SCOPE]);
        assert_eq!(Scopes::for_login(true), &[PERMANENT_SCOPE]);
    }

    #[test]
    fn html_drops_script() {
        let text = html_to_text("<style>x</style><script>alert(1)</script><p>Hello & co</p>");
        assert_eq!(text, "Hello & co");
        assert!(!text.contains("alert"));
    }
}
