import { Blockchain } from "../src/Blockchain.js"
import { Block } from "../src/Block.js";
import { Transaction } from "../src/Transaction.js"
import { buildInvestIndexes, buildMoneyIndexes } from "../src/crypto.js"
import { dateToInt } from '../src/crypto.js';

export const privateKey1 = 'ed945716dddb7af2c9774939e9946f1fee31f5ec0a3c6ec96059f119c396912f'
export const publicKey1 = '02c85e4e448d67a8dc724c620f3fe7d2a3a3cce9fe905b918f712396b4f8effcb3'
export const privateKey2 = 'e68955130b2c4adc6165b0bae6e6b8f4bcce1879dbf0c6f91b3acc69479ef272'
export const publicKey2 = '03cbe4edbfbbc99dfbae83e8c591fafdd6a82d61589be6f60775e3fe2a4677ef46'
export const privateKey3 = 'f8a33b8aa0cbf892f1c9e617126711f7304d6e5cead1d592a8b4288c0985b3c5'
export const publicKey3 = '02f126a536777e95f23b5798b1e357dc2a4f5b1869b739c290b4b2efbc18eca6fd'

export function makeTransactionObj(options = {}) {
    const date = options.date || new Date()
    const tx = new Transaction({
        v: options.version || 1,
        d: dateToInt(date),
        p: options.target || publicKey1,
        s: options.signer || publicKey1,
        m: options.money || buildMoneyIndexes(date, options.moneycount || 0),
        i: options.invests || buildInvestIndexes(date, options.investscount || 0),
        t: options.type || Blockchain.TXTYPE.CREATE,
        h: options.signature || null
    })    
    tx.sign(options.signer || privateKey1)
    return tx.export()
}

export function makeTransaction(options = {}) {
    return new Transaction(makeTransactionObj(options))
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
    const date = options.date || new Date()
    const transactions = options.transactions || []

    const block = new Block({
        v: options.version || 1,
        d: dateToInt(date),
        p: options.previousHash || Blockchain.REF_HASH,
        s: options.signer || publicKey1,
        r: options.root || 'randomMerkleroot',
        m: options.money || [],
        i: options.invests || [],
        t: options.total || 0,
        h: options.signature || null,
        x: transactions.map(x => x.export())
    })
    if (options.signed) {
        block.sign(options.signer || privateKey1)
    }
    return block.export()
}

export function makeBlock(options = {}) {
    return new Block(makeBlockObj(options))
}