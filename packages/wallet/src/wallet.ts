import { ethers } from "ethers"
import { eventNames } from "process"
import { Defter } from "./src/contracts/Defter"
import { Defter__factory } from "./src/contracts/factories/Defter__factory"

export class Wallet {
    address: string
    provider: any
    contract: any // defter yapinca contract kiziyor anlamadim, bir de queryler patliyor
    signer: any

    abi = Defter__factory.abi

    constructor(address: string, provider: any) {
        this.address = address
        this.provider = provider
        this.signer = provider.getSigner(0)
        this.contract = new ethers.Contract(this.address, this.abi, this.signer)
        // Defter__factory.connect()
    }

    // GETTER
    async getBalances(lineID: string, holder: string) {
        return await this.contract.getBalances(lineID, holder)
    }

    // MAIN FUNCTIONS
    async openLine(
        maturityDate: number,
        unit: string,
        receivers: string[],
        amounts: number[],
        connector: any = this.signer,
    ) {
        await this.contract
            .connect(connector)
            .openLine(maturityDate, unit, receivers, amounts)
    }

    async transferLine(
        lineIDs: string,
        receivers: string[],
        amounts: number[],
        connector: any = this.signer,
    ) {
        await this.contract
            .connect(connector)
            .transferLine(lineIDs, receivers, amounts)
    }

    async closeLine(
        maturityDate: number,
        unit: string,
        totalAmount: number,
        connector: any = this.signer,
    ) {
        await this.contract
            .connect(connector)
            .closeLine(maturityDate, unit, totalAmount)
    }

    async withdraw(lineID: string, unit: string, connector: any = this.signer) {
        await this.contract.connect(connector).withdraw(lineID, unit)
    }

    // LISTENERS ON
    openLineListenerOn(cb: any) {
        this.contract.on(
            "LineOpened",
            (
                from: string,
                receiver: string,
                amount: number,
                lineID: string,
                // event: any,
            ) => {
                cb()
            },
        )
    }

    transferLineListenerOn(cb: any) {
        this.contract.on(
            "LineTransferred",
            (from: string, lineID: string, totalAmount: number) => {
                cb()
            },
        )
    }

    closeLineListenerOn(cb: any) {
        this.contract.on(
            "LineClosed",
            (from: string, lineID: string, totalAmount: number) => {
                cb()
            },
        )
    }

    withdrawListenerOn(cb: any) {
        this.contract.on(
            "Withdrawn",
            (from: string, lineID: string, amount: number) => {
                cb()
            },
        )
    }

    // LISTENERS OFF
    openLineListenerOff() {
        // this.contract.off("LineOpened", () => {}) //bunlar biraz garip davraniyor. removeAll stabil calisiyor
        this.removeAllListeners("LineOpened")
    }

    transferLineListenerOff() {
        // this.contract.off("LineTransferred", () => {})
        this.removeAllListeners("LineTransferred")
    }

    closeLineListenerOff() {
        // this.contract.off("LineClosed", () => {})
        this.removeAllListeners("LineClosed")
    }

    withdrawListenerOff() {
        // this.contract.off("Withdrawn", () => {})
        this.removeAllListeners("Withdrawn")
    }

    removeAllListeners(event: any = undefined) {
        this.contract.removeAllListeners(event)
    }

    // GENERATE FILTERS
    // Call without arguments to use for all events
    openLineFilter(from: any = null, lineID: any = null) {
        return this.contract.filters.LineOpened(from, null, null, lineID)
    }

    transferLineFilter(from: any = null, lineID: any = null) {
        return this.contract.filters.LineTransferred(from, null, null, lineID)
    }

    closeLineFilter(from: any = null, lineID: any = null) {
        return this.contract.filters.LineClosed(from, lineID, null)
    }

    withdrawFilter(from: any = null, lineID: any = null) {
        return this.contract.filters.Withdrawn(from, lineID, null)
    }

    // QUERY EVENT LOGS
    async openedLines(start: number, end: number, filter: any = "LineOpened") {
        return await this.contract.queryFilter(filter, start, end)
    }

    async transferredLines(
        start: number,
        end: number,
        filter: any = "LineTransferred",
    ) {
        return await this.contract.queryFilter(filter, start, end)
    }

    async closedLines(start: number, end: number, filter: any = "LineClosed") {
        return await this.contract.queryFilter(filter, start, end)
    }

    async withdrawns(start: number, end: number, filter: any = "Withdrawn") {
        return await this.contract.queryFilter(filter, start, end)
    }

    // IPTAL GIBI
    // QUERY EVENT LOGS (FILTERED)
    async getLogs(filter: any) {
        return this.provider.getLogs(filter)
    }
}
