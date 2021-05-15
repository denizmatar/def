import { ethers } from "ethers"
import { eventNames } from "process"
import { Defter } from "./src/contracts/Defter"
import { Defter__factory } from "./src/contracts/factories/Defter__factory"

export class Wallet {
    address: string
    provider: any
    contract: any // defter yap
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
    async openLineListenerOn(filter: any, cb: any) {
        await this.contract.on(
            filter,
            (
                from: string,
                receiver: string,
                amount: number,
                lineID: string,
                event: any,
            ) => {
                event.removeListener()
                cb()
            },
        )
    }

    async transferLineListenerOn(cb: any) {
        await this.contract.on(
            "LineTransferred",
            (from: string, lineID: string, totalAmount: number) => {
                cb()
            },
        )
    }

    async closeLineListenerOn(cb: any) {
        await this.contract.on(
            "LineClosed",
            (from: string, lineID: string, totalAmount: number) => {
                cb()
            },
        )
    }

    async withdrawListenerOn(cb: any) {
        await this.contract.on(
            "Withdrawn",
            (from: string, lineID: string, amount: number) => {
                cb()
            },
        )
    }

    // LISTENERS OFF
    async openLineListenerOff() {
        await this.contract.off("LineOpened", () => {})
    }

    async transferLineListenerOff() {
        await this.contract.off("LineTransferred", () => {})
    }

    async closeLineListenerOff() {
        await this.contract.off("LineClosed", () => {})
    }

    async withdrawListenerOff() {
        await this.contract.off("Withdrawn", () => {})
    }

    // QUERY
    async openedLines(start: number, end: number) {
        return await this.contract.queryFilter("LineOpened", start, end)
    }

    async transferredLines(start: number, end: number) {
        return await this.contract.queryFilter("LineTransferred", start, end)
    }

    async closedLines(start: number, end: number) {
        return await this.contract.queryFilter("LineClosed", start, end)
    }

    async withdrawns(start: number, end: number) {
        return await this.contract.queryFilter("Withdrawn", start, end)
    }
}
