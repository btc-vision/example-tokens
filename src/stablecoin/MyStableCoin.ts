import { u256 } from '@btc-vision/as-bignum/assembly';
import {
    Address,
    Blockchain,
    BytesWriter,
    Calldata,
    OP20InitParameters,
    OP20S,
    Revert,
    Selector,
    StoredBoolean,
} from '@btc-vision/btc-runtime/runtime';

import {
    BlacklistedEvent,
    BlacklisterChangedEvent,
    MinterChangedEvent,
    OwnershipTransferredEvent,
    OwnershipTransferStartedEvent,
    PausedEvent,
    PauserChangedEvent,
    UnblacklistedEvent,
    UnpausedEvent,
} from './events/StableCoinEvents';
import { AddressMemoryMap } from '@btc-vision/btc-runtime/runtime/memory/AddressMemoryMap';

export const IS_BLACKLISTED_SELECTOR: u32 = 0xd20d08bb;
export const IS_PAUSED_SELECTOR: u32 = 0xe57e24b7;

const ownerPointer: u16 = Blockchain.nextPointer;
const pendingOwnerPointer: u16 = Blockchain.nextPointer;
const minterPointer: u16 = Blockchain.nextPointer;
const blacklisterPointer: u16 = Blockchain.nextPointer;
const pauserPointer: u16 = Blockchain.nextPointer;
const pausedPointer: u16 = Blockchain.nextPointer;
const blacklistMapPointer: u16 = Blockchain.nextPointer;

@final
export class MyStableCoin extends OP20S {
    private readonly _ownerMap: AddressMemoryMap;
    private readonly _pendingOwnerMap: AddressMemoryMap;
    private readonly _minterMap: AddressMemoryMap;
    private readonly _blacklisterMap: AddressMemoryMap;
    private readonly _pauserMap: AddressMemoryMap;
    private readonly _paused: StoredBoolean;
    private readonly _blacklist: AddressMemoryMap;

    public constructor() {
        super();
        this._ownerMap = new AddressMemoryMap(ownerPointer);
        this._pendingOwnerMap = new AddressMemoryMap(pendingOwnerPointer);
        this._minterMap = new AddressMemoryMap(minterPointer);
        this._blacklisterMap = new AddressMemoryMap(blacklisterPointer);
        this._pauserMap = new AddressMemoryMap(pauserPointer);
        this._paused = new StoredBoolean(pausedPointer, false);
        this._blacklist = new AddressMemoryMap(blacklistMapPointer);
    }

    public override onDeployment(calldata: Calldata): void {
        const owner = calldata.readAddress();
        const minter = calldata.readAddress();
        const blacklister = calldata.readAddress();
        const pauser = calldata.readAddress();
        const pegAuthority = calldata.readAddress();
        const initialPegRate = calldata.readU256();

        this._validateAddress(owner, 'Invalid owner');
        this._validateAddress(minter, 'Invalid minter');
        this._validateAddress(blacklister, 'Invalid blacklister');
        this._validateAddress(pauser, 'Invalid pauser');
        this._validateAddress(pegAuthority, 'Invalid peg authority');

        if (initialPegRate.isZero()) {
            throw new Revert('Invalid peg rate');
        }

        const maxSupply: u256 = u256.Max;
        const decimals: u8 = 6;
        const name: string = 'Stable USD';
        const symbol: string = 'SUSD';

        this.instantiate(new OP20InitParameters(maxSupply, decimals, name, symbol));
        this.initializePeg(pegAuthority, initialPegRate, 144);

        this._setOwner(owner);
        this._setMinter(minter);
        this._setBlacklister(blacklister);
        this._setPauser(pauser);

        this.emitEvent(new OwnershipTransferredEvent(Address.zero(), owner));
        this.emitEvent(new MinterChangedEvent(Address.zero(), minter));
        this.emitEvent(new BlacklisterChangedEvent(Address.zero(), blacklister));
        this.emitEvent(new PauserChangedEvent(Address.zero(), pauser));
    }

    @method(
        { name: 'to', type: ABIDataTypes.ADDRESS },
        { name: 'amount', type: ABIDataTypes.UINT256 },
    )
    @emit('Minted')
    public mint(calldata: Calldata): BytesWriter {
        this._onlyMinter();
        this._requireNotPaused();

        const to = calldata.readAddress();
        const amount = calldata.readU256();

        this._validateAddress(to, 'Invalid recipient');
        this._requireNotBlacklisted(to);

        if (amount.isZero()) {
            throw new Revert('Amount is zero');
        }

        this._mint(to, amount);

        return new BytesWriter(0);
    }

    @method(
        { name: 'from', type: ABIDataTypes.ADDRESS },
        { name: 'amount', type: ABIDataTypes.UINT256 },
    )
    @emit('Burned')
    public burnFrom(calldata: Calldata): BytesWriter {
        this._onlyMinter();
        this._requireNotPaused();

        const from = calldata.readAddress();
        const amount = calldata.readU256();

        this._validateAddress(from, 'Invalid address');

        const balance = this._balanceOf(from);
        if (balance < amount) {
            throw new Revert('Insufficient balance');
        }

        this._burn(from, amount);

        return new BytesWriter(0);
    }

    @method({ name: 'account', type: ABIDataTypes.ADDRESS })
    @emit('Blacklisted')
    public blacklist(calldata: Calldata): BytesWriter {
        this._onlyBlacklister();

        const account = calldata.readAddress();
        this._validateAddress(account, 'Invalid address');

        if (this._isBlacklisted(account)) {
            throw new Revert('Already blacklisted');
        }

        this._blacklist.set(account, u256.One);

        this.emitEvent(new BlacklistedEvent(account, Blockchain.tx.sender));

        return new BytesWriter(0);
    }

    @method({ name: 'account', type: ABIDataTypes.ADDRESS })
    @emit('Unblacklisted')
    public unblacklist(calldata: Calldata): BytesWriter {
        this._onlyBlacklister();

        const account = calldata.readAddress();
        this._validateAddress(account, 'Invalid address');

        if (!this._isBlacklisted(account)) {
            throw new Revert('Not blacklisted');
        }

        this._blacklist.set(account, u256.Zero);

        this.emitEvent(new UnblacklistedEvent(account, Blockchain.tx.sender));

        return new BytesWriter(0);
    }

    @method({ name: 'account', type: ABIDataTypes.ADDRESS })
    @returns({ name: 'blacklisted', type: ABIDataTypes.BOOL })
    public isBlacklisted(calldata: Calldata): BytesWriter {
        const account = calldata.readAddress();
        const w = new BytesWriter(1);
        w.writeBoolean(this._isBlacklisted(account));
        return w;
    }

    @method()
    @emit('Paused')
    public pause(_: Calldata): BytesWriter {
        this._onlyPauser();

        if (this._paused.value) {
            throw new Revert('Already paused');
        }

        this._paused.value = true;

        this.emitEvent(new PausedEvent(Blockchain.tx.sender));

        return new BytesWriter(0);
    }

    @method()
    @emit('Unpaused')
    public unpause(_: Calldata): BytesWriter {
        this._onlyPauser();

        if (!this._paused.value) {
            throw new Revert('Not paused');
        }

        this._paused.value = false;

        this.emitEvent(new UnpausedEvent(Blockchain.tx.sender));

        return new BytesWriter(0);
    }

    @method()
    @returns({ name: 'paused', type: ABIDataTypes.BOOL })
    public isPaused(_: Calldata): BytesWriter {
        const w = new BytesWriter(1);
        w.writeBoolean(<boolean>this._paused.value);
        return w;
    }

    @method({ name: 'newOwner', type: ABIDataTypes.ADDRESS })
    @emit('OwnershipTransferStarted')
    public transferOwnership(calldata: Calldata): BytesWriter {
        this._onlyOwner();

        const newOwner = calldata.readAddress();
        this._validateAddress(newOwner, 'Invalid new owner');

        const currentOwner = this._getOwner();
        this._setPendingOwner(newOwner);

        this.emitEvent(new OwnershipTransferStartedEvent(currentOwner, newOwner));

        return new BytesWriter(0);
    }

    @method()
    @emit('OwnershipTransferred')
    public acceptOwnership(_: Calldata): BytesWriter {
        const pending = this._getPendingOwner();
        if (pending.equals(Address.zero())) {
            throw new Revert('No pending owner');
        }
        if (!Blockchain.tx.sender.equals(pending)) {
            throw new Revert('Not pending owner');
        }

        const previousOwner = this._getOwner();
        this._setOwner(pending);
        this._setPendingOwner(Address.zero());

        this.emitEvent(new OwnershipTransferredEvent(previousOwner, pending));

        return new BytesWriter(0);
    }

    @method({ name: 'newMinter', type: ABIDataTypes.ADDRESS })
    @emit('MinterChanged')
    public setMinter(calldata: Calldata): BytesWriter {
        this._onlyOwner();

        const newMinter = calldata.readAddress();
        this._validateAddress(newMinter, 'Invalid minter');

        const previousMinter = this._getMinter();
        this._setMinter(newMinter);

        this.emitEvent(new MinterChangedEvent(previousMinter, newMinter));

        return new BytesWriter(0);
    }

    @method({ name: 'newBlacklister', type: ABIDataTypes.ADDRESS })
    @emit('BlacklisterChanged')
    public setBlacklister(calldata: Calldata): BytesWriter {
        this._onlyOwner();

        const newBlacklister = calldata.readAddress();
        this._validateAddress(newBlacklister, 'Invalid blacklister');

        const previousBlacklister = this._getBlacklister();
        this._setBlacklister(newBlacklister);

        this.emitEvent(new BlacklisterChangedEvent(previousBlacklister, newBlacklister));

        return new BytesWriter(0);
    }

    @method({ name: 'newPauser', type: ABIDataTypes.ADDRESS })
    @emit('PauserChanged')
    public setPauser(calldata: Calldata): BytesWriter {
        this._onlyOwner();

        const newPauser = calldata.readAddress();
        this._validateAddress(newPauser, 'Invalid pauser');

        const previousPauser = this._getPauser();
        this._setPauser(newPauser);

        this.emitEvent(new PauserChangedEvent(previousPauser, newPauser));

        return new BytesWriter(0);
    }

    @method()
    @returns({ name: 'owner', type: ABIDataTypes.ADDRESS })
    public owner(_: Calldata): BytesWriter {
        const w = new BytesWriter(32);
        w.writeAddress(this._getOwner());
        return w;
    }

    @method()
    @returns({ name: 'minter', type: ABIDataTypes.ADDRESS })
    public minter(_: Calldata): BytesWriter {
        const w = new BytesWriter(32);
        w.writeAddress(this._getMinter());
        return w;
    }

    @method()
    @returns({ name: 'blacklister', type: ABIDataTypes.ADDRESS })
    public blacklister(_: Calldata): BytesWriter {
        const w = new BytesWriter(32);
        w.writeAddress(this._getBlacklister());
        return w;
    }

    @method()
    @returns({ name: 'pauser', type: ABIDataTypes.ADDRESS })
    public pauser(_: Calldata): BytesWriter {
        const w = new BytesWriter(32);
        w.writeAddress(this._getPauser());
        return w;
    }

    protected override _transfer(from: Address, to: Address, amount: u256): void {
        this._requireNotPaused();
        this._requireNotBlacklisted(from);
        this._requireNotBlacklisted(to);
        this._requireNotBlacklisted(Blockchain.tx.sender);

        super._transfer(from, to, amount);
    }

    protected override _increaseAllowance(owner: Address, spender: Address, amount: u256): void {
        this._requireNotPaused();
        this._requireNotBlacklisted(owner);
        this._requireNotBlacklisted(spender);

        super._increaseAllowance(owner, spender, amount);
    }

    protected override _decreaseAllowance(owner: Address, spender: Address, amount: u256): void {
        this._requireNotPaused();
        this._requireNotBlacklisted(owner);
        this._requireNotBlacklisted(spender);

        super._decreaseAllowance(owner, spender, amount);
    }

    protected override isSelectorExcluded(selector: Selector): boolean {
        if (selector == IS_BLACKLISTED_SELECTOR || selector == IS_PAUSED_SELECTOR) {
            return true;
        }
        return super.isSelectorExcluded(selector);
    }

    private _validateAddress(addr: Address, message: string): void {
        if (addr.equals(Address.zero())) {
            throw new Revert(message);
        }
    }

    private _isBlacklisted(account: Address): boolean {
        return !this._blacklist.get(account).isZero();
    }

    private _requireNotBlacklisted(account: Address): void {
        if (this._isBlacklisted(account)) {
            throw new Revert('Blacklisted');
        }
    }

    private _requireNotPaused(): void {
        if (this._paused.value) {
            throw new Revert('Paused');
        }
    }

    private _onlyOwner(): void {
        if (!Blockchain.tx.sender.equals(this._getOwner())) {
            throw new Revert('Not owner');
        }
    }

    private _onlyMinter(): void {
        if (!Blockchain.tx.sender.equals(this._getMinter())) {
            throw new Revert('Not minter');
        }
    }

    private _onlyBlacklister(): void {
        if (!Blockchain.tx.sender.equals(this._getBlacklister())) {
            throw new Revert('Not blacklister');
        }
    }

    private _onlyPauser(): void {
        if (!Blockchain.tx.sender.equals(this._getPauser())) {
            throw new Revert('Not pauser');
        }
    }

    private _getOwner(): Address {
        const stored = this._ownerMap.get(Address.zero());
        if (stored.isZero()) return Address.zero();
        return this._u256ToAddress(stored);
    }

    private _setOwner(addr: Address): void {
        this._ownerMap.set(Address.zero(), this._addressToU256(addr));
    }

    private _getPendingOwner(): Address {
        const stored = this._pendingOwnerMap.get(Address.zero());
        if (stored.isZero()) return Address.zero();
        return this._u256ToAddress(stored);
    }

    private _setPendingOwner(addr: Address): void {
        this._pendingOwnerMap.set(Address.zero(), this._addressToU256(addr));
    }

    private _getMinter(): Address {
        const stored = this._minterMap.get(Address.zero());
        if (stored.isZero()) return Address.zero();
        return this._u256ToAddress(stored);
    }

    private _setMinter(addr: Address): void {
        this._minterMap.set(Address.zero(), this._addressToU256(addr));
    }

    private _getBlacklister(): Address {
        const stored = this._blacklisterMap.get(Address.zero());
        if (stored.isZero()) return Address.zero();
        return this._u256ToAddress(stored);
    }

    private _setBlacklister(addr: Address): void {
        this._blacklisterMap.set(Address.zero(), this._addressToU256(addr));
    }

    private _getPauser(): Address {
        const stored = this._pauserMap.get(Address.zero());
        if (stored.isZero()) return Address.zero();
        return this._u256ToAddress(stored);
    }

    private _setPauser(addr: Address): void {
        this._pauserMap.set(Address.zero(), this._addressToU256(addr));
    }
}
