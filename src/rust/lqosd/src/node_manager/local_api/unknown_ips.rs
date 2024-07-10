use std::time::Duration;
use serde::Serialize;
use lqos_utils::units::DownUpOrder;
use lqos_utils::unix_time::time_since_boot;
use crate::shaped_devices_tracker::SHAPED_DEVICES;
use crate::throughput_tracker::THROUGHPUT_TRACKER;

#[derive(Serialize)]
pub struct UnknownIp {
    ip: String,
    last_seen_nanos: u64,
    total_bytes: DownUpOrder<u64>,
    current_bytes: DownUpOrder<u64>,
}

fn get_unknown_ips() -> Vec<UnknownIp> {
    let now = Duration::from(time_since_boot().unwrap()).as_nanos() as u64;
    let sd_reader = SHAPED_DEVICES.read().unwrap();
    THROUGHPUT_TRACKER
        .raw_data
        .iter()
        .filter(|v| !v.key().as_ip().is_loopback())
        .filter(|d| d.tc_handle.as_u32() == 0)
        .filter(|d| {
            let ip = d.key().as_ip();
            !sd_reader.trie.longest_match(ip).is_some()
        })
        .map(|d| {
            UnknownIp {
                ip: d.key().as_ip().to_string(),
                last_seen_nanos: now - d.last_seen,
                total_bytes: d.bytes,
                current_bytes: d.bytes_per_second,
            }
        })
        .collect()
}

pub async fn unknown_ips() -> axum::Json<Vec<UnknownIp>> {
    axum::Json(get_unknown_ips())
}