require("@nomiclabs/hardhat-waffle")
require("@nomiclabs/hardhat-etherscan")
require("hardhat-deploy")
require("solidity-coverage")
require("hardhat-gas-reporter")
require("hardhat-contract-sizer")
require("dotenv").config()

const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL || ""
const PRIVATE_KEY = process.env.PRIVATE_KEY || ""
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || ""
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY || ""

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: "0.8.17",
    networks: {
        dashboard: {
            url: "http://localhost:24012/rpc", // truffle dashboard - SECURE
        },
        goerli: {
            url: GOERLI_RPC_URL,
            chainId: 5,
            accounts: [PRIVATE_KEY],
            blockConfirmations: 3,
        },
        ganache: {
            url: "http://127.0.0.1:7545",
            accounts: {
                mnemonic:
                    "crash envelope orbit crash actress debate improve borrow aunt twenty hero base",
                initialIndex: 0,
                count: 10,
            },
        },
    },

    namedAccounts: {
        deployer: {
            default: 0,
        },
        attacker: {
            default: 1,
        },
    },
    gasReporter: {
        enabled: false,
        // noColors: true,
        // currency: "USD",
        // coinmarketcap: COINMARKETCAP_API_KEY,
    },
    mocha: {
        timeout: 200000, // 200 seconds
    },
}
