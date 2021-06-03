import { expect } from 'chai';
import { describe, beforeEach, it, after } from 'mocha';
import * as ethers from 'ethers';
import { Wallet } from '../src/wallet';
import { Defter } from '../src/contracts/Defter';
import { MTRToken } from '../src/contracts/MTRToken';
import { Defter__factory } from '../src/contracts/factories/Defter__factory';
import { MTRToken__factory as Token__factory } from '../src/contracts/factories/MTRToken__factory';

let wallet: Wallet;
let token: MTRToken;
let contract: Defter;

// RPC PROVIDER
const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
provider.pollingInterval = 100;

// SIGNERS
const deployer: ethers.Signer = provider.getSigner(0);
const walletUser: ethers.Signer = provider.getSigner(1);
const user1: ethers.Signer = provider.getSigner(2);
const user2: ethers.Signer = provider.getSigner(3);

// SIGNER ADDRESSES
let walletUserAddress: string;
let user1Addr: string;
let user2Addr: string;

// SLEEP FNC
async function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// HASHED LINE
let hashedLine: string;

describe('Wallet', async () => {
	beforeEach(async () => {
		// FACTORIES AND DEPLOY
		const defterFactory = new Defter__factory(deployer);
		const tokenFactory = new Token__factory(deployer);

		contract = await defterFactory.deploy();
		token = await tokenFactory.deploy(100000);

		// WALLET INSTANCE
		wallet = await Wallet.withSigner(contract.address, walletUser);

		// ADDRESSES
		walletUserAddress = await walletUser.getAddress();
		user1Addr = await user1.getAddress();
		user2Addr = await user2.getAddress();

		// HASHED LINE
		hashedLine = ethers.utils.solidityKeccak256(['address', 'uint256', 'address'], [walletUserAddress, 2000000000, token.address]);

		// OPEN LINE
		await wallet.openLine(2000000000, token.address, user1Addr, ethers.BigNumber.from(100));
	});
	describe('past events', async () => {
		it('loads all past events', async () => {
			await wallet.openLine(2000000001, token.address, user1Addr, ethers.BigNumber.from(100));
			await wallet.openLine(2000000002, token.address, user1Addr, ethers.BigNumber.from(100));

			const wallet1 = await Wallet.withSigner(contract.address, user1);
			await sleep(2000);

			expect(wallet1.receiverHistory.size).to.equal(3);
		}).timeout(5000);
	});
	describe('openLine', async () => {
		it('opens line', async () => {
			const balance = (await wallet.getBalance(hashedLine, user1Addr)).toNumber();
			expect(balance).to.equal(100);
		});
		it('listens openLine', async () => {
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
	});
	describe('transferLine', async () => {
		it('transfers line', async () => {
			hashedLine = ethers.utils.solidityKeccak256(['address', 'uint256', 'address'], [user1Addr, 2000000000, token.address]);

			await contract.connect(user1).openLine(2000000000, token.address, walletUserAddress, ethers.BigNumber.from(100));
			await wallet.transferLine([hashedLine], [ethers.BigNumber.from(100)], user2Addr);
			// await wallet.transferLine([hashedLine], [ethers.BigNumber.from(100)], user2Addr);

			const balance = (await wallet.getBalance(hashedLine, user2Addr)).toNumber();

			expect(balance).to.equal(100);
		});
		it('listens transferLine', async () => {
			wallet.listenTransferLineAsSender();

			const histBefore = wallet.senderHistory;
			const histBeforeSize = histBefore.size;

			hashedLine = ethers.utils.solidityKeccak256(['address', 'uint256', 'address'], [user1Addr, 2000000000, token.address]);

			await contract.connect(user1).openLine(2000000000, token.address, walletUserAddress, ethers.BigNumber.from(100));
			await wallet.transferLine([hashedLine], [ethers.BigNumber.from(100)], user2Addr);

			await sleep(5000);

			const histAfter = wallet.senderHistory;

			expect(histAfter.size - histBeforeSize).to.equal(2);
		}).timeout(10000);
	});
	describe('closeLine', async () => {
		it('closes line', async () => {
			await token.connect(deployer).transfer(walletUserAddress, 100);
			await token.connect(walletUser).approve(contract.address, 100);

			const balanceBefore = (await token.balanceOf(contract.address)).toNumber();

			await wallet.closeLine(2000000000, token.address, 100);

			const balanceAfter = (await token.balanceOf(contract.address)).toNumber();

			expect(balanceAfter - balanceBefore).to.equal(100);
		});
	});
	describe('withdraw', async () => {
		it('withdraws', async () => {
			hashedLine = ethers.utils.solidityKeccak256(['address', 'uint256', 'address'], [user1Addr, 2000000000, token.address]);

			await contract.connect(user1).openLine(2000000000, token.address, walletUserAddress, ethers.BigNumber.from(100));

			await token.connect(deployer).transfer(user1Addr, 100);
			await token.connect(user1).approve(contract.address, 100);

			await contract.connect(user1).closeLine(2000000000, token.address, 100);

			const balanceBefore = (await wallet.getBalance(hashedLine, walletUserAddress)).toNumber();
			await wallet.withdraw(hashedLine, token.address);
			const balanceAfter = (await wallet.getBalance(hashedLine, walletUserAddress)).toNumber();
		});
	});
});
