import { expect } from "chai"
import { describe, beforeEach, it, after } from "mocha"
import * as ethers from "ethers"
import { Wallet } from "../wallet"
import { Defter } from "../src/contracts/Defter"
import { Defter__factory } from "../src/contracts/factories/Defter__factory"
import { MTRToken__factory } from "../src/contracts/factories/MTRToken__factory"
import { time } from "console"

let defter: Wallet
let token: any
let contract: any // Defter yapinca 'contract' kiziyor

const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545")

let hashedLine: string

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

        hashedLine = ethers.utils.solidityKeccak256(
            ["bytes", "uint256", "address"],
            [owner, 2000000000, token.address],
        )
    })
    describe("openLine", async () => {
        it("opens line", async () => {
            const balance = (
                await defter.getBalances(hashedLine, addr2)
            ).toNumber()

            expect(balance).to.equal(30)
        })
        xit("turns on listener", async () => {
            // filter kullanabiliyorum, veya direkt "LineOpened" yazabiliyorum wallet icinde/ hangisi??
            // const filter = await defter.contract.filters.LineOpened(owner)

            defter.openLineListenerOn(() => {
                console.log("cb working")
            })

            await defter.openLine(2000000000, token.address, [addr1], [50])

            // await defter.contract.removeAllListeners()
        })
        xit("turns off listener", async () => {
            defter.removeAllListeners()
        })
        it("gets all past events", async () => {
            const result = await defter.openedLines(0, 99999)
            expect(result).to.not.be.empty
        })
        it("filters past events", async () => {
            await defter.openLine(2000000000, token.address, [addr2], [50], s1)

            const filter = defter.openLineFilter(addr1)
            const result = await defter.openedLines(0, 99999, filter)

            expect(result).to.not.be.empty
        })
    })
    describe("transferLine", async () => {
        it("transfers line", async () => {
            await defter.transferLine(hashedLine, [addr1], [30], s2)

            const balance = (
                await defter.getBalances(hashedLine, addr1)
            ).toNumber()

            expect(balance).to.equal(50)
        })
        it("gets past events", async () => {
            await defter.transferLine(hashedLine, [addr1], [30], s2)

            const result = await defter.transferredLines(0, 99999)

            expect(result).to.not.be.empty
        })
        it("filters past events", async () => {
            await defter.transferLine(hashedLine, [addr1], [30], s2)

            const filter = defter.transferLineFilter(addr2)
            const result = await defter.transferredLines(0, 99999, filter)

            expect(result).to.not.be.empty
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
        it("gets past events", async () => {
            await token.approve(contract.address, 50)
            await defter.closeLine(2000000000, token.address, 50)

            const result = await defter.closedLines(0, 99999)
            expect(result).to.not.be.empty
        })
        it("filters past events", async () => {
            await token.approve(contract.address, 50)
            await defter.closeLine(2000000000, token.address, 50)

            const filter = defter.closeLineFilter(owner)
            const result = await defter.closedLines(0, 99999, filter)

            expect(result).to.not.be.empty
        })
    })
    describe("withdraw", async () => {
        it("withdraws", async () => {
            await token.approve(contract.address, 50)
            await defter.closeLine(2000000000, token.address, 50)

            const balanceBefore = (await token.balanceOf(addr2)).toNumber()

            await defter.withdraw(hashedLine, token.address, s2)

            const balanceAfter = (await token.balanceOf(addr2)).toNumber()

            expect(balanceAfter - balanceBefore).to.equal(30)
        })
        it("gets past events", async () => {
            await token.approve(contract.address, 50)
            await defter.closeLine(2000000000, token.address, 50)
            await defter.withdraw(hashedLine, token.address, s2)

            const result = await defter.withdrawns(0, 99999)

            expect(result).to.not.be.empty
        })
        it("filters past events", async () => {
            await token.approve(contract.address, 50)
            await defter.closeLine(2000000000, token.address, 50)
            await defter.withdraw(hashedLine, token.address, s2)

            const filter = await defter.withdrawFilter(addr2)
            const result = await defter.withdrawns(0, 99999, filter)

            expect(result).to.not.be.empty
        })
    })
})
