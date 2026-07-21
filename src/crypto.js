import { sha256 } from 'ethereum-cryptography/sha256.js'
import { scryptSync } from 'ethereum-cryptography/scrypt.js'
import { utf8ToBytes, toHex, hexToBytes } from 'ethereum-cryptography/utils.js'
import { secp256k1 } from 'ethereum-cryptography/secp256k1.js'
import { encrypt, decrypt } from 'ethereum-cryptography/aes.js'
import { getRandomBytesSync } from 'ethereum-cryptography/random.js'


export const infinityDate = "99991231"

export function randomPrivateKey() {
    return toHex(secp256k1.utils.randomPrivateKey())
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
    return toHex(secp256k1.getPublicKey(privateKey, true))
}

export function dateToInt(date) {
    return +('' + date.getUTCFullYear() + ("0" + (date.getUTCMonth() + 1)).slice(-2) + ("0" + date.getUTCDate()).slice(-2))
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

export function unitIdToDateInt(unitId) {
    return +(('' + unitId).slice(0, 8))
}

export function investIdToMoneyId(investId) {
    const s = '' + investId
    return +(s.slice(0, 8) + s.slice(9))
}

export function buildMoneyIndexes(date, level) {
    const result = []
    for (let i = 0; i < level; i++) {
        result.push(formatMoneyIndex(date, i))
    }
    return result
}

const UNIT_ID_BYTE_WIDTH = 5 // 40 bits: covers ids up to ~1.1e12, well above the largest possible invest id

/**
 * Pack an array of unit ids (money or invest, both YYYYMMDD-prefixed integers)
 * into a compact wire representation: each id as UNIT_ID_BYTE_WIDTH big-endian
 * bytes, concatenated, then base64-encoded. Order and duplicates are preserved
 * (the same id can legitimately be held by different parties, see
 * hasEnoughOccurrences). Uses btoa/atob rather than Buffer so this works
 * identically in the browser (the webapp) and in Node.
 */
export function packUnitIds(ids) {
    if (ids.length === 0) return ''
    let binary = ''
    for (const id of ids) {
        for (let byte = UNIT_ID_BYTE_WIDTH - 1; byte >= 0; byte--) {
            binary += String.fromCharCode(Math.floor(id / 256 ** byte) % 256)
        }
    }
    return btoa(binary)
}

export function unpackUnitIds(packed) {
    if (packed === '') return []
    const binary = atob(packed)
    const ids = []
    for (let offset = 0; offset < binary.length; offset += UNIT_ID_BYTE_WIDTH) {
        let id = 0
        for (let byte = 0; byte < UNIT_ID_BYTE_WIDTH; byte++) {
            id = id * 256 + binary.charCodeAt(offset + byte)
        }
        ids.push(id)
    }
    return ids
}

/**
 * Money and invest ids are date+index based, with no citizen-specific component,
 * so the same id can legitimately appear more than once (held by different parties).
 * This checks that haystack has at least as many occurrences of each value as needles
 * requires, instead of just checking value presence.
 */
export function hasEnoughOccurrences(haystack, needles) {
    const counts = new Map()
    for (const id of haystack) {
        counts.set(id, (counts.get(id) || 0) + 1)
    }
    for (const id of needles) {
        const remaining = counts.get(id) || 0
        if (remaining <= 0) return false
        counts.set(id, remaining - 1)
    }
    return true
}

export function signHash(hash, sk) {
    return toHex(secp256k1.sign(hash, hexToBytes(sk)).toDERRawBytes())
}

export function verifySignature(hash, signature, pk) {
    try {
        return secp256k1.verify(hexToBytes(signature), hash, hexToBytes(pk))
    } catch {
        return false
    }
}

export function hashTimestampAuth(publickey, timestamp) {
    return sha256(utf8ToBytes(`${publickey}:${timestamp}`))
}