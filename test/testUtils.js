import { Blockchain } from "../src/Blockchain.js"
import { Block } from "../src/Block.js";
import { Transaction, TXTYPE, TransactionMaker } from "../src/Transaction.js"
import { buildInvestIndexes, buildMoneyIndexes } from "../src/crypto.js"
import { dateToInt } from '../src/crypto.js';

export const privateKey1 = 'ed945716dddb7af2c9774939e9946f1fee31f5ec0a3c6ec96059f119c396912f'
export const publicKey1 = '02c85e4e448d67a8dc724c620f3fe7d2a3a3cce9fe905b918f712396b4f8effcb3'
export const privateKey2 = 'e68955130b2c4adc6165b0bae6e6b8f4bcce1879dbf0c6f91b3acc69479ef272'
export const publicKey2 = '03cbe4edbfbbc99dfbae83e8c591fafdd6a82d61589be6f60775e3fe2a4677ef46'
export const privateKey3 = 'f8a33b8aa0cbf892f1c9e617126711f7304d6e5cead1d592a8b4288c0985b3c5'
export const publicKey3 = '02f126a536777e95f23b5798b1e357dc2a4f5b1869b739c290b4b2efbc18eca6fd'

export function makeTransactionObj(options = {}) {
    return makeTransaction(options).export()
}

export function makeTransaction(options = {}) {

    const date = "date" in options ? options.date : new Date()
    const tx = TransactionMaker.make({
        v: "version" in options ? options.version : 1,
        d: dateToInt(date),
        p: "target" in options ? options.target : publicKey1,
        s: "signer" in options ? options.signer : publicKey1,
        m: "money" in options ? options.money : [],
        i: "invests" in options ? options.invests : [],
        t: "type" in options ? options.type : TXTYPE.CREATE,
        h: "signature" in options ? options.signature : 'notsetyet'
    })
    if (options.moneycount) {
        tx.money = buildMoneyIndexes(date, options.moneycount || 0)
    }
    if (options.investscount) {
        tx.invests = buildInvestIndexes(date, options.investscount || 0)
    }
    if (tx.signature === 'notsetyet') {
        tx.sign(options.sk || privateKey1)
    } 
    return tx
}

export function makeTransactions(count, options = {}) {
    const result = []
    for (let i = 0; i < count; i++) {
        if (options.incrementMoney) {
            options.moneycount = i
        }
        result.push(makeTransaction(options))
    }
    return result
}

export function makeBlockObj(options = {}) {
    return makeBlock(options).export()
}

export function makeBlock(options = {}) {
    const date = "date" in options ? options.date : new Date()
    const transactions = "transactions" in options ? options.transactions : []

    const block = new Block({
        v: "version" in options ? options.version : 1,
        d: dateToInt(date),
        p: "previousHash" in options ? options.previousHash : "",
        s: "signer" in options ? options.signer : publicKey1,
        r: "root" in options ? options.root : 'randomMerkleroot',
        m: "money" in options ? options.money : [],
        i: "invests" in options ? options.invests : [],
        t: "total" in options ? options.total : 0,
        h: "signature" in options ? options.signature : "",
        x: transactions.map(x => x.export())
    })
    if (options.moneycount) {
        block.money = buildMoneyIndexes(date, options.moneycount || 0)
    }
    if (options.investscount) {
        block.invests = buildInvestIndexes(date, options.investscount || 0)
    }
    if (options.signed) {
        block.sign(options.signer || privateKey1)
    }
    return block
}