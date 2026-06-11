import { sha256 } from 'ethereum-cryptography/sha256.js'
import { scryptSync } from 'ethereum-cryptography/scrypt.js'
import { utf8ToBytes, toHex, hexToBytes } from 'ethereum-cryptography/utils.js'
import { utils, getPublicKey, signSync, verify } from 'ethereum-cryptography/secp256k1.js'
import { encrypt, decrypt } from 'ethereum-cryptography/aes.js'
import { getRandomBytesSync } from 'ethereum-cryptography/random.js'


export const infinityDate = "99991231"

export function randomPrivateKey() {
    return toHex(utils.randomPrivateKey())
}

export async function aesEncrypt(msg, pwd) {
    const salt = getRandomBytesSync(32)
    const derived = scryptSync(utf8ToBytes(pwd), salt, 16384, 8, 1, 32)
    const iv = getRandomBytesSync(16)
    msg = await encrypt(msg, derived.slice(0, 16), iv)
    return { msg, iv, salt, verifier: derived.slice(16) }
}

export async function aesDecrypt(encrypted, pwd) {
    const derived = scryptSync(utf8ToBytes(pwd), encrypted.salt, 16384, 8, 1, 32)
    if (toHex(derived.slice(16)) !== toHex(encrypted.verifier)) {
        throw new Error('Invalid password')
    }
    return await decrypt(encrypted.msg, derived.slice(0, 16), encrypted.iv)
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

export function signHash(hash, sk) {
    return toHex(signSync(hash, hexToBytes(sk)))
}

export function verifySignature(hash, signature, pk) {
    try {
        return verify(hexToBytes(signature), hash, hexToBytes(pk))
    } catch {
        return false
    }
}

export function hashTimestampAuth(publickey, timestamp) {
    return sha256(utf8ToBytes(`${publickey}:${timestamp}`))
}