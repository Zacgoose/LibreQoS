export class BaseDashlet {
    constructor(slotNumber) {
        this.slotNumber = slotNumber;
        this.id = "dash_" + slotNumber;
        this.size = 3;
        this.setupDone = false;
    }

    sizeClasses() {
        switch (this.size) {
            case 1: return  ["col-xs-12", "col-sm-12", "col-md-6", "col-lg-3", "col-xl-1", "col-xxl-1"];
            case 2: return  ["col-xs-12", "col-sm-12", "col-md-6", "col-lg-3", "col-xl-2", "col-xxl-2"];
            case 3: return  ["col-xs-12", "col-sm-12", "col-md-6", "col-lg-3", "col-xl-3", "col-xxl-3"];
            case 4: return  ["col-xs-12", "col-sm-12", "col-md-6", "col-lg-6", "col-xl-4", "col-xxl-4"];
            case 5: return  ["col-xs-12", "col-sm-12", "col-md-6", "col-lg-6", "col-xl-5", "col-xxl-5"];
            case 6: return  ["col-xs-12", "col-sm-12", "col-md-6", "col-lg-6", "col-xl-6", "col-xxl-6"];
            case 7: return  ["col-xs-12", "col-sm-12", "col-md-12", "col-lg-12", "col-xl-7", "col-xxl-7"];
            case 8: return  ["col-xs-12", "col-sm-12", "col-md-12", "col-lg-12", "col-xl-8", "col-xxl-8"];
            case 9: return  ["col-xs-12", "col-sm-12", "col-md-12", "col-lg-12", "col-xl-9", "col-xxl-9"];
            case 10: return ["col-xs-12", "col-sm-12", "col-md-12", "col-lg-12", "col-xl-10", "col-xxl-10"];
            case 11: return ["col-xs-12", "col-sm-12", "col-md-12", "col-lg-12", "col-xl-11", "col-xxl-11"];
            case 12: return ["col-xs-12", "col-sm-12", "col-md-12", "col-lg-12", "col-xl-12", "col-xxl-12"];
            default: return ["col-3"];
        }
    }

    title() {
        return "Someone forgot to set a title";
    }

    subscribeTo() {
        return [];
    }

    onMessage(msg) {
        console.log(msg);
    }

    setupOnce(msg) {
        if (!this.setupDone) {
            this.setup(msg);
        }
        this.setupDone = true;
    }

    setup() {}

    graphDivId() {
        return this.id + "_graph";
    }

    graphDiv() {
        let graphDiv = document.createElement("div");
        graphDiv.id = this.id + "_graph";
        graphDiv.classList.add("dashgraph");
        return graphDiv;
    }

    buildContainer() {
        let div = document.createElement("div");
        div.id = this.id;
        let sizeClasses = this.sizeClasses();
        for (let i=0; i<sizeClasses.length; i++) {
            div.classList.add(sizeClasses[i]);
        }
        div.classList.add("dashbox");

        let title = document.createElement("h5");
        title.classList.add("dashbox-title");
        title.innerText = this.title();

        div.appendChild(title);

        return div;
    }
}