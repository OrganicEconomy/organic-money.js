import { Blockchain } from "../src/Blockchain.js"
import { Transaction } from "../src/Transaction.js"
import { buildInvestIndexes, buildMoneyIndexes } from "../src/crypto.js"
import { dateToInt } from '../src/crypto.js';

export const privateKey1 = 'ed945716dddb7af2c9774939e9946f1fee31f5ec0a3c6ec96059f119c396912f'
export const publicKey1 = '02c85e4e448d67a8dc724c620f3fe7d2a3a3cce9fe905b918f712396b4f8effcb3'
export const privateKey2 = 'e68955130b2c4adc6165b0bae6e6b8f4bcce1879dbf0c6f91b3acc69479ef272'
export const publicKey2 = '03cbe4edbfbbc99dfbae83e8c591fafdd6a82d61589be6f60775e3fe2a4677ef46'
export const privateKey3 = 'f8a33b8aa0cbf892f1c9e617126711f7304d6e5cead1d592a8b4288c0985b3c5'
export const publicKey3 = '02f126a536777e95f23b5798b1e357dc2a4f5b1869b739c290b4b2efbc18eca6fd'

export function makeTransactionObj(date=new Date(), moneycount=0, type=Blockchain.TXTYPE.CREATE) {
    const tx = new Transaction({
        v: 1,
        d: dateToInt(date),
        p: publicKey1,
        s: publicKey1,
        m: buildMoneyIndexes(date, moneycount),
        i: buildInvestIndexes(date, moneycount),
        t: type,
        h: null
    })
    tx.sign(privateKey1)
    return tx.export()
}

export function makeBlockObj(date=new Date(), moneycount=0, txcount=0, total=0, signed = false, previousHash=0) {
    const txList = []
    for (let i = 0; i < txcount; i++) {
        if (i === 0) {
            txList.push(makeTransactionObj(date, moneycount, Blockchain.TXTYPE.CREATE))
        } else {
            txList.push(makeTransactionObj(date, 1, Blockchain.TXTYPE.PAY))
        }
    }
    return {
        v: 1,
        d: dateToInt(date),
        p: previousHash || Blockchain.REF_HASH,
        s: publicKey1,
        r: 'randomMerkleroot',
        m: buildMoneyIndexes(date, moneycount),
        i: buildInvestIndexes(date, moneycount),
        t: total,
        h: null,
        x: txList
    }
}