use std::sync::Arc;
use serde_json::json;
use crate::node_manager::ws::publish_subscribe::PubSub;
use crate::node_manager::ws::published_channels::PublishedChannels;
use crate::throughput_tracker::flow_data::ALL_FLOWS;

pub async fn flow_count(channels: Arc<PubSub>) {
    if !channels.is_channel_alive(PublishedChannels::FlowCount).await {
        return;
    }

    let active_flows = {
        let lock = ALL_FLOWS.lock().unwrap();
        lock.len() as u64
    };
    let active_flows = json!(
            {
                "event": PublishedChannels::FlowCount.to_string(),
                "data": active_flows,
            }
        ).to_string();
    channels.send(PublishedChannels::FlowCount, active_flows).await;
}