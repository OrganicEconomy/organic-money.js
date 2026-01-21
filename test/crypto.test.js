import { describe, it } from 'mocha';
import { assert } from 'chai';
import { hexToBytes } from 'ethereum-cryptography/utils.js';

import {
    randomPrivateKey, publicFromPrivate, aesDecrypt, aesEncrypt,
    dateToInt, intToDate, formatMoneyIndex, formatInvestIndex,
    buildInvestIndexes, buildMoneyIndexes
} from '../src/crypto.js'


describe('aesEncrypt', () => {
    it('Should encrypt data correctly.', async () => {
        const msg = randomPrivateKey()
        const result = await aesEncrypt(msg, 'test_pwd')

        assert.property(result, 'msg')
        assert.property(result, 'iv')
        assert.property(result, 'sha')
    })
})

describe('aesDecrypt', () => {
    it('Should decrypt data correctly.', async () => {
        const msg = hexToBytes(randomPrivateKey())
        const encrypted = await aesEncrypt(msg, 'test_pwd')
        const result = await aesDecrypt(encrypted, 'test_pwd')

        assert.deepEqual(result, msg)
    })

    it('Should throw error for invalid password.', async () => {
        const msg = randomPrivateKey()
        const encrypted = await aesEncrypt(msg, 'test_pwd')

        let error = null
        try {
            await aesDecrypt(encrypted, 'wrong_password')
        } catch (err) {
            error = err
        }
        assert.typeOf(error, 'Error')
        assert.equal(error.message, 'Invalid password')
    })
})

describe('dateToInt', () => {
    it('Should return the date in YYYYMMDD format.', () => {
        const date = new Date('2021-11-15')

        const result = dateToInt(date)

        assert.equal(result, 20211115)
    })

    it('Should work with dates including 1 digit month and day.', () => {
        const date = new Date('2021-09-05')

        const result = dateToInt(date)

        assert.equal(result, 20210905)
    })
})

describe('intToDate', () => {
    it('Should return a valid Date object.', () => {
        const date = new Date('2021-11-15')

        const result = intToDate(20211115)

        assert.equal(result.getTime(), date.getTime())
    })

    it('Should work with dates including 1 digit month and day.', () => {
        const date = new Date('2021-09-05')

        const result = intToDate(20210905)

        assert.equal(result.getTime(), date.getTime())
    })
})