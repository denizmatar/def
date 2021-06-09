interface LogPending {
	name: string;
	age: number;
}

let pendingHistory = new Map<string, LogPending[]>(); // array olcak LogPending

let deniz: LogPending = { name: 'deniz', age: 23 };
let denizz: LogPending = { name: 'denizzzzz', age: 23 };

// pushToPendingHistory('1', denizz);
// console.log(pendingHistory.get('1'));

function pushToPendingHistory(lineID: string, data: LogPending) {
	let currentHistory: undefined | LogPending[] = pendingHistory.get(lineID);
	if (currentHistory) {
		currentHistory.push(data);
		pendingHistory.set(lineID, currentHistory);
	} else {
		let tempArray: LogPending[] = [];
		tempArray.push(data);
		pendingHistory.set(lineID, tempArray);
	}
}

pushToPendingHistory('1', deniz);
const hist = pendingHistory.get('1');
if (hist) {
	console.log('true');
} else {
	console.log('false');
}
// console.log(pendingHistory.get('1'));
