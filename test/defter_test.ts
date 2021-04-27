import { ethers } from "hardhat"
import { expect } from "chai"
import { Defter } from "../typechain/Defter"
import { Contract } from "@ethersproject/contracts"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { utils } from "ethers"

let defter: Contract
let owner: SignerWithAddress
let addr1: SignerWithAddress
let addr2: SignerWithAddress
let addr3: SignerWithAddress

describe("Defterhane", () => {
    beforeEach(async () => {
        ;[owner, addr1, addr2, addr3] = await ethers.getSigners()

        const defterFactory = await ethers.getContractFactory("Defter", owner)
        defter = (await defterFactory.deploy()) as Defter
        await defter.deployed()
    })
    describe("openLine", () => {
        it("gets line balance", async () => {
            await defter.openLine(2000000000, "TL", [addr1.address], [10])

            const hashedLine = utils.solidityKeccak256(
                ["bytes", "uint256", "string"],
                [owner.address, 2000000000, "TL"],
            )

            const balance = await defter.getBalances(hashedLine, addr1.address)
            expect(balance).to.equal(10)
        })

        it("zero receiver not allowed", async () => {
            await expect(defter.openLine(2000000000, "TL", [0x0], [10])).to.be
                .reverted
        })
        it("zero amount not allowed", async () => {
            await expect(
                defter.openLine(2000000000, "TL", [addr1.address], [0]),
            ).to.be.reverted
        })
        it("balance increments when lineID already opened", async () => {
            await defter.openLine(2000000000, "TL", [addr1.address], [10])

            const hashedLine = utils.solidityKeccak256(
                ["bytes", "uint256", "string"],
                [owner.address, 2000000000, "TL"],
            )

            await defter.openLine(2000000000, "TL", [addr2.address], [20])

            const balance = await defter.getBalances(hashedLine, addr2.address)

            expect(balance).to.equal(20)
        })
        it("emits new line", async () => {
            const hashedLine = utils.solidityKeccak256(
                ["bytes", "uint256", "string"],
                [owner.address, 2000000000, "USD"],
            )
            await expect(
                defter.openLine(
                    2000000000,
                    "USD",
                    [addr1.address, addr2.address],
                    [20, 30],
                ),
            )
                .to.emit(defter, "OpenLine")
                .withArgs(owner.address, hashedLine)
        })
    })
    describe("transferLine", () => {
        it("transfers line", async () => {
            await defter.openLine(
                2000000000,
                "USD",
                [addr2.address, addr3.address],
                [20, 30],
            )

            const hashedLine = utils.solidityKeccak256(
                ["bytes", "uint256", "string"],
                [owner.address, 2000000000, "USD"],
            )

            await defter
                .connect(addr2)
                .transferLine(hashedLine, [addr3.address], [10])

            const balance = await defter.getBalances(hashedLine, addr3.address)
            expect(balance).to.equal(40)
        })
        it("cannot transfer if zero balance", async () => {
            const hashedLine = utils.solidityKeccak256(
                ["bytes", "uint256", "string"],
                [owner.address, 2000000000, "EUR"],
            )

            await expect(
                defter
                    .connect(addr2)
                    .transferLine(hashedLine, [addr3.address], [40]),
            ).to.be.reverted
        })
        it("cannot transfer more than balance", async () => {
            await defter.openLine(2000000000, "USD", [addr2.address], [20])

            const hashedLine = utils.solidityKeccak256(
                ["bytes", "uint256", "string"],
                [owner.address, 2000000000, "USD"],
            )

            await expect(
                defter
                    .connect(addr2)
                    .transferLine(hashedLine, [addr3.address], [40]),
            ).to.be.reverted
        })
        it("emits transfer line", async () => {
            const hashedLine = utils.solidityKeccak256(
                ["bytes", "uint256", "string"],
                [owner.address, 2000000000, "USD"],
            )

            await defter.openLine(
                2000000000,
                "USD",
                [addr1.address, addr2.address],
                [20, 30],
            )

            await expect(
                defter
                    .connect(addr2)
                    .transferLine(hashedLine, [addr1.address], [30]),
            )
                .to.emit(defter, "TransferLine")
                .withArgs(addr2.address, hashedLine)
        })
    })
})
