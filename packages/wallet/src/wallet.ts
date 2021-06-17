import { hashMessage } from '@ethersproject/hash';
import { BigNumber, ethers } from 'ethers';
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

export interface LogSent {
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
	pendingHistory = new Map<string, LogPending[]>();
	senderHistory = new Map<string, LogSent[]>();
	receiverHistory = new Map<string, LogReceived[]>();
	lines = new Map<string, Line[]>();

	contract: Defter;
	walletAddress: string;

	// NEW INSTANCE
	public static withProvider(contractAddress: string, walletAddress: string, provider: ethers.providers.Provider): Wallet {
		return new Wallet(contractAddress, walletAddress, provider);
	}

	public static async withSigner(contractAddress: string, signer: ethers.Signer): Promise<Wallet> {
		const walletAddress = await signer.getAddress();
		return new Wallet(contractAddress, walletAddress, signer);
	}

	public static calculateLineID(issuerAddress: string, maturityDate: number, unit: string): string {
		const lineID = ethers.utils.solidityKeccak256(['address', 'uint256', 'address'], [issuerAddress, maturityDate, unit]);
		return lineID;
	}

	private constructor(contractAddress: string, walletAddress: string, provider: ethers.Signer | ethers.providers.Provider) {
		this.contract = Defter__factory.connect(contractAddress, provider);
		this.walletAddress = walletAddress;
		this.initializer();
	}

	// MAIN FUNCTIONS
	async openLine(maturityDate: number, unit: string, receiver: string, amount: ethers.BigNumber): Promise<{ lineID: string; txHash: string }> {
		const lineID = Wallet.calculateLineID(this.walletAddress, maturityDate, unit);
		if (!this.lines.get(lineID)) {
			const line: Line = {
				lineID,
				issuer: this.walletAddress,
				maturityDate,
				unit,
				status: LineStatus.OPEN,
			};
			this.pushToLines(lineID, line);
		}
		const tx = await this.contract.openLine(maturityDate, unit, receiver, amount);
		this.pushToPendingHistory(lineID, { amount, receiver, txHash: tx.hash, txType: TxType.ISSUE, validated: false });
		return { lineID, txHash: tx.hash };
	}

	async transferLine(lineIDs: string[], amounts: ethers.BigNumber[], receiver: string) {
		const tx = await this.contract.transferLine(lineIDs, amounts, receiver);
		const size = lineIDs.length;
		for (let i = 0; i < size; i++) {
			const log = { date: new Date(), amount: amounts[i], receiver };
			this.pushToPendingHistory(lineIDs[i], { amount: amounts[i], receiver, txHash: tx.hash, txType: TxType.TRANSFER, validated: false });
		}
	}

	async closeLine(maturityDate: number, unit: string, totalAmount: number) {
		await this.contract.closeLine(maturityDate, unit, totalAmount);
	}

	async withdraw(lineID: string, unit: string) {
		await this.contract.withdraw(lineID, unit);
	}

	async getBalance(lineID: string, holder: string) {
		return await this.contract.getBalances(lineID, holder);
	}

	private eventFilterOpenLine(lineID: string | null = null, issuer: string | null = null) {
		return this.contract.filters.LineOpened(lineID, issuer, null, null);
	}

	private eventFilterTransferLine(lineID: string | null = null, sender: string | null = null, receiver: string | null = null) {
		return this.contract.filters.LineTransferred(lineID, sender, receiver, null);
	}

	private eventFilterCloseLine(lineID: string | null = null, issuer: string | null = null) {
		return this.contract.filters.LineClosed(lineID, issuer);
	}

	private eventFilterWithdrawn(lineID: string | null = null, receiver: string | null = null) {
		return this.contract.filters.Withdrawn(lineID, receiver, null);
	}

	private async initializer() {
		const transferEvents = await this.contract.queryFilter(this.eventFilterTransferLine());
		const openEvents = await this.contract.queryFilter(this.eventFilterOpenLine());

		if (transferEvents.length != 0) {
			for (let i = 0; i < transferEvents.length; i++) {
				const event = transferEvents[i];
				const lineID = event.args.lineID;
				const sender = event.args.sender;
				const receiver = event.args.receiver;
				const amount = event.args.amount;
				const txHash = event.transactionHash;
				const logIndex = event.logIndex;

				if (sender == this.walletAddress) {
					this.pushToSenderHistory(lineID, { date: new Date(), amount, receiver, txHash, logIndex });
				} else if (receiver == this.walletAddress) {
					this.pushToReceiverHistory(lineID, { date: new Date(), amount, sender, txHash, logIndex });
				}
			}
		}
		if (openEvents.length != 0) {
			for (let i = 0; i < openEvents.length; i++) {
				const event = openEvents[i];
				const lineID = event.args.lineID;
				const issuer = event.args.issuer;
				const unit = event.args.unit;
				const maturityDate = event.args.maturityDate.toNumber();

				// LineStatus neye gore open/closed???
				// closedLine lara bakip matchlenebilir?
				this.pushToLines(lineID, { lineID, issuer, maturityDate, unit, status: LineStatus.OPEN });
			}
		}
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
		const filter = this.eventFilterTransferLine(null, this.walletAddress);
		this.contract.on(filter, (lineID: string, sender: string, receiver: string, amount: ethers.BigNumber, event: ethers.Event) => {
			const history = this.pendingHistory.get(lineID);
			if (history) {
				for (let i = 0; i < history.length; i++) {
					if (history[i].txHash == event.transactionHash) {
						this.pushToSenderHistory(lineID, { date: new Date(), amount, receiver, txHash: event.transactionHash, logIndex: event.logIndex });
					}
				}
			}
		});
	}

	public listenTransferLineAsReceiver() {
		const filter = this.eventFilterTransferLine(null, null, this.walletAddress);
		this.contract.on(filter, async (lineID: string, sender: string, receiver: string, amount: ethers.BigNumber, event: ethers.Event) => {
			const history = this.pendingHistory.get(lineID);
			if (history) {
				for (let i = 0; i < history.length; i++) {
					if (history[i].txHash == event.transactionHash) {
						this.pushToReceiverHistory(lineID, { date: new Date(), amount, sender, txHash: event.transactionHash, logIndex: event.logIndex });
					}
				}
			}
		});
	}

	public listenOpenLineAsIssuer() {
		const filter = this.eventFilterTransferLine(null, this.walletAddress);
		this.contract.on(filter, async (lineID: string, sender: string, receiver: string, amount: ethers.BigNumber, event: ethers.Event) => {
			const history = this.pendingHistory.get(lineID);
			if (history) {
				for (let i = 0; i < history.length; i++) {
					if (history[i].txHash == event.transactionHash) {
						this.pushToSenderHistory(lineID, { date: new Date(), amount, receiver, txHash: event.transactionHash, logIndex: event.logIndex });
					}
				}
			}
		});
	}

	private pushToPendingHistory(lineID: string, data: LogPending) {
		let currentHistory: undefined | LogPending[] = this.pendingHistory.get(lineID);
		if (currentHistory) {
			currentHistory.push(data);
			this.pendingHistory.set(lineID, currentHistory);
		} else {
			let tempArray: LogPending[] = [];
			tempArray.push(data);
			this.pendingHistory.set(lineID, tempArray);
		}
	}

	private pushToSenderHistory(lineID: string, data: LogSent) {
		let currentHistory: undefined | LogSent[] = this.senderHistory.get(lineID);
		if (currentHistory) {
			currentHistory.push(data);
			this.senderHistory.set(lineID, currentHistory);
		} else {
			let tempArray: LogSent[] = [];
			tempArray.push(data);
			this.senderHistory.set(lineID, tempArray);
		}
	}

	private pushToReceiverHistory(lineID: string, data: LogReceived) {
		let currentHistory: undefined | LogReceived[] = this.receiverHistory.get(lineID);
		if (currentHistory) {
			currentHistory.push(data);
			this.receiverHistory.set(lineID, currentHistory);
		} else {
			let tempArray: LogReceived[] = [];
			tempArray.push(data);
			this.receiverHistory.set(lineID, tempArray);
		}
	}

	private pushToLines(lineID: string, data: Line) {
		let currentHistory: undefined | Line[] = this.lines.get(lineID);
		if (currentHistory) {
			currentHistory.push(data);
			this.lines.set(lineID, currentHistory);
		} else {
			let tempArray: Line[] = [];
			tempArray.push(data);
			this.lines.set(lineID, tempArray);
		}
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

	public removeAllListeners(event: any = undefined) {
		this.contract.removeAllListeners(event);
	}
}
