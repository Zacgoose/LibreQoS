//! Manages the `/etc/lqos` file.

use anyhow::{Error, Result};
use serde::{Deserialize, Serialize};
use std::path::Path;

/// Represents the top-level of the `/etc/lqos` file. Serialization
/// structure.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct EtcLqos {
    /// The directory in which LibreQoS is installed.
    pub lqos_directory: String,

    /// How frequently should `lqosd` read the `tc show qdisc` data?
    /// In ms.
    pub queue_check_period_ms: u64,

    /// If present, defines how the Bifrost XDP bridge operates.
    pub bridge: Option<BridgeConfig>,

    /// If present, defines the values for various `sysctl` and `ethtool`
    /// tweaks.
    pub tuning: Option<Tunables>,
}

/// Represents a set of `sysctl` and `ethtool` tweaks that may be
/// applied (in place of the previous version's offload service)
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct Tunables {
    /// Should the `irq_balance` system service be stopped?
    pub stop_irq_balance: bool,

    /// Set the netdev budget (usecs)
    pub netdev_budget_usecs: u32,

    /// Set the netdev budget (packets)
    pub netdev_budget_packets: u32,

    /// Set the RX side polling frequency
    pub rx_usecs: u32,

    /// Set the TX side polling frequency
    pub tx_usecs: u32,

    /// Disable RXVLAN offloading? You generally want to do this.
    pub disable_rxvlan: bool,

    /// Disable TXVLAN offloading? You generally want to do this.
    pub disable_txvlan: bool,

    /// A list of `ethtool` offloads to be disabled.
    /// The default list is: [ "gso", "tso", "lro", "sg", "gro" ]
    pub disable_offload: Vec<String>,
}

/// Defines the BiFrost XDP bridge accelerator parameters
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct BridgeConfig {
    /// Should the XDP bridge be enabled?
    pub use_xdp_bridge: bool,

    /// A list of interface mappings.
    pub interface_mapping: Vec<BridgeInterface>,

    /// A list of VLAN mappings.
    pub vlan_mapping: Vec<BridgeVlan>,
}

/// An interface within the Bifrost XDP bridge.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct BridgeInterface {
    /// The interface name. It *must* match an interface name
    /// findable by Linux.
    pub name: String,

    /// Should Bifrost read VLAN tags and determine redirect
    /// policy from there?
    pub scan_vlans: bool,

    /// The outbound interface - data that arrives in the interface
    /// defined by `name` will be redirected to this interface.
    /// 
    /// If you are using an "on a stick" configuration, this will 
    /// be the same as `name`.
    pub redirect_to: String,
}

/// If `scan_vlans` is enabled for an interface, then VLANs
/// are examined on the way through the XDP BiFrost bridge.
/// 
/// If a VLAN is on the `parent` interface, and matches `tag` - it
/// will be moved to VLAN `redirect_to`.
/// 
/// You often need to make reciprocal pairs of these.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct BridgeVlan {
    /// The parent interface name on which the VLAN occurs.
    pub parent: String,

    /// The VLAN tag number to redirect if matched.
    pub tag: u32,

    /// The destination VLAN tag number if matched.
    pub redirect_to: u32,
}

impl EtcLqos {
    /// Loads `/etc/lqos`.
    pub fn load() -> Result<Self> {
        if !Path::new("/etc/lqos").exists() {
            return Err(Error::msg("You must setup /etc/lqos"));
        }
        let raw = std::fs::read_to_string("/etc/lqos")?;
        let config: Self = toml::from_str(&raw)?;
        //println!("{:?}", config);
        Ok(config)
    }
}
