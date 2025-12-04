# Deploying and Customizing an OP_20 Token on OP_NET

![Bitcoin](https://img.shields.io/badge/Bitcoin-000?style=for-the-badge&logo=bitcoin&logoColor=white)
![AssemblyScript](https://img.shields.io/badge/assembly%20script-%23000000.svg?style=for-the-badge&logo=assemblyscript&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![NodeJS](https://img.shields.io/badge/Node%20js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![WebAssembly](https://img.shields.io/badge/WebAssembly-654FF0?style=for-the-badge&logo=webassembly&logoColor=white)
![NPM](https://img.shields.io/badge/npm-CB3837?style=for-the-badge&logo=npm&logoColor=white)

[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

## Prerequisites

- Ensure you have [Node.js](https://nodejs.org/en/download/prebuilt-installer) and [npm](https://www.npmjs.com/)
  installed on your computer.

## Step-by-Step Guide

### 1. Install OP_WALLET Chrome Extension

- Download and install the [OP_WALLET Chrome Extension](https://opnet.org).
- Set up the wallet and switch the network to Regtest.

### 2. Obtain Regtest Bitcoin

- If you don't have any Regtest Bitcoin, get some from [this faucet](https://faucet.opnet.org/).

### 3. Download OP_20 Template Contract

- Clone the [OP_20 template contract](https://github.com/btc-vision/OP_20) repository:
    ```sh
    git clone https://github.com/btc-vision/OP_20.git
    ```

### 4. Edit Token Details

This step is crucial for customizing your OP_20 token. You will need to adjust several key properties such as
`maxSupply`, `decimals`, `name`, and `symbol`.

#### **Understanding Token Properties**

Here’s what each property means and how you can customize it:

1. **`maxSupply`**:

- This defines the total supply of your token.
- It’s a `u256` value representing the maximum number of tokens that will ever exist.
- The number should include the full number of decimals.
- **Example**: If you want a total supply of 1,000,000 tokens with 18 decimals, the value should be
  `1000000000000000000000000`.

```typescript
const maxSupply: u256 = u256.fromString('1000000000000000000000000000'); // Your max supply. (Here, 1 billion tokens)
```

2. **`decimals`**:

- This property defines how divisible your token is.
- A value of `18` means the token can be divided down to 18 decimal places, similar to how Ethereum handles its tokens.

```typescript
const decimals: u8 = 18; // Your decimals
```

3. **`name`**:

- The `name` is a string representing the full name of your token.
- This will be displayed in wallets and exchanges.

```typescript
const name: string = 'Test'; // Your token name
```

4. **`symbol`**:

- The `symbol` is a short string representing the ticker symbol of your token.
- Similar to how "BTC" represents Bitcoin.

```typescript
const symbol: string = 'TEST'; // Your token symbol
```

#### **Modifying the Contract Code**

Open the `OP_20` template repository in your IDE or text editor and navigate to `src/contracts/token/MyToken.ts`. Look
for the following section in the `onInstantiated` method:

```typescript
const maxSupply: u256 = u256.fromString('1000000000000000000000000000'); // Your max supply. (Here, 1 billion tokens)
const decimals: u8 = 18; // Your decimals.
const name: string = 'Test'; // Your token name.
const symbol: string = 'TEST'; // Your token symbol.
```

Modify the values as needed for your token.

### 5. Install Dependencies and Build

After customizing your token's properties, build the contract:

- Open your terminal and navigate to the location of the downloaded `OP_20` template folder.
- Run the following commands:

    ```sh
    npm install
    npm run build:token
    ```

- After building, a `build` folder will be created in the root of the `OP_20` folder. Look for `[nameoftoken].wasm` for
  the compiled contract.

### 6. Deploy the Token Contract

- Open the OP_WALLET extension and select the "deploy" option.
- Drag your `.wasm` file or click to choose it.
- Send your transaction to deploy the token contract onto Bitcoin with OP_NET.

### 7. Add Liquidity on Motoswap

- Copy the token address from your OP_WALLET.
- Go to [Motoswap](https://motoswap.org/pool) and paste your token address into the top or bottom box.
- Enter the amount of tokens you wish to add to the liquidity pool.
- Select the other side of the liquidity pair (e.g., WBTC) and enter the amount of tokens you wish to add.
- Click "Add Liquidity".

Your token is now tradeable on Motoswap!

---

## Customizing Your Token Further

Now that you've set up the basic token properties, you can add additional functionality to your OP_20 token contract.
Here are some common customizations:

### Adding Custom Methods

To add custom functionality to your token, you can define new methods in your contract. For example, let's say you want
to add an "airdrop" function that distributes tokens to multiple addresses.

#### Example: Airdrop Function

```typescript
public override callMethod(method: Selector, calldata: Calldata): BytesWriter {
    switch (method) {
        case encodeSelector('airdrop()'):
            return this.airdrop(calldata);
        default:
            return super.callMethod(method, calldata);
    }
}

private airdrop(calldata: Calldata): BytesWriter {
    const drops: Map<Address, u256> = calldata.readAddressValueTuple();

    const addresses: Address[] = drops.keys();
    for (let i: i32 = 0; i < addresses.length; i++) {
        const address = addresses[i];
        const amount = drops.get(address);

        this._mint(address, amount);
    }

    const writer: BytesWriter = new BytesWriter(BOOLEAN_BYTE_LENGTH);
    writer.writeBoolean(true);

    return writer;
}
```

### Overriding Methods

You may want to override some of the existing methods in the `DeployableOP_20` base class. For example, you might want
to add additional logic when minting tokens.

#### Example: Overriding `_mint` Method

```typescript
protected _mint(to: Address, amount: u256): void {
    super._mint(to, amount);

    // Add custom logic here
    Blockchain.log(`Minted ${amount.toString()} tokens to ${to.toString()}`); // Only work inside OP_NET Uint Test Framework
}
```

### Creating Events

Events in OP_NET allow you to emit signals that external observers can listen to. These are useful for tracking specific
actions within your contract, such as token transfers or approvals.

#### Example: Transfer Event

```typescript
class TransferEvent extends NetEvent {
    constructor(from: Address, to: Address, amount: u256) {
        const writer = new BytesWriter(ADDRESS_BYTE_LENGTH * 2 + U256_BYTE_LENGTH);
        writer.writeAddress(from);
        writer.writeAddress(to);
        writer.writeU256(amount);
        super('Transfer', writer);
    }
}

class MyToken extends DeployableOP_20 {
    public transfer(to: Address, amount: u256): void {
        const from: Address = Blockchain.sender;
        this._mint(to, amount);
        this.emitEvent(new TransferEvent(from, to, amount));
    }
}
```

### Implementing Additional Security Measures

If you want to add more control over who can call certain methods or add advanced features like pausing token transfers,
you can implement access control mechanisms.

#### Example: Only Owner Modifier

```typescript
public mint(to: Address, amount: u256): void {
    this.onlyOwner(Blockchain.sender); // Restrict minting to the contract owner
    this._mint(to, amount);
}
```

---

## Differences Between Solidity and AssemblyScript on OP_NET

### Constructor Behavior

- **Solidity:** The constructor runs only once at the time of contract deployment and is used for initializing contract
  state.
- **AssemblyScript on OP_NET:** The constructor runs every time the contract is instantiated. Use `onInstantiated()` for
  initialization that should occur only once.

### State Management

- **Solidity:** Variables declared at the contract level are automatically persistent and are stored in the contract's
  state.
- **AssemblyScript on OP_NET:** Persistent state must be managed explicitly using storage classes like `StoredU256`,
  `StoredBoolean`, and `StoredString`.

### Method Overriding

- **Solidity:** Method selectors are built-in, and overriding them is straightforward.
- **AssemblyScript on OP_NET:** Method selectors are manually defined using functions like `encodeSelector()`, and
  method overriding is handled in `callMethod`.

### Event Handling

- **Solidity:** Events are declared and emitted using the `emit` keyword.
- **AssemblyScript on OP_NET:** Events are custom classes derived from `NetEvent` and are emitted using the `emitEvent`
  function.

---

## Advanced Features

### Implementing Additional Custom Logic

The OPNet runtime allows you to implement complex logic in your token contract. For example, you can add functionality
such as token freezing, custom transaction fees, or governance mechanisms.

These features are implemented by extending the base `DeployableOP_20` or `OP_20` class and overriding its methods as
needed.

---

## Additional Documentation

For more detailed explanations on specific topics related to the OPNet runtime, refer to the following documentation:

- [OPNet Runtime Documentation](https://github.com/btc-vision/btc-runtime/tree/main)
- [Blockchain.md](https://github.com/btc-vision/btc-runtime/blob/main/docs/Blockchain.md)
- [Contract.md](https://github.com/btc-vision/btc-runtime/blob/main/docs/Contract.md)
- [Events.md](https://github.com/btc-vision/btc-runtime/blob/main/docs/Events.md)
- [Pointers.md](https://github.com/btc-vision/btc-runtime/blob/main/docs/Pointers.md)
- [Storage.md](https://github.com/btc-vision/btc-runtime/blob/main/docs/Storage.md)

---

## License

This project is licensed under the MIT License. View the full license [here](LICENSE.md).
