"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var chai_1 = require("chai");
var mocha_1 = require("mocha");
var ethers = require("ethers");
var wallet_1 = require("../wallet");
var Defter__factory_1 = require("../src/contracts/factories/Defter__factory");
var MTRToken__factory_1 = require("../src/contracts/factories/MTRToken__factory");
var defter;
var token;
var contract; // Defter yapinca 'contract' kiziyor
var provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");
var hashedLine;
// =============================
// Get Addresses...
var s0 = provider.getSigner(0);
var s1 = provider.getSigner(1);
var s2 = provider.getSigner(2);
var owner;
var addr1;
var addr2;
function getAddresses() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, s0.getAddress()];
                case 1:
                    owner = _a.sent();
                    return [4 /*yield*/, s1.getAddress()];
                case 2:
                    addr1 = _a.sent();
                    return [4 /*yield*/, s2.getAddress()];
                case 3:
                    addr2 = _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
getAddresses();
// =============================
var defterFactory = new ethers.ContractFactory(new ethers.utils.Interface(Defter__factory_1.Defter__factory.abi), Defter__factory_1.Defter__factory.bytecode, s0);
var tokenFactory = new ethers.ContractFactory(new ethers.utils.Interface(MTRToken__factory_1.MTRToken__factory.abi), MTRToken__factory_1.MTRToken__factory.bytecode, s0);
// console.log(defterFactory)
// console.log(Defter__factory) // cok benziyolar ama Defter__factory icinde deploy olmasina ragmen .deploy() edilmiyor
mocha_1.describe("Wallet", function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        mocha_1.beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, defterFactory.deploy()];
                    case 1:
                        contract = _a.sent();
                        return [4 /*yield*/, tokenFactory.deploy(100000)];
                    case 2:
                        token = _a.sent();
                        defter = new wallet_1.Wallet(contract.address, provider);
                        return [4 /*yield*/, defter.openLine(2000000000, token.address, [addr1, addr2], [20, 30])];
                    case 3:
                        _a.sent();
                        hashedLine = ethers.utils.solidityKeccak256(["bytes", "uint256", "address"], [owner, 2000000000, token.address]);
                        return [2 /*return*/];
                }
            });
        }); });
        mocha_1.describe("openLine", function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                mocha_1.it("opens line", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var balance;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, defter.getBalances(hashedLine, addr2)];
                            case 1:
                                balance = (_a.sent()).toNumber();
                                chai_1.expect(balance).to.equal(30);
                                return [2 /*return*/];
                        }
                    });
                }); });
                xit("turns on listener", function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                // filter kullanabiliyorum, veya direkt "LineOpened" yazabiliyorum wallet icinde/ hangisi??
                                // const filter = await defter.contract.filters.LineOpened(owner)
                                defter.openLineListenerOn(function () {
                                    console.log("cb working");
                                });
                                return [4 /*yield*/, defter.openLine(2000000000, token.address, [addr1], [50])
                                    // await defter.contract.removeAllListeners()
                                ];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                xit("turns off listener", function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        defter.removeAllListeners();
                        return [2 /*return*/];
                    });
                }); });
                mocha_1.it("gets all past events", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, defter.openedLines(0, 99999)];
                            case 1:
                                result = _a.sent();
                                chai_1.expect(result).to.not.be.empty;
                                return [2 /*return*/];
                        }
                    });
                }); });
                mocha_1.it("filters past events", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var filter, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, defter.openLine(2000000000, token.address, [addr2], [50], s1)];
                            case 1:
                                _a.sent();
                                filter = defter.openLineFilter(addr1);
                                return [4 /*yield*/, defter.openedLines(0, 99999, filter)];
                            case 2:
                                result = _a.sent();
                                chai_1.expect(result).to.not.be.empty;
                                return [2 /*return*/];
                        }
                    });
                }); });
                return [2 /*return*/];
            });
        }); });
        mocha_1.describe("transferLine", function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                mocha_1.it("transfers line", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var balance;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, defter.transferLine(hashedLine, [addr1], [30], s2)];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, defter.getBalances(hashedLine, addr1)];
                            case 2:
                                balance = (_a.sent()).toNumber();
                                chai_1.expect(balance).to.equal(50);
                                return [2 /*return*/];
                        }
                    });
                }); });
                mocha_1.it("gets past events", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, defter.transferLine(hashedLine, [addr1], [30], s2)];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, defter.transferredLines(0, 99999)];
                            case 2:
                                result = _a.sent();
                                chai_1.expect(result).to.not.be.empty;
                                return [2 /*return*/];
                        }
                    });
                }); });
                mocha_1.it("filters past events", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var filter, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, defter.transferLine(hashedLine, [addr1], [30], s2)];
                            case 1:
                                _a.sent();
                                filter = defter.transferLineFilter(addr2);
                                return [4 /*yield*/, defter.transferredLines(0, 99999, filter)];
                            case 2:
                                result = _a.sent();
                                chai_1.expect(result).to.not.be.empty;
                                return [2 /*return*/];
                        }
                    });
                }); });
                return [2 /*return*/];
            });
        }); });
        mocha_1.describe("closeLine", function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                mocha_1.it("closes line", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var balanceBefore, balanceAfter;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: 
                            // thousand years later, again :)
                            return [4 /*yield*/, token.approve(contract.address, 50)];
                            case 1:
                                // thousand years later, again :)
                                _a.sent();
                                return [4 /*yield*/, token.balanceOf(contract.address)];
                            case 2:
                                balanceBefore = (_a.sent()).toNumber();
                                return [4 /*yield*/, defter.closeLine(2000000000, token.address, 50)];
                            case 3:
                                _a.sent();
                                return [4 /*yield*/, token.balanceOf(contract.address)];
                            case 4:
                                balanceAfter = (_a.sent()).toNumber();
                                chai_1.expect(balanceAfter - balanceBefore).to.equal(50);
                                return [2 /*return*/];
                        }
                    });
                }); });
                mocha_1.it("gets past events", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, token.approve(contract.address, 50)];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, defter.closeLine(2000000000, token.address, 50)];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, defter.closedLines(0, 99999)];
                            case 3:
                                result = _a.sent();
                                chai_1.expect(result).to.not.be.empty;
                                return [2 /*return*/];
                        }
                    });
                }); });
                mocha_1.it("filters past events", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var filter, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, token.approve(contract.address, 50)];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, defter.closeLine(2000000000, token.address, 50)];
                            case 2:
                                _a.sent();
                                filter = defter.closeLineFilter(owner);
                                return [4 /*yield*/, defter.closedLines(0, 99999, filter)];
                            case 3:
                                result = _a.sent();
                                chai_1.expect(result).to.not.be.empty;
                                return [2 /*return*/];
                        }
                    });
                }); });
                return [2 /*return*/];
            });
        }); });
        mocha_1.describe("withdraw", function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                mocha_1.it("withdraws", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var balanceBefore, balanceAfter;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, token.approve(contract.address, 50)];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, defter.closeLine(2000000000, token.address, 50)];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, token.balanceOf(addr2)];
                            case 3:
                                balanceBefore = (_a.sent()).toNumber();
                                return [4 /*yield*/, defter.withdraw(hashedLine, token.address, s2)];
                            case 4:
                                _a.sent();
                                return [4 /*yield*/, token.balanceOf(addr2)];
                            case 5:
                                balanceAfter = (_a.sent()).toNumber();
                                chai_1.expect(balanceAfter - balanceBefore).to.equal(30);
                                return [2 /*return*/];
                        }
                    });
                }); });
                mocha_1.it("gets past events", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, token.approve(contract.address, 50)];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, defter.closeLine(2000000000, token.address, 50)];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, defter.withdraw(hashedLine, token.address, s2)];
                            case 3:
                                _a.sent();
                                return [4 /*yield*/, defter.withdrawns(0, 99999)];
                            case 4:
                                result = _a.sent();
                                chai_1.expect(result).to.not.be.empty;
                                return [2 /*return*/];
                        }
                    });
                }); });
                mocha_1.it("filters past events", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var filter, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, token.approve(contract.address, 50)];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, defter.closeLine(2000000000, token.address, 50)];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, defter.withdraw(hashedLine, token.address, s2)];
                            case 3:
                                _a.sent();
                                return [4 /*yield*/, defter.withdrawFilter(addr2)];
                            case 4:
                                filter = _a.sent();
                                return [4 /*yield*/, defter.withdrawns(0, 99999, filter)];
                            case 5:
                                result = _a.sent();
                                chai_1.expect(result).to.not.be.empty;
                                return [2 /*return*/];
                        }
                    });
                }); });
                return [2 /*return*/];
            });
        }); });
        return [2 /*return*/];
    });
}); });
