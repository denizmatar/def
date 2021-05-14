import { Wallet } from "./wallet"
import * as ethers from "ethers"
import { formatBytes32String } from "@ethersproject/strings"

// let wallet = new Wallet;

async function test() {
    const defter = new Wallet("0xF0E0ccf33315d40D05bC2a38536fb4351F2c5Df8")
    const provider = defter.provider
    const contract = defter.contract

    const tokenAddress = "0x9d88346B94AF9875A327f59f019A2751F6184344"

    const owner = "0x75340d6fb6D18e7bdD8e74f0f1c89296Cce23821"
    const addr1 = "0x9525F51Ca7fA140a6c3B1099A76413D39E61e356"
    const addr2 = "0x8ACF325Fa27836AdC91DB4a792bf345DE11480c6"
    const addr3 = "0xE69D2c7F446Cd7fB7d5776E0B24c1C2D3082F916"

    // const addr1 = defter.getSigners(1)
    // const addr2 = defter.getSigners(2)

    // console.log(contract.address)

    // await contract.openLine(2000000000, tokenAddress, [addr1], [10])

    // await contract.on("LineOpened", (from, receiver, amount, lineID) => {
    //     console.log(from)
    //     console.log(receiver)
    //     console.log(amount)
    //     console.log(lineID)
    // })

    // let filter = contract.filters.LineOpened(owner)
    // contract.on(filter, () => {})
    // await contract.on(
    //     "LineOpened",
    //     (from: string, receiver: string, amount: number, lineID: string) => {
    //         console.log(from)
    //         console.log(receiver)
    //         console.log(amount.toString())
    //         console.log(lineID)
    //         console.log("listened")
    //     },
    // )

    // const results = await contract.queryFilter("LineOpened", 0, 5)

    // console.log(results)

    await contract.openLine(2000000000, tokenAddress, [addr1], [10])
    // await contract.openLine(2000000000, tokenAddress, [addr1], [10])
    // await contract.openLine(2000000000, tokenAddress, [addr1], [10])

    // const filter = contract.filters.LineOpened()
    // console.log(filter)
    // console.log(await contract.listenerCount("LineOpened"))
}

test()
