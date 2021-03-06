# Terra Oracle Feeder

Oracle feeder is a robust tool that can 

1. fetch and infer ETH (or LUNA) exchange rates in 6 major active currencies (namely KRW, USD, JPY, GBP, EUR, CNY)
2. Submit vote for the price of that specific crypto using `terracli`
3. It can run a daemon in persistent mode such that it fetches and votes once in every regular pre-defined interval. It automatically restarts itself in case of a crash or a system restart (uses `pm2`).


## Installation

1. Install [node.js](https://nodejs.org/en/download/) (10.15+ version recommended) and node package manager, `npm` 
2. Download/clone this repo from `https://github.com/covalent-hq/terra-oracle.git`
3. run `npm install`  in `terra-oracle` directory: This installs necessary node modules
4. run `sudo npm link` : registers the `oracle` CLI command to `bin/oracle`
5. If you haven't already, please install [Terra](https://docs.terra.money/guide/installation)


## Dependencies and Setups
1. Obviously one need to have `terrad` and `terracli` [installed](https://docs.terra.money/guide/installation) and running to vote
2. In addition, make sure you have all the necessary node modules
3. Then before testing/interacting with the CLI, one need to make sure `terracli` is running in either Dev or Prod setup
4. Now change `src/voter.js` and put the correct `CHAIN_ID` there

### Dev Setup
1. For Dev setup, one can follow the [local deployment setup](https://docs.terra.money/guide/deploy-testnet) for Terra with 1 local node
2. Then run the CLI with `ENV=dev` e.g. `ENV=dev oracle fetch`

### Prod Setup
1. For Dev setup, one can follow the [terra network validator setup](https://docs.terra.money/guide/validators#create-your-validator) and join the [soju-0008](https://github.com/terra-project/networks/tree/master/soju-0008) live testnet by staking some Luna obtained from the faucet
2. Then run the CLI, optionally with `ENV=prod` e.g. simply `oracle fetch` or  `ENV=prod oracle fetch`

Note: In the final implementation, we did not need any specific flags for dev and prod environment, as prod and dev setups (other than which terra network it connects to) are necessarily identical. 

## Functionality, Implementation, and Mechanism
In this section, we discuss how we implemented various functionalities of the oracle feeder.

### `fetch`
This infers the crypto exchange rates in two steps:
1. Fetch Data from APIs: 
    1. We fetch exchange rates for the required crypto-fiat pairs from 5 major exchanges. Then we end up with a matrix similar to Matrix1. 
    2. Then we fetch FX rates wrt USD from 3 FX APIs (Matrix 3). Then we get the combined Fx rates by taking a median of each column discarding the missing values (Matrix 3)
<img src="./docs/mat1.png" width="600">

2. Infer missing values using FX Data: 
    1. In this step, first we infer the potential values of the crypto for all exchanges by filling out Matrix 1 using the FxCombined rate in Matrix 3 and get Matrix 4
    2. Finally, we take a median along each column to get the final price of the cryptocurrency.
<img src="./docs/mat2.png" width="590">

**Expected Output:**
1. If the CLI call runs without any error, it yields a json with all the denominations as keys and the crypto-fiat rates as values e.g. ```{'ust': 160.2, 'eut': 142.3}```
2. If CLI finds some denominations that are out of active currencies it shows the values that are in active currency list and then shows a warning showing the denominations that need change
3. If CLI fails for any other reason, it shows an error message.

Relevant files: `src/fetcher.js, src/forex.js`

### `vote`
This submits a `MsgPriceFeed` call to `terracli` (i.e. `terracli tx oracle vote`). Simply implemented with a child process spawned by the `exec` module.

Relevant file: `src/vote.js`

### `run`
This is a combination of the `fetch` and `vote` functions. This creates a persistent daemon with `pm2` which fetches relevant values and votes in every pre-specificed time interval (default: 15 mins).

**Some Tidbits:**
1. We log the voting history with timestamp, currency, price, and the tx hash/errors
2. One can check the logs with `tail -f log/output-<NUM>.log` or `tail -f log/error-<NUM>.log`.
3. We take care of log rotation with `pm2`
4. One can use the `./node_modules/pm2/bin/pm2 -h` to check everything they can do with pm2! Especially, `./node_modules/pm2/bin/pm2 ls` to check the status of the running process.

Relevant file: `src/run.js`

### `rm`
This additional command enables us to stop and remove the persistent daemon. Usage
```
oracle rm
```

Relevant file: `src/run.js`

### `help`
With `help`, CLI shows  beautifully formatted help prompts using command-line-usage and chalk. Relevant file: `src/help.js`

### `CLI Parser`
CLI parser implemented on file: `src/cli.js`. It serves to just pass through the arguments to relevant functions.

## Limitations
1. Currently due to some limitations of `ccxt` library, we need to make separate call for every single crypto-fiat pair for each exchange. While we speed it up with a pooled promise (hence they run in parallel), we still need to make upto 5 * 6 = 30 calls, which is rather expensive and slow. In future, we can try to bring it down to 5 (i.e. number of exchange API) calls.
2. If ALL the major exchanges delist ETH/USD pair, then it might not be possible to infer the exchange values for other currencies. The reason we leaned towards this assumption is that for the free forex API we could find, there was no easy way to obtain covertion rates between non-USD pairs (e.g. JPY-CNY). In addition, it is highly unlikely that all the major crypto exchanges would de-list ETH/USD pair.
2. While we chose 5 major crypto exchanges and they have decent uptime, in case, a coin is listed in very few exchanges, downtime in those exchange APIs could stop this program from working. We could use a caching system. However, as we know crypto and forex both could be volatile and depending on stale-values is not a great idea.
3. While we have tried to write various unit tests, due to time limitation our test coverage is not extremely high. All the relevant tests are in `test/` directory.
4. Currently we assume that the `terracli` and the running validator node are persistent. We could also add those commands to process monitor in `pm2`.
5. In addition, we have noticed that if we try to vote too quicky without a block reaching finality, tendermint throws some obsecure `"signature verification failed"` message (Code 4). We are not certain whether there is an easy way to check finality of the latest block (and it might be beyond the scope of this proejct). So we simply used 5 seconds sleep before each voting to assure that we are not getting this signature verification issue. Another way could be using the return value from the voting and then using some back-off techniques to wait before commiting the vote.

## Reference: Other Docs
1. [Contribution Doc](https://docs.google.com/document/d/1XBflvlwCAIu4vStYvXpmJELSXn7Mo5nBkWhAV-nwG_s/edit?usp=sharing): In this doc, we mention the contribution of each member
2. [Design Thought Process Doc](https://docs.google.com/document/d/1j4CegCqznDU2MjRCjnOP-XyCotwW3P9cTsbuAbatiPg/edit?usp=sharing): While we explain most of our functionality in this README, we went through two phases--p0 and p1 for development. In this doc, we explain the evolution of the design process during those two steps.

## Reference: Interfaces 

The oracle feeder will be distroed in the form of a cli tool, with the following interface:

```
oracle - Command line interface for interacting with the Terra Oracle Feeder 

Usage:
oracle [command]

Available Commands:
fetch       Fetch the current price of luna. If denom is not specified, fetches the prices in all available denoms
run         Runs in daemon mode. Runs periodically (constrained by the interval command) to fetch and vote to the chain
rm          Removes the persistent daemon
vote        Transactions subcommands

Flags:
--denom string      denomination flag, one of "luna | krt | ust | srt | jpt | gbt | eut | cnt"
-p, --price float       price flag, to be used by vote 
-h, --help              help for oracle
--key string        name of the terra key stored on disk by terracli
--pw  string        password of the terra key 
--interval int      the minute intervals by which oracle should run
```
### Examples: 

`oracle fetch --denom=luna,jpt,eur` - returns a json formatted dict of the current effective prices of Luna in the specified currencies. If there is no active market for Luna in the requested fiat currency, the oracle makes a best effort to translate that value before failing. 

`oracle fetch` - returns a json formatted dict of the current effective prices of Luna in all the known whitelisted currencies. 

`oracle run --interval=15` - fetches and votes every 15 minutes 

`oracle vote --denom=jpt --price=0.1` - submits a `MsgPriceFeed` to `terracli` that claims the price of Luna to be 0.1 JPT/JPY. 

