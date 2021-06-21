import { ethers } from "hardhat";
import { expect } from "chai";
import { MtrToken } from "../typechain/MtrToken";
import { Erc1155Defter } from "../typechain/Erc1155Defter";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { utils } from "ethers";

let token: MtrToken;
let defter1155: Erc1155Defter;
let owner: SignerWithAddress;
let addr1: SignerWithAddress;
let addr2: SignerWithAddress;
let addr3: SignerWithAddress;
let addr0 = ethers.constants.AddressZero;

describe("Defterhane", () => {
  beforeEach(async () => {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();

    const ERC1155DefterFactory = await ethers.getContractFactory(
      "ERC1155Defter",
      owner
    );
    defter1155 = (await ERC1155DefterFactory.deploy("")) as Erc1155Defter;
    await defter1155.deployed();

    const tokenFactory = await ethers.getContractFactory("MTRToken", owner);
    token = (await tokenFactory.deploy(10000)) as MtrToken;
    await token.deployed();
  });
  describe("openLine", () => {
    it("gets line balance", async () => {
      const hashedLine = utils.solidityKeccak256(
        ["address", "uint256", "address"],
        [owner.address, 2000000000, token.address]
      );

      await defter1155.openLine(
        owner.address,
        addr1.address,
        token.address,
        10,
        2000000000,
        "0x00"
      );

      const balance = await defter1155.getBalances(hashedLine, addr1.address);

      expect(balance).eq(10);
    });

    it("zero receiver not allowed", async () => {
      await expect(
        defter1155.openLine(
          owner.address,
          addr0,
          token.address,
          10,
          2000000000,
          "0x00"
        )
      ).to.be.reverted;
    });
    it("zero amount not allowed", async () => {
      await expect(
        defter1155.openLine(
          owner.address,
          addr1.address,
          token.address,
          0,
          2000000000,
          "0x00"
        )
      ).to.be.reverted;
    });
    it("balance increments when lineID already opened", async () => {
      const hashedLine = utils.solidityKeccak256(
        ["bytes", "uint256", "address"],
        [owner.address, 2000000000, token.address]
      );

      await defter1155.openLine(
        owner.address,
        addr1.address,
        token.address,
        10,
        2000000000,
        "0x00"
      );
      await defter1155.openLine(
        owner.address,
        addr2.address,
        token.address,
        20,
        2000000000,
        "0x00"
      );

      const balance = await defter1155.getBalances(hashedLine, addr2.address);

      expect(balance).to.equal(20);
    });
    it("emits new line", async () => {
      const hashedLine = utils.solidityKeccak256(
        ["address", "uint256", "address"],
        [owner.address, 2000000000, token.address]
      );

      await expect(
        await defter1155.openLine(
          owner.address,
          addr1.address,
          token.address,
          20,
          2000000000,
          "0x00"
        )
      )
        .to.emit(defter1155, "LineOpened")
        .withArgs(hashedLine, owner.address, token.address, 2000000000);
    });
    it("verifies signature and opens line", async () => {
      const hashedLine = utils.solidityKeccak256(
        ["address", "uint256", "address"],
        [owner.address, 2000000000, token.address]
      );

      const nonce = await defter1155._nonces(owner.address);

      const data = ethers.utils.solidityKeccak256(
        ["address", "uint256", "address", "uint256"],
        [owner.address, 2000000000, token.address, nonce]
      );
      const dataBytes = ethers.utils.arrayify(data);

      const signature = await owner.signMessage(dataBytes);

      await defter1155
        .connect(addr3)
        .openLine(
          owner.address,
          addr1.address,
          token.address,
          100,
          2000000000,
          signature
        );

      const balance = await defter1155.getBalances(hashedLine, addr1.address);

      expect(balance).eq(100);
    });
    it("shouldn't open line with old signature(nonce)", async () => {
      const nonce = await defter1155._nonces(owner.address);

      const data = ethers.utils.solidityKeccak256(
        ["address", "uint256", "address", "uint256"],
        [owner.address, 2000000000, token.address, nonce]
      );
      const dataBytes = ethers.utils.arrayify(data);

      const signature = await owner.signMessage(dataBytes);

      await defter1155
        .connect(addr3)
        .openLine(
          owner.address,
          addr1.address,
          token.address,
          100,
          2000000000,
          signature
        );

      await expect(
        defter1155
          .connect(addr3)
          .openLine(
            owner.address,
            addr1.address,
            token.address,
            100,
            2000000000,
            signature
          )
      ).to.be.reverted;
    });
  });
  describe("safeBatchTransferFrom", () => {
    it("transfers line", async () => {
      const hashedLine = utils.solidityKeccak256(
        ["address", "uint256", "address"],
        [owner.address, 2000000000, token.address]
      );

      await defter1155.openLine(
        owner.address,
        addr2.address,
        token.address,
        20,
        2000000000,
        "0x00"
      );

      await defter1155
        .connect(addr2)
        .safeBatchTransferFrom(
          addr2.address,
          addr3.address,
          [hashedLine],
          [10],
          "0x00"
        );

      const balance = await defter1155.getBalances(hashedLine, addr3.address);
      expect(balance).to.equal(10);
    });
    it("transfers multiple lines", async () => {
      await defter1155.openLine(
        owner.address,
        addr2.address,
        token.address,
        20,
        2000000000,
        "0x00"
      );

      await defter1155.openLine(
        owner.address,
        addr2.address,
        token.address,
        30,
        2000000001,
        "0x00"
      );

      const hashedLine1 = utils.solidityKeccak256(
        ["address", "uint256", "address"],
        [owner.address, 2000000000, token.address]
      );
      const hashedLine2 = utils.solidityKeccak256(
        ["address", "uint256", "address"],
        [owner.address, 2000000001, token.address]
      );
      const beforeBalance1 = (
        await defter1155.getBalances(hashedLine1, addr3.address)
      ).toNumber();
      const beforeBalance2 = (
        await defter1155.getBalances(hashedLine2, addr3.address)
      ).toNumber();

      await defter1155
        .connect(addr2)
        .safeBatchTransferFrom(
          addr2.address,
          addr3.address,
          [hashedLine1, hashedLine2],
          [20, 30],
          "0x00"
        );
      const afterBalance1 = (
        await defter1155.getBalances(hashedLine1, addr3.address)
      ).toNumber();
      const afterBalance2 = (
        await defter1155.getBalances(hashedLine2, addr3.address)
      ).toNumber();

      expect(afterBalance1 - beforeBalance1).to.equal(20);
      expect(afterBalance2 - beforeBalance2).to.equal(30);
    });
    it("shouldn't transfer if zero balance", async () => {
      const hashedLine = utils.solidityKeccak256(
        ["address", "uint256", "address"],
        [owner.address, 2000000000, token.address]
      );

      await expect(
        defter1155
          .connect(addr2)
          .safeBatchTransferFrom(
            addr2.address,
            addr3.address,
            [hashedLine],
            [40],
            "0x00"
          )
      ).to.be.reverted;
    });
    it("shouldn't transfer more than balance", async () => {
      await defter1155.openLine(
        owner.address,
        addr2.address,
        token.address,
        20,
        2000000000,
        "0x00"
      );

      const hashedLine = utils.solidityKeccak256(
        ["address", "uint256", "address"],
        [owner.address, 2000000000, token.address]
      );

      await expect(
        defter1155
          .connect(addr2)
          .safeBatchTransferFrom(
            addr2.address,
            addr3.address,
            [hashedLine],
            [40],
            "0x00"
          )
      ).to.be.reverted;
    });
    it("emits transfer line", async () => {
      const hashedLine = utils.solidityKeccak256(
        ["address", "uint256", "address"],
        [owner.address, 2000000000, token.address]
      );

      await defter1155.openLine(
        owner.address,
        addr2.address,
        token.address,
        30,
        2000000000,
        "0x00"
      );

      await expect(
        defter1155
          .connect(addr2)
          .safeBatchTransferFrom(
            addr2.address,
            addr1.address,
            [hashedLine],
            [15],
            "0x00"
          )
      )
        .to.emit(defter1155, "LineTransferred")
        .withArgs(hashedLine, addr2.address, addr1.address, 15);
    });
    it("verifies signature and transfers line", async () => {
      const hashedLine = utils.solidityKeccak256(
        ["address", "uint256", "address"],
        [owner.address, 2000000000, token.address]
      );

      const nonce = (await defter1155._nonces(addr1.address)).toNumber();

      const data = ethers.utils.solidityKeccak256(
        ["address", "address", "bytes32[]", "uint256[]", "uint256"],
        [addr1.address, addr2.address, [hashedLine], [100], nonce]
      );
      const dataBytes = ethers.utils.arrayify(data);
      const signature = await addr1.signMessage(dataBytes);

      await defter1155.openLine(
        owner.address,
        addr1.address,
        token.address,
        100,
        2000000000,
        "0x00"
      );

      await defter1155
        .connect(owner)
        .safeBatchTransferFrom(
          addr1.address,
          addr2.address,
          [hashedLine],
          [100],
          signature
        );

      const balance = await defter1155.getBalances(hashedLine, addr2.address);

      expect(balance).to.be.equal(100);
    });
  });
  describe("closeLine", () => {
    beforeEach(async () => {
      await defter1155.openLine(
        owner.address,
        addr1.address,
        token.address,
        50,
        2000000000,
        "0x00"
      );

      await token.approve(defter1155.address, 50);
    });
    it("transfers approved amount to contract", async () => {
      const balanceBefore = (
        await token.balanceOf(defter1155.address)
      ).toNumber();

      await defter1155.closeLine(
        owner.address,
        token.address,
        50,
        2000000000,
        "0x00"
      );

      const balanceAfter = (
        await token.balanceOf(defter1155.address)
      ).toNumber();

      expect(balanceAfter - balanceBefore).to.equal(50);
    });
    it("emits closed line", async () => {
      const hashedLine = utils.solidityKeccak256(
        ["address", "uint256", "address"],
        [owner.address, 2000000000, token.address]
      );

      await expect(
        defter1155.closeLine(
          owner.address,
          token.address,
          50,
          2000000000,
          "0x00"
        )
      )
        .to.emit(defter1155, "LineClosed")
        .withArgs(hashedLine, owner.address);
    });
    it("verifies signature and closes line", async () => {
      const nonce = (await defter1155._nonces(owner.address)).toNumber();

      const data = ethers.utils.solidityKeccak256(
        ["address", "address", "uint256", "uint256", "uint256"],
        [owner.address, token.address, 50, 2000000000, nonce]
      );
      const dataBytes = ethers.utils.arrayify(data);
      const signature = await owner.signMessage(dataBytes);

      const balanceBefore = (
        await token.balanceOf(defter1155.address)
      ).toNumber();

      await defter1155
        .connect(addr1)
        .closeLine(owner.address, token.address, 50, 2000000000, signature);

      const balanceAfter = (
        await token.balanceOf(defter1155.address)
      ).toNumber();
      expect(balanceAfter - balanceBefore).to.equal(50);
    });
  });
  describe("withdraw", () => {
    beforeEach(async () => {
      await defter1155.openLine(
        owner.address,
        addr1.address,
        token.address,
        50,
        2000000000,
        "0x00"
      );

      await token.approve(defter1155.address, 50);

      await defter1155.closeLine(
        owner.address,
        token.address,
        50,
        2000000000,
        "0x00"
      );
    });
    it("recepient withdraws closed line", async () => {
      const hashedLine = utils.solidityKeccak256(
        ["address", "uint256", "address"],
        [owner.address, 2000000000, token.address]
      );

      const balanceBefore = (await token.balanceOf(addr1.address)).toNumber();

      await defter1155
        .connect(addr1)
        .withdraw(addr1.address, hashedLine, token.address, "0x00");

      const balanceAfter = (await token.balanceOf(addr1.address)).toNumber();

      expect(balanceAfter - balanceBefore).to.equal(50);
    });
    it("emits withdrawn amount", async () => {
      const hashedLine = utils.solidityKeccak256(
        ["address", "uint256", "address"],
        [owner.address, 2000000000, token.address]
      );

      await expect(
        await defter1155
          .connect(addr1)
          .withdraw(addr1.address, hashedLine, token.address, "0x00")
      )
        .to.emit(defter1155, "Withdrawn")
        .withArgs(hashedLine, addr1.address, 50);
    });
    it("verifies signature and withdraws", async () => {
      const nonce = (await defter1155._nonces(addr1.address)).toNumber();

      const hashedLine = utils.solidityKeccak256(
        ["address", "uint256", "address"],
        [owner.address, 2000000000, token.address]
      );

      const data = ethers.utils.solidityKeccak256(
        ["address", "bytes32", "address", "uint256"],
        [addr1.address, hashedLine, token.address, nonce]
      );
      const dataBytes = ethers.utils.arrayify(data);
      const signature = await addr1.signMessage(dataBytes);

      const balanceBefore = (await token.balanceOf(addr1.address)).toNumber();

      await defter1155.withdraw(
        addr1.address,
        hashedLine,
        token.address,
        signature
      );

      const balanceAfter = (await token.balanceOf(addr1.address)).toNumber();

      expect(balanceAfter - balanceBefore).to.equal(50);
    });
  });
});
