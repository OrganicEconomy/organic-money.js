import { describe, it } from 'mocha';
import { assert } from 'chai';

import { CreateTransaction, EngageTransaction, InitTransaction, PaperTransaction, PayTransaction, SetActorTransaction, SetAdminTransaction, SetPayerTransaction, UnsetAdminTransaction, UnsetActorTransaction, UnsetPayerTransaction, Transaction, TransactionMaker, TXTYPE } from '../src/Transaction.js';
import { makeTransactionObj, makeTransaction, mySk, myPk, referentPk, targetPk, targetSk } from './testUtils.js';
import { bytesToHex } from 'ethereum-cryptography/utils.js';
import { buildMoneyIndexes } from '../src/crypto.js';
import { Blockchain } from '../src/Blockchain.js';

describe('Transaction', () => {
    describe('constructor', () => {
        it('Should set the 8 fields from given object', () => {
            const d = new Date('2025-11-26')
            const obj = makeTransactionObj({
                version: 1,
                date: d,
                target: 'target',
                signer: myPk,
                money: [20251226000, 20251226001],
                invests: [202512269000, 202512269001],
                type: TXTYPE.CREATE,
                signature: 'signature'
            })

            const tx = new Transaction(obj)

            assert.equal(tx.version, 1)
            assert.equal(tx.date.getDate(), d.getDate())
            assert.equal(tx.signer, myPk)
            assert.equal(tx.target, 'target')
            assert.equal(tx.type, TXTYPE.CREATE)
            assert.equal(tx.signature, 'signature')
            assert.deepEqual(tx.money, [20251226000, 20251226001])
            assert.deepEqual(tx.invests, [202512269000, 202512269001])
        })

        it('Should throw error if "v" (version) is missing', () => {
            const obj = makeTransactionObj()
            delete obj.v

            assert.throws(() => { 
                const tx = new Transaction(obj)
            }, Error, 'Fields "v" (Version), "d" (date), "s" (signer), "p" (target), "m" (money), "i" (invests), "t" (type) and "h" (signature) are mandatory.')
        })

        it('Should throw error if "d" (date) is missing', () => {
            const obj = makeTransactionObj()
            delete obj.d

            assert.throws(() => { 
                const tx = new Transaction(obj)
            }, Error, 'Fields "v" (Version), "d" (date), "s" (signer), "p" (target), "m" (money), "i" (invests), "t" (type) and "h" (signature) are mandatory.')
        })

        it('Should throw error if "s" (signer) is missing', () => {
            const obj = makeTransactionObj()
            delete obj.s

            assert.throws(() => { 
                const tx = new Transaction(obj)
            }, Error, 'Fields "v" (Version), "d" (date), "s" (signer), "p" (target), "m" (money), "i" (invests), "t" (type) and "h" (signature) are mandatory.')
        })

        it('Should throw error if "p" (target) is missing', () => {
            const obj = makeTransactionObj()
            delete obj.p

            assert.throws(() => { 
                const tx = new Transaction(obj)
            }, Error, 'Fields "v" (Version), "d" (date), "s" (signer), "p" (target), "m" (money), "i" (invests), "t" (type) and "h" (signature) are mandatory.')
        })

        it('Should throw error if "m" (money) is missing', () => {
            const obj = makeTransactionObj()
            delete obj.m

            assert.throws(() => { 
                const tx = new Transaction(obj)
            }, Error, 'Fields "v" (Version), "d" (date), "s" (signer), "p" (target), "m" (money), "i" (invests), "t" (type) and "h" (signature) are mandatory.')
        })

        it('Should throw error if "i" (invests) is missing', () => {
            const obj = makeTransactionObj()
            delete obj.i

            assert.throws(() => { 
                const tx = new Transaction(obj)
            }, Error, 'Fields "v" (Version), "d" (date), "s" (signer), "p" (target), "m" (money), "i" (invests), "t" (type) and "h" (signature) are mandatory.')
        })

        it('Should throw error if "t" (type) is missing', () => {
            const obj = makeTransactionObj()
            delete obj.t

            assert.throws(() => { 
                const tx = new Transaction(obj)
            }, Error, 'Fields "v" (Version), "d" (date), "s" (signer), "p" (target), "m" (money), "i" (invests), "t" (type) and "h" (signature) are mandatory.')
        })

        it('Should throw error if "h" (signature) is missing', () => {
            const obj = makeTransactionObj()
            delete obj.h

            assert.throws(() => { 
                const tx = new Transaction(obj)
            }, Error, 'Fields "v" (Version), "d" (date), "s" (signer), "p" (target), "m" (money), "i" (invests), "t" (type) and "h" (signature) are mandatory.')
        })
    })

    describe('hash', () => {
        it('Should make valid hash of the transaction', () => {
            const tx = new Transaction(makeTransactionObj({
                date: new Date('2026-01-21'),
                money: [],
                invests: [],
                target: myPk
            }))

            const expected = '14d5e8a5ad59438ca29821dd66debce748bdcb20cc87f90aa27452665c222315'

            const result = bytesToHex(tx.hash())

            assert.equal(result, expected)
        })

        it('Should ignore existing hash.', () => {
            const tx = new Transaction(makeTransactionObj({
                date: new Date('2026-01-21'),
                money: [],
                invests: [],
                target: myPk,
                signature: "titi"
            }))

            const expected = '14d5e8a5ad59438ca29821dd66debce748bdcb20cc87f90aa27452665c222315'

            const result = bytesToHex(tx.hash())

            assert.equal(result, expected)
        })
    })

    describe('sign', () => {
        it('Should sign the transaction if all is ok.', () => {
            const tx = new Transaction(makeTransactionObj({
                date: new Date('2025-11-16'),
                money: [],
                invests: [],
                target: myPk
            }))

            const expected = '304402206e50340d0355c34d9cdba44c9ec2101dabc880f816b19e2603f8538a6ce8da3502201477c0e02b233600fab3564cf9004b09542641bc5f46d14dc6490bec9ffbe666'

            const result = tx.sign(mySk)            

            assert.equal(result, expected)
        })
    })

    describe('export', () => {
        it('Should return the bare transaction as it was first.', () => {
            const bareTx = {
                v: 1,
                d: 20251226,
                p: 'target',
                s: 'signer',
                m: [20251226000, 20251226001],
                i: [202512269000, 202512269001],
                t: 'type',
                h: 'signature'
            }
            const tx = new Transaction(bareTx)

            const result = tx.export()            

            assert.deepEqual(result, bareTx)
        })
    })

    describe('isValid', () => {
        it('Should return false for invalid signature.', () => {
            const tx = new Transaction(makeTransactionObj({
                type: TXTYPE.INIT,
                signature: 'anything but ok'
            }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if there is no signer.', () => {
            const tx = new Transaction(makeTransactionObj({ type: TXTYPE.INIT }))
            delete tx.signer

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if signer is invalid.', () => {
            const tx = new Transaction(makeTransactionObj({ type: TXTYPE.INIT, signer: 'lapin' }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if date is invalid.', () => {
            const tx = new Transaction(makeTransactionObj({ type: TXTYPE.INIT }))
            tx.date = 'lapin'

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if date is future.', () => {
            const tx = new Transaction(makeTransactionObj({ type: TXTYPE.INIT, date: new Date('2200-12-25')}))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if money is NOT an array.', () => {
            const tx = new Transaction(makeTransactionObj({ type: TXTYPE.INIT, money: 12 }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if invests is NOT an array.', () => {
            const tx = new Transaction(makeTransactionObj({ type: TXTYPE.INIT, invests: 12 }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return true if all is fine.', () => {
            const tx = new Transaction(makeTransactionObj())

            const result = tx.isValid()

            assert.isTrue(result)
        })
    })
})

describe('TransactionMaker', () => {
    describe('make', () => {
        it('Should throw error for invalid transacrion type.', () => {
            assert.throws(() => { 
                TransactionMaker.make(makeTransactionObj({ type: -12 }))
            }, Error, 'Invalid transaction type -12. Allowed are {"INIT":1,"CREATE":2,"PAY":3,"ENGAGE":4,"PAPER":5,"SETADMIN":6,"SETACTOR":7,"SETPAYER":8,"UNSETADMIN":9,"UNSETACTOR":10,"UNSETPAYER":11,"PAYERORDER":12,"ORDER":13,"EARN":14}')
        })

        it('Should return a CreateTransaction for TXTYPE.CREATE.', () => {
            const tx = TransactionMaker.make(makeTransactionObj({ type: TXTYPE.CREATE }))

            assert.isTrue(tx instanceof CreateTransaction)
        })

        it('Should return a InitTransaction for TXTYPE.INIT.', () => {
            const tx = TransactionMaker.make(makeTransactionObj({ type: TXTYPE.INIT }))

            assert.isTrue(tx instanceof InitTransaction)
        })

        it('Should return a PayTransaction for TXTYPE.PAY.', () => {
            const tx = TransactionMaker.make(makeTransactionObj({ type: TXTYPE.PAY }))

            assert.isTrue(tx instanceof PayTransaction)
        })

        it('Should return a EngageTransaction for TXTYPE.ENGAGE.', () => {
            const tx = TransactionMaker.make(makeTransactionObj({ type: TXTYPE.ENGAGE }))

            assert.isTrue(tx instanceof EngageTransaction)
        })

        it('Should return a PaperTransaction for TXTYPE.PAPER.', () => {
            const tx = TransactionMaker.make(makeTransactionObj({ type: TXTYPE.PAPER }))

            assert.isTrue(tx instanceof PaperTransaction)
        })

        it('Should return a SetAdminTransaction for TXTYPE.SETADMIN.', () => {
            const tx = TransactionMaker.make(makeTransactionObj({ type: TXTYPE.SETADMIN }))

            assert.isTrue(tx instanceof SetAdminTransaction)
        })

        it('Should return a SetActorTransaction for TXTYPE.SETACTOR.', () => {
            const tx = TransactionMaker.make(makeTransactionObj({ type: TXTYPE.SETACTOR }))

            assert.isTrue(tx instanceof SetActorTransaction)
        })

        it('Should return a SetPayerTransaction for TXTYPE.SETPAYER.', () => {
            const tx = TransactionMaker.make(makeTransactionObj({ type: TXTYPE.SETPAYER }))

            assert.isTrue(tx instanceof SetPayerTransaction)
        })

        it('Should return a UnsetAdminTransaction for TXTYPE.UNSETADMIN.', () => {
            const tx = TransactionMaker.make(makeTransactionObj({ type: TXTYPE.UNSETADMIN }))

            assert.isTrue(tx instanceof UnsetAdminTransaction)
        })

        it('Should return a UnsetActorTransaction for TXTYPE.UNSETACTOR.', () => {
            const tx = TransactionMaker.make(makeTransactionObj({ type: TXTYPE.UNSETACTOR }))

            assert.isTrue(tx instanceof UnsetActorTransaction)
        })

        it('Should return a UnsetPayerTransaction for TXTYPE.UNSETPAYER.', () => {
            const tx = TransactionMaker.make(makeTransactionObj({ type: TXTYPE.UNSETPAYER }))

            assert.isTrue(tx instanceof UnsetPayerTransaction)
        })
    })
})

describe('InitTransaction', () => {
    describe('toString', () => {
        it('Should return [InitTransaction]', () => {
            const tx = makeTransaction({
                type: TXTYPE.INIT
            })

            assert.equal(tx.toString(), "[InitTransaction]")
        })
    })

    describe('isValid', () => {

        it('Should return false if money is NOT an empty array.', () => {
            const tx = new InitTransaction(makeTransactionObj({ type: TXTYPE.INIT, money: ['A']}))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if invests is NOT an empty array.', () => {
            const tx = new InitTransaction(makeTransactionObj({ type: TXTYPE.INIT, invests: ['A']}))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if type is NOT TXTYPE.INIT.', () => {
            const tx = new InitTransaction(makeTransactionObj({ type: TXTYPE.CREATE }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if target is empty.', () => {
            const tx = new InitTransaction(makeTransactionObj({ type: TXTYPE.INIT }))
            delete tx.target

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return true if all is fine.', () => {
            const tx = new InitTransaction(makeTransactionObj({ type: TXTYPE.INIT }))

            const result = tx.isValid()

            assert.isTrue(result)
        })
    })
})

describe('CreateTransaction', () => {
    
    describe('constructor', () => {
        it('Should accept an object as unique parameter.', () => {
            const tx = makeTransaction({
                type: TXTYPE.CREATE,
                date: new Date("2026-01-26"),
                moneycount: 1,
                investscount: 3,
                signer: referentPk,
                target: targetPk,
                version: 12
            })

            assert.equal(tx.type, TXTYPE.CREATE)
            assert.equal(tx.date.getTime(), new Date("2026-01-26").getTime())
            assert.equal(tx.money.length, 1)
            assert.equal(tx.invests.length, 3)
            assert.equal(tx.signer, referentPk)
            assert.equal(tx.target, targetPk)
            assert.equal(tx.version, 12)
        })

        it('Should accept 2 parameters : signer sk and level.', () => {
            const tx = new CreateTransaction(targetSk, 3)

            assert.equal(tx.type, TXTYPE.CREATE)
            assert.equal(tx.money.length, 3)
            assert.equal(tx.invests.length, 3)
            assert.equal(tx.date.getDate(), new Date().getDate())
            assert.equal(tx.signer, targetPk)
            assert.equal(tx.target, "")
            assert.equal(tx.version, Blockchain.VERSION)
            assert.isTrue(tx.isValid())
        })

        it('Should accept 3 parameters : signer sk, level and date.', () => {
            const tx = new CreateTransaction(targetSk, 3, new Date("2026-01-12"))

            assert.equal(tx.type, TXTYPE.CREATE)
            assert.equal(tx.money.length, 3)
            assert.equal(tx.invests.length, 3)
            assert.equal(tx.date.getTime(), new Date("2026-01-12").getTime())
            assert.equal(tx.signer, targetPk)
            assert.equal(tx.target, "")
            assert.equal(tx.version, Blockchain.VERSION)
            assert.isTrue(tx.isValid())
        })
    })

    describe('toString', () => {
        it('Should return [CreateTransaction]', () => {
            const tx = makeTransaction({
                type: TXTYPE.CREATE
            })

            assert.equal(tx.toString(), "[CreateTransaction]")
        })
    })
    
    describe('isValid', () => {

        it('Should return false if money is an empty array.', () => {
            const tx = new CreateTransaction(makeTransactionObj({
                type: TXTYPE.CREATE,
                target: "",
                moneycount: 0,
                investscount: 1
            }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if invests is an empty array.', () => {
            const tx = new CreateTransaction(makeTransactionObj({
                type: TXTYPE.CREATE,
                target: "",
                moneycount: 1,
                investscount: 0
            }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if type is NOT TXTYPE.CREATE.', () => {
            const tx = new CreateTransaction(makeTransactionObj({
                type: TXTYPE.INIT,
                target: "",
                moneycount: 1,
                investscount: 1
        }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if target is NOT empty (because creation is for myself only).', () => {
            const tx = new CreateTransaction(makeTransactionObj({
                type: TXTYPE.CREATE,
                target: myPk,
                moneycount: 1,
                investscount: 1
            }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return true if all is fine.', () => {
            const tx = new CreateTransaction(makeTransactionObj({
                type: TXTYPE.CREATE,
                target: "",
                moneycount: 1,
                investscount: 1
            }))

            const result = tx.isValid()

            assert.isTrue(result)
        })
    })
})

describe('PayTransaction', () => {

    describe('constructor', () => {
        it('Should accept an object as unique parameter.', () => {
            const tx = new PayTransaction(makeTransactionObj({
                type: TXTYPE.PAY,
                moneycount: 1,
                date: new Date("2026-01-26"),
                investscount: 3,
                signer: referentPk,
                target: targetPk,
                version: 12
            }))

            assert.equal(tx.type, TXTYPE.PAY)
            assert.equal(tx.money.length, 1)
            assert.equal(tx.invests.length, 3)
            assert.equal(tx.date.getDate(), new Date("2026-01-26").getDate())
            assert.equal(tx.signer, referentPk)
            assert.equal(tx.target, targetPk)
            assert.equal(tx.version, 12)
        })

        it('Should accept 4 parameters : signer sk, target pk, date and money.', () => {
            const tx = new PayTransaction(targetSk, referentPk, new Date("2026-01-26"), buildMoneyIndexes(new Date("2026-01-24"), 4))

            assert.equal(tx.type, TXTYPE.PAY)
            assert.equal(tx.money.length, 4)
            assert.equal(tx.invests.length, 0)
            assert.equal(tx.date.getDate(), new Date("2026-01-26").getDate())
            assert.equal(tx.signer, targetPk)
            assert.equal(tx.target, referentPk)
            assert.equal(tx.version, Blockchain.VERSION)
            assert.isTrue(tx.isValid())
        })
    })

    describe('toString', () => {
        it('Should return [PayTransaction]', () => {
            const tx = makeTransaction({
                type: TXTYPE.PAY
            })

            assert.equal(tx.toString(), "[PayTransaction]")
        })
    })

    describe('isValid', () => {

        it('Should return false if money is an empty array.', () => {
            const tx = new PayTransaction(makeTransactionObj({
                type: TXTYPE.PAY,
                moneycount: 0
            }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if invests is NOT an empty array.', () => {
            const tx = new PayTransaction(makeTransactionObj({
                type: TXTYPE.PAY,
                moneycount: 1,
                investscount: 1
            }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if type is NOT TXTYPE.PAY.', () => {
            const tx = new PayTransaction(makeTransactionObj({
                type: TXTYPE.CREATE,
                moneycount: 1
        }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if target is empty.', () => {
            const tx = new PayTransaction(makeTransactionObj({
                type: TXTYPE.PAY,
                target: "",
                moneycount: 1
            }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if target is NOT 66 char length.', () => {
            const tx = new PayTransaction(makeTransactionObj({
                type: TXTYPE.PAY,
                target: "123",
                moneycount: 1
            }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return true if all is fine.', () => {
            const tx = new PayTransaction(makeTransactionObj({
                type: TXTYPE.PAY,
                target: referentPk,
                moneycount: 1,
                investscount: 0
            }))

            const result = tx.isValid()

            assert.isTrue(result)
        })
    })
})

describe('EngageTransaction', () => {
    describe('toString', () => {
        it('Should return [EngageTransaction]', () => {
            const tx = makeTransaction({
                type: TXTYPE.ENGAGE
            })

            assert.equal(tx.toString(), "[EngageTransaction]")
        })
    })

    describe('isValid', () => {

        it('Should return false if money AND invests are both empty arrays.', () => {
            const tx = new EngageTransaction(makeTransactionObj({
                type: TXTYPE.ENGAGE,
                moneycount: 0,
                investscount: 0
            }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if money AND invests are both NOT empty arrays.', () => {
            const tx = new EngageTransaction(makeTransactionObj({
                type: TXTYPE.ENGAGE,
                moneycount: 1,
                investscount: 1
            }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if type is NOT TXTYPE.ENGAGE.', () => {
            const tx = new EngageTransaction(makeTransactionObj({
                type: TXTYPE.CREATE,
                moneycount: 1
        }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if target is empty.', () => {
            const tx = new EngageTransaction(makeTransactionObj({
                type: TXTYPE.ENGAGE,
                target: "",
                moneycount: 1
            }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if target is NOT 66 char length.', () => {
            const tx = new EngageTransaction(makeTransactionObj({
                type: TXTYPE.ENGAGE,
                target: "123",
                moneycount: 1
            }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return true if all is fine (money engaged).', () => {
            const tx = new EngageTransaction(makeTransactionObj({
                type: TXTYPE.ENGAGE,
                target: referentPk,
                moneycount: 12,
                investscount: 0
            }))

            const result = tx.isValid()

            assert.isTrue(result)
        })

        it('Should return true if all is fine (invests engaged).', () => {
            const tx = new EngageTransaction(makeTransactionObj({
                type: TXTYPE.ENGAGE,
                target: referentPk,
                moneycount: 0,
                investscount: 12
            }))

            const result = tx.isValid()

            assert.isTrue(result)
        })
    })

    describe('getEngagedMoney', () => {
        it('Should not match money from a different month with the same day.', () => {
            const tx = new EngageTransaction(makeTransactionObj({
                type: TXTYPE.ENGAGE,
                target: referentPk,
                money: [20250103000, 20250103001] // January 3rd
            }))

            const result = tx.getEngagedMoney(new Date('2025-02-03')) // February 3rd — same day, different month

            assert.deepEqual(result, [])
        })
    })

    describe('getEngagedInvests', () => {
        it('Should not match invests from a different month with the same day.', () => {
            const tx = new EngageTransaction(makeTransactionObj({
                type: TXTYPE.ENGAGE,
                target: referentPk,
                invests: [202501039000, 202501039001] // January 3rd
            }))

            const result = tx.getEngagedInvests(new Date('2025-02-03')) // February 3rd — same day, different month

            assert.deepEqual(result, [])
        })
    })
})

describe('PaperTransaction', () => {
    describe('constructor', () => {
        it('Should accept an object as unique parameter.', () => {
            const tx = new PaperTransaction(makeTransactionObj({
                type: TXTYPE.PAPER,
                moneycount: 1,
                date: new Date("2026-01-26"),
                investscount: 0,
                signer: myPk,
                target: targetPk,
                version: 12
            }))

            assert.equal(tx.type, TXTYPE.PAPER)
            assert.equal(tx.money.length, 1)
            assert.equal(tx.invests.length, 0)
            assert.equal(tx.date.getDate(), new Date("2026-01-26").getDate())
            assert.equal(tx.signer, myPk)
            assert.equal(tx.target, targetPk)
            assert.equal(tx.version, 12)
        })

        it('Should accept 4 parameters : my sk, referent pk, money and date.', () => {
            const tx = new PaperTransaction(mySk, targetPk, buildMoneyIndexes(new Date("2026-01-24"), 4), new Date("2026-01-26"))

            assert.equal(tx.type, TXTYPE.PAPER)
            assert.equal(tx.money.length, 4)
            assert.equal(tx.invests.length, 0)
            assert.equal(tx.date.getDate(), new Date("2026-01-26").getDate())
            assert.equal(tx.signer, myPk)
            assert.equal(tx.target, targetPk)
            assert.equal(tx.version, Blockchain.VERSION)
            assert.isTrue(tx.isValid())
        })
    })

    describe('toString', () => {
        it('Should return [PaperTransaction]', () => {
            const tx = makeTransaction({
                type: TXTYPE.PAPER
            })

            assert.equal(tx.toString(), "[PaperTransaction]")
        })
    })

    describe('isValid', () => {

        it('Should return false if money is an empty array.', () => {
            const tx = new PaperTransaction(makeTransactionObj({
                type: TXTYPE.PAPER,
                moneycount: 0
            }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if invests is NOT an empty array.', () => {
            const tx = new PaperTransaction(makeTransactionObj({
                type: TXTYPE.PAPER,
                moneycount: 1,
                investscount: 1
            }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if type is NOT TXTYPE.PAPER.', () => {
            const tx = new PaperTransaction(makeTransactionObj({
                type: TXTYPE.CREATE,
                moneycount: 1
        }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if target is empty.', () => {
            const tx = new PaperTransaction(makeTransactionObj({
                type: TXTYPE.PAPER,
                target: "",
                moneycount: 1
            }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if target is NOT 66 char length.', () => {
            const tx = new PaperTransaction(makeTransactionObj({
                type: TXTYPE.PAPER,
                target: "123",
                moneycount: 1
            }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return true if all is fine.', () => {
            const tx = new PaperTransaction(makeTransactionObj({
                type: TXTYPE.PAPER,
                moneycount: 12,
                investscount: 0
            }))

            const result = tx.isValid()

            assert.isTrue(result)
        })
    })
})

describe('SetAdminTransaction', () => {
    describe('toString', () => {
        it('Should return [SetAdminTransaction]', () => {
            const tx = makeTransaction({
                type: TXTYPE.SETADMIN
            })

            assert.equal(tx.toString(), "[SetAdminTransaction]")
        })
    })

    describe('isValid', () => {

        it('Should return false if money is NOT an empty array.', () => {
            const tx = new SetAdminTransaction(makeTransactionObj({
                type: TXTYPE.SETADMIN,
                moneycount: 1
            }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if invests is NOT an empty array.', () => {
            const tx = new SetAdminTransaction(makeTransactionObj({
                type: TXTYPE.SETADMIN,
                investscount: 1
            }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if type is NOT TXTYPE.SETADMIN.', () => {
            const tx = new SetAdminTransaction(makeTransactionObj({
                type: TXTYPE.CREATE,
                moneycount: 1
        }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if target is empty.', () => {
            const tx = new SetAdminTransaction(makeTransactionObj({
                type: TXTYPE.SETADMIN,
                target: ""
            }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if target is NOT 66 char length.', () => {
            const tx = new SetAdminTransaction(makeTransactionObj({
                type: TXTYPE.SETADMIN,
                target: "123"
            }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return true if all is fine.', () => {
            const tx = new SetAdminTransaction(makeTransactionObj({
                type: TXTYPE.SETADMIN,
                moneycount: 0,
                investscount: 0
            }))

            const result = tx.isValid()

            assert.isTrue(result)
        })
    })
})

describe('SetActorTransaction', () => {
    describe('constructor', () => {
        it('Should throw if q is missing from object.', () => {
            const obj = new SetActorTransaction(mySk, targetPk, 3, new Date()).export()
            delete obj.q

            assert.throws(() => new SetActorTransaction(obj), Error)
        })
    })

    describe('toString', () => {
        it('Should return [SetActorTransaction]', () => {
            const tx = makeTransaction({
                type: TXTYPE.SETACTOR
            })

            assert.equal(tx.toString(), "[SetActorTransaction]")
        })
    })

    describe('isValid', () => {
        it('Should return false if money is NOT an empty array.', () => {
            const tx = new SetActorTransaction(makeTransactionObj({
                type: TXTYPE.SETACTOR,
                moneycount: 1
            }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if invests is NOT an empty array.', () => {
            const tx = new SetActorTransaction(makeTransactionObj({
                type: TXTYPE.SETACTOR,
                investscount: 1
            }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if type is NOT TXTYPE.SETACTOR.', () => {
            const tx = new SetActorTransaction(makeTransactionObj({
                type: TXTYPE.CREATE,
                moneycount: 1,
                q: 1
        }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if target is empty.', () => {
            const tx = new SetActorTransaction(makeTransactionObj({
                type: TXTYPE.SETACTOR,
                target: ""
            }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if target is NOT 66 char length.', () => {
            const tx = new SetActorTransaction(makeTransactionObj({
                type: TXTYPE.SETACTOR,
                target: "123"
            }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if ratio is negative.', () => {
            const tx = new SetActorTransaction(mySk, targetPk, -1, new Date())
            assert.isFalse(tx.isValid())
        })

        it('Should return false if ratio is not an integer.', () => {
            const tx = new SetActorTransaction(mySk, targetPk, 1.5, new Date())
            assert.isFalse(tx.isValid())
        })

        it('Should return true if ratio is 0 (volunteer).', () => {
            const tx = new SetActorTransaction(mySk, targetPk, 0, new Date())
            assert.isTrue(tx.isValid())
        })

        it('Should return true if all is fine.', () => {
            const tx = new SetActorTransaction(mySk, targetPk, 1, new Date())
            assert.isTrue(tx.isValid())
        })
    })

    describe('constructor', () => {
        it('Should store ratio when created with (sk, targetPk, ratio, date).', () => {
            const tx = new SetActorTransaction(mySk, targetPk, 3, new Date())
            assert.equal(tx.ratio, 3)
        })

        it('Should read ratio from q field when created from object.', () => {
            const tx = new SetActorTransaction(mySk, targetPk, 5, new Date())
            const tx2 = new SetActorTransaction(tx.export())
            assert.equal(tx2.ratio, 5)
        })
    })

    describe('q field (ratio)', () => {
        it('Should include ratio in hash — different ratio produces different hash.', () => {
            const d = new Date('2025-01-01')
            const tx1 = new SetActorTransaction(mySk, targetPk, 1, d)
            const tx2 = new SetActorTransaction(mySk, targetPk, 2, d)
            assert.notDeepEqual(tx1.hash(), tx2.hash())
        })

        it('Should include q in export.', () => {
            const tx = new SetActorTransaction(mySk, targetPk, 3, new Date())
            assert.equal(tx.export().q, 3)
        })

        it('Should preserve ratio after round-trip export/reconstruct.', () => {
            const tx = new SetActorTransaction(mySk, targetPk, 7, new Date())
            const tx2 = new SetActorTransaction(tx.export())
            assert.equal(tx2.ratio, 7)
        })
    })
})

describe('SetPayerTransaction', () => {
    describe('constructor', () => {
        it('Should throw if q is missing from object.', () => {
            const obj = new SetPayerTransaction(mySk, targetPk, 5, new Date()).export()
            delete obj.q

            assert.throws(() => new SetPayerTransaction(obj), Error)
        })
    })

    describe('toString', () => {
        it('Should return [SetPayerTransaction]', () => {
            const tx = makeTransaction({
                type: TXTYPE.SETPAYER
            })

            assert.equal(tx.toString(), "[SetPayerTransaction]")
        })
    })

    describe('isValid', () => {
        it('Should return false if money is NOT an empty array.', () => {
            const tx = new SetPayerTransaction(makeTransactionObj({
                type: TXTYPE.SETPAYER,
                moneycount: 1
            }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if invests is NOT an empty array.', () => {
            const tx = new SetPayerTransaction(makeTransactionObj({
                type: TXTYPE.SETPAYER,
                investscount: 1
            }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if type is NOT TXTYPE.SETPAYER.', () => {
            const tx = new SetPayerTransaction(makeTransactionObj({
                type: TXTYPE.CREATE,
                moneycount: 1,
                q: 1
        }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if target is empty.', () => {
            const tx = new SetPayerTransaction(makeTransactionObj({
                type: TXTYPE.SETPAYER,
                target: ""
            }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if target is NOT 66 char length.', () => {
            const tx = new SetPayerTransaction(makeTransactionObj({
                type: TXTYPE.SETPAYER,
                target: "123"
            }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if cap is negative.', () => {
            const tx = new SetPayerTransaction(mySk, targetPk, -1, new Date())
            assert.isFalse(tx.isValid())
        })

        it('Should return false if cap is not an integer.', () => {
            const tx = new SetPayerTransaction(mySk, targetPk, 1.5, new Date())
            assert.isFalse(tx.isValid())
        })

        it('Should return true if cap is 0 (unlimited).', () => {
            const tx = new SetPayerTransaction(mySk, targetPk, 0, new Date())
            assert.isTrue(tx.isValid())
        })

        it('Should return true if all is fine.', () => {
            const tx = new SetPayerTransaction(mySk, targetPk, 100, new Date())
            assert.isTrue(tx.isValid())
        })
    })

    describe('constructor', () => {
        it('Should store cap when created with (sk, targetPk, cap, date).', () => {
            const tx = new SetPayerTransaction(mySk, targetPk, 50, new Date())
            assert.equal(tx.cap, 50)
        })

        it('Should read cap from q field when created from object.', () => {
            const tx = new SetPayerTransaction(mySk, targetPk, 200, new Date())
            const tx2 = new SetPayerTransaction(tx.export())
            assert.equal(tx2.cap, 200)
        })
    })

    describe('q field (cap)', () => {
        it('Should include cap in hash — different cap produces different hash.', () => {
            const d = new Date('2025-01-01')
            const tx1 = new SetPayerTransaction(mySk, targetPk, 10, d)
            const tx2 = new SetPayerTransaction(mySk, targetPk, 20, d)
            assert.notDeepEqual(tx1.hash(), tx2.hash())
        })

        it('Should include q in export.', () => {
            const tx = new SetPayerTransaction(mySk, targetPk, 50, new Date())
            assert.equal(tx.export().q, 50)
        })

        it('Should preserve cap after round-trip export/reconstruct.', () => {
            const tx = new SetPayerTransaction(mySk, targetPk, 300, new Date())
            const tx2 = new SetPayerTransaction(tx.export())
            assert.equal(tx2.cap, 300)
        })
    })
})

describe('UnsetAdminTransaction', () => {
    describe('toString', () => {
        it('Should return [UnsetAdminTransaction]', () => {
            const tx = makeTransaction({
                type: TXTYPE.UNSETADMIN
            })

            assert.equal(tx.toString(), "[UnsetAdminTransaction]")
        })
    })

    describe('isValid', () => {

        it('Should return false if money is NOT an empty array.', () => {
            const tx = new UnsetAdminTransaction(makeTransactionObj({
                type: TXTYPE.UNSETADMIN,
                moneycount: 1
            }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if invests is NOT an empty array.', () => {
            const tx = new UnsetAdminTransaction(makeTransactionObj({
                type: TXTYPE.UNSETADMIN,
                investscount: 1
            }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if type is NOT TXTYPE.UNSETADMIN.', () => {
            const tx = new UnsetAdminTransaction(makeTransactionObj({
                type: TXTYPE.CREATE,
                moneycount: 1
            }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if target is empty.', () => {
            const tx = new UnsetAdminTransaction(makeTransactionObj({
                type: TXTYPE.UNSETADMIN,
                target: ""
            }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if target is NOT 66 char length.', () => {
            const tx = new UnsetAdminTransaction(makeTransactionObj({
                type: TXTYPE.UNSETADMIN,
                target: "123"
            }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return true if all is fine.', () => {
            const tx = new UnsetAdminTransaction(makeTransactionObj({
                type: TXTYPE.UNSETADMIN,
                moneycount: 0,
                investscount: 0
            }))

            const result = tx.isValid()

            assert.isTrue(result)
        })
    })
})

describe('UnsetActorTransaction', () => {
    describe('toString', () => {
        it('Should return [UnsetActorTransaction]', () => {
            const tx = makeTransaction({
                type: TXTYPE.UNSETACTOR
            })

            assert.equal(tx.toString(), "[UnsetActorTransaction]")
        })
    })

    describe('isValid', () => {
        it('Should return false if money is NOT an empty array.', () => {
            const tx = new UnsetActorTransaction(makeTransactionObj({
                type: TXTYPE.UNSETACTOR,
                moneycount: 1
            }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if invests is NOT an empty array.', () => {
            const tx = new UnsetActorTransaction(makeTransactionObj({
                type: TXTYPE.UNSETACTOR,
                investscount: 1
            }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if type is NOT TXTYPE.UNSETACTOR.', () => {
            const tx = new UnsetActorTransaction(makeTransactionObj({
                type: TXTYPE.CREATE,
                moneycount: 1
            }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if target is empty.', () => {
            const tx = new UnsetActorTransaction(makeTransactionObj({
                type: TXTYPE.UNSETACTOR,
                target: ""
            }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if target is NOT 66 char length.', () => {
            const tx = new UnsetActorTransaction(makeTransactionObj({
                type: TXTYPE.UNSETACTOR,
                target: "123"
            }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return true if all is fine.', () => {
            const tx = new UnsetActorTransaction(makeTransactionObj({
                type: TXTYPE.UNSETACTOR,
                moneycount: 0,
                investscount: 0
            }))

            const result = tx.isValid()

            assert.isTrue(result)
        })
    })
})

describe('UnsetPayerTransaction', () => {
    describe('toString', () => {
        it('Should return [UnsetPayerTransaction]', () => {
            const tx = makeTransaction({
                type: TXTYPE.UNSETPAYER
            })

            assert.equal(tx.toString(), "[UnsetPayerTransaction]")
        })
    })

    describe('isValid', () => {
        it('Should return false if money is NOT an empty array.', () => {
            const tx = new UnsetPayerTransaction(makeTransactionObj({
                type: TXTYPE.UNSETPAYER,
                moneycount: 1
            }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if invests is NOT an empty array.', () => {
            const tx = new UnsetPayerTransaction(makeTransactionObj({
                type: TXTYPE.UNSETPAYER,
                investscount: 1
            }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if type is NOT TXTYPE.UNSETPAYER.', () => {
            const tx = new UnsetPayerTransaction(makeTransactionObj({
                type: TXTYPE.CREATE,
                moneycount: 1
            }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if target is empty.', () => {
            const tx = new UnsetPayerTransaction(makeTransactionObj({
                type: TXTYPE.UNSETPAYER,
                target: ""
            }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return false if target is NOT 66 char length.', () => {
            const tx = new UnsetPayerTransaction(makeTransactionObj({
                type: TXTYPE.UNSETPAYER,
                target: "123"
            }))

            const result = tx.isValid()

            assert.isFalse(result)
        })

        it('Should return true if all is fine.', () => {
            const tx = new UnsetPayerTransaction(makeTransactionObj({
                type: TXTYPE.UNSETPAYER,
                moneycount: 0,
                investscount: 0
            }))

            const result = tx.isValid()

            assert.isTrue(result)
        })
    })
})