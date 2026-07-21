import { describe, it } from 'mocha';
import { assert } from 'chai';
import { hexToBytes } from 'ethereum-cryptography/utils.js';

import {
    randomPrivateKey, aesDecrypt, aesEncrypt, dateToInt, intToDate, investIdToMoneyId,
    packUnitIds, unpackUnitIds
} from '../src/crypto.js'


describe('aesEncrypt', () => {
    it('Should encrypt data correctly.', async () => {
        const msg = hexToBytes(randomPrivateKey())
        const result = await aesEncrypt(msg, 'test_pwd')

        assert.property(result, 'msg')
        assert.property(result, 'iv')
        assert.property(result, 'salt')
    })

    it('Should not store the password hash.', async () => {
        const msg = hexToBytes(randomPrivateKey())
        const result = await aesEncrypt(msg, 'test_pwd')

        assert.notProperty(result, 'sha')
    })

    it('Should use a different salt on each call.', async () => {
        const msg = hexToBytes(randomPrivateKey())
        const result1 = await aesEncrypt(msg, 'test_pwd')
        const result2 = await aesEncrypt(msg, 'test_pwd')

        assert.notDeepEqual(result1.salt, result2.salt)
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
        const msg = hexToBytes(randomPrivateKey())
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

describe('investIdToMoneyId', () => {
    it('Should remove the 9 separator and return a money ID.', () => {
        assert.equal(investIdToMoneyId(202501019000), 20250101000)
    })

    it('Should work with non-zero index.', () => {
        assert.equal(investIdToMoneyId(202501019002), 20250101002)
    })

    it('Should preserve the date portion unchanged.', () => {
        assert.equal(investIdToMoneyId(202512319005), 20251231005)
    })
})

describe('packUnitIds / unpackUnitIds', () => {
    it('Should round-trip an empty array as an empty string.', () => {
        assert.equal(packUnitIds([]), '')
        assert.deepEqual(unpackUnitIds(''), [])
    })

    it('Should round-trip a single money id.', () => {
        const ids = [20260721003]
        assert.deepEqual(unpackUnitIds(packUnitIds(ids)), ids)
    })

    it('Should round-trip several ids preserving order.', () => {
        const ids = [20260721000, 20260721001, 20260722005, 20251225010]
        assert.deepEqual(unpackUnitIds(packUnitIds(ids)), ids)
    })

    it('Should preserve duplicate ids (legitimately held by different parties).', () => {
        const ids = [20260721003, 20260721003, 20260721005]
        assert.deepEqual(unpackUnitIds(packUnitIds(ids)), ids)
    })

    it('Should round-trip invest ids (the 9 separator is just part of the number).', () => {
        const ids = [202607219000, 202607219001]
        assert.deepEqual(unpackUnitIds(packUnitIds(ids)), ids)
    })

    it('Should round-trip the theoretical maximum id (infinityDate-based invest id).', () => {
        const ids = [999912319999]
        assert.deepEqual(unpackUnitIds(packUnitIds(ids)), ids)
    })

    it('Should produce a much shorter payload than JSON for many ids.', () => {
        const ids = []
        for (let i = 0; i < 200; i++) ids.push(20260721000 + i)
        const packed = packUnitIds(ids)
        // measured: ~6.7 bytes/id packed vs 12 bytes/id in a JSON array (with separators)
        assert.isBelow(packed.length / ids.length, 7.5)
        assert.deepEqual(unpackUnitIds(packed), ids)
    })
})