import { ethers } from "ethers"
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

    // LISTENERS

    async openLineListener(cb: any) {
        await this.contract.on(
            "LineOpened",
            (
                from: string,
                receiver: string,
                amount: number,
                lineID: string,
            ) => {
                console.log(from)
                console.log(receiver)
                console.log(amount.toString())
                console.log(lineID)
                cb()
                // burda bize frontendin verdigi callback fonksiyonunu cagiracagiz
            },
        )
    }

    async transferLineListener(cb: any) {
        await this.contract.on(
            "LineTransferred",
            (from: string, lineID: string, totalAmount: number) => {
                console.log(from)
                console.log(lineID)
                console.log(totalAmount.toString())
            },
        )
    }

    async closeLineListener(cb: any) {
        await this.contract.on(
            "LineClosed",
            (from: string, lineID: string, totalAmount: number) => {
                console.log(from)
                console.log(lineID)
                console.log(totalAmount.toString())
            },
        )
    }

    async withdrawListener(cb: any) {
        await this.contract.on(
            "Withdrawn",
            (from: string, lineID: string, amount: number) => {
                console.log(from)
                console.log(lineID)
                console.log(amount.toString())
            },
        )
    }

    // event history ceken fonksiyonlari ekle
}
