import {
    Address,
    ADDRESS_BYTE_LENGTH,
    BytesWriter,
    NetEvent,
} from '@btc-vision/btc-runtime/runtime';

@final
export class BlacklistedEvent extends NetEvent {
    constructor(account: Address, blacklister: Address) {
        const data: BytesWriter = new BytesWriter(ADDRESS_BYTE_LENGTH * 2);
        data.writeAddress(account);
        data.writeAddress(blacklister);

        super('Blacklisted', data);
    }
}

@final
export class UnblacklistedEvent extends NetEvent {
    constructor(account: Address, blacklister: Address) {
        const data: BytesWriter = new BytesWriter(ADDRESS_BYTE_LENGTH * 2);
        data.writeAddress(account);
        data.writeAddress(blacklister);

        super('Unblacklisted', data);
    }
}

@final
export class PausedEvent extends NetEvent {
    constructor(pauser: Address) {
        const data: BytesWriter = new BytesWriter(ADDRESS_BYTE_LENGTH);
        data.writeAddress(pauser);

        super('Paused', data);
    }
}

@final
export class UnpausedEvent extends NetEvent {
    constructor(pauser: Address) {
        const data: BytesWriter = new BytesWriter(ADDRESS_BYTE_LENGTH);
        data.writeAddress(pauser);

        super('Unpaused', data);
    }
}

@final
export class OwnershipTransferStartedEvent extends NetEvent {
    constructor(currentOwner: Address, pendingOwner: Address) {
        const data: BytesWriter = new BytesWriter(ADDRESS_BYTE_LENGTH * 2);
        data.writeAddress(currentOwner);
        data.writeAddress(pendingOwner);

        super('OwnershipTransferStarted', data);
    }
}

@final
export class OwnershipTransferredEvent extends NetEvent {
    constructor(previousOwner: Address, newOwner: Address) {
        const data: BytesWriter = new BytesWriter(ADDRESS_BYTE_LENGTH * 2);
        data.writeAddress(previousOwner);
        data.writeAddress(newOwner);

        super('OwnershipTransferred', data);
    }
}

@final
export class MinterChangedEvent extends NetEvent {
    constructor(previousMinter: Address, newMinter: Address) {
        const data: BytesWriter = new BytesWriter(ADDRESS_BYTE_LENGTH * 2);
        data.writeAddress(previousMinter);
        data.writeAddress(newMinter);

        super('MinterChanged', data);
    }
}

@final
export class BlacklisterChangedEvent extends NetEvent {
    constructor(previousBlacklister: Address, newBlacklister: Address) {
        const data: BytesWriter = new BytesWriter(ADDRESS_BYTE_LENGTH * 2);
        data.writeAddress(previousBlacklister);
        data.writeAddress(newBlacklister);

        super('BlacklisterChanged', data);
    }
}

@final
export class PauserChangedEvent extends NetEvent {
    constructor(previousPauser: Address, newPauser: Address) {
        const data: BytesWriter = new BytesWriter(ADDRESS_BYTE_LENGTH * 2);
        data.writeAddress(previousPauser);
        data.writeAddress(newPauser);

        super('PauserChanged', data);
    }
}
