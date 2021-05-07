import { ethers } from "hardhat"
import { expect } from "chai"
import { Defter } from "../typechain/Defter"
import { MtrToken } from "../typechain/MtrToken"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { utils } from "ethers"

let defter: Defter
let token: MtrToken
let owner: SignerWithAddress
let addr1: SignerWithAddress
let addr2: SignerWithAddress
let addr3: SignerWithAddress
let addr0 = ethers.constants.AddressZero

describe("Defterhane", () => {
    beforeEach(async () => {
        ;[owner, addr1, addr2, addr3] = await ethers.getSigners()

        const defterFactory = await ethers.getContractFactory("Defter", owner)
        defter = (await defterFactory.deploy()) as Defter
        await defter.deployed()

        const tokenFactory = await ethers.getContractFactory("MTRToken", owner)
        token = (await tokenFactory.deploy(100)) as MtrToken
        await token.deployed()
    })
    describe("openLine", () => {
        it("gets line balance", async () => {
            await defter.openLine(
                2000000000,
                token.address,
                [addr1.address],
                [10],
            )

            const hashedLine = utils.solidityKeccak256(
                ["bytes", "uint256", "address"],
                [owner.address, 2000000000, token.address],
            )

            const balance = await defter.getBalances(hashedLine, addr1.address)
            expect(balance).to.equal(10)
        })

        it("zero receiver not allowed", async () => {
            await expect(
                defter.openLine(2000000000, token.address, [addr0], [10]),
            ).to.be.reverted
        })
        it("zero amount not allowed", async () => {
            await expect(
                defter.openLine(
                    2000000000,
                    token.address,
                    [addr1.address],
                    [0],
                ),
            ).to.be.reverted
        })
        it("balance increments when lineID already opened", async () => {
            await defter.openLine(
                2000000000,
                token.address,
                [addr1.address],
                [10],
            )

            const hashedLine = utils.solidityKeccak256(
                ["bytes", "uint256", "address"],
                [owner.address, 2000000000, token.address],
            )

            await defter.openLine(
                2000000000,
                token.address,
                [addr2.address],
                [20],
            )

            const balance = await defter.getBalances(hashedLine, addr2.address)

            expect(balance).to.equal(20)
        })
        it("emits new line", async () => {
            const hashedLine = utils.solidityKeccak256(
                ["bytes", "uint256", "address"],
                [owner.address, 2000000000, token.address],
            )
            await expect(
                defter.openLine(
                    2000000000,
                    token.address,
                    [addr1.address, addr2.address],
                    [20, 30],
                ),
            ).to.emit(defter, "LineOpened")
            // .withArgs(
            //     owner.address,
            //     [addr1.address, addr2.address],
            //     [20, 30],
            //     hashedLine,
            // )
        })
    })
    describe("transferLine", () => {
        it("transfers line", async () => {
            await defter.openLine(
                2000000000,
                token.address,
                [addr2.address, addr3.address],
                [20, 30],
            )

            const hashedLine = utils.solidityKeccak256(
                ["bytes", "uint256", "address"],
                [owner.address, 2000000000, token.address],
            )

            await defter
                .connect(addr2)
                .transferLine(hashedLine, [addr3.address], [10])

            const balance = await defter.getBalances(hashedLine, addr3.address)
            expect(balance).to.equal(40)
        })
        it("cannot transfer if zero balance", async () => {
            const hashedLine = utils.solidityKeccak256(
                ["bytes", "uint256", "address"],
                [owner.address, 2000000000, token.address],
            )

            await expect(
                defter
                    .connect(addr2)
                    .transferLine(hashedLine, [addr3.address], [40]),
            ).to.be.reverted
        })
        it("cannot transfer more than balance", async () => {
            await defter.openLine(
                2000000000,
                token.address,
                [addr2.address],
                [20],
            )

            const hashedLine = utils.solidityKeccak256(
                ["bytes", "uint256", "address"],
                [owner.address, 2000000000, token.address],
            )

            await expect(
                defter
                    .connect(addr2)
                    .transferLine(hashedLine, [addr3.address], [40]),
            ).to.be.reverted
        })
        it("emits transfer line", async () => {
            const hashedLine = utils.solidityKeccak256(
                ["bytes", "uint256", "address"],
                [owner.address, 2000000000, token.address],
            )

            await defter.openLine(
                2000000000,
                token.address,
                [addr1.address, addr2.address],
                [20, 30],
            )

            await expect(
                defter
                    .connect(addr2)
                    .transferLine(hashedLine, [addr1.address], [30]),
            ).to.emit(defter, "LineTransferred")
            // .withArgs(addr2.address, [addr1.address], [30], hashedLine)
        })
    })
    describe("closeLine", () => {
        beforeEach(async () => {
            await defter.openLine(
                2000000000,
                token.address,
                [addr1.address, addr2.address],
                [20, 30],
            )

            // thousand years later :)
            await token.approve(defter.address, 50)
        })
        it("transfers approved amount to contract", async () => {
            const balanceBefore = (
                await token.balanceOf(defter.address)
            ).toNumber()

            await defter.closeLine(2000000000, token.address, 50)

            const balanceAfter = (
                await token.balanceOf(defter.address)
            ).toNumber()

            expect(balanceAfter - balanceBefore).to.equal(50)
        })
        it("emits closed line", async () => {
            const hashedLine = utils.solidityKeccak256(
                ["bytes", "uint256", "address"],
                [owner.address, 2000000000, token.address],
            )

            await expect(defter.closeLine(2000000000, token.address, 50))
                .to.emit(defter, "LineClosed")
                .withArgs(owner.address, hashedLine, 50)
        })
    })
    describe("withdraw", () => {
        beforeEach(async () => {
            await defter.openLine(
                2000000000,
                token.address,
                [addr1.address, addr2.address],
                [20, 30],
            )

            await token.approve(defter.address, 50)

            await defter.closeLine(2000000000, token.address, 50)
        })
        it("recepient withdraws closed line", async () => {
            const hashedLine = utils.solidityKeccak256(
                ["bytes", "uint256", "address"],
                [owner.address, 2000000000, token.address],
            )

            const balanceBefore = (
                await token.balanceOf(addr2.address)
            ).toNumber()

            await defter.connect(addr2).withdraw(hashedLine, token.address)

            const balanceAfter = (
                await token.balanceOf(addr2.address)
            ).toNumber()

            expect(balanceAfter - balanceBefore).to.equal(30)
        })
        it("emit withdrawn amount", async () => {
            const hashedLine = utils.solidityKeccak256(
                ["bytes", "uint256", "address"],
                [owner.address, 2000000000, token.address],
            )

            await expect(
                await defter.connect(addr2).withdraw(hashedLine, token.address),
            )
                .to.emit(defter, "Withdrawn")
                .withArgs(addr2.address, hashedLine, 30)
        })
    })
})
