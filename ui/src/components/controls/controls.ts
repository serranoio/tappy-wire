import {customElement, query, state} from "lit/decorators.js";
import {html, LitElement, TemplateResult} from "lit";
import {ControlsResponse, ReportResponse, WiretapControls, WiretapFilters} from "@/model/controls";
import localforage from "localforage";
import {Bus, BusCallback, Channel, CommandResponse, GetBus, Message, RanchUtils, Subscription} from "@pb33f/ranch";
import controlsComponentCss from "./controls.css";
import {SlDrawer, SlInput} from "@shoelace-style/shoelace";
import {Bag, BagManager, GetBagManager} from "@pb33f/saddlebag";
import {WipeDataEvent} from "@/model/events";
import sharedCss from "@/components/shared.css";
import {
    ChangeDelayCommand,
    RequestReportCommand,
    WiretapControlsChannel,
    WiretapControlsKey,
    WiretapControlsStore,
    WiretapFiltersKey,
    WiretapFiltersStore,
    WiretapHttpTransactionStore,
    WiretapReportChannel
} from "@/model/constants";

@customElement('wiretap-controls')
export class WiretapControlsComponent extends LitElement {

    static styles = [sharedCss, controlsComponentCss]

    @state()
    private _controls: WiretapControls;

    private readonly _bus: Bus;

    @query('#controls-drawer')
    controlsDrawer: SlDrawer;

    @query('#filters-drawer')
    filtersDrawer: SlDrawer;

    @state()
    numFilters: number = 0;

    @query("#global-delay")
    delayInput: SlInput;

    @state()
    private _drawerOpen: boolean = false;

    @query('#downloadReport')
    private _downloadReport: HTMLAnchorElement;

    private readonly _wiretapControlsSubscription: Subscription;
    private readonly _wiretapReportSubscription: Subscription;
    private readonly _wiretapControlsChannel: Channel;
    private readonly _wiretapReportChannel: Channel;
    private readonly _storeManager: BagManager;
    private readonly _controlsStore: Bag<WiretapControls>;
    private readonly _filtersStore: Bag<WiretapFilters>;

    @state()
    private filters: WiretapFilters;

    constructor() {
        super();

        // get bus.
        this._bus = GetBus();
        this._storeManager = GetBagManager();
        this._controlsStore = this._storeManager.getBag(WiretapControlsStore);
        this._filtersStore = this._storeManager.getBag(WiretapFiltersStore);
        this._wiretapControlsChannel = this._bus.getChannel(WiretapControlsChannel);
        this._wiretapReportChannel = this._bus.getChannel(WiretapReportChannel);
        this._wiretapControlsSubscription = this._wiretapControlsChannel.subscribe(this.controlUpdateHandler());
        this._wiretapReportSubscription = this._wiretapReportChannel.subscribe(this.reportHandler());

        this.loadControlStateFromStorage().then((controls: WiretapControls) => {
            if (!controls) {
                this._controls = {
                    globalDelay: 0,
                }
            } else {
                this._controls = controls;
            }
            // get the delay from the backend.
            this.changeGlobalDelay(0) // -1 won't update anything, but will return the current delay
        });

        this._filtersStore.subscribe(WiretapFiltersKey, (filters: WiretapFilters) => {
            let numFilters = 0;
            if (filters?.filterKeywords) {
                numFilters += filters.filterKeywords.length;
            }
            if (filters?.filterChain) {
                numFilters += filters.filterChain.length;
            }
            if (filters?.filterMethod?.keyword != "") {
                numFilters += 1;
            }
            this.numFilters = numFilters;
        });
    }

    async loadControlStateFromStorage(): Promise<WiretapControls> {
        return localforage.getItem<WiretapControls>(WiretapControlsStore);
    }

    controlUpdateHandler(): BusCallback<CommandResponse> {
        return (msg: Message<CommandResponse<ControlsResponse>>) => {
            const delay = msg.payload.payload?.config.globalAPIDelay;
            const existingDelay = this._controls?.globalDelay;

            if (delay == undefined) {
                // this means a reset back to 0.
                if (this._controls) {
                    this._controls.globalDelay = 0;
                }
            }

            if (delay != undefined && delay !== existingDelay) {
                if (this._controls) {
                    this._controls.globalDelay = delay;
                }
            }

            // update the store
            this._controlsStore.set(WiretapControlsKey, this._controls)
            localforage.setItem<WiretapControls>(WiretapControlsStore, this._controls);
        }
    }

    reportHandler(): BusCallback<CommandResponse> {
        return (msg: Message<CommandResponse<ReportResponse>>) => {
            const report = msg.payload.payload.transactions
            let reportData = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report));
            this._downloadReport.download = "wiretap-report.json";
            this._downloadReport.href = reportData;
            this._downloadReport.click();
        }
    }

    changeGlobalDelay(delay: number) {
        if (this._bus.getClient()?.connected) {
            this._bus.publish({
                destination: "/pub/queue/controls",
                body: JSON.stringify(
                    {
                        id: RanchUtils.genUUID(),
                        request: ChangeDelayCommand,
                        payload: {
                            delay: delay
                        }
                    }
                ),
            });
        }
    }

    openSettings() {
        this.controlsDrawer.show();
    }

    openFilters() {
        this.filtersDrawer.show();
    }

    sendReportRequest() {
        this._bus.publish({
            destination: "/pub/queue/report",
            body: JSON.stringify(
                {
                    id: RanchUtils.genUUID(),
                    request: RequestReportCommand,
                    payload: {}
                }
            ),
        });
    }

    closeControls() {
        this.controlsDrawer.hide()
        this.filtersDrawer.hide()
    }

    handleGlobalDelayChange(event: CustomEvent) {
        const delay = event.detail
        this.changeGlobalDelay(parseInt(delay));
    }

    wipeData() {
        this.dispatchEvent(new CustomEvent(WipeDataEvent, {
            bubbles: true,
            detail: WiretapHttpTransactionStore,
            composed: true,
        }));
    }

    render() {

        let filtersBadge: TemplateResult;
        if (this.numFilters > 0) {
            filtersBadge = html`
                <sl-badge class="filters-badge" pill pulse>${this.numFilters}</sl-badge>`
        }

        return html`
            ${filtersBadge}
            <sl-icon-button @click=${this.openFilters} name="funnel" label="filers">
            </sl-icon-button>
            <sl-icon-button @click=${this.openSettings} name="gear" label="controls">
            </sl-icon-button>
            <pb33f-theme-switcher></pb33f-theme-switcher>
            <sl-drawer label="wiretap controls" class="drawer-focus" id="controls-drawer">
                <a id="downloadReport" style="display:none"></a>
                <wiretap-controls-settings globalDelay=${this._controls?.globalDelay}
                                           @globalDelayChanged=${this.handleGlobalDelayChange}
                                           @wipeData=${this.wipeData}
                                           @requestReport=${this.sendReportRequest}></wiretap-controls-settings>
                <sl-button @click=${this.closeControls} slot="footer" variant="primary" outline>Close</sl-button>
            </sl-drawer>

            <sl-drawer label="wiretap filters" class="drawer-focus" id="filters-drawer">
                <wiretap-controls-filters filters=${this.filters}></wiretap-controls-filters>
                <sl-button @click=${this.closeControls} slot="footer" variant="primary" outline>Close</sl-button>
            </sl-drawer>
        `
    }
}