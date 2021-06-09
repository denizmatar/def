import { ethers } from "hardhat";
import { expect } from "chai";
import { Defter } from "../typechain/Defter";
import { MtrToken } from "../typechain/MtrToken";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { utils } from "ethers";

let defter: Defter;
let token: MtrToken;
let owner: SignerWithAddress;
let addr1: SignerWithAddress;
let addr2: SignerWithAddress;
let addr3: SignerWithAddress;
let addr0 = ethers.constants.AddressZero;

describe("Defterhane", () => {
  beforeEach(async () => {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();

    const defterFactory = await ethers.getContractFactory("Defter", owner);
    defter = (await defterFactory.deploy()) as Defter;
    await defter.deployed();

    const tokenFactory = await ethers.getContractFactory("MTRToken", owner);
    token = (await tokenFactory.deploy()) as MtrToken;
    await token.deployed();
  });
  describe("openLine", () => {
    it("gets line balance", async () => {
      await defter.openLine(2000000000, token.address, addr1.address, [10]);

      const hashedLine = utils.solidityKeccak256(
        ["bytes", "uint256", "address"],
        [owner.address, 2000000000, token.address]
      );

      const balance = await defter.getBalances(hashedLine, addr1.address);
      expect(balance).to.equal(10);
    });

    it("zero receiver not allowed", async () => {
      await expect(defter.openLine(2000000000, token.address, addr0, [10])).to
        .be.reverted;
    });
    it("zero amount not allowed", async () => {
      await expect(
        defter.openLine(2000000000, token.address, addr1.address, [0])
      ).to.be.reverted;
    });
    it("balance increments when lineID already opened", async () => {
      await defter.openLine(2000000000, token.address, addr1.address, [10]);

      const hashedLine = utils.solidityKeccak256(
        ["bytes", "uint256", "address"],
        [owner.address, 2000000000, token.address]
      );

      await defter.openLine(2000000000, token.address, addr2.address, [20]);

      const balance = await defter.getBalances(hashedLine, addr2.address);

      expect(balance).to.equal(20);
    });
    it("emits new line", async () => {
      const hashedLine = utils.solidityKeccak256(
        ["bytes", "uint256", "address"],
        [owner.address, 2000000000, token.address]
      );
      await expect(
        await defter.openLine(2000000000, token.address, addr1.address, 20)
      )
        .to.emit(defter, "LineOpened")
        .withArgs(hashedLine, owner.address, token.address, 2000000000);
    });
  });
  describe("transferLine", () => {
    it("transfers line", async () => {
      await defter.openLine(2000000000, token.address, addr2.address, 20);

      const hashedLine = utils.solidityKeccak256(
        ["bytes", "uint256", "address"],
        [owner.address, 2000000000, token.address]
      );

      await defter
        .connect(addr2)
        .transferLine([hashedLine], [10], addr3.address);

      const balance = await defter.getBalances(hashedLine, addr3.address);
      expect(balance).to.equal(10);
    });
    it("transfers multiple lines", async () => {
      await defter.openLine(2000000000, token.address, addr2.address, 20);
      await defter.openLine(2000000001, token.address, addr2.address, 30);

      const hashedLine1 = utils.solidityKeccak256(
        ["bytes", "uint256", "address"],
        [owner.address, 2000000000, token.address]
      );
      const hashedLine2 = utils.solidityKeccak256(
        ["bytes", "uint256", "address"],
        [owner.address, 2000000001, token.address]
      );
      const beforeBalance1 = (
        await defter.getBalances(hashedLine1, addr3.address)
      ).toNumber();
      const beforeBalance2 = (
        await defter.getBalances(hashedLine2, addr3.address)
      ).toNumber();

      await defter
        .connect(addr2)
        .transferLine([hashedLine1, hashedLine2], [20, 30], addr3.address);
      const afterBalance1 = (
        await defter.getBalances(hashedLine1, addr3.address)
      ).toNumber();
      const afterBalance2 = (
        await defter.getBalances(hashedLine2, addr3.address)
      ).toNumber();

      expect(afterBalance1 - beforeBalance1).to.equal(20);
      expect(afterBalance2 - beforeBalance2).to.equal(30);
    });
    it("cannot transfer if zero balance", async () => {
      const hashedLine = utils.solidityKeccak256(
        ["bytes", "uint256", "address"],
        [owner.address, 2000000000, token.address]
      );

      await expect(
        defter.connect(addr2).transferLine([hashedLine], [40], addr3.address)
      ).to.be.reverted;
    });
    it("cannot transfer more than balance", async () => {
      await defter.openLine(2000000000, token.address, addr2.address, 20);

      const hashedLine = utils.solidityKeccak256(
        ["bytes", "uint256", "address"],
        [owner.address, 2000000000, token.address]
      );

      await expect(
        defter.connect(addr2).transferLine([hashedLine], [40], addr3.address)
      ).to.be.reverted;
    });
    it("emits transfer line", async () => {
      const hashedLine = utils.solidityKeccak256(
        ["bytes", "uint256", "address"],
        [owner.address, 2000000000, token.address]
      );

      await defter.openLine(2000000000, token.address, addr2.address, 30);

      await expect(
        defter.connect(addr2).transferLine([hashedLine], [15], addr1.address)
      )
        .to.emit(defter, "LineTransferred")
        .withArgs(hashedLine, addr2.address, addr1.address, 15);
    });
  });
  describe("closeLine", () => {
    beforeEach(async () => {
      await defter.openLine(2000000000, token.address, addr1.address, 50);

      await token.setApprovalForAll(defter.address, true);
    });
    it("transfers approved amount to contract", async () => {
      const balanceBefore = (
        await token.balanceOf(defter.address, 1)
      ).toNumber();
      await defter.closeLine(2000000000, token.address, 50);

      const balanceAfter = (
        await token.balanceOf(defter.address, 1)
      ).toNumber();

      expect(balanceAfter - balanceBefore).to.equal(50);
    });
    it("emits closed line", async () => {
      const hashedLine = utils.solidityKeccak256(
        ["bytes", "uint256", "address"],
        [owner.address, 2000000000, token.address]
      );

      await expect(defter.closeLine(2000000000, token.address, 50))
        .to.emit(defter, "LineClosed")
        .withArgs(hashedLine, owner.address);
    });
  });
  describe("withdraw", () => {
    beforeEach(async () => {
      await defter.openLine(2000000000, token.address, addr1.address, 50);

      await token.setApprovalForAll(defter.address, true);

      await defter.closeLine(2000000000, token.address, 50);
    });
    it("recepient withdraws closed line", async () => {
      const hashedLine = utils.solidityKeccak256(
        ["bytes", "uint256", "address"],
        [owner.address, 2000000000, token.address]
      );

      const balanceBefore = (
        await token.balanceOf(addr1.address, 1)
      ).toNumber();

      await defter.connect(addr1).withdraw(hashedLine, token.address);

      const balanceAfter = (await token.balanceOf(addr1.address, 1)).toNumber();

      expect(balanceAfter - balanceBefore).to.equal(50);
    });
    it("emits withdrawn amount", async () => {
      const hashedLine = utils.solidityKeccak256(
        ["bytes", "uint256", "address"],
        [owner.address, 2000000000, token.address]
      );

      await expect(
        await defter.connect(addr1).withdraw(hashedLine, token.address)
      )
        .to.emit(defter, "Withdrawn")
        .withArgs(hashedLine, addr1.address, 50);
    });
  });
});
