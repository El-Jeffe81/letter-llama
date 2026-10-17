use std::env;
use std::io::{Read, Write};
use std::net::TcpListener;
use std::path::PathBuf;

use letter_llama::gmail::{deleted_from_history, HistoryRead};
use letter_llama::oauth::{authorize_url, challenge, code_from_query, verifier};
use letter_llama::store::Store;
use letter_llama::{
    execute_batch, BatchReport, GateError, Http, HttpReq, HttpRes, MailOp, Scopes, TEST_ACCOUNT,
};

struct LiveHttp {
    token: String,
    client: reqwest::blocking::Client,
}

impl Http for LiveHttp {
    fn call(&self, req: HttpReq) -> Result<HttpRes, String> {
        let url = format!("https://gmail.googleapis.com{}", req.path);
        let builder = self
            .client
            .request(
                reqwest::Method::from_bytes(req.method.as_bytes()).map_err(|e| e.to_string())?,
                &url,
            )
            .bearer_auth(&self.token);
        let builder = if let Some(body) = req.body {
            builder
                .header("content-type", "application/json")
                .body(body)
        } else {
            builder
        };
        let res = builder.send().map_err(|e| e.to_string())?;
        let status = res.status().as_u16();
        let body = res.text().unwrap_or_default();
        Ok(HttpRes { status, body })
    }
}

fn main() {
    let mut args = env::args().skip(1);
    let cmd = args.next().unwrap_or_default();
    let code = match cmd.as_str() {
        "doctor" => doctor(),
        "auth-url" => auth_url(args.next().as_deref() == Some("--permanent")),
        "auth" => auth(args.next().as_deref() == Some("--permanent")),
        "trash" => act(MailOp::Trash, &args.collect::<Vec<_>>()),
        "delete" => act(MailOp::PermanentDelete, &collect_rest(args)),
        "history" => history_cmd(),
        "clear-index" => clear_index(),
        _ => {
            eprintln!(
                "letter-llama commands: doctor | auth-url [--permanent] | auth [--permanent] | trash ID | delete ID | history | clear-index"
            );
            2
        }
    };
    std::process::exit(code);
}

fn collect_rest(args: impl Iterator<Item = String>) -> Vec<String> {
    args.collect()
}

fn account() -> String {
    env::var("LETTER_LLAMA_ACCOUNT").unwrap_or_else(|_| TEST_ACCOUNT.to_string())
}

fn db_path() -> PathBuf {
    PathBuf::from(env::var("LETTER_LLAMA_DB").unwrap_or_else(|_| "letter-llama.db".to_string()))
}

fn client_id() -> Result<String, i32> {
    if let Ok(id) = env::var("LETTER_LLAMA_CLIENT_ID") {
        if !id.is_empty() {
            return Ok(id);
        }
    }
    for path in [".env", "phase1/.env"] {
        let Ok(text) = std::fs::read_to_string(path) else {
            continue;
        };
        for line in text.lines() {
            let Some(rest) = line.trim().strip_prefix("LETTER_LLAMA_CLIENT_ID=") else {
                continue;
            };
            let id = rest.trim().trim_matches('"').to_string();
            if !id.is_empty() {
                return Ok(id);
            }
        }
    }
    eprintln!("Set LETTER_LLAMA_CLIENT_ID to the Google desktop OAuth client id. Do not paste a password.");
    Err(1)
}

fn doctor() -> i32 {
    match keyring::Entry::new("letter-llama", "doctor-probe") {
        Ok(entry) => match entry.set_password("probe") {
            Ok(()) => {
                let _ = entry.delete_credential();
                println!("keychain: ok");
                0
            }
            Err(err) => {
                eprintln!("keychain: refusing to store tokens ({err})");
                1
            }
        },
        Err(err) => {
            eprintln!("keychain: refusing to store tokens ({err})");
            1
        }
    }
}

fn auth_url(permanent: bool) -> i32 {
    let Ok(id) = client_id() else {
        return 1;
    };
    let url = authorize_url(
        &id,
        "http://127.0.0.1:8765/",
        &challenge(&verifier()),
        "state",
        permanent,
    );
    println!("{url}");
    0
}

fn auth(permanent: bool) -> i32 {
    let Ok(id) = client_id() else {
        return 1;
    };
    let listener = match TcpListener::bind("127.0.0.1:0") {
        Ok(listener) => listener,
        Err(err) => {
            eprintln!("loopback: {err}");
            return 1;
        }
    };
    let port = match listener.local_addr() {
        Ok(addr) => addr.port(),
        Err(err) => {
            eprintln!("loopback: {err}");
            return 1;
        }
    };
    let redirect = format!("http://127.0.0.1:{port}/");
    let code_verifier = verifier();
    let url = authorize_url(
        &id,
        &redirect,
        &challenge(&code_verifier),
        "letterllama",
        permanent,
    );
    println!("{url}");
    let mut stream = match listener.accept() {
        Ok((stream, _)) => stream,
        Err(err) => {
            eprintln!("loopback: {err}");
            return 1;
        }
    };
    let mut buf = [0u8; 2048];
    let n = stream.read(&mut buf).unwrap_or(0);
    let req = String::from_utf8_lossy(&buf[..n]);
    let query = req.split_whitespace().nth(1).unwrap_or("");
    let query = query.split_once('?').map(|(_, q)| q).unwrap_or("");
    let Some(code) = code_from_query(query) else {
        let _ =
            stream.write_all(b"HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\nNo code.\n");
        eprintln!("OAuth redirect had no code.");
        return 1;
    };
    let _ = stream.write_all(b"HTTP/1.1 200 OK\r\nConnection: close\r\nContent-Type: text/plain\r\n\r\nLetter Llama has the code. You can close this tab.\n");
    let secret = env::var("LETTER_LLAMA_CLIENT_SECRET").unwrap_or_default();
    let body = if secret.is_empty() {
        format!(
            "code={}&client_id={}&redirect_uri={}&grant_type=authorization_code&code_verifier={code_verifier}",
            pct(&code),
            pct(&id),
            pct(&redirect),
        )
    } else {
        format!(
            "code={}&client_id={}&client_secret={}&redirect_uri={}&grant_type=authorization_code&code_verifier={code_verifier}",
            pct(&code),
            pct(&id),
            pct(&secret),
            pct(&redirect),
        )
    };
    let client = reqwest::blocking::Client::new();
    let res = client
        .post("https://oauth2.googleapis.com/token")
        .header("content-type", "application/x-www-form-urlencoded")
        .body(body)
        .send();
    let res = match res {
        Ok(res) => res,
        Err(err) => {
            eprintln!("token exchange failed: {err}");
            return 1;
        }
    };
    if !res.status().is_success() {
        eprintln!("token exchange status {}", res.status());
        return 1;
    }
    let text = res.text().unwrap_or_default();
    match keyring::Entry::new("letter-llama", &account()) {
        Ok(entry) => match entry.set_password(&text) {
            Ok(()) => {
                println!("token stored in the OS keychain for {}", account());
                0
            }
            Err(err) => {
                eprintln!("keychain: refusing to store tokens ({err})");
                1
            }
        },
        Err(err) => {
            eprintln!("keychain: refusing to store tokens ({err})");
            1
        }
    }
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

fn token_json() -> Result<(String, Scopes), i32> {
    let entry = keyring::Entry::new("letter-llama", &account()).map_err(|err| {
        eprintln!("keychain: {err}");
        1
    })?;
    let raw = entry.get_password().map_err(|err| {
        eprintln!("no token for {} ({err})", account());
        1
    })?;
    let value: serde_json::Value = serde_json::from_str(&raw).map_err(|_| {
        eprintln!("token in keychain was not json");
        1
    })?;
    let access = value
        .get("access_token")
        .and_then(|v| v.as_str())
        .ok_or_else(|| {
            eprintln!("token json has no access_token");
            1
        })?
        .to_string();
    let scopes = value
        .get("scope")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .split_whitespace()
        .map(str::to_string)
        .collect::<Vec<_>>();
    Ok((access, Scopes::from_granted(&scopes)))
}

fn act(op: MailOp, ids: &[String]) -> i32 {
    if ids.is_empty() {
        eprintln!("missing message id");
        return 2;
    }
    let (token, scopes) = match token_json() {
        Ok(pair) => pair,
        Err(code) => return code,
    };
    let http = LiveHttp {
        token,
        client: reqwest::blocking::Client::new(),
    };
    match execute_batch(&http, &scopes, op, ids) {
        Ok(report) => {
            print_report(&report);
            if report.failed.is_empty() {
                0
            } else {
                1
            }
        }
        Err(GateError::PermanentDeleteNotGranted) => {
            eprintln!("permanent delete is off. Run auth --permanent to grant https://mail.google.com/ . Trash was not used instead.");
            1
        }
        Err(GateError::TrashNotGranted) => {
            eprintln!("this token cannot change mail.");
            1
        }
        Err(GateError::BadMessageId) => 1,
    }
}

fn print_report(report: &BatchReport) {
    println!("done {}", report.done.len());
    for id in &report.done {
        println!("  ok {id}");
    }
    println!("skipped {}", report.skipped.len());
    for id in &report.skipped {
        println!("  missing {id}");
    }
    println!("failed {}", report.failed.len());
    for (id, err) in &report.failed {
        println!("  fail {id} {err}");
    }
}

fn history_cmd() -> i32 {
    let (token, _) = match token_json() {
        Ok(pair) => pair,
        Err(code) => return code,
    };
    let cursor = match env::var("LETTER_LLAMA_HISTORY_ID") {
        Ok(id) => id,
        Err(_) => {
            eprintln!("Set LETTER_LLAMA_HISTORY_ID");
            return 2;
        }
    };
    let http = LiveHttp {
        token,
        client: reqwest::blocking::Client::new(),
    };
    let res = match http.call(HttpReq {
        method: "GET",
        path: format!("/gmail/v1/users/me/history?startHistoryId={cursor}"),
        body: None,
    }) {
        Ok(res) => res,
        Err(err) => {
            eprintln!("{err}");
            return 1;
        }
    };
    let store = match Store::open(&db_path()) {
        Ok(store) => store,
        Err(err) => {
            eprintln!("{err}");
            return 1;
        }
    };
    match deleted_from_history(res.status, &res.body) {
        HistoryRead::CursorDead => {
            eprintln!("history cursor expired. Rescan ids. No bodies downloaded.");
            1
        }
        HistoryRead::Deleted(ids) => {
            for id in ids {
                let _ = store.mark_missing(&account(), &id);
                println!("missing {id}");
            }
            0
        }
    }
}

fn clear_index() -> i32 {
    let store = match Store::open(&db_path()) {
        Ok(store) => store,
        Err(err) => {
            eprintln!("{err}");
            return 1;
        }
    };
    match store.clear(&account()) {
        Ok(()) => {
            println!("local index cleared. Gmail was not changed.");
            0
        }
        Err(err) => {
            eprintln!("{err}");
            1
        }
    }
}
