import { expect } from 'chai';
import { describe, beforeEach, it, after } from 'mocha';
import * as ethers from 'ethers';
import { Wallet } from '../src/wallet';
import { Defter } from '../src/contracts/Defter';
import { MTRToken } from '../src/contracts/MTRToken';
import { Defter__factory } from '../src/contracts/factories/Defter__factory';
import { MTRToken__factory as Token__factory } from '../src/contracts/factories/MTRToken__factory';
import { time } from 'console';

let wallet: Wallet;
let token: MTRToken;
let contract: Defter;

const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
provider.pollingInterval = 100;

let hashedLine: string;

const s0 = provider.getSigner(0);
const s1 = provider.getSigner(1);
const s2 = provider.getSigner(2);

let owner: string;
let addr1: string;
let addr2: string;

async function getAddresses() {
	owner = await s0.getAddress();
	addr1 = await s1.getAddress();
	addr2 = await s2.getAddress();
}

async function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('Wallet', async () => {
	let walletUserAddress: string;
	let walletUser: ethers.Signer;
	let otherUser: ethers.Signer;
	let alice: string = '0x0000000000000000000000000000000000000001';
	let bob: string = '0x0000000000000000000000000000000000000002';

	beforeEach(async () => {
		const deployer = await provider.getSigner(0);
		const walletUser = await provider.getSigner(1);
		walletUserAddress = await walletUser.getAddress();
		const defterFactory = new Defter__factory(deployer);
		const tokenFactory = new Token__factory(deployer);
		contract = await defterFactory.deploy();
		token = await tokenFactory.deploy(1000000);
		token = await tokenFactory.deploy(100000);
		wallet = await Wallet.withSigner(contract.address, walletUser);

		// hashedLine = ethers.utils.solidityKeccak256(['addres', 'uint256', 'address'], [owner, 2000000000, token.address]);
	});
	it('opens line', async () => {
		wallet.listenTransferLineAsReceiver();
		const res = await wallet.openLine(2000000000, token.address, alice, ethers.BigNumber.from(20));
		await sleep(2000);
	}).timeout(10000);
	// describe('openLine', async () => {
	// it('opens line', async () => {
	// 	const balance = (await defter.getBalances(hashedLine, addr2)).toNumber();
	// 	expect(balance).to.equal(30);
	// });
	// xit('turns on listener', async () => {
	// 	// filter kullanabiliyorum, veya direkt "LineOpened" yazabiliyorum wallet icinde/ hangisi??
	// 	// const filter = await defter.contract.filters.LineOpened(owner)
	// 	defter.openLineListenerOn(() => {
	// 		console.log('cb working');
	// 	});
	// 	await defter.openLine(2000000000, token.address, [addr1], [50]);
	// 	// await defter.contract.removeAllListeners()
	// });
	// xit('turns off listener', async () => {
	// 	defter.removeAllListeners();
	// });
	// it('gets all past events', async () => {
	// 	const result = await defter.openedLines(0, 99999);
	// 	expect(result).to.not.be.empty;
	// });
	// it('filters past events', async () => {
	// 	await defter.openLine(2000000000, token.address, [addr2], [50], s1);
	// 	const filter = defter.openLineFilter(addr1);
	// 	const result = await defter.openedLines(0, 99999, filter);
	// 	expect(result).to.not.be.empty;
	// });
	// });
	// describe('transferLine', async () => {
	// 	it('transfers line', async () => {
	// 		await defter.transferLine(hashedLine, [addr1], [30], s2);

	// 		const balance = (await defter.getBalances(hashedLine, addr1)).toNumber();

	// 		expect(balance).to.equal(50);
	// 	});
	// 	it('gets past events', async () => {
	// 		await defter.transferLine(hashedLine, [addr1], [30], s2);

	// 		const result = await defter.transferredLines(0, 99999);

	// 		expect(result).to.not.be.empty;
	// 	});
	// 	it('filters past events', async () => {
	// 		await defter.transferLine(hashedLine, [addr1], [30], s2);

	// 		const filter = defter.transferLineFilter(addr2);
	// 		const result = await defter.transferredLines(0, 99999, filter);

	// 		expect(result).to.not.be.empty;
	// 	});
	// });
	// describe('closeLine', async () => {
	// 	it('closes line', async () => {
	// 		// thousand years later, again :)
	// 		await token.approve(contract.address, 50);

	// 		const balanceBefore = (await token.balanceOf(contract.address)).toNumber();

	// 		await defter.closeLine(2000000000, token.address, 50);

	// 		const balanceAfter = (await token.balanceOf(contract.address)).toNumber();

	// 		expect(balanceAfter - balanceBefore).to.equal(50);
	// 	});
	// 	it('gets past events', async () => {
	// 		await token.approve(contract.address, 50);
	// 		await defter.closeLine(2000000000, token.address, 50);

	// 		const result = await defter.closedLines(0, 99999);
	// 		expect(result).to.not.be.empty;
	// 	});
	// 	it('filters past events', async () => {
	// 		await token.approve(contract.address, 50);
	// 		await defter.closeLine(2000000000, token.address, 50);

	// 		const filter = defter.closeLineFilter(owner);
	// 		const result = await defter.closedLines(0, 99999, filter);

	// 		expect(result).to.not.be.empty;
	// 	});
	// });
	// describe('withdraw', async () => {
	// 	it('withdraws', async () => {
	// 		await token.approve(contract.address, 50);
	// 		await defter.closeLine(2000000000, token.address, 50);

	// 		const balanceBefore = (await token.balanceOf(addr2)).toNumber();

	// 		await defter.withdraw(hashedLine, token.address, s2);

	// 		const balanceAfter = (await token.balanceOf(addr2)).toNumber();

	// 		expect(balanceAfter - balanceBefore).to.equal(30);
	// 	});
	// 	it('gets past events', async () => {
	// 		await token.approve(contract.address, 50);
	// 		await defter.closeLine(2000000000, token.address, 50);
	// 		await defter.withdraw(hashedLine, token.address, s2);

	// 		const result = await defter.withdrawns(0, 99999);

	// 		expect(result).to.not.be.empty;
	// 	});
	// 	it('filters past events', async () => {
	// 		await token.approve(contract.address, 50);
	// 		await defter.closeLine(2000000000, token.address, 50);
	// 		await defter.withdraw(hashedLine, token.address, s2);

	// 		const filter = await defter.withdrawFilter(addr2);
	// 		const result = await defter.withdrawns(0, 99999, filter);

	// 		expect(result).to.not.be.empty;
	// 	});
	// });
});
