import { Wallet } from "./wallet"
import * as ethers from "ethers"

// let wallet = new Wallet;

async function test() {
    const provider = new ethers.providers.JsonRpcProvider(
        "http://127.0.0.1:8545",
    )

    const defter = new Wallet(
        "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        provider,
    )
    // const provider = defter.provider
    const contract = defter.contract

    const tokenAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"

    const owner = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"
    const addr1 = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8"
    const addr2 = "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc"
    // const addr3 = "0xE69D2c7F446Cd7fB7d5776E0B24c1C2D3082F916"

    // const result = await defter.openedLines(0, 999)

    // console.log(result)

    const hashedLine = ethers.utils.solidityKeccak256(
        ["bytes", "uint256", "address"],
        [owner, 2000000000, tokenAddress],
    )

    defter.openLineListenerOn(() => {
        console.log("working")
    })

    defter.transferLineListenerOn(() => {
        console.log("tworking")
    })

    // await defter.openLine(2000000000, tokenAddress, [addr1], [50])

    // await defter.transferLine(hashedLine, [addr2], [50], provider.getSigner(1))

    // await defter.openLine(2000000000, tokenAddress, [addr2], [50])

    // defter.openLineListenerOff()
    // defter.removeAllListeners()
    // defter.removeAllListeners("LineOpened")

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

    // await contract.openLine(2000000000, tokenAddress, [addr1], [10])
    // await contract.openLine(2000000000, tokenAddress, [addr1], [10])
    // await contract.openLine(2000000000, tokenAddress, [addr1], [10])

    // const filter = contract.filters.LineOpened()
    // console.log(filter)
    // console.log(await contract.listenerCount("LineOpened"))
}

test()
