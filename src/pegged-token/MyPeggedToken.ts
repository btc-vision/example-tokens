import { u256 } from '@btc-vision/as-bignum/assembly';
import {
    Address,
    AddressMemoryMap,
    Blockchain,
    BytesWriter,
    Calldata,
    OP20InitParameters,
    OP20S,
    Revert,
} from '@btc-vision/btc-runtime/runtime';
import { CustodianChangedEvent } from '../shared-events/OracleEvents';

const custodianPointer: u16 = Blockchain.nextPointer;
const pendingCustodianPointer: u16 = Blockchain.nextPointer;

@final
export class MyPeggedToken extends OP20S {
    private readonly _custodianMap: AddressMemoryMap;
    private readonly _pendingCustodianMap: AddressMemoryMap;

    public constructor() {
        super();
        this._custodianMap = new AddressMemoryMap(custodianPointer);
        this._pendingCustodianMap = new AddressMemoryMap(pendingCustodianPointer);
    }

    public override onDeployment(calldata: Calldata): void {
        const custodian = calldata.readAddress();

        if (custodian.equals(Address.zero())) {
            throw new Revert('Invalid custodian');
        }

        const maxSupply: u256 = u256.fromU64(2100000000000000);
        const decimals: u8 = 8;
        const name: string = 'Wrapped BTC';
        const symbol: string = 'WBTC';

        this.instantiate(new OP20InitParameters(maxSupply, decimals, name, symbol));
        this.initializePeg(custodian, u256.One, u64.MAX_VALUE);

        this._setCustodian(custodian);

        this.emitEvent(new CustodianChangedEvent(Address.zero(), custodian));
    }

    @method(
        { name: 'to', type: ABIDataTypes.ADDRESS },
        { name: 'amount', type: ABIDataTypes.UINT256 },
    )
    @emit('Minted')
    public mint(calldata: Calldata): BytesWriter {
        this._onlyCustodian();

        const to = calldata.readAddress();
        const amount = calldata.readU256();

        if (to.equals(Address.zero())) {
            throw new Revert('Invalid recipient');
        }
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
        this._onlyCustodian();

        const from = calldata.readAddress();
        const amount = calldata.readU256();

        if (from.equals(Address.zero())) {
            throw new Revert('Invalid address');
        }

        const balance = this._balanceOf(from);
        if (balance < amount) {
            throw new Revert('Insufficient balance');
        }

        this._burn(from, amount);

        return new BytesWriter(0);
    }

    @method({ name: 'newCustodian', type: ABIDataTypes.ADDRESS })
    public transferCustodian(calldata: Calldata): BytesWriter {
        this._onlyCustodian();

        const newCustodian = calldata.readAddress();
        if (newCustodian.equals(Address.zero())) {
            throw new Revert('Invalid new custodian');
        }

        this._setPendingCustodian(newCustodian);

        return new BytesWriter(0);
    }

    @method()
    @emit('CustodianChanged')
    public acceptCustodian(_: Calldata): BytesWriter {
        const pending = this._getPendingCustodian();
        if (pending.equals(Address.zero())) {
            throw new Revert('No pending custodian');
        }
        if (!Blockchain.tx.sender.equals(pending)) {
            throw new Revert('Not pending custodian');
        }

        const previousCustodian = this._getCustodian();
        this._setCustodian(pending);
        this._setPendingCustodian(Address.zero());

        this.emitEvent(new CustodianChangedEvent(previousCustodian, pending));

        return new BytesWriter(0);
    }

    @method()
    @returns({ name: 'custodian', type: ABIDataTypes.ADDRESS })
    public custodian(_: Calldata): BytesWriter {
        const w = new BytesWriter(32);
        w.writeAddress(this._getCustodian());
        return w;
    }

    @method()
    @returns({ name: 'pendingCustodian', type: ABIDataTypes.ADDRESS })
    public pendingCustodian(_: Calldata): BytesWriter {
        const w = new BytesWriter(32);
        w.writeAddress(this._getPendingCustodian());
        return w;
    }

    private _getCustodian(): Address {
        const stored = this._custodianMap.get(Address.zero());
        if (stored.isZero()) return Address.zero();
        return this._u256ToAddress(stored);
    }

    private _setCustodian(addr: Address): void {
        this._custodianMap.set(Address.zero(), this._addressToU256(addr));
    }

    private _getPendingCustodian(): Address {
        const stored = this._pendingCustodianMap.get(Address.zero());
        if (stored.isZero()) return Address.zero();
        return this._u256ToAddress(stored);
    }

    private _setPendingCustodian(addr: Address): void {
        this._pendingCustodianMap.set(Address.zero(), this._addressToU256(addr));
    }

    private _onlyCustodian(): void {
        if (!Blockchain.tx.sender.equals(this._getCustodian())) {
            throw new Revert('Not custodian');
        }
    }
}
