import { u256 } from '@btc-vision/as-bignum/assembly';
import {
    Address,
    AddressMemoryMap,
    Blockchain,
    BytesWriter,
    Calldata,
    EMPTY_POINTER,
    OP20InitParameters,
    OP20S,
    Revert,
    SafeMath,
    StoredU256,
} from '@btc-vision/btc-runtime/runtime';
import {
    OracleAddedEvent,
    OracleRemovedEvent,
    PriceAggregatedEvent,
    PriceSubmittedEvent,
} from '../shared-events/OracleEvents';

const oracleCountPointer: u16 = Blockchain.nextPointer;
const minOraclesPointer: u16 = Blockchain.nextPointer;
const maxDeviationPointer: u16 = Blockchain.nextPointer;
const submissionWindowPointer: u16 = Blockchain.nextPointer;
const oracleSubmissionsPointer: u16 = Blockchain.nextPointer;
const oracleTimestampsPointer: u16 = Blockchain.nextPointer;
const oracleActivePointer: u16 = Blockchain.nextPointer;
const adminPointer: u16 = Blockchain.nextPointer;

@final
export class MultiOracleStablecoin extends OP20S {
    private readonly _oracleCount: StoredU256;
    private readonly _minOracles: StoredU256;
    private readonly _maxDeviation: StoredU256;
    private readonly _submissionWindow: StoredU256;
    private readonly _oracleSubmissions: AddressMemoryMap;
    private readonly _oracleTimestamps: AddressMemoryMap;
    private readonly _oracleActive: AddressMemoryMap;
    private readonly _adminMap: AddressMemoryMap;

    public constructor() {
        super();
        this._oracleCount = new StoredU256(oracleCountPointer, EMPTY_POINTER);
        this._minOracles = new StoredU256(minOraclesPointer, EMPTY_POINTER);
        this._maxDeviation = new StoredU256(maxDeviationPointer, EMPTY_POINTER);
        this._submissionWindow = new StoredU256(submissionWindowPointer, EMPTY_POINTER);
        this._oracleSubmissions = new AddressMemoryMap(oracleSubmissionsPointer);
        this._oracleTimestamps = new AddressMemoryMap(oracleTimestampsPointer);
        this._oracleActive = new AddressMemoryMap(oracleActivePointer);
        this._adminMap = new AddressMemoryMap(adminPointer);
    }

    public override onDeployment(calldata: Calldata): void {
        const admin = calldata.readAddress();
        const initialRate = calldata.readU256();
        const minOracles = calldata.readU64();
        const maxDeviation = calldata.readU64();
        const submissionWindow = calldata.readU64();

        if (admin.equals(Address.zero())) {
            throw new Revert('Invalid admin');
        }

        if (initialRate.isZero()) {
            throw new Revert('Invalid initial rate');
        }

        if (minOracles == 0) {
            throw new Revert('Invalid min oracles');
        }

        if (maxDeviation == 0 || maxDeviation > 1000) {
            throw new Revert('Invalid max deviation');
        }

        if (submissionWindow == 0) {
            throw new Revert('Invalid submission window');
        }

        const maxSupply: u256 = u256.Max;
        const decimals: u8 = 8;
        const name: string = 'USD Stablecoin';
        const symbol: string = 'opUSD';

        this.instantiate(new OP20InitParameters(maxSupply, decimals, name, symbol));
        this.initializePeg(admin, initialRate, submissionWindow * 2);

        this._setAdmin(admin);
        this._minOracles.value = u256.fromU64(minOracles);
        this._maxDeviation.value = u256.fromU64(maxDeviation);
        this._submissionWindow.value = u256.fromU64(submissionWindow);
    }

    @method({ name: 'oracle', type: ABIDataTypes.ADDRESS })
    @emit('OracleAdded')
    public addOracle(calldata: Calldata): BytesWriter {
        this._onlyAdmin();

        const oracle = calldata.readAddress();
        if (oracle.equals(Address.zero())) {
            throw new Revert('Invalid oracle');
        }

        const alreadyActive = this._oracleActive.get(oracle);
        if (!alreadyActive.isZero()) {
            throw new Revert('Oracle exists');
        }

        this._oracleActive.set(oracle, u256.One);
        this._oracleCount.value = SafeMath.add(this._oracleCount.value, u256.One);

        this.emitEvent(new OracleAddedEvent(oracle, Blockchain.tx.sender));

        return new BytesWriter(0);
    }

    @method({ name: 'oracle', type: ABIDataTypes.ADDRESS })
    @emit('OracleRemoved')
    public removeOracle(calldata: Calldata): BytesWriter {
        this._onlyAdmin();

        const oracle = calldata.readAddress();
        const active = this._oracleActive.get(oracle);
        if (active.isZero()) {
            throw new Revert('Oracle not active');
        }

        this._oracleActive.set(oracle, u256.Zero);
        this._oracleCount.value = SafeMath.sub(this._oracleCount.value, u256.One);

        this.emitEvent(new OracleRemovedEvent(oracle, Blockchain.tx.sender));

        return new BytesWriter(0);
    }

    @method({ name: 'price', type: ABIDataTypes.UINT256 })
    @emit('PriceSubmitted')
    public submitPrice(calldata: Calldata): BytesWriter {
        const sender = Blockchain.tx.sender;
        const active = this._oracleActive.get(sender);
        if (active.isZero()) {
            throw new Revert('Not an oracle');
        }

        const price = calldata.readU256();
        if (price.isZero()) {
            throw new Revert('Invalid price');
        }

        const blockNumber = Blockchain.block.number;

        this._oracleSubmissions.set(sender, price);
        this._oracleTimestamps.set(sender, u256.fromU64(blockNumber));

        this.emitEvent(new PriceSubmittedEvent(sender, price, blockNumber));

        return new BytesWriter(0);
    }

    @method({ name: 'oracles', type: ABIDataTypes.ARRAY_OF_ADDRESSES })
    @emit('PriceAggregated')
    public aggregatePrice(calldata: Calldata): BytesWriter {
        const oracleCount = calldata.readU32();
        if (u256.fromU32(oracleCount) < this._minOracles.value) {
            throw new Revert('Not enough oracles');
        }

        const currentBlock = Blockchain.block.number;
        const window = this._submissionWindow.value.toU64();
        const maxDev = this._maxDeviation.value;

        const prices = new Array<u256>();

        for (let i: u32 = 0; i < oracleCount; i++) {
            const oracle = calldata.readAddress();

            const active = this._oracleActive.get(oracle);
            if (active.isZero()) continue;

            const timestamp = this._oracleTimestamps.get(oracle).toU64();
            if (currentBlock > timestamp + window) continue;

            const price = this._oracleSubmissions.get(oracle);
            if (price.isZero()) continue;

            prices.push(price);
        }

        const validCount: u32 = <u32>prices.length;

        if (u256.fromU32(validCount) < this._minOracles.value) {
            throw new Revert('Insufficient valid submissions');
        }

        for (let i = 0; i < prices.length - 1; i++) {
            for (let j = 0; j < prices.length - i - 1; j++) {
                if (prices[j] > prices[j + 1]) {
                    const temp = prices[j];
                    prices[j] = prices[j + 1];
                    prices[j + 1] = temp;
                }
            }
        }

        const median = prices[prices.length / 2];

        const basisPoints = u256.fromU64(10000);
        for (let i = 0; i < prices.length; i++) {
            const price = prices[i];
            let deviation: u256;
            if (price > median) {
                deviation = SafeMath.div(
                    SafeMath.mul(SafeMath.sub(price, median), basisPoints),
                    median,
                );
            } else {
                deviation = SafeMath.div(
                    SafeMath.mul(SafeMath.sub(median, price), basisPoints),
                    median,
                );
            }

            if (deviation > maxDev) {
                throw new Revert('Deviation too high');
            }
        }

        this._pegRate.value = median;
        this._pegUpdatedAt.value = u256.fromU64(currentBlock);

        this.emitEvent(new PriceAggregatedEvent(median, validCount, currentBlock));

        return new BytesWriter(0);
    }

    @method(
        { name: 'to', type: ABIDataTypes.ADDRESS },
        { name: 'amount', type: ABIDataTypes.UINT256 },
    )
    @emit('Minted')
    public mint(calldata: Calldata): BytesWriter {
        this._onlyAdmin();

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

    @method()
    @returns({ name: 'count', type: ABIDataTypes.UINT256 })
    public oracleCount(_: Calldata): BytesWriter {
        const w = new BytesWriter(32);
        w.writeU256(this._oracleCount.value);
        return w;
    }

    @method()
    @returns({ name: 'min', type: ABIDataTypes.UINT256 })
    public minOracles(_: Calldata): BytesWriter {
        const w = new BytesWriter(32);
        w.writeU256(this._minOracles.value);
        return w;
    }

    @method({ name: 'oracle', type: ABIDataTypes.ADDRESS })
    @returns({ name: 'active', type: ABIDataTypes.BOOL })
    public isOracleActive(calldata: Calldata): BytesWriter {
        const oracle = calldata.readAddress();
        const w = new BytesWriter(1);
        w.writeBoolean(!this._oracleActive.get(oracle).isZero());
        return w;
    }

    @method({ name: 'oracle', type: ABIDataTypes.ADDRESS })
    @returns({ name: 'price', type: ABIDataTypes.UINT256 })
    public oracleSubmission(calldata: Calldata): BytesWriter {
        const oracle = calldata.readAddress();
        const w = new BytesWriter(32);
        w.writeU256(this._oracleSubmissions.get(oracle));
        return w;
    }

    @method()
    @returns({ name: 'admin', type: ABIDataTypes.ADDRESS })
    public admin(_: Calldata): BytesWriter {
        const w = new BytesWriter(32);
        w.writeAddress(this._getAdmin());
        return w;
    }

    private _getAdmin(): Address {
        const stored = this._adminMap.get(Address.zero());
        if (stored.isZero()) return Address.zero();
        return this._u256ToAddress(stored);
    }

    private _setAdmin(addr: Address): void {
        this._adminMap.set(Address.zero(), this._addressToU256(addr));
    }

    private _onlyAdmin(): void {
        if (!Blockchain.tx.sender.equals(this._getAdmin())) {
            throw new Revert('Not admin');
        }
    }
}
