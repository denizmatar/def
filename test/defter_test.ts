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

    // bunun bi numarasi kalmiyor sanki emit varken?
    // it("opens new line", async () => {
    //     await defter.openLine(1, "TL", [addr1.address, addr2.address], [10, 20])

    //     const lineIDsCount = await defter.getLineIDs()

    //     expect(lineIDsCount.length).to.equal(1)
    // })

    it("emits new line", async () => {
        const hashedLine = utils.solidityKeccak256(
            ["bytes", "uint256", "string"],
            [owner.address, 1, "USD"],
        )
        await expect(
            defter.openLine(1, "USD", [addr1.address, addr2.address], [20, 30]),
        )
            .to.emit(defter, "OpenLine")
            .withArgs(owner.address, hashedLine)
    })
    it("gets line balance", async () => {
        await defter.openLine(1, "TL", [addr1.address], [10])

        const hashedLine = utils.solidityKeccak256(
            ["bytes", "uint256", "string"],
            [owner.address, 1, "TL"],
        )

        const balance = await defter.getBalances(hashedLine, addr1.address)
        expect(balance).to.equal(10)
    })
    it("transfers line", async () => {
        await defter.openLine(
            2,
            "USD",
            [addr2.address, addr3.address],
            [20, 30],
        )

        const hashedLine = utils.solidityKeccak256(
            ["bytes", "uint256", "string"],
            [owner.address, 2, "USD"],
        )

        await defter
            .connect(addr2)
            .transferLine(hashedLine, [addr3.address], [10])

        const balance = await defter.getBalances(hashedLine, addr3.address)
        expect(balance).to.equal(40)
    })
})
