import { expect } from "chai"
import { describe, beforeEach, it, after } from "mocha"
import * as ethers from "ethers"
import { Wallet } from "../wallet"
import { Defter } from "../src/contracts/Defter"
import { Defter__factory } from "../src/contracts/factories/Defter__factory"
import { MTRToken__factory } from "../src/contracts/factories/MTRToken__factory"

let defter: Wallet
let token: any
let contract: any // Defter yapinca 'contract' kiziyor

const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:7545")

// =============================
// Get Addresses...
const s0 = provider.getSigner(0)
const s1 = provider.getSigner(1)
const s2 = provider.getSigner(2)

let owner: string
let addr1: string
let addr2: string

async function getAddresses() {
    owner = await s0.getAddress()
    addr1 = await s1.getAddress()
    addr2 = await s2.getAddress()
}

getAddresses()
// =============================

const defterFactory = new ethers.ContractFactory(
    new ethers.utils.Interface(Defter__factory.abi),
    Defter__factory.bytecode,
    s0,
)
const tokenFactory = new ethers.ContractFactory(
    new ethers.utils.Interface(MTRToken__factory.abi),
    MTRToken__factory.bytecode,
    s0,
)

// console.log(defterFactory)
// console.log(Defter__factory) // cok benziyolar ama Defter__factory icinde deploy olmasina ragmen .deploy() edilmiyor

describe("Wallet", async () => {
    beforeEach(async () => {
        contract = await defterFactory.deploy()
        token = await tokenFactory.deploy(100000)

        defter = new Wallet(contract.address, provider)

        await defter.openLine(
            2000000000,
            token.address,
            [addr1, addr2],
            [20, 30],
        )
    })
    describe("openLine", async () => {
        it("opens line", async () => {
            const hashedLine = ethers.utils.solidityKeccak256(
                ["bytes", "uint256", "address"],
                [owner, 2000000000, token.address],
            )

            const balance = (
                await defter.getBalances(hashedLine, addr2)
            ).toNumber()
            expect(balance).to.equal(30)
        })
        // after(async () => {
        //     await defter.contract.removeAllListeners("LineOpened")
        // })
        it("turns on listener", async () => {
            //     await defter.contract.removeAllListeners(
            //         "LineOpened",
            //     )

            // filter kullanabiliyorum, veya direkt "LineOpened" yazabiliyorum wallet icinde
            const filter = await defter.contract.filters.LineOpened(owner)

            await defter.openLineListenerOn(filter, () => {
                console.log("cb working")
            })

            await defter.openLine(2000000000, token.address, [addr1], [50])

            await defter.contract.removeAllListeners("LineOpened")
        })
        it("turns off listener", async () => {
            await defter.openLineListenerOff()
        })
        xit("gets past events", async () => {
            const result = await defter.openedLines(0, 999)
            console.log(result)
        })
    })
    describe("transferLine", async () => {
        it("transfers line", async () => {
            const hashedLine = ethers.utils.solidityKeccak256(
                ["bytes", "uint256", "address"],
                [owner, 2000000000, token.address],
            )

            await defter.transferLine(hashedLine, [addr1], [30], s2)

            const balance = (
                await defter.getBalances(hashedLine, addr1)
            ).toNumber()
            expect(balance).to.equal(50)
        })
    })
    describe("closeLine", async () => {
        it("closes line", async () => {
            // thousand years later, again :)
            await token.approve(contract.address, 50)

            const balanceBefore = (
                await token.balanceOf(contract.address)
            ).toNumber()

            await defter.closeLine(2000000000, token.address, 50)

            const balanceAfter = (
                await token.balanceOf(contract.address)
            ).toNumber()

            expect(balanceAfter - balanceBefore).to.equal(50)
        })
    })
    describe("withdraw", async () => {
        it("withdraws", async () => {
            await token.approve(contract.address, 50)
            await defter.closeLine(2000000000, token.address, 50)

            const hashedLine = ethers.utils.solidityKeccak256(
                ["bytes", "uint256", "address"],
                [owner, 2000000000, token.address],
            )

            const balanceBefore = (await token.balanceOf(addr2)).toNumber()

            await defter.withdraw(hashedLine, token.address, s2)

            const balanceAfter = (await token.balanceOf(addr2)).toNumber()

            expect(balanceAfter - balanceBefore).to.equal(30)
        })
    })
})
