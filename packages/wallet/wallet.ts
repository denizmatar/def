import { ethers } from "ethers"
import { Defter } from "./src/contracts/Defter"
import { Defter__factory } from "./src/contracts/factories/Defter__factory"

export class Wallet {
    address: string
    contract: any

    provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:7545")
    signer = this.getSigners(0)

    constructor(address: string) {
        this.address = address
        this.contract = new ethers.Contract(
            this.address,
            Defter__factory.abi,
            this.signer,
        )
    }

    getSigners(n: number) {
        return this.provider.getSigner(n)
    }

    openLine(
        maturityDate: Date,
        unit: string,
        receivers: string[],
        amounts: bigint[],
    ) {
        this.contract.openLine(maturityDate, unit, receivers, amounts)
    }

    transferLine(lineIDs: string[], receivers: string[], amounts: bigint[]) {
        this.contract.transferLine(lineIDs, receivers, amounts)
    }

    closeLine(maturityDate: Date, unit: string, totalAmount: bigint) {
        this.contract.closeLine(maturityDate, unit, totalAmount)
    }

    withdraw(lineID: string, unit: string) {
        this.contract.withdraw(lineID, unit)
    }
}

// async function testt() {
//     const defter = new Wallet("0xF0E0ccf33315d40D05bC2a38536fb4351F2c5Df8")
//     const contract = defter.contract

//     // console.log(await defter.provider.listAccounts())
//     // console.log(defter.contract.address)

//     // console.log(defter.signer)
//     await contract.openLine()
// }
// testt()
