use std::path::Path;

use rusqlite::{Connection, OptionalExtension};

pub struct Store {
    conn: Connection,
}

#[derive(Debug, PartialEq, Eq)]
pub struct MessageRef {
    pub provider_message_id: String,
    pub subject: String,
    pub internal_date: i64,
    pub missing: bool,
}

impl Store {
    pub fn open(path: &Path) -> Result<Self, String> {
        let conn = Connection::open(path).map_err(|e| e.to_string())?;
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS message_ref (
                account_id TEXT NOT NULL,
                provider_message_id TEXT NOT NULL,
                subject TEXT NOT NULL DEFAULT '',
                internal_date INTEGER NOT NULL DEFAULT 0,
                missing INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY (account_id, provider_message_id)
            );",
        )
        .map_err(|e| e.to_string())?;
        Ok(Self { conn })
    }

    pub fn has_body_column(&self) -> bool {
        let mut stmt = self
            .conn
            .prepare("PRAGMA table_info(message_ref)")
            .expect("pragma");
        let mut names = Vec::new();
        let rows = stmt
            .query_map([], |row| row.get::<_, String>(1))
            .expect("names");
        for name in rows {
            names.push(name.expect("name"));
        }
        names.iter().any(|name| name == "body")
    }

    pub fn upsert_ref(
        &self,
        account: &str,
        id: &str,
        subject: &str,
        internal_date: i64,
    ) -> Result<(), String> {
        self.conn
            .execute(
                "INSERT INTO message_ref (account_id, provider_message_id, subject, internal_date, missing)
                 VALUES (?1, ?2, ?3, ?4, 0)
                 ON CONFLICT(account_id, provider_message_id)
                 DO UPDATE SET subject = excluded.subject, internal_date = excluded.internal_date, missing = 0",
                (account, id, subject, internal_date),
            )
            .map(|_| ())
            .map_err(|e| e.to_string())
    }

    pub fn get(&self, account: &str, id: &str) -> Result<Option<MessageRef>, String> {
        self.conn
            .query_row(
                "SELECT provider_message_id, subject, internal_date, missing
                 FROM message_ref WHERE account_id = ?1 AND provider_message_id = ?2",
                (account, id),
                |row| {
                    Ok(MessageRef {
                        provider_message_id: row.get(0)?,
                        subject: row.get(1)?,
                        internal_date: row.get(2)?,
                        missing: row.get::<_, i64>(3)? != 0,
                    })
                },
            )
            .optional()
            .map_err(|e| e.to_string())
    }

    pub fn mark_missing(&self, account: &str, id: &str) -> Result<(), String> {
        self.conn
            .execute(
                "UPDATE message_ref SET missing = 1 WHERE account_id = ?1 AND provider_message_id = ?2",
                (account, id),
            )
            .map(|_| ())
            .map_err(|e| e.to_string())
    }

    pub fn clear(&self, account: &str) -> Result<(), String> {
        self.conn
            .execute(
                "DELETE FROM message_ref WHERE account_id = ?1",
                (account,),
            )
            .map(|_| ())
            .map_err(|e| e.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn refs_have_no_body_and_clear_does_not_need_gmail() {
        let path = std::env::temp_dir().join(format!(
            "letter-llama-test-{}.db",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let store = Store::open(&path).unwrap();
        assert!(!store.has_body_column());
        let body = "this body must not land on disk";
        store
            .upsert_ref("jjgumballs@gmail.com", "abc123", "Fixture subject", 1)
            .unwrap();
        let saved = store.get("jjgumballs@gmail.com", "abc123").unwrap().unwrap();
        assert_eq!(saved.subject, "Fixture subject");
        assert!(!saved.missing);
        let raw = std::fs::read(&path).unwrap();
        let raw = String::from_utf8_lossy(&raw);
        assert!(!raw.contains(body));
        store.clear("jjgumballs@gmail.com").unwrap();
        assert!(store.get("jjgumballs@gmail.com", "abc123").unwrap().is_none());
        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn external_delete_marks_missing_without_dropping_the_row() {
        let path = std::env::temp_dir().join(format!(
            "letter-llama-miss-{}.db",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let store = Store::open(&path).unwrap();
        store
            .upsert_ref("jjgumballs@gmail.com", "gone1", "Old", 2)
            .unwrap();
        store.mark_missing("jjgumballs@gmail.com", "gone1").unwrap();
        let row = store.get("jjgumballs@gmail.com", "gone1").unwrap().unwrap();
        assert!(row.missing);
        let _ = std::fs::remove_file(path);
    }
}
