import { expect, assert } from 'chai';
import { describe, beforeEach, it, after } from 'mocha';
import * as ethers from 'ethers';
import { LineStatus, Wallet } from '../src/wallet';
import { Defter } from '../src/contracts/Defter';
import { MTRToken } from '../src/contracts/MTRToken';
import { Defter__factory } from '../src/contracts/factories/Defter__factory';
import { MTRToken__factory as Token__factory } from '../src/contracts/factories/MTRToken__factory';
import { markAsUntransferable } from 'worker_threads';

let wallet: Wallet;
let token: MTRToken;
let defter: Defter;

// RPC PROVIDER
const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
provider.pollingInterval = 100;

// SIGNERS
const deployer: ethers.Signer = provider.getSigner(0);
const walletUser: ethers.Signer = provider.getSigner(1);
const user1: ethers.Signer = provider.getSigner(2);
const user2: ethers.Signer = provider.getSigner(3);
const user3: ethers.Signer = provider.getSigner(4);
const user4: ethers.Signer = provider.getSigner(5);

// SIGNER ADDRESSES
let walletUserAddr: string;
let user1Addr: string;
let user2Addr: string;
let user3Addr: string;
let user4Addr: string;

// SLEEP FNC
async function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('Wallet', async () => {
	beforeEach(async () => {
		const defterFactory = new Defter__factory(deployer);
		const tokenFactory = new Token__factory(deployer);

		defter = await defterFactory.deploy();
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
		await defter.connect(user1).openLine(2000000000, token.address, walletUserAddr, amount1);

		const amount2 = 1001;
		const lineID2 = Wallet.calculateLineID(user2Addr, maturity, token.address);
		await defter.connect(user2).openLine(2000000000, token.address, walletUserAddr, amount2);

		const amount3 = 900;
		await defter.connect(walletUser).transferLine([lineID1], [amount3], user3Addr);
		const amount4 = 300;
		await defter.connect(walletUser).transferLine([lineID2], [amount4], user3Addr);
		const amount5 = 301;
		await defter.connect(walletUser).transferLine([lineID2], [amount5], user4Addr);

		await sleep(2000);
		wallet = await Wallet.withSigner(defter.address, walletUser);
		await sleep(2000);

		// receiver lineID1
		let receiverHistory = wallet.receiverHistory.get(lineID1);

		expect(receiverHistory).length(1);
		let logReceiver = receiverHistory![0];
		expect(logReceiver.amount.toNumber()).eq(amount1);
		expect(logReceiver.sender).eq(user1Addr);

		// receiver lineID2
		receiverHistory = wallet.receiverHistory.get(lineID2);

		expect(receiverHistory).length(1);
		logReceiver = receiverHistory![0];
		expect(logReceiver.amount.toNumber()).eq(amount2);
		expect(logReceiver.sender).eq(user2Addr);

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
		await wallet.openLine(2000000000, token.address, user1Addr, ethers.BigNumber.from(100));
		const balance = (await wallet.getBalance(lineID, user1Addr)).toNumber();
		expect(balance).to.equal(100);
	});
	it('listens openLine', async () => {
		wallet = await Wallet.withSigner(defter.address, walletUser);

		wallet.listenTransferLineAsSender();
		const histBefore = wallet.senderHistory;
		// alttakini yapmak zorunda kaldim cunku expect icine direkt histBefore.size verince
		// 1 cikiyor 0 olmasi gerekirken. openLine'dan once bastirinca 0 oluyor sonra bastirinca 1 oluyor
		// yani constant bir degisken nasil degisebiliyor anlamis degilim. baya merak ettim sebebini
		const histBeforeSize = histBefore.size;

		await wallet.openLine(2000000000, token.address, user1Addr, ethers.BigNumber.from(100));
		await sleep(2000);

		const histAfter = wallet.senderHistory;

		expect(histAfter.size - histBeforeSize).to.equal(1);
	}).timeout(5000);

	it('transfers line', async () => {
		wallet = await Wallet.withSigner(defter.address, walletUser);

		let lineID = ethers.utils.solidityKeccak256(['address', 'uint256', 'address'], [user1Addr, 2000000000, token.address]);

		await defter.connect(user1).openLine(2000000000, token.address, walletUserAddr, ethers.BigNumber.from(100));
		await wallet.transferLine([lineID], [ethers.BigNumber.from(100)], user2Addr);
		// await wallet.transferLine([lineID], [ethers.BigNumber.from(100)], user2Addr);

		const balance = (await wallet.getBalance(lineID, user2Addr)).toNumber();

		expect(balance).to.equal(100);
	});
	xit('listens transferLine', async () => {
		wallet = await Wallet.withSigner(defter.address, walletUser);
		wallet.listenTransferLineAsSender();

		const histBefore = wallet.senderHistory;
		const histBeforeSize = histBefore.size;

		const lineID = ethers.utils.solidityKeccak256(['address', 'uint256', 'address'], [user1Addr, 2000000000, token.address]);

		await defter.connect(user1).openLine(2000000000, token.address, walletUserAddr, ethers.BigNumber.from(100));
		await wallet.transferLine([lineID], [ethers.BigNumber.from(100)], user2Addr);

		await sleep(5000);

		const histAfter = wallet.senderHistory;

		expect(histAfter.size - histBeforeSize).to.equal(2);
	}).timeout(10000);

	it.skip('closes line', async () => {
		wallet = await Wallet.withSigner(defter.address, walletUser);
		await token.connect(deployer).transfer(walletUserAddr, 100);
		await token.connect(walletUser).approve(defter.address, 100);

		const balanceBefore = (await token.balanceOf(defter.address)).toNumber();

		await wallet.closeLine(2000000000, token.address, 100);

		const balanceAfter = (await token.balanceOf(defter.address)).toNumber();

		expect(balanceAfter - balanceBefore).to.equal(100);
	});

	it.skip('withdraws', async () => {
		wallet = await Wallet.withSigner(defter.address, walletUser);
		const lineID = ethers.utils.solidityKeccak256(['address', 'uint256', 'address'], [user1Addr, 2000000000, token.address]);

		await defter.connect(user1).openLine(2000000000, token.address, walletUserAddr, ethers.BigNumber.from(100));

		await token.connect(deployer).transfer(user1Addr, 100);
		await token.connect(user1).approve(defter.address, 100);

		await defter.connect(user1).closeLine(2000000000, token.address, 100);

		const balanceBefore = (await wallet.getBalance(lineID, walletUserAddr)).toNumber();
		await wallet.withdraw(lineID, token.address);
		const balanceAfter = (await wallet.getBalance(lineID, walletUserAddr)).toNumber();
	});
});
