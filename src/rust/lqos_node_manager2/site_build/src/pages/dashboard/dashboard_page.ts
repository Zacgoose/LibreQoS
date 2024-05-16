import html from './dashboard.html';
import {Page} from "../../page";
import {
    requestFlowCount,
    requestFullThroughput,
    requestNetworkTreeSummary,
    requestRttHisto,
    requestThroughput, requestTop10Downloaders
} from "../../requests";
import {scaleNumber} from "../../scaling";
import {ThroughputEntry, ThroughputGraph} from "../../charts/throughput_graph";
import * as echarts from 'echarts';
import {RttHistogram} from "../../charts/rtt_histo";
import {rtt_display} from "../../rtt_color";

export class DashboardPage extends Page {
    deferredDone: boolean;
    throughputChart: ThroughputGraph | undefined;
    rttHisto: RttHistogram | undefined;

    constructor() {
        super();
        this.deferredDone = false;
        this.throughputChart = undefined;
        this.rttHisto = undefined;
        this.fillContent(html);
    }

    wireup() {
        requestFlowCount();
        requestThroughput();
        requestFullThroughput();
        requestRttHisto();
        requestNetworkTreeSummary();
        requestTop10Downloaders();

        // This is a fake await for after the HTML has loaded
        window.setTimeout(() => {
            this.throughputChart = new ThroughputGraph('throughputs');
            this.rttHisto = new RttHistogram('rttHisto');
            this.deferredDone = true;
        }, 1);
    }

    onmessage(event: any): void {
        switch (event.type) {
            case "FlowCount": {
                let target = document.getElementById("flowCounter");
                if (target) {
                    target.innerHTML = event.count;
                }
            } break;
            case "Throughput": {
                let target = document.getElementById("pps");
                if (target) {
                    target.innerHTML = scaleNumber(event.pps[0]) + " / " + scaleNumber(event.pps[1])
                }

                target = document.getElementById("bps");
                if (target) {
                    target.innerHTML = scaleNumber(event.bps[0]) + " / " + scaleNumber(event.bps[1])
                }

                if (this.deferredDone) {
                    this.throughputChart.onMessage(event as ThroughputEntry);
                }
            } break;
            case "ThroughputFull": {
                if (this.deferredDone) {
                    this.throughputChart.startingBuffer(event.entries as ThroughputEntry[]);
                }
            } break;
            case "RttHisto": {
                if (this.deferredDone) {
                    this.rttHisto.onMessage(event.entries as number[]);
                }
            } break;
            case "NetworkTreeSummary": {
                let entries: NetworkTreeEntry[] = [];
                for (let i=0; i<event.entries.length; i++) {
                    entries.push(event.entries[i][1] as NetworkTreeEntry);
                }
                this.networkTreeSummary(entries);
            } break;
            case "Top10Downloaders": {
                this.top10Downloaders(event.entries as IpStatsWithPlan[])
            } break;
        }
    }

    ontick(): void {
        requestFlowCount();
        requestThroughput();
        requestRttHisto();
        requestNetworkTreeSummary();
        requestTop10Downloaders();
    }

    anchor(): string {
        return "dashboard";
    }

    replaceGraphs() {
        super.replaceGraphs();
        echarts.dispose(this.throughputChart.myChart);
        this.throughputChart = new ThroughputGraph('throughputs');
        requestFullThroughput();
    }

    networkTreeSummary(entries: NetworkTreeEntry[]) {
        let div = document.getElementById("networkTree") as HTMLDivElement;
        let html = "<table class='table table-striped table-sm table-tiny'>";
        html += "<thead><th>Site</th><th>Throughput</th><th>Capacity</th><th>RTT</th></thead>";
        html += "<tbody>";
        for (let i=0; i<entries.length; i++) {
            let entry = entries[i];
            html += "<tr>";
            html += "<td>" + entry.name + "</td>";

            let capacity_down_percent= entry.current_throughput[0] / (entry.max_throughput[0] * 10000); // It's in mb?
            let capacity_up_percent = entry.current_throughput[1] / (entry.max_throughput[1] * 10000);
            let capacity_percent = Math.max(capacity_down_percent, capacity_up_percent);
            let capacity_color = "";
            if (capacity_percent < 0.5) {
                capacity_color = "green";
            } else if (capacity_percent < 0.75) {
                capacity_color = "orange";
            } else {
                capacity_color = "red";
            }
            if (entry.name !== "Others") {
                html += "<td><span style='color: " + capacity_color + "'>⬤</span> " + scaleNumber(entry.current_throughput[0] * 8, 1) + " / " + scaleNumber(entry.current_throughput[1] * 8, 1) + "</td>";
                html += "<td>" + (capacity_down_percent * 100).toFixed(0) + "% / " + (capacity_up_percent * 100).toFixed(0) + "%</td>";
            } else {
                html += "<td><span style='color: darkgray'>○</span> " + scaleNumber(entry.current_throughput[0] * 8) + " / " + scaleNumber(entry.current_throughput[1] * 8) + "</td>";
                html += "<td>-</td>";
            }


            if (entry.rtts.length == 0) {
                html += "<td>-</td>";
            } else {
                let total = 0;
                for (let j=0; j<entry.rtts.length; j++) {
                    total += entry.rtts[j];
                }
                total /= entry.rtts.length;

                html += "<td>" + rtt_display(total) + "</td>";
            }

            html += "</tr>";
        }
        html += "</tbody></table>";
        div.innerHTML = html;
    }

    top10Downloaders(events: IpStatsWithPlan[]) {
        let div = document.getElementById("topN") as HTMLDivElement;

        let html = "<table class='table table-striped table-sm table-tiny'>";

        html += "<thead><th>Circuit</th><th>Throughput</th><th>RTT</th><th>TCP Re-xmit</th><th>Plan</th></thead><tbody>";
        for (let i=0; i<events.length; i++) {
            let row = events[i];
            html += "<tr>";
            html += "<td>" + row.ip_address + "</td>"

            if (row.plan.length === 2 && row.plan[0] != 0 && row.plan[1] != 0) {
                let capacity_down_percent = row.bits_per_second[0] / (row.plan[0] * 10000); // It's in mb?
                let capacity_up_percent = row.bits_per_second[1] / (row.plan[1] * 10000);
                let capacity_percent = Math.max(capacity_down_percent, capacity_up_percent);
                let capacity_color = "";
                if (capacity_percent < 0.5) {
                    capacity_color = "green";
                } else if (capacity_percent < 0.75) {
                    capacity_color = "orange";
                } else {
                    capacity_color = "red";
                }
                html += "<td><span style='color: " + capacity_color + "'>⬤</span> " + scaleNumber(row.bits_per_second[0], 1) + " / " + scaleNumber(row.bits_per_second[1], 1) + "</td>";
            } else {
                html += "<td><span style='color: darkgray'>○</span> " + scaleNumber(row.bits_per_second[0], 1) + " / " + scaleNumber(row.bits_per_second[1], 1) + "</td>";
            }

            html += "<td>" + rtt_display(row.median_tcp_rtt) + "</td>";
            html += "<td>" + row.tcp_retransmits[0] + " / " + row.tcp_retransmits[1] + "</td>";
            html += "<td>" + row.plan[0] / row.plan[1] + "</td>";
            html += "</tr>";
        }

        html += "</tbody></table>";

        div.innerHTML = html;
    }
}

class NetworkTreeEntry {
    current_throughput: number[];
    immediate_parent: number;
    max_throughput: number[];
    name: string;
    parents: number[];
    rtts: number[];
    type: string | null;
}

class IpStatsWithPlan {
    bits_per_second: number[];
    circuit_id: string;
    ip_address: string;
    median_tcp_rtt: number;
    packets_per_second: number[];
    plan: number[];
    tc_handle: number;
    tcp_retransmits: number[];
}