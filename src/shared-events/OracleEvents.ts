import { u256 } from '@btc-vision/as-bignum/assembly';
import {
    Address,
    ADDRESS_BYTE_LENGTH,
    BytesWriter,
    NetEvent,
    U256_BYTE_LENGTH,
    U32_BYTE_LENGTH,
    U64_BYTE_LENGTH,
} from '@btc-vision/btc-runtime/runtime';

@final
export class OracleAddedEvent extends NetEvent {
    constructor(oracle: Address, addedBy: Address) {
        const data: BytesWriter = new BytesWriter(ADDRESS_BYTE_LENGTH * 2);
        data.writeAddress(oracle);
        data.writeAddress(addedBy);

        super('OracleAdded', data);
    }
}

@final
export class OracleRemovedEvent extends NetEvent {
    constructor(oracle: Address, removedBy: Address) {
        const data: BytesWriter = new BytesWriter(ADDRESS_BYTE_LENGTH * 2);
        data.writeAddress(oracle);
        data.writeAddress(removedBy);

        super('OracleRemoved', data);
    }
}

@final
export class PriceSubmittedEvent extends NetEvent {
    constructor(oracle: Address, price: u256, blockNumber: u64) {
        const data: BytesWriter = new BytesWriter(
            ADDRESS_BYTE_LENGTH + U256_BYTE_LENGTH + U64_BYTE_LENGTH,
        );
        data.writeAddress(oracle);
        data.writeU256(price);
        data.writeU64(blockNumber);

        super('PriceSubmitted', data);
    }
}

@final
export class PriceAggregatedEvent extends NetEvent {
    constructor(medianPrice: u256, oracleCount: u32, blockNumber: u64) {
        const data: BytesWriter = new BytesWriter(
            U256_BYTE_LENGTH + U32_BYTE_LENGTH + U64_BYTE_LENGTH,
        );
        data.writeU256(medianPrice);
        data.writeU32(oracleCount);
        data.writeU64(blockNumber);

        super('PriceAggregated', data);
    }
}

@final
export class TWAPUpdatedEvent extends NetEvent {
    constructor(oldPrice: u256, newPrice: u256, timeElapsed: u64) {
        const data: BytesWriter = new BytesWriter(U256_BYTE_LENGTH * 2 + U64_BYTE_LENGTH);
        data.writeU256(oldPrice);
        data.writeU256(newPrice);
        data.writeU64(timeElapsed);

        super('TWAPUpdated', data);
    }
}

@final
export class PoolChangedEvent extends NetEvent {
    constructor(previousPool: Address, newPool: Address) {
        const data: BytesWriter = new BytesWriter(ADDRESS_BYTE_LENGTH * 2);
        data.writeAddress(previousPool);
        data.writeAddress(newPool);

        super('PoolChanged', data);
    }
}

@final
export class CustodianChangedEvent extends NetEvent {
    constructor(previousCustodian: Address, newCustodian: Address) {
        const data: BytesWriter = new BytesWriter(ADDRESS_BYTE_LENGTH * 2);
        data.writeAddress(previousCustodian);
        data.writeAddress(newCustodian);

        super('CustodianChanged', data);
    }
}
