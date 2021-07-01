import { expect, assert } from 'chai';
import { describe, beforeEach, it, after } from 'mocha';
import * as ethers from 'ethers';
import { LineStatus, Wallet } from '../src/wallet';
import { ERC1155Defter } from '../src/contracts/ERC1155Defter';
import { MTRToken } from '../src/contracts/MTRToken';
import { ERC1155Defter__factory } from '../src/contracts/factories/ERC1155Defter__factory';
import { MTRToken__factory as Token__factory } from '../src/contracts/factories/MTRToken__factory';

let wallet: Wallet;
let token: MTRToken;
let defter: ERC1155Defter;

const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
provider.pollingInterval = 100;

const deployer: ethers.Signer = provider.getSigner(0);
const walletUser: ethers.Signer = provider.getSigner(1);
const user1: ethers.Signer = provider.getSigner(2);
const user2: ethers.Signer = provider.getSigner(3);
const user3: ethers.Signer = provider.getSigner(4);
const user4: ethers.Signer = provider.getSigner(5);

let walletUserAddr: string;
let user1Addr: string;
let user2Addr: string;
let user3Addr: string;
let user4Addr: string;

async function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('Wallet', async () => {
	beforeEach(async () => {
		const defterFactory = new ERC1155Defter__factory(deployer);
		const tokenFactory = new Token__factory(deployer);

		defter = await defterFactory.deploy('');
		token = await tokenFactory.deploy(100000);

		walletUserAddr = await walletUser.getAddress();
		user1Addr = await user1.getAddress();
		user2Addr = await user2.getAddress();
		user3Addr = await user2.getAddress();
		user4Addr = await user2.getAddress();
	});

	it('loads all past events', async () => {
		let maturity = 2000000000;

		const amount1 = 1000;
		const lineID1 = Wallet.calculateLineID(user1Addr, maturity, token.address);
		await defter.connect(user1).mint(user1Addr, walletUserAddr, token.address, amount1, 2000000000, '0x00');

		const amount2 = 1001;
		const lineID2 = Wallet.calculateLineID(user2Addr, maturity, token.address);
		await defter.connect(user2).mint(user2Addr, walletUserAddr, token.address, amount2, 2000000000, '0x00');

		const amount3 = 900;
		await defter.connect(walletUser).safeBatchTransferFrom(walletUserAddr, user3Addr, [lineID1], [amount3], '0x00');
		const amount4 = 300;
		await defter.connect(walletUser).safeBatchTransferFrom(walletUserAddr, user3Addr, [lineID2], [amount4], '0x00');
		const amount5 = 301;
		await defter.connect(walletUser).safeBatchTransferFrom(walletUserAddr, user4Addr, [lineID2], [amount5], '0x00');

		await sleep(2000);
		wallet = await Wallet.withSigner(defter.address, walletUser);
		await sleep(2000);

		// receiver lineID1
		let receiverHistory = wallet.receiverHistory.get(lineID1);

		expect(receiverHistory).length(1);
		let logReceiver = receiverHistory![0];
		expect(logReceiver.amount.toNumber()).eq(amount1);
		// expect(logReceiver.sender).eq(user1Addr);
		expect(logReceiver.sender).eq(ethers.constants.AddressZero);

		// receiver lineID2
		receiverHistory = wallet.receiverHistory.get(lineID2);

		expect(receiverHistory).length(1);
		logReceiver = receiverHistory![0];
		expect(logReceiver.amount.toNumber()).eq(amount2);
		// expect(logReceiver.sender).eq(user2Addr);
		expect(logReceiver.sender).eq(ethers.constants.AddressZero);

		// sender lineID1
		let senderHistory = wallet.senderHistory.get(lineID1);

		expect(receiverHistory).length(1);
		let logSender = senderHistory![0];
		expect(logSender.amount.toNumber()).eq(amount3);
		expect(logSender.receiver).eq(user3Addr);

		// sender lineID2
		senderHistory = wallet.senderHistory.get(lineID2);

		expect(senderHistory).length(2);

		logSender = senderHistory![0];
		expect(logSender.amount.toNumber()).eq(amount4);
		expect(logSender.receiver).eq(user3Addr);

		logSender = senderHistory![1];
		expect(logSender.amount.toNumber()).eq(amount5);
		expect(logSender.receiver).eq(user4Addr);

		let line = wallet.lines.get(lineID1);

		if (line) {
			expect(line[0].issuer).eq(user1Addr);
			expect(line[0].maturityDate).eq(maturity);
			expect(line[0].status).eq(LineStatus.OPEN);
			expect(line[0].unit).eq(token.address);
		}

		line = wallet.lines.get(lineID2);

		if (line) {
			expect(line[0].issuer).eq(user2Addr);
			expect(line[0].maturityDate).eq(maturity);
			expect(line[0].status).eq(LineStatus.OPEN);
			expect(line[0].unit).eq(token.address);
		}
	}).timeout(15000);

	it('opens line', async () => {
		wallet = await Wallet.withSigner(defter.address, walletUser);

		let maturity = 2000000000;

		let lineID = Wallet.calculateLineID(walletUserAddr, maturity, token.address);

		await wallet.openLine(walletUserAddr, user1Addr, token.address, ethers.BigNumber.from(100), maturity, '0x00');
		const balance = (await wallet.getBalance(lineID, user1Addr)).toNumber();
		expect(balance).to.equal(100);
	});
	it('listens openLine as issuer', async () => {
		wallet = await Wallet.withSigner(defter.address, walletUser);

		wallet.listenOpenLineAsIssuer();
		const histBefore = wallet.senderHistory;
		const histBeforeSize = histBefore.size;

		await wallet.openLine(walletUserAddr, user1Addr, token.address, ethers.BigNumber.from(50), 2000000000, '0x00');
		await wallet.openLine(walletUserAddr, user1Addr, token.address, ethers.BigNumber.from(50), 2000000000, '0x00');
		await sleep(2000);

		const histAfter = wallet.senderHistory;
		const histAfterSize = histAfter.size;

		expect(histAfterSize - histBeforeSize).to.equal(1);
	}).timeout(5000);

	it('transfers line', async () => {
		wallet = await Wallet.withSigner(defter.address, walletUser);

		const lineID = Wallet.calculateLineID(user1Addr, 2000000000, token.address);

		await defter.connect(user1).mint(user1Addr, walletUserAddr, token.address, ethers.BigNumber.from(100), 2000000000, '0x00');
		await wallet.transferLine(walletUserAddr, user2Addr, lineID, ethers.BigNumber.from(100), '0x00');

		const balance = (await wallet.getBalance(lineID, user2Addr)).toNumber();

		expect(balance).to.equal(100);
	});
	it('transfers multiple lines', async () => {
		wallet = await Wallet.withSigner(defter.address, walletUser);

		const lineID1 = Wallet.calculateLineID(user1Addr, 2000000000, token.address);
		const lineID2 = Wallet.calculateLineID(user2Addr, 2000000000, token.address);

		await defter.connect(user1).mint(user1Addr, walletUserAddr, token.address, ethers.BigNumber.from(100), 2000000000, '0x00');
		await defter.connect(user2).mint(user2Addr, walletUserAddr, token.address, ethers.BigNumber.from(100), 2000000000, '0x00');

		wallet.transferLines(walletUserAddr, user3Addr, [lineID1, lineID2], [ethers.BigNumber.from(100), ethers.BigNumber.from(100)], '0x00');

		const balance1 = (await wallet.getBalance(lineID1, user3Addr)).toNumber();
		const balance2 = (await wallet.getBalance(lineID2, user3Addr)).toNumber();

		expect(balance1).eq(100);
		expect(balance2).eq(100);
	});
	it('listens transferLine as sender', async () => {
		wallet = await Wallet.withSigner(defter.address, walletUser);
		wallet.listenTransferLinesAsSender();

		const histBefore = wallet.senderHistory;
		const histBeforeSize = histBefore.size;

		const lineID = Wallet.calculateLineID(user1Addr, 2000000000, token.address);

		await defter.connect(user1).mint(user1Addr, walletUserAddr, token.address, ethers.BigNumber.from(100), 2000000000, '0x00');
		await wallet.transferLines(walletUserAddr, user2Addr, [lineID], [ethers.BigNumber.from(100)], '0x00');

		await sleep(5000);

		const histAfter = wallet.senderHistory;

		expect(histAfter.size - histBeforeSize).to.equal(1);
	}).timeout(10000);
	it('listens transferLine as receiver', async () => {
		wallet = await Wallet.withSigner(defter.address, walletUser);
		wallet.listenTransferLinesAsReceiver();

		const histBefore = wallet.receiverHistory;
		const histBeforeSize = histBefore.size;

		const lineID = Wallet.calculateLineID(user1Addr, 2000000000, token.address);

		await defter.connect(user1).mint(user1Addr, user2Addr, token.address, ethers.BigNumber.from(100), 2000000000, '0x00');
		await defter.connect(user2).safeBatchTransferFrom(user2Addr, walletUserAddr, [lineID], [ethers.BigNumber.from(100)], '0x00');

		await sleep(5000);

		const histAfter = wallet.receiverHistory;

		expect(histAfter.size - histBeforeSize).to.be.equal(1);
	}).timeout(10000);
	it('closes line', async () => {
		wallet = await Wallet.withSigner(defter.address, walletUser);

		await wallet.openLine(walletUserAddr, user1Addr, token.address, ethers.BigNumber.from(100), 2000000000, '0x00');

		await token.connect(deployer).transfer(walletUserAddr, 100);
		await token.connect(walletUser).approve(defter.address, 100);

		const balanceBefore = (await token.balanceOf(defter.address)).toNumber();

		await wallet.closeLine(walletUserAddr, token.address, 100, 2000000000, '0x00');

		const balanceAfter = (await token.balanceOf(defter.address)).toNumber();

		expect(balanceAfter - balanceBefore).to.equal(100);
	});

	it('withdraws', async () => {
		wallet = await Wallet.withSigner(defter.address, walletUser);
		const lineID = ethers.utils.solidityKeccak256(['address', 'uint256', 'address'], [user1Addr, 2000000000, token.address]);

		await defter.connect(user1).mint(user1Addr, walletUserAddr, token.address, ethers.BigNumber.from(100), 2000000000, '0x00');

		await token.connect(deployer).transfer(user1Addr, 100);
		await token.connect(user1).approve(defter.address, 100);

		await defter.connect(user1).closeLine(user1Addr, token.address, 100, 2000000000, '0x00');

		const balanceBefore = (await wallet.getBalance(lineID, walletUserAddr)).toNumber();
		await wallet.withdraw(walletUserAddr, lineID, token.address, '0x00');
		const balanceAfter = (await wallet.getBalance(lineID, walletUserAddr)).toNumber();
	});
});
