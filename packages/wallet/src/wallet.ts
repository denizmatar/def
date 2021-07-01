import { BigNumber, ethers } from 'ethers';
import { ERC1155Defter } from '../src/contracts/ERC1155Defter';
import { ERC1155Defter__factory } from '../src/contracts/factories/ERC1155Defter__factory';

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

	contract: ERC1155Defter;
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
		this.contract = ERC1155Defter__factory.connect(contractAddress, provider);
		this.walletAddress = walletAddress;
		this.initializer();
	}

	// MAIN FUNCTIONS
	async openLine(issuer: string, receiver: string, unit: string, amount: ethers.BigNumber, maturityDate: number, signature: string): Promise<{ lineID: string; txHash: string }> {
		const lineID = Wallet.calculateLineID(this.walletAddress, maturityDate, unit);

		const tx = await this.contract.mint(issuer, receiver, unit, amount, maturityDate, signature);

		this.pushToPendingHistory(lineID, { amount, receiver, txHash: tx.hash, txType: TxType.ISSUE, validated: false });
		return { lineID, txHash: tx.hash };
	}

	async transferLine(from: string, to: string, lineID: string, amount: ethers.BigNumber, signature: string) {
		const tx = await this.contract.safeTransferFrom(from, to, lineID, amount, signature);
		this.pushToPendingHistory(lineID, { amount, receiver: to, txHash: tx.hash, txType: TxType.TRANSFER, validated: false });
	}

	async transferLines(from: string, to: string, lineIDs: string[], amounts: ethers.BigNumber[], signature: string) {
		const tx = await this.contract.safeBatchTransferFrom(from, to, lineIDs, amounts, signature);
		const size = lineIDs.length;
		for (let i = 0; i < size; i++) {
			this.pushToPendingHistory(lineIDs[i], { amount: amounts[i], receiver: to, txHash: tx.hash, txType: TxType.TRANSFER, validated: false });
		}
	}

	async closeLine(from: string, unit: string, totalAmount: number, maturityDate: number, signature: string) {
		await this.contract.closeLine(from, unit, totalAmount, maturityDate, signature);
	}

	async withdraw(from: string, lineID: string, unit: string, signature: string) {
		await this.contract.withdraw(from, lineID, unit, signature);
	}

	async getBalance(lineID: string, holder: string) {
		return await this.contract.getBalances(lineID, holder);
	}

	private eventFilterOpenLine(lineID: string | null = null, issuer: string | null = null, to: string | null = null) {
		return this.contract.filters.LineOpened(lineID, issuer, to, null, null, null);
	}

	private eventFilterTransferLine(operator: string | null = null, from: string | null = null, to: string | null = null) {
		return this.contract.filters.TransferSingle(operator, from, to, null, null);
	}
	private eventFilterTransferLines(operator: string | null = null, from: string | null = null, to: string | null = null) {
		return this.contract.filters.TransferBatchThatWorks(operator, from, to, null, null);
	}

	private eventFilterCloseLine(lineID: string | null = null, issuer: string | null = null) {
		return this.contract.filters.LineClosed(lineID, issuer);
	}

	private eventFilterWithdrawn(lineID: string | null = null, receiver: string | null = null) {
		return this.contract.filters.Withdrawn(lineID, receiver, null);
	}

	private async initializer() {
		const openEvents = await this.contract.queryFilter(this.eventFilterOpenLine());
		const transferSingleEvents = await this.contract.queryFilter(this.eventFilterTransferLine());
		const transferBatchEvents = await this.contract.queryFilter(this.eventFilterTransferLines());

		if (transferSingleEvents.length != 0) {
			for (let i = 0; i < transferSingleEvents.length; i++) {
				const event = transferSingleEvents[i];
				const sender = event.args.from;
				const receiver = event.args.to;
				const lineID = event.args.id.toHexString();
				const amount = event.args.value;
				const txHash = event.transactionHash;
				const logIndex = event.logIndex;

				if (sender == this.walletAddress) {
					this.pushToSenderHistory(lineID, { date: new Date(), amount, receiver, txHash, logIndex });
				} else if (receiver == this.walletAddress) {
					this.pushToReceiverHistory(lineID, { date: new Date(), amount, sender, txHash, logIndex });
				}
			}
		}

		if (transferBatchEvents.length != 0) {
			for (let i = 0; i < transferBatchEvents.length; i++) {
				const event = transferBatchEvents[i];

				const sender = event.args.from;
				const receiver = event.args.to;
				const lineIDs = event.args.ids;
				const amounts = event.args.amounts;
				const txHash = event.transactionHash;
				const logIndex = event.logIndex;

				for (let i = 0; i < lineIDs.length; i++) {
					const lineID = lineIDs[i].toHexString();
					const amount = amounts[i];
					if (sender == this.walletAddress) {
						this.pushToSenderHistory(lineID, { date: new Date(), amount, receiver, txHash, logIndex });
					} else if (receiver == this.walletAddress) {
						this.pushToReceiverHistory(lineID, { date: new Date(), amount, sender, txHash, logIndex });
					}
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

				// #TODO: LineStatus neye gore open/closed???
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

	// #TODO: add listenTransferLineAsSender & listenTransferLineAsReceiver

	public listenTransferLinesAsSender() {
		const filter = this.eventFilterTransferLines(null, this.walletAddress);
		this.contract.on(filter, async (operator: string, from: string, receiver: string, ids: ethers.BigNumber[], values: ethers.BigNumber[], event: ethers.Event) => {
			const _operator = operator;
			const _from = from;
			const _to = receiver;
			const _ids = ids;
			const _values = values;
			const _txHash = event.transactionHash;
			const _logIndex = event.logIndex;

			for (let i = 0; i < _ids.length; i++) {
				const id = _ids[i].toHexString();
				const value = values[i];

				const history = this.pendingHistory.get(id);

				if (history) {
					for (let item of history) {
						if (item.amount.eq(value) && item.receiver == _to && item.txHash == _txHash) {
							this.pushToSenderHistory(id, { date: new Date(), amount: value, receiver: _to, txHash: _txHash, logIndex: _logIndex });
							item.validated = true;
						}
					}
				} else {
					this.pushToSenderHistory(id, { date: new Date(), amount: value, receiver: _to, txHash: event.transactionHash, logIndex: event.logIndex });
				}
			}
		});
	}

	public listenTransferLinesAsReceiver() {
		const filter = this.eventFilterTransferLines(null, null, this.walletAddress);
		this.contract.on(filter, async (operator: string, from: string, to: string, ids: ethers.BigNumber[], values: ethers.BigNumber[], event: ethers.Event) => {
			const _operator = operator;
			const _from = from;
			const _to = to;
			const txHash = event.transactionHash;
			const logIndex = event.logIndex;

			for (let i = 0; i < ids.length; i++) {
				const id = ids[i].toHexString();
				const value = values[i];
				const history = this.pendingHistory.get(id);

				if (history) {
					for (let item of history) {
						if (item.amount.eq(value) && item.receiver == _to && item.txHash == txHash) {
							this.pushToReceiverHistory(id, { date: new Date(), amount: value, sender: _from, txHash: txHash, logIndex: logIndex });
							item.validated = true;
						}
					}
				} else {
					this.pushToReceiverHistory(id, { date: new Date(), amount: value, sender: _from, txHash: txHash, logIndex: logIndex });
				}
			}
		});
	}

	public listenOpenLineAsIssuer() {
		const filter = this.eventFilterOpenLine(null, this.walletAddress);
		this.contract.on(filter, async (lineID: string, issuer: string, to: string, unit: string, amount: number, maturityDate: ethers.BigNumber, event: ethers.Event) => {
			const _lineID = lineID;
			const _issuer = issuer;
			const _to = to;
			const _unit = unit;
			const _amount = ethers.BigNumber.from(amount);
			const _maturityDate = maturityDate.toNumber();
			const history = this.pendingHistory.get(lineID);

			if (history) {
				for (let item of history) {
					if (item.txHash == event.transactionHash) {
						const line: Line = {
							lineID: _lineID,
							issuer: _issuer,
							maturityDate: _maturityDate,
							unit: _unit,
							status: LineStatus.OPEN,
						};
						this.pushToLines(lineID, line);
						this.pushToSenderHistory(lineID, { date: new Date(), amount: _amount, receiver: _to, txHash: event.transactionHash, logIndex: event.logIndex });
						item.validated = true;
					}
				}
			} else {
				this.pushToSenderHistory(lineID, { date: new Date(), amount: _amount, receiver: _to, txHash: event.transactionHash, logIndex: event.logIndex });
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
