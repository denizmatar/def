import { hashMessage } from '@ethersproject/hash';
import { BigNumber, ethers } from 'ethers';
import { isAnyArrayBuffer } from 'util/types';
import { Defter } from '../src/contracts/Defter';
import { Defter__factory } from '../src/contracts/factories/Defter__factory';

export enum LineStatus {
	OPEN,
	CLOSED,
}

export enum TxType {
	ISSUE,
	TRANSFER,
}

export interface Line {
	lineID: string;
	issuer: string;
	maturityDate: number;
	unit: string;
	status: LineStatus;
}

export interface LogSend {
	date: Date;
	amount: ethers.BigNumber;
	receiver: string;
	txHash: string;
	logIndex: number;
}

export interface LogPending {
	amount: ethers.BigNumber;
	receiver: string;
	txHash: string;
	validated: boolean;
	txType: TxType;
}

export interface LogReceived {
	date: Date;
	amount: ethers.BigNumber;
	sender: string;
	txHash: string;
	logIndex: number;
}

export class Wallet {
	pendingHistory: { [lineID: string]: Array<LogPending> } = {};
	senderHistory: { [lineID: string]: Array<LogSend> } = {};
	receiverHistory: { [lineID: string]: Array<LogReceived> } = {};

	lines: { [lineID: string]: Line } = {};

	contract: Defter;
	walletAddress: string;

	public static withProvider(contractAddress: string, walletAddress: string, provider: ethers.providers.Provider): Wallet {
		return new Wallet(contractAddress, walletAddress, provider);
	}

	public static async withSigner(contractAddress: string, signer: ethers.Signer): Promise<Wallet> {
		const walletAddress = await signer.getAddress();
		return new Wallet(contractAddress, walletAddress, signer);
	}

	private constructor(contractAddress: string, walletAddress: string, provider: ethers.Signer | ethers.providers.Provider) {
		this.contract = Defter__factory.connect(contractAddress, provider);
		this.walletAddress = walletAddress;
	}

	public static calculateLineID(issuerAddress: string, maturityDate: number, unit: string): string {
		const lineID = ethers.utils.solidityKeccak256(['address', 'uint256', 'address'], [issuerAddress, maturityDate, unit]);
		return lineID;
	}

	async getBalance(lineID: string, holder: string) {
		return await this.contract.getBalances(lineID, holder);
	}

	async openLine(maturityDate: number, unit: string, receiver: string, amount: ethers.BigNumber): Promise<{ lineID: string; txHash: string }> {
		const lineID = Wallet.calculateLineID(this.walletAddress, maturityDate, unit);
		if (!this.lines[lineID]) {
			const line: Line = {
				lineID,
				issuer: this.walletAddress,
				maturityDate,
				unit,
				status: LineStatus.OPEN,
			};
			this.lines[lineID] = line;
		}
		const tx = await this.contract.openLine(maturityDate, unit, receiver, amount);
		this.pendingHistory[lineID].push({ amount, receiver, txHash: tx.hash, txType: TxType.TRANSFER, validated: false });
		return { lineID, txHash: tx.hash };
	}

	async transferLine(lineIDs: string[], amounts: ethers.BigNumber[], receiver: string) {
		const tx = await this.contract.transferLine(lineIDs, amounts, receiver);
		const size = lineIDs.length;
		for (let i = 0; i < size; i++) {
			const log = { date: new Date(), amount: amounts[i], receiver };
			this.pendingHistory[lineIDs[i]].push({ amount: amounts[i], receiver, txHash: tx.hash, txType: TxType.TRANSFER, validated: false });
		}
	}

	async closeLine(maturityDate: number, unit: string, totalAmount: number) {
		await this.contract.closeLine(maturityDate, unit, totalAmount);
	}

	async withdraw(lineID: string, unit: string) {
		await this.contract.withdraw(lineID, unit);
	}

	async getLine(lineID: string): Promise<Line | null> {
		const events = await this.contract.queryFilter(this.eventFilterOpenLine(lineID));
		if (events.length == 0) return null;
		const event = events[0];
		const issuer = event.args.issuer;
		const unit = event.args.unit;
		const maturityDate = event.args.maturityDate.toNumber();
		return {
			lineID,
			issuer,
			unit,
			maturityDate,
			status: LineStatus.OPEN,
		};
	}

	public listenTransferLineAsSender() {
		const filter = this.eventFilterTransferAsSender();
		this.contract.on(filter, (lineID: string, sender: string, receiver: string, amount: ethers.BigNumber, event: ethers.Event) => {
			this.senderHistory[lineID].push({ date: new Date(), amount, receiver, txHash: event.transactionHash, logIndex: event.logIndex });
			for (let h of this.pendingHistory[lineID]) if ((h.txHash = event.transactionHash)) h.validated = true;
		});
	}

	public listenTransferLineAsReceiver() {
		const filter = this.eventFilterTransferLineAsReceiver();
		this.contract.on(filter, async (lineID: string, sender: string, receiver: string, amount: ethers.BigNumber, event: ethers.Event) => {
			this.receiverHistory[lineID].push({ date: new Date(), amount, sender, txHash: event.transactionHash, logIndex: event.logIndex });
			for (let h of this.pendingHistory[lineID]) if ((h.txHash = event.transactionHash)) h.validated = true;
		});
	}

	// public listenOpenLineAsIssuer() {
	// 	const filter = this.contract.filters.LineOpened(null, this.walletAddress, null);
	// 	this.contract.on(filter, (lineID: string, issuer: string, unit: string, maturityDate: ethers.BigNumber, event: ethers.Event) => {});
	// }

	private eventFilterTransferLineAsReceiver(lineID: string | null = null) {
		return this.contract.filters.LineTransferred(lineID, null, this.walletAddress, null);
	}

	private eventFilterTransferAsSender() {
		return this.contract.filters.LineTransferred(null, this.walletAddress, null, null);
	}

	private eventFilterOpenLine(lineID: string) {
		return this.contract.filters.LineOpened(lineID);
	}

	private openLineListenerOff() {
		this.removeAllListeners('LineOpened');
	}

	private transferLineListenerOff() {
		this.removeAllListeners('LineTransferred');
	}

	private closeLineListenerOff() {
		this.removeAllListeners('LineClosed');
	}

	private withdrawListenerOff() {
		this.removeAllListeners('Withdrawn');
	}

	removeAllListeners(event: any = undefined) {
		this.contract.removeAllListeners(event);
	}
}
