import { sha256 } from 'ethereum-cryptography/sha256.js'
import { scryptSync } from 'ethereum-cryptography/scrypt.js'
import { utf8ToBytes, toHex } from 'ethereum-cryptography/utils.js'
import { utils, getPublicKey } from 'ethereum-cryptography/secp256k1.js'
import { encrypt, decrypt } from 'ethereum-cryptography/aes.js'
import { getRandomBytesSync } from 'ethereum-cryptography/random.js'


export function randomPrivateKey() {
    return toHex(utils.randomPrivateKey())
}

export async function aesEncrypt(msg, pwd) {
    const key = scryptSync(utf8ToBytes(pwd), utf8ToBytes("salt"), 2048, 8, 1, 16)
    const iv = getRandomBytesSync(16)
    msg = await encrypt(msg, key, iv)
    return { msg, iv, sha: sha256(utf8ToBytes(pwd)) }
}

export async function aesDecrypt(encrypted, pwd) {
    if (JSON.stringify(sha256(utf8ToBytes(pwd))) !== JSON.stringify(encrypted.sha)) {
        throw new Error('Invalid password')
    }
    const key = scryptSync(utf8ToBytes(pwd), utf8ToBytes("salt"), 2048, 8, 1, 16)
    return await decrypt(encrypted.msg, key, encrypted.iv)
}

export function publicFromPrivate(privateKey) {
    return toHex(getPublicKey(privateKey, true))
}

export function dateToInt(date) {
    return +('' + date.getFullYear() + ("0" + (date.getMonth() + 1)).slice(-2) + ("0" + date.getDate()).slice(-2))
}

export function intToDate(dateint) {
    const datestr = '' + dateint
    return new Date(datestr.slice(0, 4) + '-' + datestr.slice(4, 6) + '-' + datestr.slice(6, 8))
}

export function intToIndex(dateint) {
    const datestr = '' + dateint
    return +datestr.slice(-3)
}

export function formatMoneyIndex(date, index) {
    return +('' + dateToInt(date) + ("00" + index).slice(-3))
}

export function formatInvestIndex(date, index) {
    return +('' + dateToInt(date) + '9' + ("00" + index).slice(-3))
}

export function buildInvestIndexes(date, level) {
    const result = []
    for (let i = 0; i < level; i++) {
        result.push(formatInvestIndex(date, i))
    }
    return result
}

export function buildMoneyIndexes(date, level) {
    const result = []
    for (let i = 0; i < level; i++) {
        result.push(formatMoneyIndex(date, i))
    }
    return result
}